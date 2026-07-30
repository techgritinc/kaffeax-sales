import type { RecentItem } from '@/providers/recents/recents-context';
import type { MeetingRecord } from '@/types/meeting.types';
import type { Rubric, Weight } from '@/types/rubric.types';
import type { DetectedSignal } from '@/types/scoring.types';
import type { AttendeeSide, StoredTranscript, TranscriptFields } from '@/types/transcript.types';

/** View `Side` ↔ persistence `AttendeeSide` (differ only in the kaffea_x spelling). */
const toAttendeeSide = (side: 'kaffea_x' | 'prospect'): AttendeeSide =>
  side === 'kaffea_x' ? 'kaffeax' : 'prospect';
const fromAttendeeSide = (side: AttendeeSide): 'kaffea_x' | 'prospect' =>
  side === 'kaffeax' ? 'kaffea_x' : 'prospect';

/** Weight lookup from the active rubric — the rubric is the source of truth for weight. */
const weightBySignalId = (rubric: Rubric): Record<string, Weight> =>
  rubric.signals.reduce<Record<string, Weight>>((acc, s) => {
    acc[s.id] = s.weight;
    return acc;
  }, {});

/** Display-formatted date/time for the recents bar and review header. */
export const formatWhen = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

/** Compose a `MeetingRecord` (view-model) from a stored transcript + the active rubric. */
export function toMeetingRecord(stored: StoredTranscript, rubric: Rubric): MeetingRecord {
  const { id, fields, updatedAt } = stored;
  const weights = weightBySignalId(rubric);
  const summary = fields.summary;
  const leadScore = fields.leadScore;
  const detectedSignals: DetectedSignal[] = (leadScore?.detectedSignals ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    evidence: s.evidence,
    weight: weights[s.id] ?? 'cold',
  }));
  const band = leadScore?.band ?? 'cold';
  return {
    id,
    when: formatWhen(updatedAt),
    committed: fields.status === 'saved',
    band,
    aiProcessingStatus: fields.aiProcessingStatus,
    contact: {
      name: { value: '', confidence: 'low' },
      company: { value: '', confidence: 'low' },
      title: { value: '', confidence: 'low' },
      email: {
        value: fields.contact?.email ?? '',
        confidence: fields.contact?.email ? 'high' : 'low',
      },
    },
    summary: {
      meetingTitle: fields.title,
      narrative: summary?.narrative ?? '',
      attendees: (summary?.attendees ?? []).map((a) => ({
        name: a.name,
        side: fromAttendeeSide(a.side),
      })),
      topics: summary?.whatWasCovered ?? [],
      decisions: summary?.whatWasDecided ?? [],
      openQuestions: [],
      nextSteps: (summary?.actionItems ?? []).map((a) => ({
        description: a.description,
        owner: a.owner,
        dueDate: a.dueDate ?? '',
      })),
      commitments: [],
    },
    leadScore: {
      band,
      detectedSignals,
      rationale: leadScore?.rationale ?? '',
      scorePercentage: leadScore?.scorePercentage ?? 0,
    },
    recapEmail: { subject: '', body: fields.recapEmail ?? '' },
  };
}

/** Project a stored transcript into the lightweight recents-bar display shape. */
export function toRecentItem(stored: StoredTranscript): RecentItem {
  const { id, fields, updatedAt } = stored;
  const badge =
    fields.aiProcessingStatus === 'success' && fields.leadScore?.band
      ? (fields.leadScore.band.toUpperCase() as RecentItem['badge'])
      : undefined;
  return {
    id,
    title: fields.title,
    status: fields.status === 'saved' ? 'CRM' : 'DRAFT',
    badge,
    aiProcessingStatus: fields.aiProcessingStatus,
    when: formatWhen(updatedAt),
  };
}

/** Decompose a `MeetingRecord` into a persistence patch (never touches raw/cleaned transcript). */
export function toTranscriptPatch(record: MeetingRecord): Partial<TranscriptFields> {
  const { summary, leadScore, recapEmail, contact } = record;
  return {
    title: summary.meetingTitle,
    status: record.committed ? 'saved' : 'draft',
    summary: {
      narrative: summary.narrative,
      whatWeHeard: [],
      whatWasCovered: summary.topics,
      whatWasDecided: summary.decisions,
      actionItems: summary.nextSteps.map((s) => ({
        description: s.description,
        owner: s.owner,
        dueDate: s.dueDate,
      })),
      attendees: summary.attendees.map((a) => ({ name: a.name, side: toAttendeeSide(a.side) })),
    },
    contact: { email: contact.email.value },
    leadScore: {
      band: leadScore.band,
      detectedSignals: leadScore.detectedSignals.map((s) => ({
        id: s.id,
        label: s.label,
        evidence: s.evidence,
      })),
      rationale: leadScore.rationale,
      scorePercentage: leadScore.scorePercentage,
    },
    recapEmail: recapEmail.body,
  };
}
