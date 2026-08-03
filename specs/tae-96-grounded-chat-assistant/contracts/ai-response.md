# Contract: AI answer JSON

**Schema**: `src/schemas/chat-answer.schema.ts`
**Processor**: `src/lib/utils/grounded-chat.utils.ts`
**Related**: [prompt.md](./prompt.md) · [data-model.md](../data-model.md)

What the model must return, and what happens to it before a user sees anything. This contract is where SC-001 is mechanically enforced.

---

## Required shape

A single JSON object. No prose outside it, no code fences, camelCase keys (§XVIII).

```json
{
  "inScope": true,
  "coveredInMeeting": true,
  "answer": "They have no visibility on wholesale pricing — they said they're \"either too expensive or leaving money on the table\" because they don't know what other roasters charge.",
  "evidenceSpans": [
    "we have no idea what other roasters charge wholesale, so we're either too expensive or leaving money on the table"
  ],
  "unanswerablePart": null
}
```

## Zod schema

```ts
export const ChatAnswerSchema = z.object({
  inScope: z.boolean(),
  coveredInMeeting: z.boolean(),
  answer: z.string().min(1),
  evidenceSpans: z.array(z.string().min(1)).default([]),
  unanswerablePart: z.string().nullable().default(null),
});
```

Cross-field rule enforced after parsing, not in the schema: **`inScope: true` requires at least one `evidenceSpans` entry.** An in-scope answer with no evidence is unverifiable, so it is treated as unusable output — retry, then `malformed_response`. (`coveredInMeeting: false` is the one exception: "the meeting did not discuss this" is a claim about absence and has nothing to quote.)

---

## Field semantics

### `inScope`

`false` when the question cannot be answered from this meeting's transcript and analysis at any level: general world facts, organisations never named, generic sales advice, other meetings, pipeline questions, instruction-override attempts.

`true` when the question is about this meeting — even if the meeting never covered the specific topic. That case is `inScope: true, coveredInMeeting: false`.

Governs SC-002 (≥95% of adversarial questions refused).

### `coveredInMeeting`

Only meaningful when `inScope` is `true`.

- `true` — the meeting addressed the topic and `answer` reports what was said.
- `false` — the topic belongs to this meeting's world but was never discussed. `answer` says so plainly. `evidenceSpans` may be empty.

Governs SC-003. Keeping this separate from `inScope` is what lets the evaluation tell a guardrail failure apart from a recall failure — collapsing them into one flag would make both criteria unmeasurable.

### `answer`

The full user-facing text, for every combination:

| State | What `answer` contains |
|---|---|
| in scope, covered | The grounded answer, with the specific figures, dates, names, and phrasing as stated. |
| in scope, not covered | An explicit statement that the meeting did not cover it. No speculation. |
| out of scope | A refusal naming the boundary: it can only answer from this meeting. |
| partly answerable | The grounded part, plus explicit identification of the part it cannot address (FR-010). |

Grounding must be visible here (FR-005) — quoting or pointing at what was said, not just asserting a conclusion. This is the field the user reads; `evidenceSpans` is machine-facing.

### `evidenceSpans`

Verbatim extracts from the grounding material supporting every factual claim in `answer`. Verbatim is load-bearing: a paraphrase cannot be verified, and an unverifiable span is indistinguishable from a fabricated one.

- One entry per distinct supporting passage.
- May come from the transcript or from any analysis text field.
- Long enough to be unambiguous, short enough to be a quote — roughly one sentence, not a paragraph.
- Empty only when `inScope` is `false` or `coveredInMeeting` is `false`.

### `unanswerablePart`

For a partly-answerable question, the portion outside the meeting's content. `null` when the question was fully answerable. `answer` must independently mention this too — the field is for evaluation and future use, not a substitute for saying it to the user.

---

## Processing pipeline

`processChatResponse(rawText, context)` — pure, provider-agnostic, mirroring `processStructuredResponse`.

1. **Strip fences.** Remove a leading ` ```json ` / ` ``` ` and trailing ` ``` `, then trim.
2. **Parse.** `JSON.parse`; on failure, run the existing `repairJson` and retry once. Both failing ⇒ `malformed_response`.
3. **Validate.** `ChatAnswerSchema.safeParse`. Failure ⇒ `malformed_response` with the Zod issues logged (structure only, never values).
4. **Cross-field check.** `inScope && !coveredInMeeting === false && evidenceSpans.length === 0` ⇒ `malformed_response`.
5. **Verify evidence.** Skipped when `inScope` is false. Otherwise every span must be found in the normalised haystack.
6. **Return** a `ChatAnswerResult` or `ChatRefusalResult`.

Provider wrappers retry the whole call up to `MAX_CHAT_ATTEMPTS` (2) when the category is `malformed_response`, then return the failure — the same retry discipline `summarizeStructured` already uses for malformed analysis output.

---

## Evidence verification algorithm

```
normalise(s) = s.replace(/\s+/g, ' ').trim().toLowerCase()

haystack = normalise(
  cleanedTranscript
  + summary.narrative
  + summary.whatWeHeard.join(' ')
  + summary.whatWasCovered.join(' ')
  + summary.whatWasDecided.join(' ')
  + summary.actionItems.flatMap(a => [a.description, a.owner, a.dueDate ?? '']).join(' ')
  + summary.attendees.map(a => a.name).join(' ')
  + leadScore.rationale
  + leadScore.detectedSignals.flatMap(s => [s.label, s.evidence]).join(' ')
)

verified = evidenceSpans.every(span => haystack.includes(normalise(span)))
```

**Why normalise.** Whitespace collapsing survives the transcript's line breaks and the model re-wrapping a quote; lowercasing survives sentence-case drift at a span boundary. Neither weakens the check meaningfully — a fabricated sentence does not become a substring of the transcript by being lowercased.

**Why whole-answer rejection rather than span-dropping.** `processStructuredResponse` drops a hallucinated signal and keeps the rest, because signals are independent list items. Here the prose *depends* on its evidence: dropping an unverified span would leave a claim standing with its support removed. So the answer is rejected entirely.

**Known limitation.** Verification proves the span exists in the meeting; it does not prove the span *supports* the claim, or that the claim is a faithful reading of it. A model could quote accurately and still characterise it wrongly. That residual risk is what SC-001's manual review catches — the automated check eliminates outright invention, which is the failure mode that matters most and the one a human reviewer is worst at spotting.

---

## Prompt-side requirements

The output-contract section of the system prompt must state, in this order (see [prompt.md](./prompt.md)):

1. Return only JSON, parseable by `JSON.parse`, no text outside it.
2. camelCase keys exactly as specified.
3. `evidenceSpans` must be **copied character-for-character** from the transcript or analysis. Paraphrase is a contract violation, and an answer whose spans cannot be located is discarded.
4. Set `inScope: false` rather than answering from outside knowledge.
5. Set `coveredInMeeting: false` rather than inferring what was probably discussed.
6. One worked example of each of: in-scope answered, in-scope not covered, out-of-scope refused, partly answerable.

Point 3 is the one to state most plainly — telling the model its output is mechanically checked measurably improves span fidelity, and it is also simply true.
