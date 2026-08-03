import type { SummarizationErrorCategory } from '@/types/claude.types';
import type {
  AiProvider,
  AiUsage,
  TranscriptLeadScore,
  TranscriptSummary,
} from '@/types/transcript.types';

export const CHAT_ONLY_ERROR_CATEGORIES = ['no_analysis', 'context_too_large'] as const;

export type ChatOnlyErrorCategory = (typeof CHAT_ONLY_ERROR_CATEGORIES)[number];

export type ChatErrorCategory = SummarizationErrorCategory | ChatOnlyErrorCategory;
export interface GroundingContext {
  transcriptId: string;
  meetingTitle: string;
  cleanedTranscript: string;
  summary: TranscriptSummary;
  leadScore: TranscriptLeadScore;
}

/** Both render identically today; stored separately for evaluation and filtering. */
export const CHAT_EXCHANGE_KINDS = ['answer', 'refusal'] as const;

export type ChatExchangeKind = (typeof CHAT_EXCHANGE_KINDS)[number];
export interface ChatExchangeFields {
  transcriptId: string;
  question: string;
  answer: string;
  kind: ChatExchangeKind;
  usage: AiUsage;
}
export interface StoredChatExchange {
  id: string;
  fields: ChatExchangeFields;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatTokenUsage = Omit<AiUsage, 'model' | 'provider'>;
export interface ProcessedChatAnswer {
  success: true;
  kind: 'answer';
  answer: string;
  evidenceSpans: string[];
  coveredInMeeting: boolean;
  unanswerablePart: string | null;
}
export interface ProcessedChatRefusal {
  success: true;
  kind: 'refusal';
  answer: string;
}

export interface ChatFailure {
  success: false;
  category: ChatErrorCategory;
  message: string;
  retryAfterMs: number | null;
}

export type ProcessedChatResponse = ProcessedChatAnswer | ProcessedChatRefusal | ChatFailure;
export interface ChatResponseMeta {
  model: string;
  provider: AiProvider;
  usage: ChatTokenUsage;
}

export type ChatAnswerResult = ProcessedChatAnswer & ChatResponseMeta;
export type ChatRefusalResult = ProcessedChatRefusal & ChatResponseMeta;

export type MeetingChatResponse = ChatAnswerResult | ChatRefusalResult | ChatFailure;
