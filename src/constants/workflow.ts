/** Interval (ms) between processing-modal step advances. */
export const PROC_TICK_MS = 380;

/** Simulated model latency window (ms) for the mocked processing. */
export const PROCESSING_MIN_MS = 900;
export const PROCESSING_JITTER_MS = 500;

/** Toast auto-dismiss delay (ms). */
export const TOAST_DURATION_MS = 3200;

/** Identifier prefixes minted by the workflow. */
export const DRAFT_ID_PREFIX = 'DRF';
export const CRM_ID_PREFIX = 'ZOHO';
export const REJECT_ID_PREFIX = 'REJ';

/** Audit-entry fixed fields (demo). */
export const AUDIT_MODEL = 'claude-sonnet-4-6';
export const AUDIT_REVIEWER = 'You (demo reviewer)';
export const AUDIT_RUBRIC_VERSION = '2026-06';
export const AUDIT_TARGET = 'Zoho sandbox';
export const AUDIT_TARGET_NONE = '—';

/** Default weight for a newly composed rubric signal. */
export const NEW_SIGNAL_DEFAULT_WEIGHT = 'warm' as const;

/** Viewport width (px) above which the sidebar defaults to open. */
export const SIDEBAR_OPEN_MIN_WIDTH = 900;

/** Header / identity strings (demo). */
export const APP_LABEL = 'Meeting Summary to CRM';
export const USER_NAME = 'Mohan Verma';
export const USER_EMAIL = 'mohan.verma@kaffeax.com';
export const USER_INITIALS = 'MR';

/** Hardcoded meeting date reproduced verbatim from the prototype. */
export const MEETING_DATE = 'June 24, 2026';

/** Accepted transcript upload extensions. */
export const TRANSCRIPT_FILE_ACCEPT = '.txt,.md,.vtt,.srt';
