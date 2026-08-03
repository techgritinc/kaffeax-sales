import { env } from '@env';

import { SuggestedQuestions as ClaudeSuggestedQuestions } from '@/integrations/claude/suggested-questions';
import { SuggestedQuestions as OpenRouterSuggestedQuestions } from '@/integrations/openrouter/suggested-questions';
import type { GroundingContext } from '@/types/chat.types';
import type { SuggestedQuestionsResponse } from '@/types/suggested-questions.types';

/** Structural contract both provider integrations satisfy. */
export interface SuggestedQuestionsLike {
  generate(context: GroundingContext): Promise<SuggestedQuestionsResponse>;
}

/** Picks the AI provider by environment: OpenRouter in development, Claude in production. */
export function getSuggestedQuestions(): SuggestedQuestionsLike {
  return env.NEXT_PUBLIC_APP_ENV === 'development'
    ? new OpenRouterSuggestedQuestions()
    : new ClaudeSuggestedQuestions();
}
