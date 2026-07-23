import { env } from '@env';
import { z } from 'zod';

import type {
  SummarizationError,
  SummarizationOptions,
  SummarizationResponse,
  SummarizationResult,
} from '@/types/claude.types';

import { chatCompletion } from './client';

const transcriptSchema = z.string().min(1);

const openRouterResponseSchema = z.object({
  model: z.string(),
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
  }),
});

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
      const response = await chatCompletion({
        model: options?.model ?? env.OPENROUTER_DEFAULT_MODEL,
        messages: [{ role: 'user', content: transcript }],
        max_tokens: options?.maxTokens ?? env.OPENROUTER_MAX_TOKENS,
      });

      if (!response.ok) {
        return mapHttpError(response);
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
        console.error('[TranscriptSummarizer] Network error', error.message);
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

function mapHttpError(response: Response): SummarizationError {
  const { status } = response;

  if (status === 401 || status === 403) {
    return {
      success: false,
      category: 'authentication',
      message: 'API authentication failed. Contact your administrator.',
      retryAfterMs: null,
    };
  }

  if (status === 429) {
    const retryAfter = response.headers.get('retry-after');
    const seconds = retryAfter != null ? parseInt(retryAfter, 10) : NaN;
    return {
      success: false,
      category: 'rate_limit',
      message: 'Service is temporarily busy. Please try again shortly.',
      retryAfterMs: isNaN(seconds) ? null : seconds * 1000,
    };
  }

  if (status === 400) {
    return {
      success: false,
      category: 'invalid_request',
      message: 'The request could not be processed. The transcript may be too long.',
      retryAfterMs: null,
    };
  }

  if (status === 408 || status === 504) {
    return {
      success: false,
      category: 'network',
      message: 'Unable to reach the summarization service. Check your connection.',
      retryAfterMs: null,
    };
  }

  console.error('[TranscriptSummarizer] API error', status);
  return {
    success: false,
    category: 'api_error',
    message: 'An unexpected error occurred. Please try again.',
    retryAfterMs: null,
  };
}
