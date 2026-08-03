import { EMAIL_GREETING, EMAIL_SUBJECT_PREFIX } from '@/constants/workflow/email.constants';
import type { Commitment, MeetingRecord, NextStep, Side } from '@/types/meeting.types';
import type { Weight } from '@/types/rubric.types';
import type { DetectedSignal } from '@/types/scoring.types';

const SIDE_LABELS: Record<Side, string> = { kaffea_x: 'Kaffea-X', prospect: 'Prospect' };
const SIGNAL_WEIGHT_LABELS: Record<Weight, string> = { hot: 'Hot', warm: 'Warm', cold: 'Cold' };
const SIGNAL_WEIGHT_ORDER: Weight[] = ['hot', 'warm', 'cold'];

function renderNumberedList(lines: string[]): string {
  return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
}

function formatNextStepLine(step: NextStep): string {
  return `${step.owner}: ${step.description} (Due: ${step.dueDate || 'TBD'})`;
}

function formatCommitmentLine(commitment: Commitment): string {
  return `${SIDE_LABELS[commitment.side]}: ${commitment.description}`;
}

function buildGreeting(): string {
  return EMAIL_GREETING;
}

function buildSummarySection(narrative: string): string {
  return narrative;
}

function buildHeardSection(signals: DetectedSignal[]): string {
  if (signals.length === 0) return '';
  const groups = SIGNAL_WEIGHT_ORDER.map((weight) => {
    const matching = signals.filter((signal) => signal.weight === weight);
    if (matching.length === 0) return '';
    const lines = matching.map((signal) => `  * ${signal.label}`).join('\n');
    return `${SIGNAL_WEIGHT_LABELS[weight]}:\n${lines}`;
  }).filter((group) => group !== '');
  return `WHAT WE HEARD\n${groups.join('\n\n')}`;
}

function buildCoveredSection(topics: string[]): string {
  if (topics.length === 0) return '';
  return `WHAT WAS COVERED\n${renderNumberedList(topics)}`;
}

function buildDecidedSection(decisions: string[]): string {
  if (decisions.length === 0) return '';
  return `WHAT WAS DECIDED\n${renderNumberedList(decisions)}`;
}

function buildActionItemsSection(actionLines: string[]): string {
  if (actionLines.length === 0) return '';
  return `ACTION ITEMS\n${renderNumberedList(actionLines)}`;
}

function buildSignOff(attendees: MeetingRecord['summary']['attendees']): string {
  const rep = attendees.find((attendee) => attendee.side === 'kaffea_x');
  const nameLine = rep ? `\n${rep.name}` : '';
  return `Looking forward to our next steps.\n\nBest regards,${nameLine}`;
}

export function buildEmailSubject(draft: MeetingRecord): string {
  return EMAIL_SUBJECT_PREFIX + draft.summary.meetingTitle;
}

/** Assembles the full recap email body. Every populated section is included in full — no length-based truncation (zero data loss per SC-002). */
export function buildEmailContent(draft: MeetingRecord): { subject: string; body: string } {
  const subject = buildEmailSubject(draft);
  const actionLines = [
    ...draft.summary.nextSteps.map(formatNextStepLine),
    ...draft.summary.commitments.map(formatCommitmentLine),
  ];
  const body = [
    buildGreeting(),
    buildSummarySection(draft.summary.narrative),
    buildHeardSection(draft.leadScore.detectedSignals),
    buildCoveredSection(draft.summary.topics),
    buildDecidedSection(draft.summary.decisions),
    buildActionItemsSection(actionLines),
    buildSignOff(draft.summary.attendees),
  ]
    .filter((section) => section !== '')
    .join('\n\n');

  return { subject, body };
}
