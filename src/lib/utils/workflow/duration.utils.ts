/** Formats a call length in seconds as "1h 30m" / "45m" / "1m"; `null` when the duration is unknown. */
export function formatCallDuration(durationSeconds?: number): string | null {
  if (durationSeconds === undefined) return null;

  const totalMinutes = Math.max(1, Math.floor(durationSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** Matches a `HH:MM:SS`/`MM:SS` timestamp at the start of a line, optionally bracketed (e.g. `[00:05:12]`). */
const LEADING_TIMESTAMP = /^\s*\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?/gm;

function timestampToSeconds(hourOrMinute: string, minuteOrSecond: string, second?: string): number {
  if (second !== undefined) {
    return Number(hourOrMinute) * 3600 + Number(minuteOrSecond) * 60 + Number(second);
  }
  return Number(hourOrMinute) * 60 + Number(minuteOrSecond);
}

/**
 * Derives a call's length from per-line speaker timestamps in a raw transcript (e.g. Zoom-style
 * `00:00:05 Name: ...` captions) — real transcript exports carry no separate duration metadata,
 * so the timestamp range across all lines is the only available signal. Returns `undefined` when
 * fewer than two distinct timestamps are found (duration cannot be determined).
 */
export function extractDurationSecondsFromTranscript(raw: string): number | undefined {
  let min = Infinity;
  let max = -Infinity;

  for (const match of raw.matchAll(LEADING_TIMESTAMP)) {
    const seconds = timestampToSeconds(match[1], match[2], match[3]);
    if (seconds < min) min = seconds;
    if (seconds > max) max = seconds;
  }

  if (max <= min) return undefined;
  return max - min;
}
