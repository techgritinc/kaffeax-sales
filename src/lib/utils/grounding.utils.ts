import { EMPTY_SECTION_PLACEHOLDER } from '@/constants/grounded-chat';
import type { GroundingContext } from '@/types/chat.types';
import type { StoredTranscript } from '@/types/transcript.types';

/** Project a stored transcript into the only material an answer may draw on. */
export function buildGroundingContext(stored: StoredTranscript): GroundingContext {
  const { id, fields } = stored;
  return {
    transcriptId: id,
    meetingTitle: fields.title,
    cleanedTranscript: fields.cleanedTranscript,
    summary: fields.summary,
    leadScore: fields.leadScore,
  };
}

const bullets = (items: string[]): string =>
  items.length === 0 ? EMPTY_SECTION_PLACEHOLDER : items.map((i) => `- ${i}`).join('\n');

const orNone = (lines: string[]): string =>
  lines.length === 0 ? EMPTY_SECTION_PLACEHOLDER : lines.join('\n');

export function renderAnalysis(context: GroundingContext): string {
  const { meetingTitle, summary, leadScore } = context;
  const actionItems = summary.actionItems.map(
    (a) =>
      `- ${a.description} — owner: ${a.owner} — due: ${a.dueDate ?? EMPTY_SECTION_PLACEHOLDER}`,
  );
  const attendees = summary.attendees.map((a) => `- ${a.name} (${a.side})`);
  const signals = leadScore.detectedSignals.map((s) => `- ${s.label} — ${s.evidence}`);

  return [
    `Title: ${meetingTitle}`,
    `Narrative: ${summary.narrative || EMPTY_SECTION_PLACEHOLDER}`,
    `What we heard:\n${bullets(summary.whatWeHeard)}`,
    `What was covered:\n${bullets(summary.whatWasCovered)}`,
    `What was decided:\n${bullets(summary.whatWasDecided)}`,
    `Action items:\n${orNone(actionItems)}`,
    `Attendees:\n${orNone(attendees)}`,
    `Lead score: ${leadScore.band ?? EMPTY_SECTION_PLACEHOLDER}, ${leadScore.scorePercentage ?? 0}%`,
    `Score rationale: ${leadScore.rationale || EMPTY_SECTION_PLACEHOLDER}`,
    `Detected signals:\n${orNone(signals)}`,
  ].join('\n\n');
}

/** Total characters of grounding material, for the size ceiling check. */
export function groundingSize(context: GroundingContext): number {
  return context.cleanedTranscript.length + renderAnalysis(context).length;
}

/** Collapse whitespace, trim, lowercase — applied to both haystack and span. */
export function normaliseForMatch(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function buildGroundingHaystack(context: GroundingContext): string {
  return normaliseForMatch(`${context.cleanedTranscript}\n${renderAnalysis(context)}`);
}
