import type { ProcessingStep } from '@/types/workflow/processing.types';

/** Toast auto-dismiss delay (ms). */
export const TOAST_DURATION_MS = 3200;

/** Interval (ms) between foreground poll ticks while the user watches the processing modal. */
export const FOREGROUND_POLL_INTERVAL_MS = 3000;

/** Interval (ms) between background-generation completion polls. */
export const BACKGROUND_POLL_INTERVAL_MS = 5000;

/** Pipeline stages displayed in the processing modal during summarization. */
export const PROCESSING_STEPS: ProcessingStep[] = [
  { label: 'Preparing Transcript', stage: 'preparing' },
  { label: 'Agent Processing', stage: 'processing' },
  { label: 'Extracting Summary', stage: 'extracting' },
];

/** Default weight for a newly composed rubric signal. */
export const NEW_SIGNAL_DEFAULT_WEIGHT = 'warm' as const;

/** Viewport width (px) above which the sidebar defaults to open. */
export const SIDEBAR_OPEN_MIN_WIDTH = 900;

/** Header / identity strings (configurable via env vars with fallbacks). */
export const APP_LABEL = process.env.NEXT_PUBLIC_APP_LABEL || 'Meeting Summary to CRM';
export const USER_NAME = process.env.NEXT_PUBLIC_USER_NAME || 'Mohan Verma';
export const USER_EMAIL = process.env.NEXT_PUBLIC_USER_EMAIL || 'mohan.verma@kaffeax.com';
export const USER_INITIALS = process.env.NEXT_PUBLIC_USER_INITIALS || 'MR';

/** Hardcoded meeting date reproduced verbatim from the prototype. */
export const MEETING_DATE = 'June 24, 2026';

/** sessionStorage key marking an in-flight synchronous (blocking) generation, used to detect refresh/cancel. */
export const ACTIVE_FOREGROUND_GENERATION_KEY = 'kx.activeForegroundGenerationId';

/** Accepted transcript upload extensions. */
export const TRANSCRIPT_FILE_ACCEPT = '.txt,.md,.vtt,.srt';

/** ID prefix for rubric signals created by the user (not sourced from the client). */
export const CUSTOM_SIGNAL_ID_PREFIX = 'custom_';

/** The sample Zoom transcript loaded into the capture textarea via "Load Sample". */
export const SAMPLE_TRANSCRIPT = `[Zoom call — June 24, 2026 · 28 min]

Mohan (Kaffea-X): Thanks for making time. Tell me where things stand for you right now.

Prospect: Sure. We're a small roastery out of Portland — Cascade Ember, going about four years. Single-origin, mostly Ethiopian and Colombian. The coffee's good, that's not the problem. The problem is getting it in front of buyers. We just don't have a channel — right now it's farmers markets and a trickle of online orders.

Mohan: Distribution is the wall a lot of roasters hit. You've tried wholesale?

Prospect: We've tried. Cold-emailing cafes, showing up with samples. It's brutal and it doesn't scale. And honestly we have no idea what other roasters charge wholesale, so we're either too expensive or leaving money on the table. No visibility on pricing at all.

Mohan: So if there were a marketplace where you could list your coffee, see where you sit on price, and get in front of buyers who are looking — is that what you're after?

Prospect: A hundred percent. If I could just list our lots and have buyers find us, that changes everything for us.

Mohan: What do the next few months look like — evaluating now, or just exploring?

Prospect: We want something in place before the fall buying season, so realistically the next six to eight weeks. We've set aside some budget — nothing huge, but we're serious.

Mohan: Perfect. Let me put together a short onboarding walkthrough with some sample listings. Can we do 30 minutes Thursday next week?

Prospect: Thursday works. Send it across.

Mohan: Will do — I'll email the deck and a calendar invite.`;
