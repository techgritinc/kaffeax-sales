import type { ChatTokenUsage } from '@/types/chat.types';
import type { SummarizationErrorCategory } from '@/types/claude.types';
import type { AiProvider } from '@/types/transcript.types';

// ─── Error categories ─────────────────────────────────────────────────────────

/** Failure categories only the suggestion path can produce. */
export const SUGGESTION_ONLY_ERROR_CATEGORIES = ['context_too_large', 'rejected_set'] as const;

export type SuggestionOnlyErrorCategory = (typeof SUGGESTION_ONLY_ERROR_CATEGORIES)[number];

export type SuggestionErrorCategory = SummarizationErrorCategory | SuggestionOnlyErrorCategory;

// ─── Set validation ───────────────────────────────────────────────────────────

/**
 * The rules a candidate set must clear, in application order:
 * V1 parseable JSON · V2 matches the schema · V3 exactly three after trimming ·
 * V4 every entry within the character budget · V5 no duplicates.
 *
 * Carried on the outcome as a code rather than a message because the log line
 * may not contain the offending text (FR-026), and the code is what tells a
 * tuning round whether the character budget or the diversity rule is losing.
 */
export const SUGGESTION_VALIDATION_RULES = ['V1', 'V2', 'V3', 'V4', 'V5'] as const;

export type SuggestionValidationRule = (typeof SUGGESTION_VALIDATION_RULES)[number];

/** Whole-set outcome: three questions or none, never a partial set (FR-014). */
export type SuggestionSetOutcome =
  | { ok: true; questions: string[] }
  | {
      ok: false;
      category: Extract<SuggestionErrorCategory, 'malformed_response' | 'rejected_set'>;
      rule: SuggestionValidationRule;
    };

// ─── Provider response ────────────────────────────────────────────────────────

/** A validated set. `questions` always has exactly SUGGESTED_QUESTION_COUNT entries. */
export interface SuggestedQuestionsResult {
  success: true;
  questions: string[];
  model: string;
  provider: AiProvider;
  usage: ChatTokenUsage;
}

/**
 * `message` is for logs only. No suggestion failure is ever shown to a user —
 * the sole user-visible consequence is the absence of the chip row (FR-023) —
 * so this must never carry question, transcript, or analysis text.
 */
export interface SuggestedQuestionsFailure {
  success: false;
  category: SuggestionErrorCategory;
  message: string;
}

export type SuggestedQuestionsResponse = SuggestedQuestionsResult | SuggestedQuestionsFailure;
