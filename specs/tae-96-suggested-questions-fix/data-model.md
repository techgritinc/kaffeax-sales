# Phase 1 Data Model: Suggested Questions Reach the Panel

**Ticket**: TAE-96 | **Plan**: [plan.md](./plan.md) | **Date**: 2026-07-31

**No schema change and no migration.** Every field the feature needs already exists. This document records the entities, their validation rules, and the set's state transitions so the implementation has a single reference for what is and is not allowed to change.

---

## Entities

### Suggested Question Set

Exactly three self-contained natural-language questions belonging to one meeting. A meeting has a complete set of three or none — never one or two.

**Persistence** — `src/lib/db/models/transcript.model.ts:116`, unchanged:

```ts
suggestedQuestions: { type: [String], default: [] }
```

**Plain type** — `src/types/transcript.types.ts:84`, unchanged. Kept free of any Mongoose dependency per §XI so the same shape is reusable client-side:

```ts
suggestedQuestions: string[]
```

| Property | Value | Enforced by |
|---|---|---|
| Cardinality | exactly 3, or 0 | V3 at write time; `SUGGESTED_QUESTION_COUNT` guard at render time |
| Per-question length | 1–48 characters after trim | V4 (see [contracts/validation.md](./contracts/validation.md)) |
| Distinctness | no two equal under whitespace/case normalisation | V5 |
| Ordering | model-authored order, preserved verbatim | no reordering anywhere in the path |
| Mutability | write-once per analysis; replaced wholesale on re-analysis | `runAiSummarization` |
| Lifetime | bounded by the meeting document | Mongo document deletion |

The empty array is the *only* representation of "no suggestions". There is no null, no sentinel, and no partial set — which is what lets `SuggestedQuestions` reduce the entire unavailable case to one length check.

### Suggestion Source Material

The grounding context assembled from the meeting's cleaned transcript plus its complete analysis output. Read-only for this feature; produced by the analysis step, which this work does not modify.

- Assembled by `buildGroundingContext(stored)` — `src/lib/utils/grounding.utils.ts`
- Size-gated by `groundingSize(context) > MAX_GROUNDING_CHARS` (400,000) before any request is issued
- Carries the transcript, summary narrative, what-we-heard, what-was-covered, what-was-decided, action items, attendees, lead score band, score percentage, rationale, and detected signals — satisfying FR-011's requirement that generation draw on both sources

Empty analysis sections render as `(none)` in the prompt, which is the signal Rule 1 uses to forbid asking about a section that was never discussed. That mechanism already exists and must be preserved — it is what keeps FR-010 true.

### Set Assessment Outcome

The verdict on one generated set. Not persisted; it exists to make a missing chip row diagnosable (FR-026) and carries no meeting content (FR-027).

Existing discriminated union in `src/types/suggested-questions.types.ts`, unchanged in shape:

```ts
type SuggestionSetOutcome =
  | { ok: true;  questions: string[] }
  | { ok: false; category: 'malformed_response'; rule: 'V1' | 'V2' }
  | { ok: false; category: 'rejected_set';       rule: 'V3' | 'V4' | 'V5' }
```

The four-way *generation* outcome that R4 introduces (`not_attempted` / `no_response` / `rejected` / `stored`) is a logging concern, not a persisted one, and is specified in [contracts/attempts.md](./contracts/attempts.md).

### Suggestion Usage

Accumulated AI cost for generating one meeting's set, across **all** attempts.

**Persistence** — `suggestionUsage` on the transcript, written by `storeSuggestedQuestions`, unchanged in shape:

```ts
{ model, provider, inputTokens, outputTokens,
  cacheCreationTokens, cacheReadTokens,
  inputCostUsd, outputCostUsd,
  cacheCreationCostUsd, cacheReadCostUsd, totalCostUsd }
```

The change is to what is written into it, not its shape: today it holds the winning attempt's usage; after this work it holds the sum over every attempt (R3, FR-025). Field names are camelCase per §XVIII.

---

## State transitions

The set's lifecycle across an analysis run. Steps marked *(unchanged)* are verified-correct today and must not be edited.

