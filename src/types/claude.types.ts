export type SummarizationErrorCategory =
  'authentication' | 'rate_limit' | 'invalid_request' | 'network' | 'api_error';

export interface SummarizationError {
  success: false;
  category: SummarizationErrorCategory;
  message: string;
  retryAfterMs: number | null;
}

export interface SummarizationResult {
  success: true;
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export type SummarizationResponse = SummarizationResult | SummarizationError;

export interface SummarizationOptions {
  model?: string;
  maxTokens?: number;
}
