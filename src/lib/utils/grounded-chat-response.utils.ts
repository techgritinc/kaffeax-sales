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

/**
 * How many claimed evidence spans are absent from the grounding material.
 *
 * A span that cannot be located is not a quote — it is a fabrication. Any
 * non-zero count rejects the whole answer rather than dropping the span: the
 * prose depends on its evidence, so removing the support while keeping the claim
 * would be worse than refusing.
 *
 * This proves a span exists in the meeting. It does not prove the span supports
 * the claim, or that the claim is a faithful reading of it — that residual risk
 * is what the manual evaluation catches.
 */
function countUnverifiedSpans(spans: string[], context: GroundingContext): number {
  if (spans.length === 0) return 0;
  const haystack = buildGroundingHaystack(context);
  return spans.filter((span) => !haystack.includes(normaliseForMatch(span))).length;
}

/**
 * Parse, validate, and verify one model response.
 *
 * Mirrors `processStructuredResponse`: strip fences, parse with a repair
 * fallback, validate through Zod — then check the evidence, which is the half
 * that makes "this was said in the meeting" mechanically falsifiable rather than
 * a matter of trust.
 */
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

  // A refusal is a successful response, not an error (FR-009), and it has no
  // factual claims to ground — so verification does not apply to it.
  if (!answer.inScope) {
    return { success: true, kind: 'refusal', answer: answer.answer };
  }

  // An in-scope answer about a covered topic with no evidence is unverifiable,
  // which makes it indistinguishable from a fabricated one. "Not discussed" is
  // the one exception: it is a claim about absence and has nothing to quote.
  if (answer.coveredInMeeting && answer.evidenceSpans.length === 0) {
    console.warn('[meeting-chat] answer claimed coverage with no evidence', {
      transcriptId: context.transcriptId,
    });
    return malformed();
  }

  const unverified = countUnverifiedSpans(answer.evidenceSpans, context);
  if (unverified > 0) {
    // Count and lengths only — the spans themselves are transcript-derived.
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
