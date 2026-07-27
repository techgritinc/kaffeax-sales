import { BAND_ORDER } from '@/constants/bands';
import { PROCESSING_JITTER_MS, PROCESSING_MIN_MS } from '@/constants/workflow';
import type {
  Confidence,
  ConfidentField,
  Contact,
  MeetingRecord,
  RecapEmail,
  Summary,
} from '@/types/meeting.types';
import type { Band, Rubric } from '@/types/rubric.types';
import type { DetectedSignal } from '@/types/scoring.types';

import { CURATED } from './curated';

export const hintFallback = (label: string): string[] =>
  label
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(' ')
    .filter((w) => w.length > 4);

/** Extract a ±28-char snippet of evidence around the first hit of `hint`. */
export function snippet(text: string, hint: string): string {
  const i = text.toLowerCase().indexOf(hint.toLowerCase());
  if (i < 0) return '';
  const start = Math.max(0, i - 28);
  const end = Math.min(text.length, i + hint.length + 28);
  return (
    (start > 0 ? '…' : '') +
    text.slice(start, end).replace(/\s+/g, ' ').trim() +
    (end < text.length ? '…' : '')
  );
}

/** Match each rubric signal against the transcript, returning fired signals. */
export function detectSignals(transcript: string, rubric: Rubric): DetectedSignal[] {
  const lc = transcript.toLowerCase();
  const out: DetectedSignal[] = [];
  rubric.signals.forEach((sig) => {
    const hints = sig.hints && sig.hints.length ? sig.hints : hintFallback(sig.label);
    const hit = hints.find((h) => lc.includes(h.toLowerCase()));
    if (hit) {
      out.push({
        id: sig.id,
        label: sig.label,
        weight: sig.weight,
        evidence: snippet(transcript, hit),
      });
    }
  });
  return out;
}

/** Detect whether a concrete next step was agreed on the call. */
export function detectNextStep(transcript: string): boolean {
  return /(monday|tuesday|wednesday|thursday|friday|next week)[^.]*(work|good|fine|sure|great)|send (it|the deck|across)|calendar invite/i.test(
    transcript,
  );
}

/** Apply the banding rule to the detected signals + next-step flag. */
export function applyBanding(detected: DetectedSignal[], nextStep: boolean): Band {
  const hot = detected.filter((d) => d.weight === 'hot').length;
  const warm = detected.filter((d) => d.weight === 'warm').length;
  const cold = detected.filter((d) => d.weight === 'cold').length;
  if (hot >= 1 && nextStep) return 'hot';
  if (warm >= 1 && cold === 0) return 'warm';
  if (hot >= 1) return 'warm';
  return 'cold';
}

/** Build the human-readable rationale string for a scored band. */
export function buildRationale(detected: DetectedSignal[], band: Band, nextStep: boolean): string {
  const hot = detected.filter((d) => d.weight === 'hot').map((d) => d.label);
  const warm = detected.filter((d) => d.weight === 'warm').map((d) => d.label);
  const parts: string[] = [];
  if (hot.length)
    parts.push(`${hot.length} hot signal${hot.length > 1 ? 's' : ''} (${hot.join('; ')})`);
  if (warm.length) parts.push(`${warm.length} warm signal${warm.length > 1 ? 's' : ''}`);
  const base = parts.length ? parts.join(' and ') : 'no qualifying signals';
  return `Detected ${base}; ${nextStep ? 'a next step was agreed' : 'no next step agreed'} → scored ${band.toUpperCase()} per the banding rule.`;
}

/** Build the band-keyed narrative prose for the summary. */
export function buildNarrative(
  band: Band,
  company: string,
  detected: DetectedSignal[],
  hasNextStep: boolean,
): string {
  const c = company || 'the roastery';
  const hot = detected.filter((d) => d.weight === 'hot').map((d) => d.label.toLowerCase());
  const warm = detected.filter((d) => d.weight === 'warm').map((d) => d.label.toLowerCase());
  if (band === 'hot') {
    const painLine = hot.length
      ? `The founder walked through their current channel and where it's breaking down, describing clear pain around ${hot.slice(0, 2).join(' and ')}.`
      : `The founder walked through their current channel and where it's breaking down, describing several pain points the platform is built to address.`;
    const nextLine = hasNextStep
      ? `A concrete 30-minute follow-up was agreed for next week, with the onboarding walkthrough and sample listings to land beforehand.`
      : `The team is close to a follow-up commitment, though nothing was placed on the calendar yet.`;
    return `${c} presented a strong buying case in this conversation, with the founder speaking openly about what isn't working today. ${painLine} Kaffea-X mapped its onboarding motion to the gaps raised, and the discussion moved past introductions into specifics quickly. ${nextLine} Scored HOT because multiple qualifying signals fired against the rubric and a committed next step landed on the call.`;
  }
  if (band === 'warm') {
    const sigLine = warm.length
      ? `Signals around ${warm.slice(0, 2).join(' and ')} came up naturally, and the team took time to describe how they work today.`
      : `A handful of secondary signals came up, and the team took time to describe how they work today.`;
    const nextLine = hasNextStep
      ? `A lighter-touch follow-up was agreed — an overview to review at their own pace, with an open door to a deeper walkthrough later.`
      : `No firm follow-up was set, but the door was left open for the team to reconnect on their own timing.`;
    return `${c} is exploring the space with real intent, though the buying case isn't fully framed yet. ${sigLine} Kaffea-X shared what a fit would look like without leaning into a hard pitch, and the conversation had genuine give-and-take. ${nextLine} Scored WARM because the interest is real but the top-tier buying trigger hasn't fired.`;
  }
  return `${c} joined the conversation but no qualifying signals surfaced against the rubric. The team isn't in an active evaluation window right now, and the discussion stayed at the level of general orientation to the platform. Kaffea-X shared context on how the product works without pushing for a commitment, and the tone remained informational throughout. No next step was agreed on the call and no material was requested in follow-up. Scored COLD — worth keeping the relationship warm through occasional updates, but not worth active pursuit at this time.`;
}

