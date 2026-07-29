import { env } from '@env';
import { z } from 'zod';

import type {
  SummarizationOptions,
  SummarizationResponse,
  SummarizationResult,
} from '@/types/claude.types';

import { chatCompletion } from './client';
import { mapHttpError } from './http-error.utils';
import { openRouterResponseSchema } from './openrouter-response.schema';
import { summarizeStructured } from './structured-summarizer';

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
        return await summarizeStructured(transcript, options.signals, options);
      }

      const response = await chatCompletion({
        model: options?.model ?? env.OPENROUTER_DEFAULT_MODEL,
        messages: [{ role: 'user', content: transcript }],
        max_tokens: options?.maxTokens ?? env.OPENROUTER_MAX_TOKENS,
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

      const result: SummarizationResult = {
        success: true,
        content: firstChoice.message.content,
        model: parsed.data.model,
        usage: {
          inputTokens: parsed.data.usage.prompt_tokens,
          outputTokens: parsed.data.usage.completion_tokens,
        },
      };

      return result;
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
}
