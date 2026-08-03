import { computeOpenRouterCost } from '@/lib/utils/ai-cost.utils';
import type { ChatTokenUsage } from '@/types/chat.types';

export const toSuggestionUsage = (
  model: string,
  inputTokens: number,
  outputTokens: number,
  cost: number | undefined,
): ChatTokenUsage => ({
  inputTokens,
  outputTokens,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  ...computeOpenRouterCost(model, inputTokens, outputTokens, cost),
});
