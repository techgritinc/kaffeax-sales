import { CHAT_ERROR_MESSAGES } from '@/constants/grounded-chat';
import { buildGroundingHaystack, normaliseForMatch } from '@/lib/utils/grounding.utils';
import { repairJson } from '@/lib/utils/json-repair.utils';
import { ChatAnswerSchema } from '@/schemas/chat-answer.schema';
import type { GroundingContext, ProcessedChatResponse } from '@/types/chat.types';

const malformed = (): ProcessedChatResponse => ({
  success: false,
  category: 'malformed_response',
  message: CHAT_ERROR_MESSAGES.malformed_response,
  retryAfterMs: null,
});

function countUnverifiedSpans(spans: string[], context: GroundingContext): number {
  if (spans.length === 0) return 0;
  const haystack = buildGroundingHaystack(context);
  return spans.filter((span) => !haystack.includes(normaliseForMatch(span))).length;
}

export function processChatResponse(
  rawText: string,
  context: GroundingContext,
): ProcessedChatResponse {
  const cleanedText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedText);
  } catch {
    try {
      parsed = JSON.parse(repairJson(cleanedText));
    } catch {
      console.error('[meeting-chat] answer could not be parsed as JSON', {
        transcriptId: context.transcriptId,
        rawLength: rawText.length,
      });
      return malformed();
    }
  }

  const validation = ChatAnswerSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn('[meeting-chat] answer failed schema validation', {
      transcriptId: context.transcriptId,
      issues: validation.error.issues.map((i) => ({ path: i.path.join('.'), code: i.code })),
    });
    return malformed();
  }

  const answer = validation.data;

  if (!answer.inScope) {
    return { success: true, kind: 'refusal', answer: answer.answer };
  }

  if (answer.coveredInMeeting && answer.evidenceSpans.length === 0) {
    console.warn('[meeting-chat] answer claimed coverage with no evidence', {
      transcriptId: context.transcriptId,
    });
    return malformed();
  }

  const unverified = countUnverifiedSpans(answer.evidenceSpans, context);
  if (unverified > 0) {
    console.warn('[meeting-chat] evidence spans could not be located in the source', {
      transcriptId: context.transcriptId,
      unverified,
      total: answer.evidenceSpans.length,
      spanLengths: answer.evidenceSpans.map((s) => s.length),
    });
    return malformed();
  }

  return {
    success: true,
    kind: 'answer',
    answer: answer.answer,
    evidenceSpans: answer.evidenceSpans,
    coveredInMeeting: answer.coveredInMeeting,
    unanswerablePart: answer.unanswerablePart,
  };
}
