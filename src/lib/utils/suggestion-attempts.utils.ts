import { SUGGESTION_RETRY_NOTES, SUGGESTION_RETRY_PREFIX } from '@/constants/suggested-questions';
import type { ChatTokenUsage } from '@/types/chat.types';
import type { SuggestionValidationRule } from '@/types/suggested-questions.types';

const ZERO_USAGE: ChatTokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  inputCostUsd: 0,
  outputCostUsd: 0,
  cacheCreationCostUsd: 0,
  cacheReadCostUsd: 0,
  totalCostUsd: 0,
};

export const emptyUsage = (): ChatTokenUsage => ({ ...ZERO_USAGE });

export function buildCorrectiveNote(baseUserTurn: string, rule: SuggestionValidationRule): string {
  return `${baseUserTurn}\n\n## Retry\n\n${SUGGESTION_RETRY_PREFIX} ${SUGGESTION_RETRY_NOTES[rule]}`;
}

export function accumulateUsage(running: ChatTokenUsage, next: ChatTokenUsage): ChatTokenUsage {
  return {
    inputTokens: running.inputTokens + next.inputTokens,
    outputTokens: running.outputTokens + next.outputTokens,
    cacheCreationTokens: running.cacheCreationTokens + next.cacheCreationTokens,
    cacheReadTokens: running.cacheReadTokens + next.cacheReadTokens,
    inputCostUsd: running.inputCostUsd + next.inputCostUsd,
    outputCostUsd: running.outputCostUsd + next.outputCostUsd,
    cacheCreationCostUsd: running.cacheCreationCostUsd + next.cacheCreationCostUsd,
    cacheReadCostUsd: running.cacheReadCostUsd + next.cacheReadCostUsd,
    totalCostUsd: running.totalCostUsd + next.totalCostUsd,
  };
}

export function spendFields(
  attempt: number,
  usage: ChatTokenUsage,
): { attempts: number; usage?: ChatTokenUsage } {
  const spent = usage.inputTokens > 0 || usage.outputTokens > 0;
  return spent ? { attempts: attempt, usage } : { attempts: attempt };
}
