import { env } from '@env';

import { MAX_GROUNDING_CHARS } from '@/constants/grounded-chat';
import { MAX_SUGGESTION_ATTEMPTS, SUGGESTION_MAX_TOKENS } from '@/constants/suggested-questions';
import { computeOpenRouterCost } from '@/lib/utils/ai-cost.utils';
import { groundingSize } from '@/lib/utils/grounding.utils';
import { buildSuggestedQuestionsPrompt } from '@/lib/utils/suggested-questions-prompt.utils';
import { validateSuggestionSet } from '@/lib/utils/suggested-questions.utils';
import type { GroundingContext } from '@/types/chat.types';
import type {
  SuggestedQuestionsFailure,
  SuggestedQuestionsResponse,
} from '@/types/suggested-questions.types';

import { chatCompletion } from './client';
import { mapHttpError } from './http-error.utils';
import { openRouterResponseSchema } from './openrouter-response.schema';

/** Messages here are log-only — no suggestion failure reaches a user (FR-023). */
const API_ERROR: SuggestedQuestionsFailure = {
  success: false,
  category: 'api_error',
  message: 'Unexpected error while generating suggested questions.',
};

export class SuggestedQuestions {
  async generate(context: GroundingContext): Promise<SuggestedQuestionsResponse> {
    if (groundingSize(context) > MAX_GROUNDING_CHARS) {
      return {
        success: false,
        category: 'context_too_large',
        message: 'Grounding material exceeds the size ceiling; skipping suggestions.',
      };
    }

    const { system, user } = buildSuggestedQuestionsPrompt(context);
    let lastFailure: SuggestedQuestionsFailure | null = null;

    for (let attempt = 1; attempt <= MAX_SUGGESTION_ATTEMPTS; attempt++) {
      try {
        const response = await chatCompletion({
          model: env.OPENROUTER_DEFAULT_MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          max_tokens: SUGGESTION_MAX_TOKENS,
          // Variety comes from the input, not from sampling: a different meeting
          // yields different questions, and determinism keeps re-analysis of the
          // same meeting comparable across evaluation runs.
          temperature: 0,
          response_format: { type: 'json_object' },
        });

        if (!response.ok) {
          const failure = await mapHttpError(response);
          return { success: false, category: failure.category, message: failure.message };
        }

        const json: unknown = await response.json();
        const parsed = openRouterResponseSchema.safeParse(json);
        if (!parsed.success) {
          console.error('[suggested-questions] malformed API response', parsed.error.message);
          return API_ERROR;
        }

        const firstChoice = parsed.data.choices[0];
        if (firstChoice === undefined) {
          console.error('[suggested-questions] empty choices array in response');
          return API_ERROR;
        }

        const outcome = validateSuggestionSet(firstChoice.message.content);
        if (outcome.ok) {
          const inputTokens = parsed.data.usage.prompt_tokens;
          const outputTokens = parsed.data.usage.completion_tokens;
          return {
            success: true,
            questions: outcome.questions,
            model: parsed.data.model,
            provider: 'openrouter',
            usage: {
              inputTokens,
              outputTokens,
              cacheCreationTokens: 0,
              cacheReadTokens: 0,
              ...computeOpenRouterCost(
                parsed.data.model,
                inputTokens,
                outputTokens,
                parsed.data.usage.cost,
              ),
            },
          };
        }

        lastFailure = {
          success: false,
          category: outcome.category,
          message: `Suggestion set failed validation at ${outcome.rule}.`,
        };
        if (attempt === MAX_SUGGESTION_ATTEMPTS) return lastFailure;
        console.warn(
          `[suggested-questions] unusable set, retrying (attempt ${attempt + 1}/${MAX_SUGGESTION_ATTEMPTS})`,
          { transcriptId: context.transcriptId, rule: outcome.rule },
        );
      } catch (error) {
        if (error instanceof TypeError) {
          console.error('[suggested-questions] network error', error.message);
          return {
            success: false,
            category: 'network',
            message: 'Unable to reach the suggestion service.',
          };
        }
        console.error(
          '[suggested-questions] unexpected error',
          error instanceof Error ? error.message : 'Unknown error',
        );
        return API_ERROR;
      }
    }

    return lastFailure ?? API_ERROR;
  }
}
