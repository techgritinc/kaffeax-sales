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

export interface GroundedChatPrompt {
  guardrail: string;
  grounding: string;
}

const GUARDRAIL_SECTIONS: string[] = [
  CHAT_PERSONA,
  STRICT_CONTEXT_MANDATE,
  REFUSAL_RULES,
  UNTRUSTED_CONTENT_RULE,
  CHAT_OUTPUT_CONTRACT,
  CHAT_OUTPUT_EXAMPLES,
];

const GUARDRAIL = GUARDRAIL_SECTIONS.join('\n\n');

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