/** Build the band-keyed recap email (subject + body). */
export function buildRecap(band: Band, company: string): RecapEmail {
  const c = company || 'your roastery';
  if (band === 'hot')
    return {
      subject: `Next steps for ${c} on Kaffea-X`,
      body: `Hi,\n\nGreat speaking today — the distribution and pricing-visibility gaps you described are exactly what Kaffea-X is built to close. As promised, I'll send a short onboarding walkthrough with sample listings so you can see how ${c}'s lots would appear to buyers.\n\nI've got us down for 30 minutes Thursday next week — calendar invite to follow.\n\nBest,\nMohan`,
    };
  if (band === 'warm')
    return {
      subject: `${c} × Kaffea-X — a quick overview`,
      body: `Hi,\n\nThanks for the conversation today. I'm attaching an overview of how Kaffea-X helps roasters like ${c} reach buyers and benchmark pricing. Have a look when it's convenient and let me know if a walkthrough would help.\n\nBest,\nMohan`,
    };
  return {
    subject: `Keeping in touch — Kaffea-X for ${c}`,
    body: `Hi,\n\nThanks for your time today. No rush at all — I'll add you to our occasional updates so ${c} stays in the loop, and I'm here whenever the timing is right.\n\nBest,\nMohan`,
  };
}

/** Build the human meeting title for a band + company. */
export function buildMeetingTitle(band: Band, company: string): string {
  const c = company || 'prospect';
  if (band === 'hot') return `Discovery call — ${c}`;
  if (band === 'warm') return `Intro conversation — ${c}`;
  return `Intro touchpoint — ${c}`;
}

/** The four record fields produced by extraction, before id/when/committed. */
export type NormalizedRecord = Pick<
  MeetingRecord,
  'contact' | 'summary' | 'lead_score' | 'recap_email'
>;

/** Loose shape accepted by `normalize` — every field optional / defaulted. */
export interface NormalizeInput {
  contact?: Partial<Record<keyof Contact, Partial<ConfidentField>>>;
  summary?: Partial<Summary>;
  lead_score?: { band?: string; detected_signals?: DetectedSignal[]; rationale?: string };
  recap_email?: Partial<RecapEmail>;
}

/** Coerce a raw extraction payload into a well-formed record shape. */
export function normalize(p: NormalizeInput): NormalizedRecord {
  const cf = (o?: Partial<ConfidentField>): ConfidentField => ({
    value: o?.value || '',
    confidence: (o?.confidence || 'low') as Confidence,
  });
  const rawBand = p.lead_score?.band;
  const band: Band = rawBand && BAND_ORDER.includes(rawBand as Band) ? (rawBand as Band) : 'cold';
  return {
    contact: {
      name: cf(p.contact?.name),
      company: cf(p.contact?.company),
      title: cf(p.contact?.title),
      email: cf(p.contact?.email),
    },
    summary: {
      meeting_title: p.summary?.meeting_title || '',
      narrative: p.summary?.narrative || '',
      attendees: p.summary?.attendees || [],
      topics: p.summary?.topics || [],
      decisions: p.summary?.decisions || [],
      open_questions: p.summary?.open_questions || [],
      next_steps: p.summary?.next_steps || [],
      commitments: p.summary?.commitments || [],
    },
    lead_score: {
      band,
      detected_signals: p.lead_score?.detected_signals || [],
      rationale: p.lead_score?.rationale || '',
    },
    recap_email: { subject: p.recap_email?.subject || '', body: p.recap_email?.body || '' },
  };
}

export async function runProcessing(transcript: string, rubric: Rubric): Promise<NormalizedRecord> {
  await new Promise<void>((r) =>
    setTimeout(r, PROCESSING_MIN_MS + Math.random() * PROCESSING_JITTER_MS),
  );
  const detected = detectSignals(transcript, rubric);
  const nextStep = detectNextStep(transcript);
  const band = applyBanding(detected, nextStep);
  const company = CURATED.contact.company.value;
  return normalize({
    contact: CURATED.contact,
    summary: {
      ...CURATED.summary,
      narrative: buildNarrative(band, company, detected, nextStep),
    },
    lead_score: {
      band,
      detected_signals: detected.map(({ id, label, evidence, weight }) => ({
        id,
        label,
        evidence,
        weight,
      })),
      rationale: buildRationale(detected, band, nextStep),
    },
    recap_email: buildRecap(band, company),
  });
}
