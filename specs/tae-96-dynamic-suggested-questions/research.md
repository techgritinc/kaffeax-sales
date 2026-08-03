# Phase 0 Research: AI-Generated Suggested Questions

**Feature**: [spec.md](./spec.md) | **Date**: 2026-07-30

Every decision below was taken against the existing code on `feat/chat-panel`, not in the abstract. The grounded chat assistant (`specs/tae-96-grounded-chat-assistant/`) already established the provider-pair + factory pattern, the grounding projection, and the cost-recording shape; this feature reuses all three rather than inventing parallel ones.

---

## D1 — Separate AI request, not a third field on the summarization contract

**Decision**: Generate suggestions with a dedicated AI request after the summary is stored. Do **not** add a `suggestedQuestions` field to the structured summarization output contract.

**Rationale**:

1. **Failure isolation is the feature's hardest requirement, and only a separate call gives it structurally.** FR-022 says a suggestion failure must not touch the analysis. If suggestions ride in the summarization JSON, a malformed or over-length suggestion array is a malformed *analysis* response — `processStructuredResponse` rejects the whole object, `runAiSummarization` retries, and eventually marks `aiProcessingStatus: 'failed'`. A meeting would lose its summary because a question was 40 characters long. Guarding against that means loosening the summarization parser, which weakens the analysis contract to serve a decorative feature.
2. **The analysis prompt is tuned and evaluated output.** `buildSummarizationPrompt` and its scoring rubric are the subject of TAE-82. Adding a third top-level output field changes token distribution and attention for a prompt whose summary/score quality is measured elsewhere. The spec's Out of Scope line ("no changes to the analysis prompt's summary or scoring output contract") exists for this reason, and it decides D1.
3. **Cost attribution stays honest.** A separate call has its own `usage`, so per-meeting cost splits into analysis vs. suggestions (FR-025). Folded in, the two are inseparable.

**What it costs**: one extra request per analysis, its input being the same transcript the summarizer just read. That is the real price of this decision — see D6 for the latency budget and D3 for accounting.

**Alternatives considered**:

- **Extend the summarization contract** — rejected above. This also contradicts the spec's Out of Scope, which the Assumptions section had left open as "an architecture decision"; the Out of Scope line wins and the ambiguity is resolved here.
- **Extend `MeetingChat.ask()`** (the feature request offered this as an option) — rejected. `ask` returns `inScope`/`coveredInMeeting`/`evidenceSpans` and is bound by the refusal guardrail. Suggestion generation shares none of that contract and is not user-facing, so overloading `ask` would mean a discriminant parameter, two response shapes, and a guardrail prompt doing a job it was not written for. §V and §XV both point the other way.
- **A third client-triggered call when the panel opens** — rejected by the spec (FR-002/FR-003, SC-004).

---

## D2 — Generation lives in `runAiSummarization`, after a durable analysis write

**Decision**: Orchestrate in `src/features/workflow/actions/transcript-ai.actions.ts`. Sequence:

1. On a re-run, the existing "mark pending" write also clears `suggestedQuestions` and `suggestionUsage` (see D5).
2. Summarize. On failure, behave exactly as today.
3. **Write the analysis** (`title`, `summary`, `leadScore`, `aiProcessingStatus: 'success'`, `aiUsage`) — unchanged from today.
4. *Then* generate suggestions, inside its own `try`/`catch`.
5. On a valid set, a **second** write patches `suggestedQuestions` and `suggestionUsage`.
6. Return the record from step 5 if it happened, otherwise the record from step 3.

**Rationale**: FR-022 becomes structural rather than intentional — by the time suggestion generation is attempted, the analysis is already committed with `aiProcessingStatus: 'success'`. No suggestion failure path, including a crash or a cold process, can reach back and undo it. The alternative ordering (generate, then one combined write) holds a completed analysis in memory across a second network call, so a timeout there loses a summary the user already paid for.

