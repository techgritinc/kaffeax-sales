import {
  ANALYST_PERSONA,
  ANALYTICAL_APPROACH,
  CORE_ACCURACY_MANDATE,
  FIELD_DEFINITIONS,
  OUTPUT_FORMAT_HEADER,
  OUTPUT_SCHEMA_EXAMPLE,
  SIGNAL_DETECTION_INTRO,
  SIGNAL_EMPTY_TEXT,
  SIGNAL_PER_SIGNAL_RULES,
  SIGNAL_SECTION_HEADER,
} from '@/constants/summarization';
import type { SimplifiedSignal } from '@/types/rubric-signal.types';

function buildSignalSection(signals: SimplifiedSignal[]): string {
  if (signals.length === 0) {
    return `${SIGNAL_SECTION_HEADER}\n\n${SIGNAL_EMPTY_TEXT}`;
  }

  return [
    SIGNAL_SECTION_HEADER,
    SIGNAL_DETECTION_INTRO,
    JSON.stringify(signals, null, 2),
    SIGNAL_PER_SIGNAL_RULES,
  ].join('\n\n');
}

export function buildSummarizationPrompt(signals: SimplifiedSignal[]): { system: string } {
  const system = [
    ANALYST_PERSONA,
    CORE_ACCURACY_MANDATE,
    ANALYTICAL_APPROACH,
    `${OUTPUT_FORMAT_HEADER}\n\n${OUTPUT_SCHEMA_EXAMPLE}`,
    FIELD_DEFINITIONS,
    buildSignalSection(signals),
  ].join('\n\n');

  return { system };
}
