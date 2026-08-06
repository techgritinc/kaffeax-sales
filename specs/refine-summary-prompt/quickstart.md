# Quickstart: Validating the Concise, Non-Redundant Call Summary

This is a manual validation guide — this repo has no automated test suite yet
(`CLAUDE.md`), and the output being validated is model-generated prose/lists, not
deterministic code. Use this after implementing the prompt changes described in
`plan.md` / `contracts/summary-output-contract.md`.

## Prerequisites

- `.env.development` configured per `CLAUDE.md` (requires `MONGO_URI` and the Claude/OpenRouter API credentials the app already uses for summarization).
- A sample call transcript to feed through the pipeline. The reported bug transcript
  ("Transcript 1" — the Jake Alvarado / Meridian Coffee call) is a good baseline because
  the current summary for it is the concrete example of both problems (wall-of-text
  narrative, and the duplicated "set up trial access" commitment).

## Setup

```bash
npm run dev
```

Open the app, go to the capture flow, and submit the sample transcript the same way a
real call would be captured (paste/upload → trigger AI processing), then open the
resulting entry's Review screen once processing completes.

## Before/after comparison

1. **Capture the "before" output** (if not already known from the bug report): note the
   current `narrative` text and the current `whatWasCovered` / `whatWasDecided` /
   `actionItems` lists for the sample transcript.
2. **Apply the prompt changes** to `src/constants/summarization.ts` per the contract.
3. **Regenerate** the summary for the same transcript.
4. **Compare** using the checklist below.

## Validation checklist

### Narrative structure (FR-001, SC-001)

- [ ] Reading only the `narrative`, can you point to the sentence(s) that answer "why did
      this meeting happen?" within a few seconds?
- [ ] Can you point to the sentence(s) covering "what mattered most"?
- [ ] Can you point to the sentence(s) covering "what remains unresolved" (or a clear
      statement that nothing remains unresolved, if that's true for this call)?
- [ ] The narrative reads as a synthesis, not a turn-by-turn retelling of the transcript.
- [ ] The narrative has no added headings, labels, or bullet points marking the three
      questions, and stays within the existing 1-2 paragraph format (clarified 2026-08-06).

### No cross-section duplication (FR-002–FR-005, SC-002)

- [ ] For every entry in `actionItems`, confirm the same fact does **not** also appear
      (verbatim or paraphrased) in `whatWasCovered` or `whatWasDecided`.
      For the sample transcript specifically: confirm "set up trial access for Grace and
      Elias" appears only under Action Items.
- [ ] For every entry in `whatWasDecided`, confirm it is not also restated in
      `whatWasCovered`.
- [ ] Spot-check 2-3 entries in `whatWasCovered` and confirm none of them are actually
      forward-looking owned commitments that belong in `actionItems` instead.

### No information loss (FR-006–FR-008, SC-003, SC-004)

Build a checklist of every guardrail, figure, deadline, and commitment explicitly stated
in the source transcript (for the sample transcript, this includes: the 87-point Huila
lot pricing anecdote, the 6,000 lbs/week volume figure, the 7-day free trial with no
trading enabled, the escrow payment-timing documentation request, the "no minimum
purchase commitment" detail, and the trial-access permission split between Elias and
Grace). Confirm every item on that list is still traceable somewhere in the new output
(narrative or structured fields).

- [ ] Every guardrail/constraint raised by either party is still present somewhere.
- [ ] Every figure (price, volume, percentage, date) is still present, verbatim, somewhere.
- [ ] Every commitment (who committed, to what, by when) is still present, precisely,
      somewhere.
- [ ] Word count of the new `narrative` is meaningfully shorter than the "before" capture
      for the same transcript (target: ≥50% reduction, per SC-003) — while the checklist
      above still passes in full.

### Regression check on unaffected fields

- [ ] `attendees`, `detectedSignals`, `leadScoreBand`, and `scoreRationale` are populated
      the same way they were before (this feature does not touch their logic).
- [ ] The Review screen (`summary-block.tsx`), Zoho export mapping
      (`zoho-field-map.ts`), and chat-assistant grounding (`grounding.utils.ts`) all still
      render/consume the output without error — they read the same field shapes as
      before.

## Expected outcome

All checklist items pass for at least the sample transcript, and ideally for 2-3
additional transcripts of varying length/complexity to confirm the fix generalizes
rather than being tuned to one example.
