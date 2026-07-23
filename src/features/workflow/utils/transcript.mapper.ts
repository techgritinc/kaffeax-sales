import type { StoredTranscript } from '@/lib/db/mock/types';
import type { MeetingRecord } from '@/types/meeting.types';
import type { Rubric, Weight } from '@/types/rubric.types';
import type { DetectedSignal } from '@/types/scoring.types';
import type { AttendeeSide } from '@/types/transcript.types';

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

/** Compose a `MeetingRecord` (view-model) from a stored transcript + the active rubric. */
export function toMeetingRecord(stored: StoredTranscript, rubric: Rubric): MeetingRecord {
  const { id, fields, presentation } = stored;
  const weights = weightBySignalId(rubric);
  const detected_signals: DetectedSignal[] = fields.leadScore.detectedSignals.map((s) => ({
    id: s.id,
    label: s.label,
    evidence: s.evidence,
    weight: weights[s.id] ?? 'cold',
  }));
  const band = fields.leadScore.band ?? 'cold';
  return {
    id,
    when: presentation.when,
    committed: fields.status === 'saved',
    band,
    contact: {
      name: presentation.contact.name,
      company: presentation.contact.company,
      title: presentation.contact.title,
      email: {
        value: fields.contact.email ?? '',
        confidence: presentation.contact.emailConfidence,
      },
    },
    summary: {
      meeting_title: fields.title,
      narrative: fields.summary.narrative,
      attendees: fields.summary.attendees.map((a) => ({
        name: a.name,
        side: fromAttendeeSide(a.side),
      })),
      topics: fields.summary.whatWasCovered,
      decisions: fields.summary.whatWasDecided,
      open_questions: presentation.summary.openQuestions,
      next_steps: fields.summary.actionItems.map((a) => ({
        description: a.description,
        owner: a.owner,
        due_date: a.dueDate ?? '',
      })),
      commitments: presentation.summary.commitments,
    },
    lead_score: { band, detected_signals, rationale: fields.leadScore.rationale },
    recap_email: { subject: presentation.recapSubject, body: fields.recapEmail ?? '' },
  };
}

/** Decompose a `MeetingRecord` back into a stored transcript (persistence + supplement). */
export function toStoredTranscript(record: MeetingRecord, userId: string): StoredTranscript {
  const { contact, summary, lead_score, recap_email } = record;
  return {
    id: record.id,
    fields: {
      userId,
      title: summary.meeting_title,
      status: record.committed ? 'saved' : 'draft',
      source: 'zoom',
      externalMeetingId: null,
      webhookPayload: null,
      originalTranscript: '',
      cleanedTranscript: '',
      summary: {
        narrative: summary.narrative,
        whatWeHeard: [],
        whatWasCovered: summary.topics,
        whatWasDecided: summary.decisions,
        actionItems: summary.next_steps.map((s) => ({
          description: s.description,
          owner: s.owner,
          dueDate: s.due_date,
        })),
        attendees: summary.attendees.map((a) => ({ name: a.name, side: toAttendeeSide(a.side) })),
      },
      contact: { email: contact.email.value },
      leadScore: {
        band: lead_score.band,
        detectedSignals: lead_score.detected_signals.map((s) => ({
          id: s.id,
          label: s.label,
          evidence: s.evidence,
        })),
        rationale: lead_score.rationale,
      },
      recapEmail: recap_email.body,
      zohoLeadId: record.committed ? record.id : null,
    },
    presentation: {
      when: record.when,
      recapSubject: recap_email.subject,
      contact: {
        name: contact.name,
        company: contact.company,
        title: contact.title,
        emailConfidence: contact.email.confidence,
      },
      summary: { openQuestions: summary.open_questions, commitments: summary.commitments },
    },
  };
}