The cost is one extra `findByIdAndUpdate` per analysis, on a document already in the working set. That is a rounding error next to the two AI calls, and it buys the guarantee.

**Alternatives considered**:

- **One combined write** — rejected: cheaper by one write, but makes analysis durability depend on suggestion success.
- **Inside the summarizer integration** — rejected: `src/integrations/` must not perform repository writes, and the integration classes are deliberately transport-only.
- **Fire-and-forget after returning the record** — rejected twice over: `@typescript-eslint/no-floating-promises` is an error (§III/XIV), and a detached promise in a server action has no guaranteed lifetime, so "available when the panel opens" would become a race the user can lose.

---

## D3 — Cost lands in a sibling `suggestionUsage` field, not summed into `aiUsage`

**Decision**: Add `suggestionUsage?: AiUsage` to the transcript, reusing the already-exported `aiUsageSchema` from `transcript.model.ts`.

**Rationale**: FR-025 asks for recording "consistently with how the analysis step records its own" — the same shape in the same document is exactly that, and `aiUsageSchema` was already exported for reuse by `chat-exchange.model.ts`, so there is a precedent to follow rather than a pattern to invent. Per-meeting total cost becomes `aiUsage + suggestionUsage + Σ(exchange.usage)`: three addends, each attributable to the call that incurred it.

**Alternatives considered**:

- **Sum into `aiUsage`** — rejected: destroys attribution, and `aiUsage.model` would silently describe two calls.
- **Nest a `usage` map keyed by call type** — rejected: a schema migration for the existing field, for no gain at two call types.
- **Don't record it** — rejected outright by FR-025 and SC-010.

---

## D4 — Suggestions live on the transcript document, not in their own collection

**Decision**: `suggestedQuestions: { type: [String], default: [] }` on `transcriptSchema`.

**Rationale**: The parent feature put conversations in a separate `chatexchanges` collection because `getTranscripts()` returns full documents for the recents sidebar, and unbounded conversation history would have been dragged into every list render. Neither half of that argument applies here: three strings capped at 34 characters is ~110 bytes, bounded forever, and those same documents already carry `originalTranscript` and `cleanedTranscript` in full — tens of kilobytes each. The marginal payload is noise against what the query already moves.

It also delivers FR-005 for free: suggestions are deleted with their meeting because they *are* their meeting's document. No cascade, no orphan class, nothing for `deleteTranscript` to coordinate.

**Alternatives considered**:

- **A `suggestedquestions` collection** — rejected: a second repository, a second read on the panel path, and a cascade to maintain, all to store 110 bytes with a one-to-one lifetime.
- **Inside the `summary` sub-document** — rejected: `toTranscriptPatch` rewrites `summary` wholesale from the view-model on every `updateTranscript` call, so a suggestion nested there would be wiped by an unrelated edit. Top-level keeps it out of that write path (see D8).

---

## D5 — Clear on re-run, so a failed regeneration never leaves a stale set

**Decision**: The existing "reset to pending" write in `runAiSummarization` — which today fires only when `aiProcessingStatus !== 'pending'` — also sets `suggestedQuestions: []` and unsets `suggestionUsage`.

**Rationale**: FR-004 says re-analysis replaces the set completely. If clearing happened only in the success write, a re-analysis whose summary succeeded but whose suggestion call failed would leave the *previous* analysis's questions on screen, pointing at content the new analysis may no longer contain. Clearing at the start makes the invariant "the stored set was generated from the currently stored analysis" true at every instant, including mid-run and after any failure. On a first run the field is already `[]` by schema default, so no extra write appears on the common path.

**Alternatives considered**:

- **Clear only in the success write** — rejected: the stale-set window above.
- **Version-stamp the set against the analysis** — rejected: solves the same problem with a comparison at every read instead of a clear at one write. YAGNI (§XV).

---

## D6 — Latency budget: the input dominates, so cap output and skip oversized meetings

