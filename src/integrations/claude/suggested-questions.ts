import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

// import { env } from '@env';

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
import {
  accumulateUsage,
  buildCorrectiveNote,
  emptyUsage,
  spendFields,
} from '@/lib/utils/suggestion-attempts.utils';
import { SuggestedQuestionsSchema } from '@/schemas/suggested-questions.schema';
import type { ChatTokenUsage, GroundingContext } from '@/types/chat.types';
import type {
  SuggestedQuestionsFailure,
  SuggestedQuestionsResponse,
  SuggestionValidationRule,
} from '@/types/suggested-questions.types';

import client from './client';
import { resolveModelCapabilities } from './model-capabilities';
import { handleSdkError } from './sdk-error.utils';

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
    // const capabilities = resolveModelCapabilities(env.CLAUDE_DEFAULT_MODEL);
    const capabilities = resolveModelCapabilities('claude-haiku-4.5');
    let lastRule: SuggestionValidationRule | null = null;
    let lastFailure: SuggestedQuestionsFailure | null = null;
    let usage: ChatTokenUsage = emptyUsage();

    for (let attempt = 1; attempt <= MAX_SUGGESTION_ATTEMPTS; attempt++) {
      try {
        const userTurn = lastRule === null ? user : buildCorrectiveNote(user, lastRule);
        const response = await client.messages.create({
          // model: env.CLAUDE_DEFAULT_MODEL,
          model: 'claude-haiku-4.5',
          max_tokens: SUGGESTION_MAX_TOKENS,
          ...(capabilities.supportsAdaptiveThinking
            ? { thinking: { type: 'adaptive' as const } }
            : {}),
          output_config: {
            format: zodOutputFormat(SuggestedQuestionsSchema),
            ...(capabilities.supportsEffort ? { effort: SUGGESTION_EFFORT } : {}),
          },
          system,
          messages: [{ role: 'user', content: userTurn }],
        });

        const rawText = response.content.reduce<string>(
          (acc, block) => (block.type === 'text' ? acc + block.text : acc),
          '',
        );

        // Every attempt's spend counts, not just the winning one (FR-025).
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;
        const cacheCreationTokens = response.usage.cache_creation_input_tokens ?? 0;
        const cacheReadTokens = response.usage.cache_read_input_tokens ?? 0;
        usage = accumulateUsage(usage, {
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
        });

        const outcome = validateSuggestionSet(rawText);
        if (outcome.ok) {
          return {
            success: true,
            questions: outcome.questions,
            model: response.model,
            provider: 'anthropic',
            usage,
          };
        }

        lastRule = outcome.rule;
        lastFailure = {
          success: false,
          category: outcome.category,
          message: `Suggestion set failed validation at ${outcome.rule}.`,
          rule: outcome.rule,
          provider: 'anthropic',
          model: response.model,
          ...spendFields(attempt, usage),
        };
        if (attempt === MAX_SUGGESTION_ATTEMPTS) return lastFailure;
        console.warn(
          `[suggested-questions] unusable set, retrying (attempt ${attempt + 1}/${MAX_SUGGESTION_ATTEMPTS})`,
          { transcriptId: context.transcriptId, rule: outcome.rule },
        );
      } catch (error) {
        const failure = handleSdkError(error);
        return {
          success: false,
          category: failure.category,
          message: failure.message,
          ...spendFields(attempt, usage),
        };
      }
    }

    return lastFailure ?? API_ERROR;
  }
}
