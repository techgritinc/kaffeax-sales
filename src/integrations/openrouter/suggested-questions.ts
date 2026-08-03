import { env } from '@env';

import { MAX_GROUNDING_CHARS } from '@/constants/grounded-chat';
import {
  MAX_SUGGESTION_ATTEMPTS,
  SUGGESTION_MAX_TOKENS,
  SUGGESTION_RETRY_TEMPERATURE,
} from '@/constants/suggested-questions';
import { groundingSize } from '@/lib/utils/grounding.utils';
import { buildSuggestedQuestionsPrompt } from '@/lib/utils/suggested-questions-prompt.utils';
import { validateSuggestionSet } from '@/lib/utils/suggested-questions.utils';
import {
  accumulateUsage,
  buildCorrectiveNote,
  emptyUsage,
  spendFields,
} from '@/lib/utils/suggestion-attempts.utils';
import type { ChatTokenUsage, GroundingContext } from '@/types/chat.types';
import type {
  SuggestedQuestionsFailure,
  SuggestedQuestionsResponse,
  SuggestionValidationRule,
} from '@/types/suggested-questions.types';

import { chatCompletion } from './client';
import { mapHttpError } from './http-error.utils';
import { openRouterResponseSchema } from './openrouter-response.schema';
import { toSuggestionUsage } from './suggestion-usage.utils';

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
    let lastRule: SuggestionValidationRule | null = null;
    let lastFailure: SuggestedQuestionsFailure | null = null;
    let usage: ChatTokenUsage = emptyUsage();

    for (let attempt = 1; attempt <= MAX_SUGGESTION_ATTEMPTS; attempt++) {
      try {
        const userTurn = lastRule === null ? user : buildCorrectiveNote(user, lastRule);
        const response = await chatCompletion({
          model: env.OPENROUTER_DEFAULT_MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userTurn },
          ],
          max_tokens: SUGGESTION_MAX_TOKENS,
          temperature: lastRule === null ? 0 : SUGGESTION_RETRY_TEMPERATURE,
          response_format: { type: 'json_object' },
        });

        if (!response.ok) {
          const failure = await mapHttpError(response);
          return {
            success: false,
            category: failure.category,
            message: failure.message,
            ...spendFields(attempt, usage),
          };
        }

        const json: unknown = await response.json();
        const parsed = openRouterResponseSchema.safeParse(json);
        const firstChoice = parsed.success ? parsed.data.choices[0] : undefined;
        if (!parsed.success || firstChoice === undefined) {
          const detail = parsed.success
            ? 'empty choices array'
            : parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
          console.error('[suggested-questions] unusable API response', { detail });
          return { ...API_ERROR, ...spendFields(attempt, usage) };
        }

        usage = accumulateUsage(
          usage,
          toSuggestionUsage(
            parsed.data.model,
            parsed.data.usage.prompt_tokens,
            parsed.data.usage.completion_tokens,
            parsed.data.usage.cost,
          ),
        );

        const outcome = validateSuggestionSet(firstChoice.message.content);
        if (outcome.ok) {
          return {
            success: true,
            questions: outcome.questions,
            model: parsed.data.model,
            provider: 'openrouter',
            usage,
          };
        }

        lastRule = outcome.rule;
        lastFailure = {
          success: false,
          category: outcome.category,
          message: `Suggestion set failed validation at ${outcome.rule}.`,
          rule: outcome.rule,
          provider: 'openrouter',
          model: parsed.data.model,
          ...spendFields(attempt, usage),
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
            ...spendFields(attempt, usage),
          };
        }
        console.error(
          '[suggested-questions] unexpected error',
          error instanceof Error ? error.message : 'Unknown error',
        );
        return { ...API_ERROR, ...spendFields(attempt, usage) };
      }
    }

    return lastFailure ?? API_ERROR;
  }
}
