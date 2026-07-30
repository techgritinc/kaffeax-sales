import type { SummarizationErrorCategory } from '@/types/claude.types';
import type {
  AiProvider,
  AiUsage,
  TranscriptLeadScore,
  TranscriptSummary,
} from '@/types/transcript.types';

// ─── Error categories ─────────────────────────────────────────────────────────

/** Failure categories that only the meeting-chat path can produce. */
export const CHAT_ONLY_ERROR_CATEGORIES = ['no_analysis', 'context_too_large'] as const;

export type ChatOnlyErrorCategory = (typeof CHAT_ONLY_ERROR_CATEGORIES)[number];

/** Every failure category an assistant answer can end in. */
export type ChatErrorCategory = SummarizationErrorCategory | ChatOnlyErrorCategory;

// ─── Grounding ────────────────────────────────────────────────────────────────

/**
 * The complete and only permitted grounding material for one answer.
 *
 * There is deliberately no conversation field: FR-031 requires that stored
 * exchanges never influence an answer, and the strongest guarantee is for this
 * type to have nowhere to put them.
 */
export interface GroundingContext {
  /** Used for logging and cost attribution only — never placed in the prompt. */
  transcriptId: string;
  meetingTitle: string;
  cleanedTranscript: string;
  summary: TranscriptSummary;
  leadScore: TranscriptLeadScore;
}

// ─── Persisted exchange ───────────────────────────────────────────────────────

/** Both render identically today; stored separately for evaluation and filtering. */
export const CHAT_EXCHANGE_KINDS = ['answer', 'refusal'] as const;

export type ChatExchangeKind = (typeof CHAT_EXCHANGE_KINDS)[number];

/**
 * One completed question-and-answer pair. Operational failures are shown live
 * and never stored, so every persisted exchange has a real response.
 */
export interface ChatExchangeFields {
  transcriptId: string;
  question: string;
  answer: string;
  kind: ChatExchangeKind;
  usage: AiUsage;
}

/** A persisted exchange as read back from the store, keyed by id. */
export interface StoredChatExchange {
  id: string;
  fields: ChatExchangeFields;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Provider response ────────────────────────────────────────────────────────

/** Token counts and costs for one answer, without the model/provider labels. */
export type ChatTokenUsage = Omit<AiUsage, 'model' | 'provider'>;

/** A grounded answer whose every evidence span was verified against the source. */
export interface ProcessedChatAnswer {
  success: true;
  kind: 'answer';
  answer: string;
  evidenceSpans: string[];
  coveredInMeeting: boolean;
  unanswerablePart: string | null;
}

/** An out-of-scope refusal. A successful outcome, not an error (FR-009). */
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

/**
 * What response processing yields. Provider wrappers attach the model, provider,
 * and usage afterwards — the processor itself is transport-agnostic.
 */
export type ProcessedChatResponse = ProcessedChatAnswer | ProcessedChatRefusal | ChatFailure;

/** The labels a provider attaches to a processed success. */
export interface ChatResponseMeta {
  model: string;
  provider: AiProvider;
  usage: ChatTokenUsage;
}

export type ChatAnswerResult = ProcessedChatAnswer & ChatResponseMeta;
export type ChatRefusalResult = ProcessedChatRefusal & ChatResponseMeta;

export type MeetingChatResponse = ChatAnswerResult | ChatRefusalResult | ChatFailure;
