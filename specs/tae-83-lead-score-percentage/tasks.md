# Tasks: Lead Score Percentage

**Input**: Design documents from `specs/tae-83-lead-score-percentage/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Extend the signal data model with `numericWeight` and extend the transcript type with `scorePercentage`. All three tasks touch different files and can be done in parallel.

**⚠️ CRITICAL**: T004 and T005 cannot begin until all three of T001, T002, T003 are complete.

- [x] T001 [P] Add `numericWeight: number` to `RubricSignalFields` in `src/types/rubric-signal.types.ts` — insert after the `hints` field; add `numericWeight: number` to `SimplifiedSignal` as well (non-optional, required field on both interfaces)
- [x] T002 [P] Add `numericWeight` to the Mongoose schema in `src/lib/db/models/rubric-signal.model.ts` — insert `numericWeight: { type: Number, required: true, min: 0 }` after the `hints` field definition; no migration needed (collection has no documents)
- [x] T003 [P] Add `scorePercentage?: number` to `TranscriptLeadScore` interface in `src/types/transcript.types.ts` — insert after the `rationale` field; field is optional to preserve backward compatibility with legacy MongoDB documents that pre-date this feature

**Checkpoint**: Types compile, Mongoose schema is updated — US1 implementation can begin.

---

## Phase 2: User Story 1 - View Percentage Score on Lead Result (Priority: P1) 🎯 MVP

**Goal**: `StructuredSummarizationResult.leadScore.scorePercentage` is always an integer 0–100 when the structured analysis path runs.

**Independent Test**: Call `computeScorePercentage` directly with `SimplifiedSignal[]` objects that carry `numericWeight` and verify the return value matches `round((detectedPoints / totalPossible) × 100)` clamped to [0, 100]. See quickstart.md Scenario 4.

### Implementation for User Story 1

- [x] T004 [US1] Update `simplifySignals()` in `src/lib/utils/scoring.utils.ts` — in the `.map()` callback that converts `RubricSignalFields` to `SimplifiedSignal`, add `numericWeight: signal.numericWeight` to the returned object; verify the return type annotation `SimplifiedSignal` still matches after the interface change from T001
- [x] T005 [US1] Add `computeScorePercentage(detectedSignals: DetectedSignal[], inputSignals: SimplifiedSignal[]): number` to `src/lib/utils/scoring.utils.ts` — build a `tierMap` from `inputSignals` keyed by `id` (same pattern as `determineBand`); sum `inputSignal.numericWeight` for all `inputSignals` to get `totalPossible`; sum the matching `inputSignal.numericWeight` for each `detectedSignal` to get `detectedPoints`; return `0` when `totalPossible === 0`; otherwise return `Math.min(100, Math.max(0, Math.round((detectedPoints / totalPossible) * 100)))`
- [x] T006 [US1] Update `summarizeStructured()` in `src/integrations/claude/transcript-summarizer.ts` — import `computeScorePercentage` directly from `@/lib/utils/scoring.utils` (direct import, no barrel per §XVII); after the existing `determineBand(filteredSignals, signals)` call, call `computeScorePercentage(filteredSignals, signals)` and add `scorePercentage` to the `leadScore` object literal
- [x] T007 [US1] Run `npm run validate` from the repo root — all three gates (type-check → lint → build) must pass with zero errors and zero warnings before proceeding

**Checkpoint**: `leadScore.scorePercentage` is present in every structured analysis result. User Story 1 complete.

---

## Phase 3: User Story 2 - Percentage Reflects Tier Weighting (Priority: P2)

**Goal**: Detecting a high-`numericWeight` signal contributes more to `scorePercentage` than detecting a low-`numericWeight` signal, even when the raw detected count is identical.

**Independent Test**: Using the computed function from US1, verify Scenario 2 Subtest D from quickstart.md: in an 8-signal rubric (5×10 + 2×6 + 1×2 = 64 pts total), detecting only 2 hot signals (20 pts → 31%) produces a higher percentage than detecting 2 warm + 1 cold signals (14 pts → 22%).

### Implementation for User Story 2

- [x] T008 [US2] Manually verify all four unit assertions from quickstart.md Scenario 4 by invoking `computeScorePercentage` directly in a Node REPL or scratch file — assert: (a) all-detected → 100, (b) none-detected → 0, (c) empty-rubric → 0, (d) 1-of-3 hot (10pts each) → 33
- [x] T009 [US2] Manually verify tier-asymmetry from quickstart.md Scenario 2 Subtest D — construct the 8-signal mixed rubric with `numericWeight` values, call `computeScorePercentage` with only the 2 hot signals detected (expected: 31) and then with only the 2 warm + 1 cold signals detected (expected: 22); confirm 31 > 22

**Checkpoint**: `numericWeight`-based weighting confirmed correct. Both user stories complete.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T010 [P] Verify `scorePercentage` is always a whole integer (no decimals) by reviewing the `Math.round` call in `src/lib/utils/scoring.utils.ts` and confirming `Math.min`/`Math.max` clamping is in place — no code changes expected; this is a reading/audit step
- [ ] T011 Run quickstart.md Scenarios 1–3 end-to-end with a live transcript if `ANTHROPIC_API_KEY` is available in `.env.development`; this step requires a live API call and is manual-only — document actual scores observed as a comment in quickstart.md

---

## Phase 5: User Story 3 — Provider-Agnostic Structured Pipeline (FR-011, Priority: P3)

**Goal**: Both the Claude and OpenRouter integrations produce structurally identical `StructuredSummarizationResult` (including `scorePercentage`, `band`, `detectedSignals`, `rationale`) when given the same transcript and rubric signals. Shared logic is extracted into `src/lib/utils/structured-analysis.utils.ts`; neither integration duplicates the pipeline. `buildSummarizationPrompt()` moves there from `src/integrations/claude/prompt.ts` (which is deleted).

**Independent Test**: Quickstart.md Scenario 5 (OpenRouter parity with live API) and Scenario 6 (`processStructuredResponse` unit verification with no API key).

### Implementation for User Story 3

- [x] T012 [US3] Create `src/lib/utils/structured-analysis.utils.ts` — (1) copy `buildSummarizationPrompt(signals: SimplifiedSignal[]): { system: string }` verbatim from `src/integrations/claude/prompt.ts` including all helper constants (system prompt string, signal rubric injection logic); export it. (2) Implement and export `processStructuredResponse(rawText: string, signals: SimplifiedSignal[]): { success: true; summary: TranscriptSummary; leadScore: TranscriptLeadScore } | SummarizationError` with this pipeline in order: strip ` ```json ` / ` ``` ` fences from `rawText`; `JSON.parse` → return `{ success: false, category: 'api_error', message: '...' } satisfies SummarizationError` on `SyntaxError`; `AiSummaryResponseSchema.safeParse` → return `SummarizationError { category: 'api_error' }` on Zod failure; hallucination filter — filter `parsed.detectedSignals` to IDs present in `signals`, emit `console.warn` per stripped signal (same warning text as current Claude summarizer); call `determineBand(filteredSignals, signals)` and emit `console.warn` if it differs from `parsed.leadScoreBand`; call `computeScorePercentage(filteredSignals, signals)`; assemble `TranscriptSummary` and `TranscriptLeadScore` objects; return `{ success: true, summary, leadScore }`. Imports: `AiSummaryResponseSchema` from `@/schemas/ai-summary-response.schema`; `determineBand`, `computeScorePercentage` from `@/lib/utils/scoring.utils`; types from `@/types/transcript.types` and `@/types/claude.types`.
- [x] T013 [P] [US3] Refactor `src/integrations/claude/transcript-summarizer.ts` — replace `import { buildSummarizationPrompt } from './prompt'` with `import { buildSummarizationPrompt, processStructuredResponse } from '@/lib/utils/structured-analysis.utils'`; remove the now-redundant direct imports of `AiSummaryResponseSchema`, `determineBand` (they are used inside `processStructuredResponse`); in `summarizeStructured()`, keep the `buildSummarizationPrompt(signals)` call and the SDK stream call that produces `rawText` unchanged; replace everything from the JSON-fence-cleaning step onward with: `const processed = processStructuredResponse(rawText, signals); if (!processed.success) return processed; return { success: true, summary: processed.summary, leadScore: processed.leadScore, model: response.model, usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens } } satisfies StructuredSummarizationResult;`. Depends on T012.
- [x] T014 [P] [US3] Add structured path to `src/integrations/openrouter/transcript-summarizer.ts` — import `buildSummarizationPrompt` and `processStructuredResponse` from `@/lib/utils/structured-analysis.utils`; import `SimplifiedSignal` from `@/types/rubric-signal.types` and `StructuredSummarizationResult` from `@/types/claude.types`; in `summarize()`, add `if (options?.signals !== undefined) { return this.summarizeStructured(transcript, options.signals, options); }` before the existing unstructured fetch logic (mirror the guard pattern from the Claude summarizer); add `private async summarizeStructured(transcript: string, signals: SimplifiedSignal[], options: SummarizationOptions): Promise<SummarizationResponse>` — call `buildSummarizationPrompt(signals)` to get `{ system }`; call `this.client.chatCompletion({ model: options?.model ?? this.model, messages: [{ role: 'system', content: system }, { role: 'user', content: transcript }], max_tokens: options?.maxTokens ?? this.maxTokens })` and check `response.ok` (if not, apply existing `mapHttpError(response)` pattern); parse response JSON with the existing `openRouterResponseSchema.safeParse(await response.json())`; if parse fails return `SummarizationError`; extract `choices[0].message.content` as `rawText`; call `processStructuredResponse(rawText, signals)`; if `!processed.success` return `processed`; return `{ success: true, summary: processed.summary, leadScore: processed.leadScore, model: parsed.data.model, usage: { inputTokens: parsed.data.usage.prompt_tokens, outputTokens: parsed.data.usage.completion_tokens } } satisfies StructuredSummarizationResult`. Depends on T012.
- [x] T015 [US3] Delete `src/integrations/claude/prompt.ts` — first confirm T013 is complete; run `grep -r "integrations/claude/prompt" src/` and verify zero matches before deleting; delete the file. Depends on T013.
- [x] T016 [US3] Run `npm run validate` from repo root — all three gates (type-check → lint → build) must pass with zero errors and zero warnings. Depends on T013, T014, T015.

**Checkpoint**: Both integrations produce `StructuredSummarizationResult` with `scorePercentage`. `claude/prompt.ts` deleted. User Story 3 complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately
- **US1 (Phase 2)**: Depends on T001, T002, AND T003 all complete
- **US2 (Phase 3)**: Depends on T005 (utility function) being complete — T008 and T009 are verification steps
- **Polish (Phase 4)**: Depends on US1 and US2 complete
- **US3 (Phase 5)**: Depends on T005 (`SimplifiedSignal` shape with `numericWeight`) and T006 (`summarizeStructured` in Claude summarizer) complete — both were established in Phase 2

### Within Each Phase

- T001, T002, T003 are fully parallel (different files)
- T004 must precede T005 (scoring utility imports the updated `SimplifiedSignal` shape)
- T005 must precede T006 (summarizer imports the new utility)
- T006 must precede T007 (validate runs after all code changes)
- T008 and T009 are parallel (different scenarios of the same function)
- T010 and T011 are parallel (different concerns)
- T012 must precede T013, T014, T015 (shared utility must exist before it can be imported)
- T013 and T014 are parallel after T012 (touch different files: claude vs openrouter summarizer)
- T015 must follow T013 (claude summarizer import updated before old file deleted)
- T016 must follow T013, T014, T015 (validate only after all code changes)

### Parallel Opportunities

```
Phase 1:  T001 ║ T002 ║ T003              (parallel, different files)
Phase 2:  T004 → T005 → T006 → T007      (sequential chain)
Phase 3:  T008 ║ T009                    (parallel verification scenarios)
Phase 4:  T010 ║ T011                    (parallel audit + live test)
Phase 5:  T012 → (T013 ║ T014) → T015 → T016
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001, T002, T003) — type extensions + Mongoose schema
2. Complete Phase 2 (T004–T007) — simplifySignals update + utility + integration + validate
3. **STOP and VALIDATE**: `scorePercentage` field is present on `leadScore`, `npm run validate` green
4. US1 is shippable as an MVP

### Incremental Delivery

1. Phase 1 + Phase 2 → `scorePercentage` field computed and returned
2. Phase 3 → `numericWeight`-based weighting correctness verified
3. Phase 4 → Polish and optional live-API validation
4. Phase 5 → Shared pipeline extracted; OpenRouter gains full structured analysis parity

---

## Notes

- T001, T002, T003 touch different files and have no blocking dependencies on each other
- T002 (Mongoose schema) requires no migration — the rubric signal collection has no existing documents
- `numericWeight` must be propagated in `simplifySignals()` (T004) before `computeScorePercentage()` (T005) can use it
- T008 and T009 are manual verification steps; they can be done in a Node REPL using `tsx` or a temporary scratch file
- T011 requires `ANTHROPIC_API_KEY` and is optional for environments without a live key
- No constants file (`src/constants/`) is created by this feature — all signal point values come from the database
- T012 is a pure CREATE — the new file must be complete and compiling before T013/T014 begin their imports
- T013 and T014 touch different integration directories and have no shared file conflict — they can run in parallel
- T015 (delete `prompt.ts`) must be the last step before T016 validate — deleting it before T013 removes the import would break the build
- T016 (`npm run validate`) is the definitive gate for Phase 5; any TypeScript or lint error surfaces here
