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

const GUIDANCE_SECTIONS: string[] = [
  SUGGESTION_PERSONA,
  SUGGESTION_RULES,
  UNTRUSTED_CONTENT_RULE,
  SUGGESTION_OUTPUT_CONTRACT,
  SUGGESTION_OUTPUT_EXAMPLES,
];

const GUIDANCE = GUIDANCE_SECTIONS.join('\n\n');

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