**Decision**: `SUGGESTION_MAX_TOKENS = 512`, `SUGGESTION_EFFORT = 'low'` (Claude), `temperature: 0` (OpenRouter), and reuse the existing `MAX_GROUNDING_CHARS` ceiling — over it, skip generation entirely rather than truncate.

**Rationale**: SC-005 allows 5s at p95. The output is ~150 characters of JSON, so generation time is dominated by reading the transcript, which is the same input the summarizer just processed — a known, already-measured quantity for any meeting that got this far. `effort: 'low'` matches the chat call's reasoning: picking three questions from material in context is retrieval, not deep reasoning. The 512-token cap sits far above the output and leaves headroom for adaptive thinking without letting it run.

Reusing `MAX_GROUNDING_CHARS` keeps one ceiling in the codebase instead of two that can drift. Above it the correct behaviour is *no suggestions*, never suggestions from a truncated read — the same principle the parent spec applies to answers, and here it is free because absence is already a supported state.

**Prompt caching is deliberately not used.** The suggestion prompt's prefix differs from the chat guardrail, so a cache write here can never be read by a later question, and the write itself costs 1.25×. Nothing would read it before it expired.

**Alternatives considered**:

- **Analysis-only input** (skip the transcript) — cheaper and faster, and tempting. Rejected: FR-007 requires both, and the analysis alone cannot supply the verbatim specifics ("the six-to-eight-week timeline") that make a suggestion feel like it is about *this* call. Kept as the documented lever if SC-005 fails in practice.
- **Non-zero temperature for variety** — rejected: variety comes from the input (a different meeting), and D9 fixes the set per meeting, so determinism costs nothing and makes SC-002/SC-003 reproducible across evaluation runs.

---

## D7 — Length cap of 34 characters, derived from the panel, enforced in code

**Decision**: `MAX_SUGGESTION_CHARS = 34`. Validation rejects a set containing any longer question; the prompt states the budget and demonstrates it.

**Rationale** — the arithmetic, so it can be rechecked when the layout changes:

| Quantity | 340px chat column | 300px column (≤1100px) |
|---|---|---|
| Column width (`shell-cols.ts`) | 340px | 300px |
| − panel padding (`p-[20px_18px]`) | 304px | 264px |
| − chip row offset (`ml-[42px]`) | 262px | 222px |
| − chip padding + border (`px-[12px]`, 1px) | 236px | 196px |
| ÷ ~5.5px per char (Figtree semibold, 11.5px) | ~43 chars | **~35 chars** |

The 300px column binds. At 34 characters a chip's text stays on one line at every supported width, which is what preserves the pill shape the prototype specifies (§XII). For calibration, the three hard-coded chips being replaced are 30, 26, and 20 characters — the cap is not a new constraint, it is the existing design measured.

Enforcing it in code rather than trusting the prompt follows the parent feature's principle: prompts govern taste, deterministic checks govern contracts.

