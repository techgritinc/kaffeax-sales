# Tasks: Summary Scoring & Prompt Engineering

**Input**: Design documents from `specs/tae-82-summary-scoring-prompt/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: Not requested — no testing infrastructure in place (per CLAUDE.md).

**Scope**: Claude integration layer only. Signals received as `SimplifiedSignal[]` parameter. No server action, repository, OpenRouter, or DB work.

**Files touched**:
- Modify: `src/types/rubric-signal.types.ts`, `src/types/claude.types.ts`, `src/integrations/claude/transcript-summarizer.ts`
- Create: `src/integrations/claude/prompt.ts`, `src/schemas/ai-summary-response.schema.ts`, `src/lib/utils/scoring.utils.ts`

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Type definitions that every other task depends on. Must be complete before any US1 or US2 work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Add `SimplifiedSignal` interface to `src/types/rubric-signal.types.ts` — exported interface with fields `id: string`, `label: string`, `tier: SignalWeight`, `hints?: string[]`; placed after the existing `RubricSignalFields` interface; no other changes to the file
- [x] T002 Update `src/types/claude.types.ts` — add `signals?: SimplifiedSignal[]` to `SummarizationOptions`; add new `StructuredSummarizationResult` interface (`success: true`, `summary: TranscriptSummary`, `leadScore: TranscriptLeadScore`, `model: string`, `usage: { inputTokens: number; outputTokens: number }`); update `SummarizationResponse` union to include `StructuredSummarizationResult`; add necessary imports from `@/types/rubric-signal.types` and `@/types/transcript.types`

**Checkpoint**: Type definitions compile (`npm run type-check`). Ready for US1 implementation.

---

## Phase 2: User Story 1 — Summarize a Sales Meeting Transcript (Priority: P1) 🎯 MVP

**Goal**: When `summarize(transcript, { signals })` is called with a non-empty transcript and a `SimplifiedSignal[]` array, the method returns a `StructuredSummarizationResult` containing a fully-populated `TranscriptSummary`, a `TranscriptLeadScore` with the correct highest-tier-wins band, and model/usage metadata.

**Independent Test**: Call `new TranscriptSummarizer().summarize(transcript, { signals })` with the sample transcript and signals from `quickstart.md` Scenario 1. Verify the return value has `success: true`, `summary.narrative` is a non-empty string, `leadScore.band` is `"hot"`, and `leadScore.detectedSignals` includes entries with evidence. No database or server action required.

- [x] T003 [P] [US1] Create `src/lib/utils/scoring.utils.ts` — export two pure functions: (1) `simplifySignals(signals: RubricSignalFields[]): SimplifiedSignal[]` that maps `signalId → id`, `weight → tier`, and includes `hints` only when `signal.hints.length > 0`; (2) `determineBand(detectedSignals: DetectedSignal[], inputSignals: SimplifiedSignal[]): LeadScoreBand` that builds a Map of `id → tier` from `inputSignals`, iterates `detectedSignals`, returns `"hot"` if any hot tier found, `"warm"` if any warm tier found (and no hot), `"cold"` otherwise; add all necessary imports from `@/types/rubric-signal.types` and `@/types/transcript.types`
- [x] T004 [P] [US1] Create `src/schemas/ai-summary-response.schema.ts` — export `AiSummaryResponseSchema` as a Zod `z.object()` with all camelCase fields matching the contract in `contracts/ai-analysis-response.md`: `narrative` (non-empty string), `whatWeHeard`/`whatWasCovered`/`whatWasDecided` (string arrays, default `[]`), `actionItems` (array of `{ description, owner, dueDate: z.string().nullable().optional().default(null) }`, default `[]`), `attendees` (array of `{ name, side: z.enum(['kaffeax', 'prospect']) }`, default `[]`), `detectedSignals` (array of `{ id, label, evidence }` all non-empty strings, default `[]`), `leadScoreBand` (`z.enum(['hot', 'warm', 'cold'])`), `scoreRationale` (non-empty string); export `AiSummaryResponse` as `z.infer<typeof AiSummaryResponseSchema>`
- [x] T005 [US1] Create `src/integrations/claude/prompt.ts` — export `buildSummarizationPrompt(signals: SimplifiedSignal[]): { system: string }`; the system prompt must: (1) declare the AI role as a sales call analyst, (2) instruct JSON-only output with no markdown fences, no preamble, no commentary, (3) embed the full camelCase output schema as a JSON example matching `AiSummaryResponseSchema` shape, (4) serialize `signals` as `JSON.stringify(signals, null, 2)` within the prompt, (5) instruct the model to detect ONLY signals from the provided list by matching each signal's `label` (and `hints` when present) against the transcript, (6) require each detected signal to include the signal's exact `id` from the list and a direct quote or close paraphrase from the transcript as `evidence`, (7) state that if no signals match, return `leadScoreBand: "cold"` and `detectedSignals: []`; when `signals` is an empty array, the prompt must include explicit instruction: "No rubric signals have been provided. Set detectedSignals to [] and leadScoreBand to cold. In scoreRationale, state that no scoring criteria were provided."; import `SimplifiedSignal` from `@/types/rubric-signal.types`
- [x] T006 [US1] Update `src/integrations/claude/transcript-summarizer.ts` — add structured branch inside `summarize()`: when `options?.signals` is defined (including empty array), call `buildSummarizationPrompt(options.signals)` to get `{ system }`, pass it as the top-level `system` param in `client.messages.stream()` alongside `messages: [{ role: 'user', content: transcript }]`; accumulate `text`-type blocks from `response.content` into a string; strip markdown fences (`rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()`); wrap `JSON.parse` in try-catch — on failure return `{ success: false, category: 'api_error', message: 'AI response could not be parsed. Please try again.', retryAfterMs: null }`; call `AiSummaryResponseSchema.safeParse(parsed)` — on failure log `console.warn` with issue details and return `{ success: false, category: 'api_error', message: 'AI response structure was unexpected. Please try again.', retryAfterMs: null }`; build `inputIds = new Set(options.signals.map(s => s.id))`, filter `detectedSignals` to only matching IDs (log `console.warn` for each stripped hallucination), call `determineBand(filteredSignals, options.signals)`, compare with `validatedResponse.leadScoreBand` and log discrepancy if different; construct `TranscriptSummary` and `TranscriptLeadScore` from validated data, return `StructuredSummarizationResult`; when `options?.signals` is `undefined`, fall through to the existing unstructured path unchanged; add imports for `buildSummarizationPrompt`, `AiSummaryResponseSchema`, `determineBand`, and new types

**Checkpoint**: US1 is fully functional. `summarize(transcript, { signals })` returns a valid `StructuredSummarizationResult` for a happy-path transcript. Backward-compat unstructured path unchanged.

---

## Phase 3: User Story 2 — Handle Edge Cases Gracefully (Priority: P1)

**Goal**: Verify the summarizer behaves correctly under edge-case conditions introduced during Phase 2 — the error handling, hallucination filtering, and zero-signals behavior are already coded in T006; this phase is a dedicated review and targeted hardening pass.

**Independent Test**: (1) Call `summarize(transcript, { signals: [] })` — expect `success: true`, `leadScore.band === "cold"`, `leadScore.detectedSignals.length === 0`, `leadScore.rationale` mentions no criteria. (2) Verify JSON parse failure returns `SummarizationError` with `category: "api_error"`. (3) Confirm that a `detectedSignals` entry with an ID not in the input signals array is absent from the result.

- [x] T007 [US2] Review and confirm edge-case completeness in `src/integrations/claude/transcript-summarizer.ts` — verify the structured branch from T006 covers: (a) markdown fence stripping before `JSON.parse`, (b) try-catch around `JSON.parse` with structured error return, (c) `safeParse` failure returns structured error with `console.warn`, (d) hallucinated signal filtering with `console.warn`, (e) `leadScoreBand` discrepancy logging; add any missing handling and ensure all `console.warn` calls include the prefix `[TranscriptSummarizer]` and relevant context (stripped signal ID, validation issues, band discrepancy values)
- [x] T008 [US2] Verify zero-signals edge case end-to-end in `src/integrations/claude/prompt.ts` and `src/integrations/claude/transcript-summarizer.ts` — confirm that passing `signals: []` produces a valid `StructuredSummarizationResult` (not an error); ensure `buildSummarizationPrompt([])` includes the no-criteria instruction; confirm `determineBand([], [])` returns `"cold"`; confirm `leadScore.detectedSignals` is `[]`; make any corrections needed

**Checkpoint**: All edge cases confirmed. Zero crashes, all error paths return `SummarizationError { category: 'api_error' }`, hallucinated signals are stripped and logged.

---

## Phase 4: Polish & Validation

**Purpose**: Verify type safety, lint compliance, and end-to-end correctness.

- [x] T009 Run `npm run validate` from repo root — fix any TypeScript errors, ESLint violations, or Prettier formatting issues before marking complete; `npm run validate` runs `type-check → lint → build` sequentially
- [ ] T010 [P] Run quickstart.md validation — manually invoke `TranscriptSummarizer.summarize()` with the sample data from `specs/tae-82-summary-scoring-prompt/quickstart.md` for Scenario 1 (hot lead with signals), Scenario 2 (cold lead — no signals matched), and Scenario 3 (zero signals array); confirm response shapes match expected outcomes documented in quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Requires Phase 1 complete. T003 and T004 are parallel with each other and with each other. T005 requires T001 (imports `SimplifiedSignal`). T006 requires T003, T004, T005.
- **US2 (Phase 3)**: Requires Phase 2 complete. T007 and T008 are sequential (both touch `transcript-summarizer.ts` and `prompt.ts`).
- **Polish (Phase 4)**: Requires Phase 3 complete.

### Dependency Graph

```
T001 ──┬──→ T002
       └──→ T005 ──→ T008
