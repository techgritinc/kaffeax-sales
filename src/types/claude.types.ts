import type { SimplifiedSignal } from '@/types/rubric-signal.types';
import type { TranscriptLeadScore, TranscriptSummary } from '@/types/transcript.types';

export type SummarizationErrorCategory =
  | 'authentication'
  | 'rate_limit'
  | 'invalid_request'
  | 'network'
  | 'api_error'
  // The AI call itself succeeded but the content wasn't valid/matching JSON — usually a
  // one-off generation glitch, and a good candidate for an automatic same-request retry.
  | 'malformed_response';

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
  meetingTitle: string;
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
