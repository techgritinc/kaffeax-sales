import { MAX_SUGGESTION_CHARS, SUGGESTED_QUESTION_COUNT } from '@/constants/suggested-questions';
import { normaliseForMatch } from '@/lib/utils/grounding.utils';
import { repairJson } from '@/lib/utils/json-repair.utils';
import { SuggestedQuestionsSchema } from '@/schemas/suggested-questions.schema';
import type {
  SuggestionSetOutcome,
  SuggestionValidationRule,
} from '@/types/suggested-questions.types';

const malformed = (rule: Extract<SuggestionValidationRule, 'V1' | 'V2'>): SuggestionSetOutcome => ({
  ok: false,
  category: 'malformed_response',
  rule,
});

const rejected = (
  rule: Extract<SuggestionValidationRule, 'V3' | 'V4' | 'V5'>,
): SuggestionSetOutcome => ({ ok: false, category: 'rejected_set', rule });

/** Distinctness under the same normalisation the evidence check uses: whitespace, case, trim. */
function hasDuplicates(questions: string[]): boolean {
  const seen = new Set(questions.map(normaliseForMatch));
  return seen.size !== questions.length;
}

export function validateSuggestionSet(rawText: string): SuggestionSetOutcome {
  const cleanedText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedText);
  } catch {
    try {
      parsed = JSON.parse(repairJson(cleanedText));
    } catch {
      return malformed('V1');
    }
  }

  const validation = SuggestedQuestionsSchema.safeParse(parsed);
  if (!validation.success) {
    return malformed('V2');
  }

  const questions = validation.data.questions
    .map((question) => question.trim())
    .filter((question) => question.length > 0);

  if (questions.length !== SUGGESTED_QUESTION_COUNT) {
    return rejected('V3');
  }

  if (questions.some((question) => question.length > MAX_SUGGESTION_CHARS)) {
    return rejected('V4');
  }

  if (hasDuplicates(questions)) {
    return rejected('V5');
  }

  return { ok: true, questions };
}
