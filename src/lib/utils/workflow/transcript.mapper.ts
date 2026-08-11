import { RECENT_STATUS } from '@/constants/workflow/recents.constants';
import type { RecentItem } from '@/providers/recents/recents-context';
import type { MeetingRecord } from '@/types/meeting.types';
import type { Rubric, Weight } from '@/types/rubric.types';
import type { DetectedSignal } from '@/types/scoring.types';
import type { AttendeeSide, StoredTranscript, TranscriptFields } from '@/types/transcript.types';

const toAttendeeSide = (side: 'kaffea_x' | 'prospect'): AttendeeSide =>
  side === 'kaffea_x' ? 'kaffeax' : 'prospect';
const fromAttendeeSide = (side: AttendeeSide): 'kaffea_x' | 'prospect' =>
  side === 'kaffeax' ? 'kaffea_x' : 'prospect';

const weightBySignalId = (rubric: Rubric): Record<string, Weight> =>
  rubric.signals.reduce<Record<string, Weight>>((acc, s) => {
    acc[s.id] = s.weight;
    return acc;
  }, {});

export const formatWhen = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

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
    originalTranscript: fields.originalTranscript,
    durationSeconds: fields.durationSeconds,
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
    suggestedQuestions: fields.suggestedQuestions ?? [],
  };
}

export function toRecentItem(stored: StoredTranscript): RecentItem {
  const { id, fields, updatedAt } = stored;
  const badge =
    fields.aiProcessingStatus === 'success' && fields.leadScore?.band
      ? (fields.leadScore.band.toUpperCase() as RecentItem['badge'])
      : undefined;
  return {
    id,
    title: fields.title,
    status: fields.status === 'saved' ? RECENT_STATUS.CRM : RECENT_STATUS.DRAFT,
    badge,
    aiProcessingStatus: fields.aiProcessingStatus,
    when: formatWhen(updatedAt),
  };
}

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
