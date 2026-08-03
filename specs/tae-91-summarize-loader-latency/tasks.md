# Tasks: Summarize Loader Accuracy & Response Performance

**Input**: Design documents from `specs/tae-91-summarize-loader-latency/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: No test infrastructure in this project — no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the `ProcessingStage` type definition that all subsequent changes depend on. Must complete before any other task.

- [x] T001 Create `src/types/workflow/processing.types.ts` — define `ProcessingStage = 'idle' | 'preparing' | 'processing' | 'extracting'` and `ProcessingStep { label: string; stage: ProcessingStage }` (see data-model.md; camelCase per §XVIII; no barrel export)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update shared constants and the `WorkflowProvider` state shape. MUST complete before any user story implementation begins — modal, hook utils, and button guard all depend on `procStage` being available in context.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Update `src/constants/workflow.ts` — remove `PROC_TICK_MS`; replace `PROC_STEPS` (4-item array) with `PROCESSING_STEPS: ProcessingStep[]` containing exactly three entries: `{ label: 'Preparing Transcript', stage: 'preparing' }`, `{ label: 'Agent Processing', stage: 'processing' }`, `{ label: 'Extracting Summary', stage: 'extracting' }` (import `ProcessingStep` from `@/types/workflow/processing.types`, not a barrel; see contracts/processing-modal.md for label constraints)
- [x] T003 Update `src/providers/workflow/workflow-provider.tsx` — replace `procTick: number` state and `setProcTick` setter with `procStage: ProcessingStage` (initial value `'idle'`) and `setProcStage`; update the context type accordingly; import `ProcessingStage` directly from `@/types/workflow/processing.types`

**Checkpoint**: `ProcessingStage` type exists, constants are updated, and `WorkflowProvider` exposes `procStage` / `setProcStage` — user story implementation can now begin.

---

## Phase 3: User Story 1 — Accurate Progress States (Priority: P1) 🎯 MVP

**Goal**: The loader advances through three real, vendor-neutral state labels (`'Preparing Transcript'`, `'Agent Processing'`, `'Extracting Summary'`) driven by actual pipeline completion, not a timer.

**Independent Test**: Click Summarise with sample transcript. Each step must become active only when its corresponding server action begins, not before. No timer-driven instant check-marking. No vendor names. No `'Drafting recap'` label. See quickstart.md Scenarios 1 and 2.

### Implementation for User Story 1

- [x] T004 [US1] Update `src/components/capture-screen/processing-modal.tsx` — replace `procTick: number` prop with `procStage: ProcessingStage`; replace `Math.min(procTick, PROC_STEPS.length - 1)` step-index logic with a stage-to-step-index map derived from `PROCESSING_STEPS`; a step is `done` when its index is less than the active step index, `active` when it matches, `pending` otherwise; import `ProcessingStage` from `@/types/workflow/processing.types` directly (§XVII — no barrel); keep the component purely presentational — no async logic, no timers (see contracts/processing-modal.md)
- [x] T005 [US1] Update `src/hooks/workflow/workflow-actions.utils.ts` — remove `window.setInterval(...)` call, `clearInterval(ticker)` call, and any reference to `PROC_TICK_MS` or `setProcTick`; insert `setProcStage('preparing')` immediately before the `createDraftTranscript` call; insert `setProcStage('processing')` immediately before the `runAiSummarization` call; insert `setProcStage('extracting')` when `runAiSummarization` returns `{ success: true }` and before transitioning to the `'review'` step; ensure `setProcStage('idle')` is called in the `finally` block so stage always resets on completion or error (see contracts/workflow-stage.md)
- [x] T006 [P] [US1] Update `src/hooks/workflow/use-workflow-actions.ts` — remove `procTick` and `setProcTick` from the deps object passed to `runSummarize`; add `procStage` and `setProcStage` in their place; update the deps interface or type if one is declared (depends on T003, T005)
- [x] T007 [US1] Verify Summarize button disabled state in `src/components/capture-screen/transcript-card.tsx` (or its parent wiring in `CaptureScreen`) — confirm the button is disabled whenever `procStage !== 'idle'`; if currently gated on an `isProcessing: boolean`, replace with `procStage !== 'idle'` drawn from WorkflowProvider context (FR-008 — duplicate submit prevention; see contracts/workflow-stage.md)

**Checkpoint**: User Story 1 is fully functional. Loader advances stage by stage. Labels are accurate and vendor-neutral. Button is disabled during processing. Validate with quickstart.md Scenarios 1 and 2 before proceeding.

---

## Phase 4: User Story 2 — Production Performance Targets (Priority: P2)

**Goal**: Confirm the summarization pipeline completes within the production performance targets (sample transcript < 30 seconds) when running against the enterprise AI API.

**Independent Test**: Run quickstart.md Scenario 1 against the production or staging environment using the enterprise API credentials. See spec.md SC-001.

**Note**: No code changes are required for this story. The latency in development is a confirmed free-tier model artifact (see research.md Decision 4 and spec.md Latency Root Cause Finding). This phase is a pre-production validation gate, not an implementation phase.

### Validation for User Story 2

- [ ] T008 [US2] Validate summarization performance against the enterprise AI API endpoint (configure `NEXT_PUBLIC_APP_ENV=production` or equivalent in a staging environment) — run quickstart.md Scenario 1; confirm the sample transcript summarizes completely in under 30 seconds from button click to result display; record the observed elapsed time as evidence; if the target is not met, raise a new ticket

**Checkpoint**: Production performance target confirmed. SC-001 evidenced.

---

## Phase 5: User Story 3 — Latency Root Cause Documented (Priority: P2) ✅ COMPLETE

**Status**: Completed during planning phase on 2026-07-31. No implementation tasks remain.

**Evidence**: Root cause investigation was conducted by tracing the codebase during `/speckit-plan`. Findings are documented in:
- `specs/tae-91-summarize-loader-latency/spec.md` → "Latency Root Cause Finding" section
- `specs/tae-91-summarize-loader-latency/research.md` → Decision 4

**Summary of finding**: The 2–3 minute latency is attributable to free-tier OpenRouter model constraints (queue time, rate limits, lower throughput) compounded by up to 3× retry overhead on malformed JSON (`MAX_STRUCTURED_ATTEMPTS = 3`). No code-side avoidable delays were identified. The production claude-haiku enterprise API path uses streaming and will not exhibit this behaviour.

- [x] T009 [US3] Investigate and document latency root cause in spec.md "Latency Root Cause Finding" section (COMPLETE — done during /speckit-plan on 2026-07-31)

---

## Phase 6: User Story 4 — Failure State Communicated Clearly (Priority: P3)

**Goal**: When the AI service returns an error response, the user sees a user-friendly message and a retry path — the loader does not freeze or silently fail.

**Independent Test**: Run quickstart.md Scenario 4 (set an invalid API key, click Summarise, confirm error message appears and button re-enables). See spec.md FR-007, FR-009.

### Implementation for User Story 4

- [x] T010 [US4] Audit `src/hooks/workflow/workflow-actions.utils.ts` `runSummarize` catch block — confirm it: (a) calls `setProcStage('idle')` in `finally` so the loader always exits, (b) surfaces a user-readable error message through workflow state (not a raw Error.message or stack trace), (c) does not have a bare `catch {}` (§XIV — every caught error must be handled explicitly); if any of these are missing, implement the fix
- [x] T011 [US4] Verify retry path — confirm that after an error state, the Summarise button returns to enabled (procStage resets to `'idle'`) and the user can click it again to re-submit the same transcript without a page refresh; if the workflow state does not clear the error flag on re-attempt, add the reset logic in the button's `onClick` handler or in `runSummarize`'s entry point
- [x] T012 [P] [US4] Verify malformed AI response handling — trace the path from `src/integrations/openrouter/structured-summarizer.ts` (3-attempt retry on `malformed_response`) through `src/server-actions/workflow/transcript-ai.actions.ts` `runAiSummarization` to `runSummarize`; confirm that exhausted retries result in `{ success: false, error: string }` being returned (not an unhandled thrown exception) so the catch block in `runSummarize` can surface it correctly (FR-009)

**Checkpoint**: Error state fully functional. Run quickstart.md Scenario 4 to validate.

---

## Polish & Cross-Cutting Concerns

**Purpose**: Final validation, CI gate, and spec status update.

- [x] T013 [P] Run quickstart.md Scenario 2 (label validation) — open the loader modal and confirm all three labels match exactly: `'Preparing Transcript'`, `'Agent Processing'`, `'Extracting Summary'`; confirm absence of: `'Drafting recap'`, `'Recap Email'`, `'Claude'`, `'Anthropic'`, `'OpenRouter'`, `'Scoring intent'`, `'Extracting entities'`, `'Reading transcript'`
- [x] T014 [P] Run quickstart.md Scenario 3 (duplicate submit prevention) — confirm Summarise button is non-interactive from the moment procStage becomes `'preparing'` until it returns to `'idle'`
- [x] T015 Run `npm run validate` from repo root — confirm zero TypeScript errors, zero ESLint warnings, successful build (§IV — CI gate; all warnings treated as errors)
- [x] T016 Update `specs/tae-91-summarize-loader-latency/spec.md` Status field from `Draft` to `Review`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on T001 — BLOCKS all user story work
- **Phase 3 (US1)**: Depends on Phase 2 completion (T002, T003)
- **Phase 4 (US2)**: Depends on Phase 3 (US1 loader changes must be in place before validating in production)
- **Phase 5 (US3)**: Already complete — no dependency
- **Phase 6 (US4)**: Can begin after Phase 2; error-state work is mostly independent of loader label changes
- **Polish**: Depends on Phase 3 + Phase 6

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 complete; no other story dependency
- **US2 (P2)**: Requires US1 complete (loader changes must ship); no code implementation — production validation gate only
- **US3 (P2)**: Complete — no dependency
- **US4 (P3)**: Requires Phase 2 complete; can run in parallel with US1 if desired

### Within Phase 3 (US1)

- T004 and T005 can run in parallel (different files) once T002 and T003 are done
- T006 depends on T003 and T005
- T007 can run in parallel with T004 and T005 (different file)

### Parallel Opportunities

- T001 and T002 are independent of each other (different files) — can run in parallel
- T004, T005, and T007 can all start in parallel once T003 is done
- T010, T011, and T012 are largely independent (different files/concerns) — can run in parallel
- T013 and T014 are independent quickstart validations — can run in parallel

---

## Parallel Example: Phase 3 (User Story 1)

```
# Once T002 and T003 are complete, launch these in parallel:

