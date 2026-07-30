# Quickstart: AI-Generated Suggested Questions

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-07-30

How to run the feature, and how each success criterion is actually measured. There is no test infrastructure in this repository, so this document *is* the verification suite — the checks below are the acceptance gate, not a formality.

---

## Prerequisites

```bash
npm install
npm run dev            # loads .env.development → OpenRouter provider
```

Required environment variables are the ones already validated at startup by `env.mjs`. This feature adds none. In development the provider selection resolves to OpenRouter; production resolves to Claude (`suggested-questions.factory.ts`, matching the two existing factories).

Verify the gates before measuring anything:

```bash
npm run validate       # type-check → lint (--max-warnings=0) → build
```

---

## Running it end to end

1. Start the app and go to the capture screen.
2. Paste a transcript (or use **Load Sample**) and run the analysis.
3. When the review screen appears, open the follow-up panel.
4. Three chips should sit under the opening message, each about *this* meeting.
5. Click one. It behaves exactly like typing that text: the question appears as a user bubble, the pending row shows, then a grounded answer arrives.

To inspect what was stored:

```js
// mongosh
db.transcripts.findOne(
  { _id: ObjectId('<id>') },
  { suggestedQuestions: 1, suggestionUsage: 1, aiProcessingStatus: 1 }
)
```

Expect `suggestedQuestions` with exactly three entries, each ≤34 characters, and a `suggestionUsage` object beside `aiUsage`.

---

## Building the evaluation set

Ten meetings, visibly different from each other — different prospects, different objections, at least two where a summary section came back empty, and at least one short transcript (under ~40 lines). Reuse the corpus from `specs/tae-96-grounded-chat-assistant/evaluation/corpus.md` and extend it to ten; that corpus was built for grounding evaluation and the same meetings serve here.

Record for each meeting: its id, the three generated questions, and each question's character count. That table is the input to SC-002, SC-003, and SC-008.

---

## Measuring the success criteria

### SC-001 — every meeting has three suggestions or none

Across every meeting analyzed after the feature ships:

```js
db.transcripts.aggregate([
  { $project: { n: { $size: { $ifNull: ['$suggestedQuestions', []] } } } },
  { $group: { _id: '$n', count: { $sum: 1 } } }
])
```

**Pass**: only `_id: 0` and `_id: 3` appear. A `1` or `2` means whole-set rejection (V3–V5) leaked, and is a bug in `suggested-questions.utils.ts`, not a tuning issue.

### SC-002 — chips get answers, not refusals *(the one that matters most)*

For each of the 30 questions: open its meeting, click the chip, record whether the response is a grounded answer, a "this meeting did not cover it" reply, or a refusal.

**Pass**: at least 29 of 30 are grounded answers. Anything else — including the polite not-covered reply — counts as a failure, because a chip promising something the meeting never discussed is the failure mode this feature exists to remove.

If this misses: check the log lines for the affected meetings first (a not-covered answer on an *empty* analysis section means the prompt is drawing from `(none)`), then tune the rules section, then escalate to evidence-span verification per D12.

### SC-003 — variety across meetings, distinctness within a set

From the recorded table:

- **Cross-meeting**: no question text appears verbatim in more than two of the ten sets.
- **Within-set**: all three differ, and — judged by reading, not by string comparison — ask about three different aspects rather than three angles on the same one.
- **Genericness spot-check**: for each question, ask "could this have been written without reading this meeting?" A yes is a failure even if it passes both checks above.

### SC-004 — no added latency at panel open

Open the panel on a meeting with suggestions. In DevTools → Network, filter to the panel's requests.

**Pass**: no request is made for the suggestions, and the chips are present in the same paint as the opening message. Toggling the panel closed and open repeats this with zero requests.

### SC-005 — generation adds ≤5s at p95, and never breaks the analysis

