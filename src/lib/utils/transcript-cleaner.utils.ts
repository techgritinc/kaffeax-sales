const BRACKETED_METADATA_LINE = /^[ \t]*\[[^\]]*\][ \t]*\n?/gm;
const INLINE_TIMESTAMP = /\b\d{1,2}:\d{2}(?::\d{2})?\b[ \t]*/g;
const LEADING_HYPHEN = /^[ \t]*[-–—][ \t]*/gm;

export function cleanTranscript(raw: string): string {
  return raw
    .replace(BRACKETED_METADATA_LINE, '')
    .replace(INLINE_TIMESTAMP, '')
    .replace(LEADING_HYPHEN, '')
    .trim();
}