T004 ──┘
T003 ───┐
T004 ───┴──→ T006 ──→ T007 ──→ T008
T005 ───┘
                       T008 ──→ T009
                       T008 ──→ T010
```

### Parallel Opportunities

**Phase 2** (after T001 + T002 complete):
```
# T003 and T004 have no inter-dependency — launch together:
Task A: "Create src/lib/utils/scoring.utils.ts — simplifySignals and determineBand"
Task B: "Create src/schemas/ai-summary-response.schema.ts — AiSummaryResponseSchema"
# Then T005 (needs SimplifiedSignal type from T001), then T006 (needs all three)
```

**Phase 4** (after T007 + T008 complete):
```
# T009 (validate) and T010 (quickstart) are independent:
Task A: "npm run validate — fix any violations"
Task B: "Run quickstart.md validation scenarios"
```

---

## Implementation Strategy

### MVP Scope (US1 only — Phases 1 + 2)

1. Complete Phase 1: T001, T002 (type definitions — sequential)
2. Complete T003 + T004 in parallel → T005 → T006
3. **Validate**: Call `summarize(transcript, { signals })` with happy-path inputs, verify `StructuredSummarizationResult`
4. **Hand off to teammate** — server action can now call the structured path

### Full Delivery

1. Complete Phases 1 + 2 → US1 working
2. Complete Phase 3 → edge cases hardened → production-ready
3. Complete Phase 4 → CI gate passes → PR ready

---

## Notes

- `[P]` = different files or logically independent — can run in parallel without merge conflicts
- `[US1]` / `[US2]` = maps to user story in spec.md for traceability
- The existing unstructured path in `transcript-summarizer.ts` (when `options?.signals` is `undefined`) MUST remain unchanged — backward compat per FR-013
- All new code uses camelCase per §XVIII of the constitution — no snake_case in any type, interface, Zod schema, or variable name
- The `simplifySignals` utility is exported for use by the teammate's server action layer; the summarizer itself receives already-simplified `SimplifiedSignal[]`
- No barrel files (`index.ts`) per §XVII — import directly from source files
- The `scoring.utils.ts` file is in `src/lib/utils/` (shared utilities) not `src/features/` — it is reusable across integrations