**This corrects SC-008.** The criterion says the chip row "never wraps to more than two lines". At 262px, chips of 30/26/20 characters measure ~191/~169/~136px, so no two fit on a line — *today's* row is already three lines. The measurable intent is: no chip's text wraps inside the chip, and the row occupies no more lines than the current implementation at the same width. Flagged in [plan.md](./plan.md#spec-deltas-surfaced-by-design) for confirmation rather than silently reinterpreted.

**Alternatives considered**:

- **No cap, let chips wrap internally** — rejected: a two-line pill is a visible layout change (FR-021, SC-008).
- **Cap at 60 chars** as the feature request's examples imply ("What pricing concerns did the customer raise?" is 45) — rejected: those wrap inside the chip at both column widths. The examples in the request are illustrative of *content*, not of length.
- **Truncate with an ellipsis** — rejected: a truncated question is a different question, and clicking it sends the truncation.

---

## D8 — Delivery: one new field on `MeetingRecord`, no new fetch

**Decision**: `MeetingRecord` gains a top-level `suggestedQuestions: string[]`, mapped by `toMeetingRecord`. `app-shell.tsx` passes `wf.draft.suggestedQuestions` to `ChatPanel`, which passes it to `ChatMessages`. `toTranscriptPatch` does **not** include it.

**Rationale**: The panel already receives `openingMessage`, derived from the same `wf.draft` record; suggestions travel the identical path, so they are present in the first render with no request at panel-open (FR-002, SC-004). `toMeetingRecord` is the only place `MeetingRecord` is constructed in the codebase, so the new required field costs exactly one edit.

Top-level rather than inside `summary` is load-bearing: `toTranscriptPatch` rebuilds `summary` from the view-model on every `updateTranscript`, so a field nested there would be silently erased whenever a user edited the review screen. Keeping it out of `toTranscriptPatch` entirely means partial-patch semantics preserve it. **Adding `suggestedQuestions` to `toTranscriptPatch` would let a stale client wipe a generated set** — the one trap in this design worth a comment in the code.

**Alternatives considered**:

- **Own the suggestions in `use-meeting-chat`** — rejected: they are static per meeting and never mutate, so hook state would add a lifecycle to a constant.
- **Fetch them in a server action on panel open** — rejected by FR-002 and SC-004.

---

## D9 — Stability per meeting is the design, not a limitation

**Decision**: A meeting shows the same three questions on every open, for as long as its analysis stands.

**Rationale**: The feature request asked for "randomized" suggestions *and* for pre-generation during analysis. Pre-generation is what buys the zero-extra-call, zero-latency property the request selected it for; that choice necessarily fixes the set. Variety therefore means across meetings (FR-012, SC-003), not across opens. Determinism is also what makes the evaluation in [quickstart.md](./quickstart.md) repeatable, and re-asking a suggestion is already specified as behaving like re-asking any question.

**Alternatives considered**:

- **Generate a pool of 6–9 and sample 3 per open** — the only way to get per-open freshness while keeping one AI call. Rejected as out of scope, but it is the cheapest upgrade path if users report staleness: storage widens, sampling is client-side, and nothing else in this design changes.
- **Regenerate on each open** — rejected: reinstates the runtime call the feature exists to remove.

---

## D10 — Provider pair + factory, mirroring `meeting-chat`

**Decision**: `src/integrations/claude/suggested-questions.ts`, `src/integrations/openrouter/suggested-questions.ts`, and `src/integrations/suggested-questions.factory.ts` exposing `SuggestedQuestionsLike { generate(context: GroundingContext): Promise<SuggestedQuestionsResponse> }`. Prompt assembly and response validation live in `src/lib/utils/`, shared by both.

**Rationale**: This is the third instance of a pattern the repo has already settled twice (`transcript-summarizer.factory.ts`, `meeting-chat.factory.ts`): env-selected provider, structural interface, shared pure utils in `lib/utils` because `src/integrations/` may not import from a feature. Error mapping reuses `handleSdkError` and `mapHttpError` unchanged — both already return the category vocabulary this feature needs.

Named `suggested-questions.ts` rather than the request's `suggestion-generator.ts` so the file matches the domain noun used by the field, the type, and the constants, consistent with how `meeting-chat.ts` is named.

---

## D11 — Two rejection classes, because they mean different things

**Decision**: `malformed_response` for output that is not parseable JSON matching the schema; a new `rejected_set` for well-formed JSON that fails the semantic rules (wrong count, over-length, non-distinct). Retry once on either (`MAX_SUGGESTION_ATTEMPTS = 2`).

**Rationale**: The distinction is diagnostic, and it is the same reasoning the parent feature used to keep `inScope` and `coveredInMeeting` separate: unparseable output is a generation glitch, while a well-formed set that breaks the rules is a *prompt* problem — most likely the 34-character budget. Collapsing them would leave the logs unable to say which, and D7's cap is exactly the kind of constraint that needs that signal.

One retry, not zero: a failure means no chips ever for that meeting (there is no backfill), and the retry only fires in the rare case, so p95 latency is untouched even though p99 doubles.

**Rejection is whole-set** (FR-014): three valid questions minus one over-length question is not two chips, it is no chips. `SUGGESTED_QUESTION_COUNT = 3` is the only accepted length.

---

## D12 — Answerability is a prompt obligation with an evaluation gate, not a code check

**Decision**: FR-006 (every suggestion must be answerable from the meeting) is enforced by prompt instruction plus SC-002 measurement. It is **not** verified in code at generation time.

**Rationale**: Verifying answerability mechanically would mean asking the model each candidate question and checking for a refusal — three extra AI calls per meeting, tripling the cost and latency of a feature whose entire justification is avoiding extra calls. The cheap proxy available is the parent feature's own evidence-span verification: instruct the model to name the span its question is answerable from, then verify that span with `normaliseForMatch` before accepting the set.

That is genuinely attractive and is the recommended escalation if SC-002 misses its bar, but it is not the first cut: it raises output tokens, adds a rejection class that will fire on paraphrase, and the parent feature's evaluation showed spans need tuning. First measure the plain prompt against SC-002 (29/30 suggestions must yield grounded answers); escalate to span verification only if it fails. Recorded as a lever, not a guess.

**Alternatives considered**:

- **Ask the assistant each generated question at analysis time and drop refusals** — rejected on cost/latency as above; also makes analysis depend on the chat path.
- **Nothing at all (prompt only, no measurement)** — rejected: FR-006 would be unfalsifiable, and a chip that produces a refusal is precisely the failure mode that makes the panel look broken.

---

## D13 — No user-facing message catalogue

**Decision**: Suggestion failures produce no user-facing string anywhere. `SuggestedQuestionsFailure.message` exists for logs only.

**Rationale**: FR-023 says the only user-visible consequence of any failure is the absence of the row. The parent feature needed `CHAT_ERROR_MESSAGES` because a failed answer must tell the user something; here, telling them anything is the defect. Worth stating explicitly because the surrounding code establishes the opposite habit, and a reviewer will look for the catalogue.

Logging follows FR-026: transcript id, provider, model, outcome, category, question *count* and *lengths*, token counts — never question text, transcript text, or analysis text. This is the one place where the no-content rule genuinely costs debuggability, which is why the rejection reason is a typed category (D11) rather than a message built from the offending string.

---

## D14 — Extract the chip row into its own component

**Decision**: New `src/features/assistant-chat/components/suggested-questions.tsx`, rendering the eyebrow label and the chips, or nothing.

**Rationale**: FR-017 (no set → no row *and* no heading) becomes a single early return in one file instead of a compound condition wrapped around two JSX blocks inside `chat-messages.tsx`. `chat-messages.tsx` is 92 lines and its map body is already the most conditional code in the feature; §V and §VI both favour the extraction, and the existing classes move across verbatim so §XII is unaffected.

---

## Summary of choices

| # | Decision |
|---|---|
| D1 | Separate AI request; the summarization contract is untouched |
| D2 | Orchestrated in `runAiSummarization`, after a durable analysis write |
| D3 | Cost in a sibling `suggestionUsage` field |
| D4 | Stored on the transcript document; no new collection |
| D5 | Cleared when a re-run starts, so a stale set is impossible |
| D6 | `max_tokens` 512, effort low, temperature 0, existing size ceiling, no caching |
| D7 | 34-character cap derived from the 300px chat column, enforced in code |
| D8 | Top-level field on `MeetingRecord`; excluded from `toTranscriptPatch` |
| D9 | Stable per meeting; variety is across meetings |
| D10 | Provider pair + factory, mirroring `meeting-chat` |
| D11 | `malformed_response` vs `rejected_set`; one retry; whole-set rejection |
| D12 | Answerability via prompt + SC-002, with span verification held in reserve |
| D13 | No user-facing messages at all |
| D14 | Chip row extracted into its own component |
