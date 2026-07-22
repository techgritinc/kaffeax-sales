import type { Contact, MeetingRecord, Summary } from '@/types/meeting.types';
import type { Band, Rubric, Weight } from '@/types/rubric.types';
import type { DetectedSignal } from '@/types/scoring.types';

import { buildMeetingTitle, buildRecap } from './engine';

/** A detected signal as authored in the seed data — weight resolved from the rubric. */
interface SeedSignal {
  id: string;
  label: string;
  evidence: string;
}

/** Arguments accepted by `makeSeed` to assemble a full seed record. */
interface SeedInput {
  id: string;
  company: string;
  name?: string;
  title?: string;
  email?: string;
  band: Band;
  when: string;
  committed?: boolean;
  detected?: SeedSignal[];
  rationale?: string;
  meetingTitle?: string;
}

/** The curated, hand-authored extraction for the SAMPLE transcript. */
export const CURATED: { contact: Contact; summary: Summary } = {
  contact: {
    name: { value: '', confidence: 'low' },
    company: { value: 'Cascade Ember', confidence: 'high' },
    title: { value: 'Owner / Founder', confidence: 'medium' },
    email: { value: '', confidence: 'low' },
  },
  summary: {
    meeting_title: 'Discovery call — Cascade Ember distribution',
    narrative:
      "Cascade Ember, a small Portland roastery, walked the team through the shape of their business and where growth is stuck. The founder was direct: the coffee sells fine at farmers markets, but there is no wholesale channel, no visibility into what other roasters charge, and no way to get lots in front of buyers systematically. Kaffea-X's marketplace matched what they were describing almost line for line, budget is set aside for the next six to eight weeks, and a walkthrough is booked for Thursday.",
    attendees: [
      { name: 'Mohan', side: 'kaffea_x' },
      { name: 'Prospect (Cascade Ember)', side: 'prospect' },
    ],
    topics: [
      'Small Portland roastery — single-origin Ethiopian & Colombian',
      'No distribution channel beyond farmers markets and online',
      'No visibility on wholesale pricing',
      'Wants a marketplace to list lots and reach buyers',
    ],
    decisions: [
      'Kaffea-X to share an onboarding walkthrough with sample listings',
      'Follow-up meeting set for Thursday next week',
    ],
    open_questions: ['Prospect contact name and email not captured on the call'],
    next_steps: [
      {
        description:
          "Send the onboarding walkthrough deck plus three sample listings that reflect Cascade Ember's product mix, so they can see how their catalog would appear to wholesale buyers on the platform",
        owner: 'Mohan',
        due_date: 'by Monday',
      },
      {
        description:
          'Schedule a 30-minute follow-up call to review the sample listings together and answer any pricing-visibility questions before they commit to a pilot',
        owner: 'Mohan',
        due_date: 'Thursday next week',
      },
    ],
    commitments: [
      {
        side: 'kaffea_x',
        description:
          'Email the pricing benchmarks deck along with a calendar invite offering two time windows in their timezone for the Thursday follow-up',
      },
      {
        side: 'prospect',
        description:
          'Attend the Thursday follow-up after reviewing the walkthrough materials, and share any concerns about wholesale volume commitments ahead of the call',
      },
    ],
  },
};

/** The default scoring rubric — 7 signals plus the banding rule. */
export const DEFAULT_RUBRIC: Rubric = {
  signals: [
    {
      id: 'distribution_pipeline_challenge',
      label: 'Challenge distributing / building a pipeline of buyers',
      weight: 'hot',
      source: 'client',
      hints: [
        'no channel',
        'distribution',
        'in front of buyers',
        "doesn't scale",
        'get it in front',
      ],
    },
    {
      id: 'listing_frustration',
      label: 'Frustration listing their coffee for lack of a channel',
      weight: 'hot',
      source: 'client',
      hints: ['list our lots', 'list our coffee', 'just list', 'have buyers find us'],
    },
    {
      id: 'price_transparency_pain',
      label: 'Price-transparency pain',
      weight: 'hot',
      source: 'client',
      hints: [
        'no idea what other',
        'charge wholesale',
        'no visibility',
        'pricing',
        'leaving money',
      ],
    },
    {
      id: 'logistics_issue',
      label: 'Logistics / fulfillment issues',
      weight: 'hot',
      source: 'client',
      hints: ['shipping', 'warehouse', 'fulfillment', 'logistics'],
    },
    {
      id: 'budget_confirmed',
      label: 'Budget or willingness to spend mentioned',
      weight: 'warm',
      source: 'proposed',
      hints: ['budget', 'set aside', 'willing to spend', "we're serious"],
    },
    {
      id: 'timeline_named',
      label: 'Specific evaluation timeline mentioned',
      weight: 'warm',
      source: 'proposed',
      hints: ['six to eight weeks', 'next few months', 'before the fall', 'weeks'],
    },
    {
      id: 'just_browsing',
      label: "Explicit 'just looking' / no near-term need",
      weight: 'cold',
      source: 'proposed',
      hints: ['just looking', 'just exploring', 'no near-term', 'not right now', 'maybe later'],
    },
  ],
  banding:
    '≥1 HOT signal AND a next step agreed → hot. ≥1 WARM signal and no cold-overriding signal → warm. Otherwise → cold.',
};

