import type { SummarizationError } from '@/types/claude.types';

export async function mapHttpError(response: Response): Promise<SummarizationError> {
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
    const body = await response.text().catch(() => '<unreadable body>');
    console.error('[TranscriptSummarizer] Rate limited', { retryAfter, body });
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
