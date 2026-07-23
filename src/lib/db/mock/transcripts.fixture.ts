import { toStoredTranscript } from '@/features/workflow/utils/transcript.mapper';

import { type SeedInput, makeSeed } from './seed-builder';
import type { StoredTranscript } from './types';

/** Fixed demo owner id for all seeded transcripts (real DB would use a real user ObjectId). */
export const DEMO_USER_ID = '000000000000000000000001';

/** Compact inputs for the seeded library (mock CRM + drafts). */
const SEED_INPUTS: SeedInput[] = [
  {
    id: 'ZOHO-421089',
    company: 'Cascade Ember',
    name: '',
    title: 'Owner / Founder',
    email: '',
    meetingTitle: 'Discovery call — Cascade Ember distribution & Cascade Ember distribution',
    band: 'hot',
    when: 'Today · just now',
    committed: true,
    detected: [
      {
        id: 'distribution_pipeline_challenge',
        label: 'Challenge distributing / building a pipeline of buyers',
        evidence:
          "…don't have a channel — right now it's farmers markets and a trickle of online orders…",
      },
      {
        id: 'price_transparency_pain',
        label: 'Price-transparency pain',
        evidence: '…no visibility on wholesale pricing, no idea what other roasters charge…',
      },
      {
        id: 'listing_frustration',
        label: 'Frustration listing their coffee for lack of a channel',
        evidence: '…just list our lots and have buyers find us…',
      },
    ],
    rationale:
      'Detected 3 hot signals and a next step was agreed → scored HOT per the banding rule.',
  },
  {
    id: 'ZOHO-338502',
    company: 'Blue Ridge Roasters',
    name: 'Jesse Hart',
    title: 'Head of Sales',
    email: 'jesse@blueridge.co',
    meetingTitle: 'Evaluation call — Blue Ridge Roasters',
    band: 'warm',
    when: 'Yesterday · 4:22 PM',
    committed: true,
    detected: [
      {
        id: 'budget_confirmed',
        label: 'Budget or willingness to spend mentioned',
        evidence: "…we've set aside some budget for this, nothing huge but we're serious…",
      },
      {
        id: 'timeline_named',
        label: 'Specific evaluation timeline mentioned',
        evidence:
          "…we'd want something in place before the fall buying season, realistically the next six to eight weeks…",
      },
    ],
    rationale:
      'Detected 2 warm signals with no cold-overriding signals → scored WARM per the banding rule.',
  },
  {
    id: 'DRF-portland-pour',
    company: 'Portland Pour Coffee',
    name: 'Kai Ferreira',
    title: 'Owner',
    email: '',
    meetingTitle: 'Intro call — Portland Pour Coffee',
    band: 'warm',
    when: '3 days ago',
    committed: false,
    detected: [
      {
        id: 'timeline_named',
        label: 'Specific evaluation timeline mentioned',
        evidence: "…we'd want to be up on a marketplace before next quarter…",
      },
    ],
    rationale:
      'Detected 1 warm signal with no cold-overriding signals → scored WARM per the banding rule.',
  },
];

/** The seeded library, in persistence (`Transcript`) shape + presentation supplement. */
export const SEED_TRANSCRIPTS: StoredTranscript[] = SEED_INPUTS.map((input) =>
  toStoredTranscript(makeSeed(input), DEMO_USER_ID),
);

/** The mock Zoom transcript loaded into the capture textarea by default. */
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