/** Weight lookup by signal id — the rubric is the source of truth for weight. */
const WEIGHT_BY_ID: Record<string, Weight> = DEFAULT_RUBRIC.signals.reduce<Record<string, Weight>>(
  (acc, sig) => {
    acc[sig.id] = sig.weight;
    return acc;
  },
  {},
);

/** Resolve a seed signal into a full DetectedSignal, weight from the rubric. */
function resolveSignal(s: SeedSignal): DetectedSignal {
  return { id: s.id, label: s.label, weight: WEIGHT_BY_ID[s.id] ?? 'cold', evidence: s.evidence };
}

/** Assemble a full MeetingRecord from compact seed input. */
export function makeSeed({
  id,
  company,
  name,
  title,
  email,
  band,
  when,
  committed,
  detected,
  rationale,
  meetingTitle,
}: SeedInput): MeetingRecord {
  const contact: Contact = {
    name: { value: name || '', confidence: name ? 'high' : 'low' },
    company: { value: company || '', confidence: 'high' },
    title: { value: title || '', confidence: title ? 'medium' : 'low' },
    email: { value: email || '', confidence: email ? 'medium' : 'low' },
  };
  const signals = (detected || []).map(resolveSignal);
  return {
    id,
    when,
    committed: !!committed,
    band,
    contact,
    summary: {
      meeting_title: meetingTitle || buildMeetingTitle(band, company),
      narrative:
        band === 'hot'
          ? `${company} presented a strong buying case in this conversation, with the founder speaking openly about what isn't working in their current channel. The team walked through concrete pain around distribution and wholesale pricing visibility, describing the exact friction Kaffea-X is built to close. The discussion moved past introductions quickly and into specifics about how listings, benchmarks, and buyer discovery would work. A concrete 30-minute follow-up was agreed for next week, with the onboarding walkthrough and sample listings to land beforehand. Scored HOT because multiple qualifying signals fired against the rubric and a committed next step landed on the call.`
          : band === 'warm'
            ? `${company} is exploring the space with real intent, though the buying case isn't fully framed yet. Signals around timing and evaluation windows came up naturally, and the team took time to describe how they work today. Kaffea-X shared what a fit would look like without leaning into a hard pitch, and the conversation had genuine give-and-take on both sides. A lighter-touch follow-up was agreed — an overview to review at their own pace, with the door open to a deeper walkthrough later. Scored WARM because the interest is real but the top-tier buying trigger hasn't fired yet.`
            : `${company} joined the conversation but no qualifying signals surfaced against the rubric. The team isn't in an active evaluation window right now, and the discussion stayed at the level of general orientation to the Kaffea-X platform. Kaffea-X shared context on how the product works without pushing for a commitment, and the tone remained informational throughout. No next step was agreed on the call and no follow-up material was requested. Scored COLD — worth keeping the relationship warm through occasional updates, but not worth active pursuit at this time.`,
      attendees: [
        { name: 'Mohan', side: 'kaffea_x' },
        { name: `Prospect (${company})`, side: 'prospect' },
      ],
      topics: [
        `${company} — profile and current channel`,
        'Distribution and go-to-market friction discussed',
        'Wholesale pricing visibility raised',
      ],
      decisions: [
        `Kaffea-X to share onboarding walkthrough with ${company}`,
        'Follow-up scheduled next week',
      ],
      open_questions: ['Volume commitments not yet confirmed'],
      next_steps: [
        {
          description:
            'Send the onboarding walkthrough deck along with three sample listings that mirror their product mix, so the team can see exactly how their catalog would surface to wholesale buyers',
          owner: 'Mohan',
          due_date: 'by Tuesday',
        },
        {
          description:
            'Book a 30-minute follow-up call to walk through the sample listings together and address any wholesale-pricing questions before they commit.',
          owner: 'Mohan',
          due_date: 'next week',
        },
      ],
      commitments: [
        {
          side: 'kaffea_x',
          description:
            'Share the pricing benchmarks deck and send a calendar invite with two suggested time windows in their timezone for the follow-up conversation',
        },
        {
          side: 'prospect',
          description:
            'Review the onboarding walkthrough and sample listings before Thursday, then flag any concerns around volume commitments so we can address them live on the call',
        },
      ],
    },
    lead_score: {
      band,
      detected_signals: signals,
      rationale:
        rationale ||
        `Detected ${signals.length} qualifying signal(s); scored ${band.toUpperCase()} per the banding rule.`,
    },
    recap_email: buildRecap(band, company),
  };
}

/** The seeded library populating the Recent sidebar (mock CRM + drafts). */
export const SEED_LIBRARY: MeetingRecord[] = [
  makeSeed({
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
  }),
  makeSeed({
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
  }),
  makeSeed({
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
  }),
];

/** The mock Zoom transcript loaded into the capture textarea by default. */
export const SAMPLE = `[Zoom call — June 24, 2026 · 28 min]

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
