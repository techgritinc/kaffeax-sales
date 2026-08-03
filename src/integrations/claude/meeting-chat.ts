import { env } from '@env';

import { CHAT_EFFORT, CHAT_MAX_TOKENS, MAX_CHAT_ATTEMPTS } from '@/constants/grounded-chat';
import { computeAnthropicCost } from '@/lib/utils/ai-cost.utils';
import { buildGroundedChatPrompt } from '@/lib/utils/grounded-chat-prompt.utils';
import { processChatResponse } from '@/lib/utils/grounded-chat-response.utils';
import type { GroundingContext, MeetingChatResponse } from '@/types/chat.types';

import client from './client';
import { handleSdkError } from './sdk-error.utils';

export class MeetingChat {
  async ask(context: GroundingContext, question: string): Promise<MeetingChatResponse> {
    const { guardrail, grounding } = buildGroundedChatPrompt(context);
    let lastFailure: MeetingChatResponse | null = null;

    for (let attempt = 1; attempt <= MAX_CHAT_ATTEMPTS; attempt++) {
      try {
        const response = await client.messages.create({
          model: env.CLAUDE_DEFAULT_MODEL,
          max_tokens: CHAT_MAX_TOKENS,
          thinking: { type: 'adaptive' },
          output_config: { effort: CHAT_EFFORT },
          system: [
            { type: 'text', text: guardrail },
            { type: 'text', text: grounding, cache_control: { type: 'ephemeral' } },
          ],
          messages: [{ role: 'user', content: question }],
        });

        const rawText = response.content.reduce<string>(
          (acc, block) => (block.type === 'text' ? acc + block.text : acc),
          '',
        );

        const processed = processChatResponse(rawText, context);
        if (processed.success) {
          const inputTokens = response.usage.input_tokens;
          const outputTokens = response.usage.output_tokens;
          const cacheCreationTokens = response.usage.cache_creation_input_tokens ?? 0;
          const cacheReadTokens = response.usage.cache_read_input_tokens ?? 0;
          return {
            ...processed,
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

        lastFailure = processed;
        if (processed.category !== 'malformed_response' || attempt === MAX_CHAT_ATTEMPTS) {
          return processed;
        }
        console.warn(
          `[meeting-chat] unusable answer, retrying (attempt ${attempt + 1}/${MAX_CHAT_ATTEMPTS})`,
          { transcriptId: context.transcriptId },
        );
      } catch (error) {
        return handleSdkError(error);
      }
    }

    return (
      lastFailure ?? {
        success: false,
        category: 'api_error',
        message: 'An unexpected error occurred. Please try again.',
        retryAfterMs: null,
      }
    );
  }
}
