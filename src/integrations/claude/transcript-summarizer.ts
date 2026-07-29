import { env } from '@env';
import { z } from 'zod';

import { computeAnthropicCost } from '@/lib/utils/ai-cost.utils';
import {
  MAX_STRUCTURED_ATTEMPTS,
  buildSummarizationPrompt,
  processStructuredResponse,
} from '@/lib/utils/structured-analysis.utils';
import type {
  StructuredSummarizationResult,
  SummarizationOptions,
  SummarizationResponse,
  SummarizationResult,
} from '@/types/claude.types';
import type { SimplifiedSignal } from '@/types/rubric-signal.types';

import client from './client';
import { handleSdkError } from './sdk-error.utils';

const transcriptSchema = z.string().min(1);

export class TranscriptSummarizer {
  async summarize(
    transcript: string,
    options?: SummarizationOptions,
  ): Promise<SummarizationResponse> {
    const validation = transcriptSchema.safeParse(transcript);
    if (!validation.success) {
      return {
        success: false,
        category: 'invalid_request',
        message: 'Transcript must be a non-empty string.',
        retryAfterMs: null,
      };
    }

    try {
      if (options?.signals !== undefined) {
        return await this.summarizeStructured(transcript, options.signals, options);
      }

      const stream = client.messages.stream({
        model: options?.model ?? env.CLAUDE_DEFAULT_MODEL,
        max_tokens: options?.maxTokens ?? env.CLAUDE_MAX_TOKENS,
        thinking: { type: 'adaptive' },
        messages: [{ role: 'user', content: transcript }],
      });

      const response = await stream.finalMessage();

      const content = response.content.reduce<string>((acc, block) => {
        if (block.type === 'text') return acc + block.text;
        return acc;
      }, '');

      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const cacheCreationTokens = response.usage.cache_creation_input_tokens ?? 0;
      const cacheReadTokens = response.usage.cache_read_input_tokens ?? 0;
      const result: SummarizationResult = {
        success: true,
        content,
        model: response.model,
        provider: 'anthropic',
        usage: {
          inputTokens,
          outputTokens,
          cacheCreationTokens,
          cacheReadTokens,
          ...computeAnthropicCost(
            response.model,
            inputTokens,
            outputTokens,
            cacheCreationTokens,
            cacheReadTokens,
          ),
        },
      };

      return result;
    } catch (error) {
      return handleSdkError(error);
    }
  }

  private async summarizeStructured(
    transcript: string,
    signals: SimplifiedSignal[],
    options: SummarizationOptions,
  ): Promise<SummarizationResponse> {
    const { system } = buildSummarizationPrompt(signals);

    let lastResult: SummarizationResponse | null = null;

    for (let attempt = 1; attempt <= MAX_STRUCTURED_ATTEMPTS; attempt++) {
      const stream = client.messages.stream({
        model: options.model ?? env.CLAUDE_DEFAULT_MODEL,
        max_tokens: options.maxTokens ?? env.CLAUDE_MAX_TOKENS,
        system,
        thinking: { type: 'adaptive' },
        messages: [{ role: 'user', content: transcript }],
      });

      const response = await stream.finalMessage();

      const rawText = response.content.reduce<string>((acc, block) => {
        if (block.type === 'text') return acc + block.text;
        return acc;
      }, '');

      const processed = processStructuredResponse(rawText, signals);
      if (processed.success) {
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;
        const cacheCreationTokens = response.usage.cache_creation_input_tokens ?? 0;
        const cacheReadTokens = response.usage.cache_read_input_tokens ?? 0;
        return {
          success: true,
          meetingTitle: processed.meetingTitle,
          summary: processed.summary,
          leadScore: processed.leadScore,
          model: response.model,
          provider: 'anthropic',
          usage: {
            inputTokens,
            outputTokens,
            cacheCreationTokens,
            cacheReadTokens,
            ...computeAnthropicCost(
              response.model,
              inputTokens,
              outputTokens,
              cacheCreationTokens,
              cacheReadTokens,
            ),
          },
        } satisfies StructuredSummarizationResult;
      }

      lastResult = processed;
      if (processed.category !== 'malformed_response' || attempt === MAX_STRUCTURED_ATTEMPTS) {
        return processed;
      }
      console.warn(
        `[TranscriptSummarizer] Malformed AI response, retrying (attempt ${attempt + 1}/${MAX_STRUCTURED_ATTEMPTS})`,
      );
    }

    return (
      lastResult ?? {
        success: false,
        category: 'api_error',
        message: 'An unexpected error occurred. Please try again.',
        retryAfterMs: null,
      }
    );
  }
}
