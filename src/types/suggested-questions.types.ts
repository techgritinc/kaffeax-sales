import type { ChatTokenUsage } from '@/types/chat.types';
import type { SummarizationErrorCategory } from '@/types/claude.types';
import type { AiProvider } from '@/types/transcript.types';

export const SUGGESTION_ONLY_ERROR_CATEGORIES = ['context_too_large', 'rejected_set'] as const;

export type SuggestionOnlyErrorCategory = (typeof SUGGESTION_ONLY_ERROR_CATEGORIES)[number];

export type SuggestionErrorCategory = SummarizationErrorCategory | SuggestionOnlyErrorCategory;

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

export interface SuggestedQuestionsResult {
  success: true;
  questions: string[];
  model: string;
  provider: AiProvider;
  usage: ChatTokenUsage;
}

export interface SuggestedQuestionsFailure {
  success: false;
  category: SuggestionErrorCategory;
  message: string;
  rule?: SuggestionValidationRule;
  attempts?: number;
  provider?: AiProvider;
  model?: string;
  usage?: ChatTokenUsage;
}

export type SuggestedQuestionsResponse = SuggestedQuestionsResult | SuggestedQuestionsFailure;
export type GenerationOutcome = 'not_attempted' | 'no_response' | 'rejected' | 'stored';