```
                        ┌─────────────────────────────────────────┐
                        │ meeting created — suggestedQuestions: [] │
                        └──────────────────┬──────────────────────┘
                                           │ user clicks Summarize
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │ status ≠ 'pending' → reset to [] (unchanged)  │  ← guarantees FR-016:
                    └──────────────────┬───────────────────────────┘    re-analysis never merges
                                       │ summary + leadScore stored
                                       ▼
                    ┌──────────────────────────────────────────────┐
                    │ grounding size > 400k ?                       │
                    └────────┬─────────────────────────┬───────────┘
                        yes  │                    no   │
                             ▼                         ▼
                    ┌────────────────┐    ┌──────────────────────────┐
                    │ not_attempted  │    │ attempt 1 (temp 0)       │
                    │ set stays []   │    └────────┬─────────────────┘
                    └────────────────┘             │
                                          ┌────────┴────────┐
                                    ok    │                 │  rejected (V1–V5)
                                          ▼                 ▼
                              ┌───────────────┐   ┌────────────────────────────┐
                              │ stored: 3 Qs  │   │ attempt 2 — corrective     │
                              │ + summed usage│   │ turn + temp 0.7 (OpenRouter)│
                              └───────────────┘   └────────┬───────────────────┘
                                                  ┌────────┴────────┐
                                            ok    │                 │  rejected
                                                  ▼                 ▼
                                        ┌───────────────┐  ┌──────────────────┐
                                        │ stored: 3 Qs  │  │ rejected         │
                                        │ + summed usage│  │ set stays []     │
                                        └───────────────┘  └──────────────────┘
```

**Invariants that hold at every node**

1. The analysis result — summary, lead score, `aiProcessingStatus: 'success'` — is already committed before generation begins. No generation outcome can alter it (FR-022). This ordering exists in `runAiSummarization` today and is load-bearing.
2. The set is either `[]` or exactly 3. No intermediate state is ever written.
3. No path surfaces anything to the user beyond the presence or absence of the chip row (FR-023).

**One edge case worth recording.** The reset to `[]` is conditional on `aiProcessingStatus !== 'pending'`. If a prior run left the status at `'pending'` — it crashed or was interrupted after the status flip but before completion — a re-analysis skips the reset. The set from an *earlier* successful run could then survive into the new analysis window, and if the new run's generation fails, the panel would show the older meeting's questions against a newer summary. It is narrow, but it is a genuine FR-016 violation. Cheapest correct fix is to make the reset unconditional, since resetting an already-empty array costs nothing. Called out here so `/speckit-tasks` can pick it up rather than rediscovering it.

---

## Read path (verified correct — do not modify)

The path from stored document to rendered chip, confirmed intact during investigation. It is listed so implementation touches none of it:

| Step | Location | Behaviour |
|---|---|---|
| 1 | `transcriptRepository.update` / `.findById` | returns `StoredTranscript` with `fields.suggestedQuestions` |
| 2 | `transcript.mapper.ts:78` | `suggestedQuestions: fields.suggestedQuestions ?? []` → `MeetingRecord` |
| 3 | `workflow-actions.utils.ts` `setDraft(result.record)` | post-summarize draft carries the set |
| 4 | `use-workflow-actions.ts:85` `getTranscriptById` | reopen path maps through the same mapper — no stale-state gap |
| 5 | `app-shell.tsx:113` | `suggestedQuestions={wf.draft?.suggestedQuestions ?? []}` |
| 6 | `chat-panel.tsx` → `chat-messages.tsx:63` | passed to `SuggestedQuestions`, attached to the opening bubble only (FR-018) |
| 7 | `suggested-questions.tsx:12` | `if (questions.length !== SUGGESTED_QUESTION_COUNT) return null` — the whole three-or-nothing rule, one line |

`toTranscriptPatch` deliberately omits `suggestedQuestions`, so the approve/commit round-trip cannot clobber a stored set — the patch is partial and the returned record is re-mapped from the stored document. This is correct as-is and is the reason FR-004 needs verification rather than a code change.
