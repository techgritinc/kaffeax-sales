import type { SummarizationError } from '@/types/claude.types';

import {
  APIConnectionError,
  APIError,
  AuthenticationError,
  BadRequestError,
  RateLimitError,
} from './client';

/** Always an error — narrowed from `SummarizationResponse` so callers needn't re-narrow. */
export function handleSdkError(error: unknown): SummarizationError {
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
