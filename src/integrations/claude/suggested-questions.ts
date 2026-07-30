import { env } from '@env';

import { MAX_GROUNDING_CHARS } from '@/constants/grounded-chat';
import {
  MAX_SUGGESTION_ATTEMPTS,
  SUGGESTION_EFFORT,
  SUGGESTION_MAX_TOKENS,
} from '@/constants/suggested-questions';
import { computeAnthropicCost } from '@/lib/utils/ai-cost.utils';
import { groundingSize } from '@/lib/utils/grounding.utils';
import { buildSuggestedQuestionsPrompt } from '@/lib/utils/suggested-questions-prompt.utils';
import { validateSuggestionSet } from '@/lib/utils/suggested-questions.utils';
import type { GroundingContext } from '@/types/chat.types';
import type {
  SuggestedQuestionsFailure,
  SuggestedQuestionsResponse,
} from '@/types/suggested-questions.types';

import client from './client';
import { handleSdkError } from './sdk-error.utils';

/** Messages here are log-only — no suggestion failure reaches a user (FR-023). */
const API_ERROR: SuggestedQuestionsFailure = {
  success: false,
  category: 'api_error',
  message: 'Unexpected error while generating suggested questions.',
};

export class SuggestedQuestions {
  async generate(context: GroundingContext): Promise<SuggestedQuestionsResponse> {
    // Checked before the call, not after a truncation: suggestions drawn from a
    // partially-read transcript would look identical to good ones.
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
        // No cache_control: a meeting gets exactly one suggestion call, so a
        // cache write here would cost 1.25x and never be read.
        const response = await client.messages.create({
          model: env.CLAUDE_DEFAULT_MODEL,
          max_tokens: SUGGESTION_MAX_TOKENS,
          thinking: { type: 'adaptive' },
          output_config: { effort: SUGGESTION_EFFORT },
          system,
          messages: [{ role: 'user', content: user }],
        });

        const rawText = response.content.reduce<string>(
          (acc, block) => (block.type === 'text' ? acc + block.text : acc),
          '',
        );

        const outcome = validateSuggestionSet(rawText);
        if (outcome.ok) {
          const inputTokens = response.usage.input_tokens;
          const outputTokens = response.usage.output_tokens;
          const cacheCreationTokens = response.usage.cache_creation_input_tokens ?? 0;
          const cacheReadTokens = response.usage.cache_read_input_tokens ?? 0;
          return {
            success: true,
            questions: outcome.questions,
            model: response.model,
            provider: 'anthropic',
            usage: {
              inputTokens,
              outputTokens,
              cacheCreationTokens,
              cacheReadTokens,
              ...computeAnthropicCost(
                response.model,
                inputTokens,
                outputTokens,
                cacheCreationTokens,
                cacheReadTokens,
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
        const failure = handleSdkError(error);
        return { success: false, category: failure.category, message: failure.message };
      }
    }

    return lastFailure ?? API_ERROR;
  }
}
