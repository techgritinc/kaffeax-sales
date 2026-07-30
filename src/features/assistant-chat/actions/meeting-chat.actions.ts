'use server';

import { CHAT_ERROR_MESSAGES, MAX_GROUNDING_CHARS } from '@/constants/grounded-chat';
import { getMeetingChat } from '@/integrations/meeting-chat.factory';
import { buildGroundingContext, groundingSize } from '@/lib/utils/grounding.utils';
import { logAndThrow } from '@/lib/utils/server-action.utils';
import { chatExchangeRepository } from '@/repositories/chat-exchange.repository';
import { transcriptRepository } from '@/repositories/transcript.repository';
import { chatQuestionSchema, transcriptIdSchema } from '@/schemas/chat.schema';
import type {
  ChatAnswerResult,
  ChatErrorCategory,
  ChatRefusalResult,
  MeetingChatResponse,
  StoredChatExchange,
} from '@/types/chat.types';

import { CHAT_LOAD_ERROR } from '../constants/action.constants';

const meetingChat = getMeetingChat();

function failure(category: ChatErrorCategory): MeetingChatResponse {
  return {
    success: false,
    category,
    message: CHAT_ERROR_MESSAGES[category],
    retryAfterMs: null,
  };
}

/**
 * Answer one question about one meeting.
 *
 * There is deliberately no history parameter. FR-031 requires that stored
 * exchanges never influence an answer, and a signature with nowhere to put
 * history makes that structurally true rather than a rule to remember.
 */
export async function askAboutMeeting(input: {
  transcriptId: string;
  question: string;
}): Promise<MeetingChatResponse> {
  const startedAt = Date.now();
  let transcriptId = '';

  try {
    const parsed = chatQuestionSchema.safeParse(input);
    if (!parsed.success) {
      return failure('invalid_request');
    }
    transcriptId = parsed.data.transcriptId;

    const stored = await transcriptRepository.findById(transcriptId);
    if (!stored) {
      console.warn('[meeting-chat] question asked against a missing transcript', { transcriptId });
      return failure('invalid_request');
    }

    // Cheap rejections before any AI call.
    if (stored.fields.aiProcessingStatus !== 'success' || !stored.fields.cleanedTranscript.trim()) {
      return failure('no_analysis');
    }

    const context = buildGroundingContext(stored);
    if (groundingSize(context) > MAX_GROUNDING_CHARS) {
      console.warn('[meeting-chat] grounding material exceeds the ceiling', {
        transcriptId,
        groundingChars: groundingSize(context),
        ceiling: MAX_GROUNDING_CHARS,
      });
      return failure('context_too_large');
    }

    const result = await meetingChat.ask(context, parsed.data.question);

    // Never log question or answer text, evidence spans, or transcript content.
    if (result.success) {
      console.info('[meeting-chat] answered', {
        transcriptId,
        kind: result.kind,
        model: result.model,
        provider: result.provider,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cacheReadTokens: result.usage.cacheReadTokens,
        totalCostUsd: result.usage.totalCostUsd,
        verifiedSpans: result.kind === 'answer' ? result.evidenceSpans.length : 0,
        durationMs: Date.now() - startedAt,
      });
    } else {
      console.warn('[meeting-chat] failed', {
        transcriptId,
        category: result.category,
        durationMs: Date.now() - startedAt,
      });
    }

    if (result.success) {
      await persistExchange(transcriptId, parsed.data.question, result);
    }

    return result;
  } catch (error) {
    console.error('[meeting-chat] askAboutMeeting failed', { transcriptId, error });
    return failure('api_error');
  }
}

/**
 * Record a completed exchange. Best-effort by design (FR-032): a storage failure
 * must never turn a delivered answer into an error for the user, so the error is
 * logged with context and swallowed. The consequence — the exchange may be absent
 * when they return — is the better trade.
 *
 * Only answers and refusals are stored. Operational failures are shown live and
 * never persisted: a restored "service is busy" bubble from three days ago is
 * noise, and storing the question without its answer would leave a dangling
 * bubble that reads as a bug.
 */
async function persistExchange(
  transcriptId: string,
  question: string,
  result: ChatAnswerResult | ChatRefusalResult,
): Promise<void> {
  try {
    await chatExchangeRepository.create({
      transcriptId,
      question,
      answer: result.answer,
      kind: result.kind,
      usage: { model: result.model, provider: result.provider, ...result.usage },
    });
  } catch (error) {
    console.error('[meeting-chat] exchange persist failed', {
      transcriptId,
      kind: result.kind,
      error,
    });
  }
}

/**
 * A meeting's stored conversation, oldest first.
 *
 * Returns `[]` for both an empty and a missing meeting — the distinction does not
 * matter here, since either way there is nothing to show, and asking a question
 * against a bad id still fails loudly through `askAboutMeeting`.
 */
export async function getMeetingConversation(transcriptId: string): Promise<StoredChatExchange[]> {
  try {
    const parsed = transcriptIdSchema.safeParse(transcriptId);
    if (!parsed.success) return [];
    return await chatExchangeRepository.listByTranscript(parsed.data);
  } catch (error) {
    logAndThrow('getMeetingConversation', error, CHAT_LOAD_ERROR);
  }
}
