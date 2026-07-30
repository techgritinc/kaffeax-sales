import {
  ANALYSIS_DELIMITER_CLOSE,
  ANALYSIS_DELIMITER_OPEN,
  CHAT_OUTPUT_CONTRACT,
  CHAT_OUTPUT_EXAMPLES,
  CHAT_PERSONA,
  REFUSAL_RULES,
  STRICT_CONTEXT_MANDATE,
  TRANSCRIPT_DELIMITER_CLOSE,
  TRANSCRIPT_DELIMITER_OPEN,
  UNTRUSTED_CONTENT_RULE,
} from '@/constants/grounded-chat';
import { renderAnalysis } from '@/lib/utils/grounding.utils';
import type { GroundingContext } from '@/types/chat.types';

/** Guardrail prose and grounding material as separate blocks. */
export interface GroundedChatPrompt {
  /** Frozen across every request in the deployment — the cacheable prefix. */
  guardrail: string;
  /** Varies per meeting only. The cache breakpoint goes at the end of this. */
  grounding: string;
}

/** Frozen, in prompt order. Byte-identical across every request — see D3. */
const GUARDRAIL_SECTIONS: string[] = [
  CHAT_PERSONA,
  STRICT_CONTEXT_MANDATE,
  REFUSAL_RULES,
  UNTRUSTED_CONTENT_RULE,
  CHAT_OUTPUT_CONTRACT,
  CHAT_OUTPUT_EXAMPLES,
];

const GUARDRAIL = GUARDRAIL_SECTIONS.join('\n\n');

/**
 * Assemble the two prompt blocks.
 *
 * Nothing derived from the question, the clock, or a random source may appear in
 * either block: prompt caching is a prefix match, so a single volatile byte
 * silently disables it for every follow-up question about this meeting. If a
 * cache-read rate of zero ever shows up across repeated questions on one
 * meeting, this function is the first place to look.
 */
export function buildGroundedChatPrompt(context: GroundingContext): GroundedChatPrompt {
  const grounding = [
    TRANSCRIPT_DELIMITER_OPEN,
    context.cleanedTranscript,
    TRANSCRIPT_DELIMITER_CLOSE,
    '',
    ANALYSIS_DELIMITER_OPEN,
    renderAnalysis(context),
    ANALYSIS_DELIMITER_CLOSE,
  ].join('\n');

  return { guardrail: GUARDRAIL, grounding };
}
