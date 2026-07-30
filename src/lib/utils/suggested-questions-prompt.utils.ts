import {
  ANALYSIS_DELIMITER_CLOSE,
  ANALYSIS_DELIMITER_OPEN,
  TRANSCRIPT_DELIMITER_CLOSE,
  TRANSCRIPT_DELIMITER_OPEN,
  UNTRUSTED_CONTENT_RULE,
} from '@/constants/grounded-chat';
import {
  SUGGESTION_OUTPUT_CONTRACT,
  SUGGESTION_OUTPUT_EXAMPLES,
  SUGGESTION_PERSONA,
  SUGGESTION_RULES,
  SUGGESTION_USER_INSTRUCTION,
} from '@/constants/suggested-questions';
import { renderAnalysis } from '@/lib/utils/grounding.utils';
import type { GroundingContext } from '@/types/chat.types';

/** The two halves of one suggestion request. */
export interface SuggestedQuestionsPrompt {
  system: string;
  user: string;
}

/**
 * The injection guardrail and the delimiters are imported from the chat
 * constants rather than restated here. They protect against the same thing in
 * the same way, and two copies of a guardrail is how one of them quietly gets
 * weaker than the other.
 */
const GUIDANCE_SECTIONS: string[] = [
  SUGGESTION_PERSONA,
  SUGGESTION_RULES,
  UNTRUSTED_CONTENT_RULE,
  SUGGESTION_OUTPUT_CONTRACT,
  SUGGESTION_OUTPUT_EXAMPLES,
];

const GUIDANCE = GUIDANCE_SECTIONS.join('\n\n');

/**
 * Assemble the suggestion prompt from the same grounding material the assistant
 * answers from — which is what makes "every question must be answerable" a
 * reachable requirement rather than a hope.
 *
 * Nothing derived from the clock, a counter, or a random source may enter either
 * string. Not for caching (there is no cache here — a meeting gets exactly one
 * suggestion call, so a cache write could never be read before it expired) but
 * for evaluation: re-analysing the same meeting must produce the same set, or
 * every regression is indistinguishable from sampling noise.
 *
 * Unlike the chat prompt there is no cache breakpoint and no split into
 * guardrail/grounding blocks, so the whole thing is one system string.
 */
export function buildSuggestedQuestionsPrompt(context: GroundingContext): SuggestedQuestionsPrompt {
  const grounding = [
    TRANSCRIPT_DELIMITER_OPEN,
    context.cleanedTranscript,
    TRANSCRIPT_DELIMITER_CLOSE,
    '',
    ANALYSIS_DELIMITER_OPEN,
    renderAnalysis(context),
    ANALYSIS_DELIMITER_CLOSE,
  ].join('\n');

  return {
    system: `${GUIDANCE}\n\n${grounding}`,
    user: SUGGESTION_USER_INSTRUCTION,
  };
}
