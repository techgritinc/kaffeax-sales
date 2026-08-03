import { env } from '@env';

import { CHAT_MAX_TOKENS, MAX_CHAT_ATTEMPTS } from '@/constants/grounded-chat';
import { computeOpenRouterCost } from '@/lib/utils/ai-cost.utils';
import { buildGroundedChatPrompt } from '@/lib/utils/grounded-chat-prompt.utils';
import { processChatResponse } from '@/lib/utils/grounded-chat-response.utils';
import type { GroundingContext, MeetingChatResponse } from '@/types/chat.types';

import { chatCompletion } from './client';
import { mapHttpError } from './http-error.utils';
import { openRouterResponseSchema } from './openrouter-response.schema';

const API_ERROR: MeetingChatResponse = {
  success: false,
  category: 'api_error',
  message: 'An unexpected error occurred. Please try again.',
  retryAfterMs: null,
};

export class MeetingChat {
  async ask(context: GroundingContext, question: string): Promise<MeetingChatResponse> {
    const { guardrail, grounding } = buildGroundedChatPrompt(context);
    // OpenRouter has no prompt-cache breakpoint, so the two blocks are joined.
    const system = `${guardrail}\n\n${grounding}`;
    let lastFailure: MeetingChatResponse | null = null;

    for (let attempt = 1; attempt <= MAX_CHAT_ATTEMPTS; attempt++) {
      try {
        const response = await chatCompletion({
          model: env.OPENROUTER_DEFAULT_MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: question },
          ],
          max_tokens: CHAT_MAX_TOKENS,
          temperature: 0,
          response_format: { type: 'json_object' },
        });

        if (!response.ok) {
          return await mapHttpError(response);
        }

        const json: unknown = await response.json();
        const parsed = openRouterResponseSchema.safeParse(json);
        if (!parsed.success) {
          console.error('[meeting-chat] malformed API response', parsed.error.message);
          return API_ERROR;
        }

        const firstChoice = parsed.data.choices[0];
        if (firstChoice === undefined) {
          console.error('[meeting-chat] empty choices array in response');
          return API_ERROR;
        }

        const processed = processChatResponse(firstChoice.message.content, context);
        if (processed.success) {
          const inputTokens = parsed.data.usage.prompt_tokens;
          const outputTokens = parsed.data.usage.completion_tokens;
          return {
            ...processed,
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

        lastFailure = processed;
        if (processed.category !== 'malformed_response' || attempt === MAX_CHAT_ATTEMPTS) {
          return processed;
        }
        console.warn(
          `[meeting-chat] unusable answer, retrying (attempt ${attempt + 1}/${MAX_CHAT_ATTEMPTS})`,
          { transcriptId: context.transcriptId },
        );
      } catch (error) {
        if (error instanceof TypeError) {
          console.error('[meeting-chat] network error', error.message);
          return {
            success: false,
            category: 'network',
            message: 'Unable to reach the assistant. Check your connection.',
            retryAfterMs: null,
          };
        }
        console.error(
          '[meeting-chat] unexpected error',
          error instanceof Error ? error.message : 'Unknown error',
        );
        return API_ERROR;
      }
    }

    return lastFailure ?? API_ERROR;
  }
}
