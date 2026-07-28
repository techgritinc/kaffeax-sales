import { type TranscriptFields } from '@/types/transcript.types';
import { type CrmMeetingPayload } from '@/types/zoho.types';

export const ZOHO_CRM_FIELD_MAP = {
  meetingTitle: 'Meeting_Title_Placeholder',
  meetingSummary: 'Meeting_Summary_Placeholder',
  meetingScoreBand: 'Meeting_Score_Band_Placeholder',
  meetingScorePercentage: 'Meeting_Score_Percentage_Placeholder',
  meetingScoreRationale: 'Meeting_Score_Rationale_Placeholder',
  meetingWhatWeHeard: 'Meeting_What_We_Heard_Placeholder',
  meetingWhatWasCovered: 'Meeting_What_Was_Covered_Placeholder',
  meetingWhatWasDecided: 'Meeting_What_Was_Decided_Placeholder',
  meetingActionItems: 'Meeting_Action_Items_Placeholder',
  meetingAttendees: 'Meeting_Attendees_Placeholder',
  meetingDetectedSignals: 'Meeting_Detected_Signals_Placeholder',
} as const;

export function mapMeetingToZohoPayload(transcript: TranscriptFields): CrmMeetingPayload {
  const f = ZOHO_CRM_FIELD_MAP;

  const actionItemsStr = transcript.summary.actionItems
    .map((item) => `- ${item.description} (Owner: ${item.owner}, Due: ${item.dueDate ?? 'N/A'})`)
    .join('\n');

  const attendeesStr = transcript.summary.attendees.map((a) => `${a.name} (${a.side})`).join('\n');

  const signalsStr = transcript.leadScore.detectedSignals
    .map((s) => `- ${s.label}: ${s.evidence}`)
    .join('\n');

  return {
    [f.meetingTitle]: transcript.title,
    [f.meetingSummary]: transcript.summary.narrative,
    [f.meetingScoreBand]: transcript.leadScore.band,
    [f.meetingScorePercentage]: transcript.leadScore.scorePercentage,
    [f.meetingScoreRationale]: transcript.leadScore.rationale,
    [f.meetingWhatWeHeard]: transcript.summary.whatWeHeard.join('\n'),
    [f.meetingWhatWasCovered]: transcript.summary.whatWasCovered.join('\n'),
    [f.meetingWhatWasDecided]: transcript.summary.whatWasDecided.join('\n'),
    [f.meetingActionItems]: actionItemsStr,
    [f.meetingAttendees]: attendeesStr,
    [f.meetingDetectedSignals]: signalsStr,
  };
}
