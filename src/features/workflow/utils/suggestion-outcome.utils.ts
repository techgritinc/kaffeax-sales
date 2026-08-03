import type {
  GenerationOutcome,
  SuggestedQuestionsFailure,
  SuggestedQuestionsResult,
} from '@/types/suggested-questions.types';


const LOG_PREFIX = '[transcript-ai.actions]';
const NOT_ATTEMPTED_CATEGORIES = new Set(['context_too_large']);
const REJECTED_CATEGORIES = new Set(['malformed_response', 'rejected_set']);

export function classifyFailure(category: string): GenerationOutcome {
  if (NOT_ATTEMPTED_CATEGORIES.has(category)) return 'not_attempted';
  if (REJECTED_CATEGORIES.has(category)) return 'rejected';
  return 'no_response';
}

export function logSuggestionFailure(
  transcriptId: string,
  result: SuggestedQuestionsFailure,
): void {
  console.warn(`${LOG_PREFIX} suggested questions unavailable`, {
    transcriptId,
    outcome: classifyFailure(result.category),
    category: result.category,
    rule: result.rule,
    attempts: result.attempts,
    provider: result.provider,
    model: result.model,
    inputTokens: result.usage?.inputTokens,
    outputTokens: result.usage?.outputTokens,
    totalCostUsd: result.usage?.totalCostUsd,
    detail: result.message,
  });
}

export function logSuggestionStored(
  transcriptId: string,
  result: SuggestedQuestionsResult,
  attempts?: number,
): void {
  console.info(`${LOG_PREFIX} suggested questions stored`, {
    transcriptId,
    outcome: 'stored' satisfies GenerationOutcome,
    provider: result.provider,
    model: result.model,
    attempts,
    count: result.questions.length,
    lengths: result.questions.map((question) => question.length),
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    totalCostUsd: result.usage.totalCostUsd,
  });
}

export function logSuggestionUnstorable(transcriptId: string, reason: string): void {
  console.warn(`${LOG_PREFIX} suggestions could not be stored`, {
    transcriptId,
    outcome: 'no_response' satisfies GenerationOutcome,
    reason,
  });
}
