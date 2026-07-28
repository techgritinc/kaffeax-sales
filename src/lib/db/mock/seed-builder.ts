import { buildMeetingTitle, buildRecap } from '@/providers/workflow/engine';
import type { Contact, MeetingRecord } from '@/types/meeting.types';
import type { Band, Weight } from '@/types/rubric.types';
import type { DetectedSignal } from '@/types/scoring.types';

import { SEED_RUBRIC_SIGNALS } from './rubric-signals.fixture';

/** A detected signal as authored in the seed data — weight resolved from the rubric. */
export interface SeedSignal {
  id: string;
  label: string;
  evidence: string;
}

/** Arguments accepted by `makeSeed` to assemble a full seed record. */
export interface SeedInput {
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

/** Weight lookup by signal id — the rubric is the source of truth for weight. */
const WEIGHT_BY_ID: Record<string, Weight> = SEED_RUBRIC_SIGNALS.reduce<Record<string, Weight>>(
  (acc, sig) => {
    acc[sig.signalId] = sig.weight;
    return acc;
  },
  {},
);

/** Resolve a seed signal into a full DetectedSignal, weight from the rubric. */
function resolveSignal(s: SeedSignal): DetectedSignal {
  return { id: s.id, label: s.label, weight: WEIGHT_BY_ID[s.id] ?? 'cold', evidence: s.evidence };
}

/** Assemble a full MeetingRecord from compact seed input (view-model authoring helper). */
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
