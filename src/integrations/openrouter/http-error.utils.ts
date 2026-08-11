import type { SummarizationError } from '@/types/claude.types';

type Categorized = Pick<SummarizationError, 'category' | 'message'>;

/** Maps an HTTP-style status/error code to the response category and user-facing message shared by both a real non-2xx HTTP status and OpenRouter's embedded-error envelope. */
function categorizeCode(code: number): Categorized {
  if (code === 401 || code === 403) {
    return {
      category: 'authentication',
      message: 'API authentication failed. Contact your administrator.',
    };
  }

  if (code === 429) {
    return {
      category: 'rate_limit',
      message: 'Service is temporarily busy. Please try again shortly.',
    };
  }

  if (code === 400) {
    return {
      category: 'invalid_request',
      message: 'The request could not be processed. The transcript may be too long.',
    };
  }

  if (code === 408 || code === 504) {
    return {
      category: 'network',
      message:
        'The summarization service (AI provider) took too long to respond. Please try again.',
    };
  }

  return {
    category: 'api_error',
    message: 'An unexpected error occurred. Please try again.',
  };
}

export async function mapHttpError(response: Response): Promise<SummarizationError> {
  const { status } = response;

  if (status === 429) {
    const retryAfter = response.headers.get('retry-after');
    const seconds = retryAfter != null ? parseInt(retryAfter, 10) : NaN;
    const body = await response.text().catch(() => '<unreadable body>');
    console.error('[TranscriptSummarizer] Rate limited', { retryAfter, body });
    return {
      success: false,
      ...categorizeCode(status),
      retryAfterMs: isNaN(seconds) ? null : seconds * 1000,
    };
  }

  if (status !== 401 && status !== 403 && status !== 400 && status !== 408 && status !== 504) {
    console.error('[TranscriptSummarizer] API error', status);
  }

  return {
    success: false,
    ...categorizeCode(status),
    retryAfterMs: null,
  };
}

/**
 * Maps OpenRouter's embedded `{ error: { code, message } }` envelope — returned with an HTTP 200
 * status when the upstream provider itself fails (e.g. a timeout) — using the same category/message
 * mapping as a real HTTP error status, so callers handle both channels identically.
 */
export function mapProviderErrorEnvelope(code: number, message: string): SummarizationError {
  console.error('[TranscriptSummarizer] Provider-embedded error', { code, message });
  return {
    success: false,
    ...categorizeCode(code),
    retryAfterMs: null,
  };
}
