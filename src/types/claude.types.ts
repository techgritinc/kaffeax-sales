import type { SimplifiedSignal } from '@/types/rubric-signal.types';
import type { TranscriptLeadScore, TranscriptSummary } from '@/types/transcript.types';

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

export interface StructuredSummarizationResult {
  success: true;
  summary: TranscriptSummary;
  leadScore: TranscriptLeadScore;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export type SummarizationResponse =
  SummarizationResult | StructuredSummarizationResult | SummarizationError;

export interface SummarizationOptions {
  model?: string;
  maxTokens?: number;
  signals?: SimplifiedSignal[];
}
