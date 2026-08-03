import type { MeetingRecord } from '@/types/meeting.types';

const list = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] ?? ''}`;

export function buildOpeningMessage(draft: MeetingRecord | null): string {
  if (!draft) {
    return 'Ask me anything about this meeting — I can only answer from what was said in it.';
  }

  const title = draft.summary.meetingTitle.trim();
  const opener = title ? `I've analysed "${title}".` : "I've analysed this meeting.";
  const signals = draft.leadScore.detectedSignals
    .map((signal) => signal.label.trim())
    .filter((label) => label.length > 0)
    .slice(0, 3);

  if (signals.length === 0) {
    return `${opener} Ask me anything about what was said — I can only answer from this meeting.`;
  }

  return `${opener} The signals picked up were ${list(signals)}. What would you like to know?`;
}