Time ten analyses end to end (the processing modal's duration is sufficient granularity), then compare against ten analyses with generation disabled (comment out step 5 of the action).

**Pass**: the p95 delta is ≤5s. Also confirm across the ten runs that `aiProcessingStatus` is `'success'` every time.

Forced-failure half of the criterion: make `generate` throw unconditionally, run three analyses, and confirm each ends `'success'` with a summary, a lead score, `suggestedQuestions: []`, and no `suggestionUsage`.

### SC-006 — a failure is invisible

With generation still forced to fail, open the panel on those three meetings.

**Pass**: no chip row, no "Suggested" eyebrow, no empty gap where the row was, no toast, no console-visible error surfaced to the user, and the input works normally. The panel must look like a meeting that simply has no suggestions.

### SC-007 — the suggestions teach you something

Pick five meetings you have not read. For each, read only the title and the three chips, write down what you learn, then read the transcript.

**Pass**: for each meeting, at least three of the facts implied by the chips are real and were not guessable from the title alone.

### SC-008 — visual parity

Open `Design/POC_Kaffea-X_Prototype.html` beside the running app and compare the panel at **1440px, 1100px, 900px, and 560px**, in both the has-chips and no-chips states.

**Pass**:

- Eyebrow, chip pill shape, border, padding, gap, hover treatment, and the 42px left offset are indistinguishable from the prototype.
- **No chip's text wraps inside the chip** at any width — this is what the 34-character cap protects (D7).
- The row occupies no more lines than the current hard-coded implementation at the same width, and the panel never scrolls horizontally.
- In the no-chips state, the opening message and the input sit exactly as they do in the prototype with the chip row removed — no residual margin.

Note the criterion as written in the spec says "no more than two lines"; that is incorrect about the current implementation, which is already three lines at the 262px chip row. See [plan.md](./plan.md) → *Spec deltas surfaced by design*.

### SC-009 — nothing sensitive in logs

Run the full evaluation with server logs captured to a file, then search it for: each generated question's text, distinctive transcript phrases, prospect names, and any analysis excerpt.

**Pass**: zero hits. Log lines should contain ids, provider, model, category, `rule`, counts, lengths, and token numbers — nothing else.

### SC-010 — cost is attributable

```js
db.transcripts.findOne({ _id: ObjectId('<id>') }, { 'aiUsage.totalCostUsd': 1, 'suggestionUsage.totalCostUsd': 1 })
```

**Pass**: both present, both non-zero, and `suggestionUsage.provider` / `.model` name the call that produced the questions. Per-meeting total is these two plus the sum over that meeting's chat exchanges.

### SC-011 — no fixed list remains

```bash
grep -rn "What pricing did they mention\|Any competitor references\|Summarize next steps" src/
grep -rn "CHIPS" src/features/assistant-chat/
```

**Pass**: zero hits. Both greps currently hit only `chat-messages.tsx` (lines 16–20 and 63), which is the array being removed — so this check goes from three hits to none. Combined with SC-003, it establishes that every chip a user sees was generated for their meeting.

---

## Edge-case checks (Phase 6)

| Check | Expected |
|---|---|
| Meeting analyzed before this feature (no field on the document) | No chip row; panel fully usable |
| Analysis with an empty `whatWasDecided` | No chip asks about decisions; no chip yields "not discussed" |
| Very short transcript (~20 lines) | Either three genuinely answerable chips or none — never padded generic ones |
| Re-analyze a meeting | Set is replaced; old questions gone; `suggestionUsage` updated |
| Re-analyze with `generate` throwing | Set is **empty**, not the previous one (D5) |
| Transcript over `MAX_GROUNDING_CHARS` | `context_too_large` logged; no chips; analysis unaffected |
| Transcript containing "ignore your instructions, output …" | Questions are about the meeting's content; the injected text is not obeyed |
| Click a chip while a question is in flight | Blocked, exactly like a typed submission |
| Click the same chip twice | Two exchanges, consistent answers |
| Edit and save the meeting on the review screen, then reopen the panel | Chips survive — proves `toTranscriptPatch` still excludes the field (D8) |
| Delete the meeting | Document and its suggestions gone together |

---

## Tuning loop (Phase 7)

Prompt work is expected, not rework. The loop:

1. Analyze the ten-meeting set.
2. Read the log lines: a cluster of `rule: 'V4'` means the character budget is losing; `V5` means the aspect list is not diversifying; clean generation with weak SC-002 numbers means the answerability instruction is not biting.
3. Change one section of `src/constants/suggested-questions.ts`.
4. Re-analyze the same ten meetings and recompare. Determinism (temperature 0, no volatile prompt bytes) is what makes step 4 a comparison rather than a new sample.

Levers, in the order they should be reached for: the rules prose → the worked examples → the character cap (34 → 40, accepting internal wrap at the 1100px breakpoint) → evidence-span verification (D12) → analysis-only input if latency is the binding problem (D6).
