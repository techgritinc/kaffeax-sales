import { env } from '@env';
import { z } from 'zod';

import type {
  SummarizationOptions,
  SummarizationResponse,
  SummarizationResult,
} from '@/types/claude.types';

import client, {
  APIConnectionError,
  APIError,
  AuthenticationError,
  BadRequestError,
  RateLimitError,
} from './client';

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
      const stream = client.messages.stream({
        model: options?.model ?? env.CLAUDE_DEFAULT_MODEL,
        max_tokens: options?.maxTokens ?? env.CLAUDE_MAX_TOKENS,
        thinking: { type: 'adaptive' },
        messages: [{ role: 'user', content: transcript }],
      });

      const response = await stream.finalMessage();

      const content = response.content.reduce<string>((acc, block) => {
        if (block.type === 'text') {
          return acc + block.text;
        }
        return acc;
      }, '');

      const result: SummarizationResult = {
        success: true,
        content,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };

      return result;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return {
          success: false,
          category: 'authentication',
          message: 'API authentication failed. Contact your administrator.',
          retryAfterMs: null,
        };
      }
      if (error instanceof RateLimitError) {
        const retryAfter = error.headers?.get('retry-after');
        const seconds = retryAfter != null ? parseInt(retryAfter, 10) : NaN;
        return {
          success: false,
          category: 'rate_limit',
          message: 'Service is temporarily busy. Please try again shortly.',
          retryAfterMs: isNaN(seconds) ? null : seconds * 1000,
        };
      }
      if (error instanceof BadRequestError) {
        return {
          success: false,
          category: 'invalid_request',
          message: 'The request could not be processed. The transcript may be too long.',
          retryAfterMs: null,
        };
      }
      if (error instanceof APIConnectionError) {
        return {
          success: false,
          category: 'network',
          message: 'Unable to reach the summarization service. Check your connection.',
          retryAfterMs: null,
        };
      }
      if (error instanceof APIError) {
        return {
          success: false,
          category: 'api_error',
          message: 'An unexpected error occurred. Please try again.',
          retryAfterMs: null,
        };
      }
      console.error(
        '[TranscriptSummarizer] Unexpected non-SDK error',
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
