import { env } from '@env';

import {
  MAX_STRUCTURED_ATTEMPTS,
  buildSummarizationPrompt,
  processStructuredResponse,
} from '@/lib/utils/structured-analysis.utils';
import type {
  StructuredSummarizationResult,
  SummarizationOptions,
  SummarizationResponse,
} from '@/types/claude.types';
import type { SimplifiedSignal } from '@/types/rubric-signal.types';

import { chatCompletion } from './client';
import { mapHttpError } from './http-error.utils';
import { openRouterResponseSchema } from './openrouter-response.schema';

export async function summarizeStructured(
  transcript: string,
  signals: SimplifiedSignal[],
  options: SummarizationOptions,
): Promise<SummarizationResponse> {
  const { system } = buildSummarizationPrompt(signals);

  let lastResult: SummarizationResponse | null = null;

  for (let attempt = 1; attempt <= MAX_STRUCTURED_ATTEMPTS; attempt++) {
    try {
      const response = await chatCompletion({
        model: options.model ?? env.OPENROUTER_DEFAULT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: transcript },
        ],
        max_tokens: options.maxTokens ?? env.OPENROUTER_MAX_TOKENS,
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      if (!response.ok) {
        return await mapHttpError(response);
      }

      const json: unknown = await response.json();
      const parsed = openRouterResponseSchema.safeParse(json);
      if (!parsed.success) {
        console.error('[TranscriptSummarizer] Malformed API response', parsed.error.message);
        return {
          success: false,
          category: 'api_error',
          message: 'An unexpected error occurred. Please try again.',
          retryAfterMs: null,
        };
      }

      const firstChoice = parsed.data.choices[0];
      if (firstChoice === undefined) {
        console.error('[TranscriptSummarizer] Empty choices array in response');
        return {
          success: false,
          category: 'api_error',
          message: 'An unexpected error occurred. Please try again.',
          retryAfterMs: null,
        };
      }

      const processed = processStructuredResponse(firstChoice.message.content, signals);
      if (processed.success) {
        return {
          success: true,
          meetingTitle: processed.meetingTitle,
          summary: processed.summary,
          leadScore: processed.leadScore,
          model: parsed.data.model,
          usage: {
            inputTokens: parsed.data.usage.prompt_tokens,
            outputTokens: parsed.data.usage.completion_tokens,
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
    } catch (error) {
      if (error instanceof TypeError) {
        console.error('[TranscriptSummarizer] Network error', (error as Error).message);
        return {
          success: false,
          category: 'network',
          message: 'Unable to reach the summarization service. Check your connection.',
          retryAfterMs: null,
        };
      }
      console.error(
        '[TranscriptSummarizer] Unexpected error',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return {
        success: false,
        category: 'api_error',
        message: 'An unexpected error occurred. Please try again.',
        retryAfterMs: null,
      };
    }
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
