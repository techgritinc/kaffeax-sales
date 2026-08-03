import type { LeadScoreBand, TranscriptFields } from '@/types/transcript.types';
import { type CrmMeetingPayload } from '@/types/zoho.types';

export const ZOHO_CRM_FIELD_MAP = {
  meetingTitle: 'Meeting_Title',
  meetingBand: 'Meeting_Band',
  meetingScore: 'Meeting_Score',
  meetingSummary: 'Meeting_Summary',
  meetingWhatWeHeard: 'What_We_Heard',
  meetingDetectedSignals: 'Detected_Signals',
  meetingWhatWasCovered: 'What_Was_Covered',
  meetingWhatWasDecided: 'What_Was_Decided',
  meetingActionItems: 'Action_Items',
} as const;

const BAND_HEADINGS: Record<LeadScoreBand, string> = { hot: 'HOT', warm: 'WARM', cold: 'COLD' };
const BAND_ORDER: LeadScoreBand[] = ['hot', 'warm', 'cold'];

/** Format a list of points as dashed lines, matching the Action Items field's style. */
function toBulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

/** Group detected signals under a HOT/WARM/COLD heading, per-signal band from the active rubric. */
function formatDetectedSignalsByBand(
  detectedSignals: TranscriptFields['leadScore']['detectedSignals'],
  signalWeights: Record<string, LeadScoreBand>,
  fallbackBand: LeadScoreBand,
): string {
  const buckets: Record<LeadScoreBand, string[]> = { hot: [], warm: [], cold: [] };
  detectedSignals.forEach((s) => {
    const band = signalWeights[s.id] ?? fallbackBand;
    buckets[band].push(`- ${s.label}: ${s.evidence}`);
  });

  return BAND_ORDER.filter((band) => buckets[band].length > 0)
    .map((band) => `${BAND_HEADINGS[band]}\n${buckets[band].join('\n')}`)
    .join('\n\n');
}

/**
 * Maps a transcript + the active rubric's per-signal weights to the Zoho CRM payload.
 * `signalWeights` keys signal ids to their current rubric band (hot/warm/cold).
 */
export function mapMeetingToZohoPayload(
  transcript: TranscriptFields,
  signalWeights: Record<string, LeadScoreBand>,
): CrmMeetingPayload {
  const f = ZOHO_CRM_FIELD_MAP;
  const fallbackBand = transcript.leadScore.band ?? 'cold';

  const actionItemsStr = transcript.summary.actionItems
    .map((item) => `- ${item.description} (Owner: ${item.owner}, Due: ${item.dueDate ?? 'N/A'})`)
    .join('\n');

  return {
    [f.meetingTitle]: transcript.title,
    [f.meetingBand]: transcript.leadScore.band,
    [f.meetingScore]: transcript.leadScore.scorePercentage,
    [f.meetingSummary]: transcript.summary.narrative,
    [f.meetingWhatWeHeard]: transcript.leadScore.rationale,
    [f.meetingDetectedSignals]: formatDetectedSignalsByBand(
      transcript.leadScore.detectedSignals,
      signalWeights,
      fallbackBand,
    ),
    [f.meetingWhatWasCovered]: toBulletList(transcript.summary.whatWasCovered),
    [f.meetingWhatWasDecided]: toBulletList(transcript.summary.whatWasDecided),
    [f.meetingActionItems]: actionItemsStr,
  };
}