Task T004: Update processing-modal.tsx (procStage prop, 3-step rendering, labels)
Task T005: Update workflow-actions.utils.ts (remove setInterval, add setProcStage)
Task T007: Verify button disable logic in transcript-card.tsx / CaptureScreen

# Then sequentially:
Task T006: Update use-workflow-actions.ts deps (after T003 and T005)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1 (T001)
2. Complete Phase 2 (T002, T003)
3. Complete Phase 3/US1 (T004–T007)
4. **STOP and VALIDATE**: Run quickstart.md Scenarios 1 and 2
5. US1 is the entire visible UX improvement — ready to demo

### Incremental Delivery

1. Phase 1 + Phase 2 → type and constants ready
2. Phase 3 (US1) → loader fully fixed, labels correct, timer gone → **demo and validate**
3. Phase 6 (US4) → error state hardened → **validate Scenario 4**
4. Phase 4 (US2) → production performance confirmed → **pre-production gate**
5. Polish → CI clean, spec updated

---

## Notes

- [P] tasks = different files, no cross-task dependencies — safe to parallelise
- [Story] label maps each task to its user story for traceability
- US3 is complete — no implementation tasks remain for it
- US2 requires no code changes — it is purely a production validation gate
- The `extracting` stage (T005) is brief; verify it is visually observable during Scenario 1 manual testing
- Remove `PROC_TICK_MS` import from `workflow-actions.utils.ts` before deleting the constant (order matters to avoid TypeScript errors during the refactor)
- `procTick` may appear in more consumers than identified — search the full `src/` tree for all references before removing from WorkflowProvider
