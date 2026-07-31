# Implementation Plan: Summarize Loader Accuracy & Response Performance

**Branch**: `feat/tae-91-audit-log-service` | **Date**: 2026-07-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/tae-91-summarize-loader-latency/spec.md`

---

## Summary

The summarization loader currently fakes progress using a 380ms timer (`setInterval` in `workflow-actions.utils.ts`) that cycles through four misleading state labels (`'Reading transcript'`, `'Extracting entities'`, `'Scoring intent'`, `'Drafting recap'`) independently of any real pipeline work. All states check off instantly, then the loader stalls indefinitely at "Drafting recap" (the "Recap Email" label) while the AI call completes in the background.

This plan replaces the timer with real pipeline-stage callbacks — a `ProcessingStage` enum set at each `await` boundary in `runSummarize` — and updates the loader to display three accurate, vendor-neutral labels: `'Preparing Transcript'`, `'Agent Processing'`, `'Extracting Summary'`. The 2–3 minute latency observed in the development environment is a confirmed free-tier model artifact (queue time, rate limits, retry multiplier) and requires no code fix; the finding is documented in the spec.

---

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16 (App Router)

**Primary Dependencies**: React 19, Tailwind CSS v4, Anthropic SDK (production path), OpenRouter REST API via `fetch` (development path)

**Storage**: MongoDB via repository layer — no schema changes required by this feature

**Testing**: No test infrastructure in place

**Target Platform**: Web application (Next.js server + browser)

**Performance Goals**: Each loader stage transition occurs within 50ms of the corresponding server action completing; no artificial delay

**Constraints**: Full-wait response (no streaming per spec); no timeout on the AI call; loader error state triggered only by explicit AI service error response

**Scale/Scope**: Single-user session; one summarization at a time (enforced by button disable)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design below.*

| Principle | Check | Notes |
|-----------|-------|-------|
| §I Tech Stack | ✅ Pass | Next.js 16, React 19, TypeScript 5 — no new frameworks |
| §II CSS & Design Tokens | ✅ Pass | ProcessingModal uses Tailwind utilities only; no hardcoded colours or `style={{}}` props may be introduced |
| §III TypeScript Strictness | ✅ Pass | `ProcessingStage` is a typed string union; no `any`, no non-null assertions permitted |
| §V Code Modularity | ✅ Pass | `processing-modal.tsx` must remain under 150 lines; if the timer removal and label changes cause it to exceed, extract sub-components |
| §VI Reusable UI | ✅ Pass | `ProcessingModal` remains an atomic presentational component; no business logic inside it |
| §VII Utility Functions | ✅ Pass | No new utility functions needed; `buildSummarizationPrompt` unchanged |
| §X Server Actions | ✅ Pass | `createDraftTranscript` and `runAiSummarization` are existing server actions; no new API routes |
| §XIII AI-Assisted Development | ✅ Pass | UI changes (loader labels, visual states) → `frontend-design` skill; stage tracking logic → `brainstorming` skill |
| §XIV Error Handling | ✅ Pass | The `catch` block in `runSummarize` must not be bare; error must be surfaced to the user and `procStage` reset |
| §XVII No Barrel Imports | ✅ Pass | `ProcessingStage` imported directly from its source file; no `index.ts` barrel |
| §XVIII camelCase | ✅ Pass | `ProcessingStage`, `processingStep`, `procStage` — all camelCase |
| §XIX Spec Directory | ✅ Pass | `specs/tae-91-summarize-loader-latency/` |

**Post-Design Re-check**: All gates pass. No violations to justify in Complexity Tracking.

---

## Project Structure

### Documentation (this feature)

```text
specs/tae-91-summarize-loader-latency/
├── spec.md                         # Feature specification (includes Latency Root Cause Finding)
├── plan.md                         # This file
├── research.md                     # Phase 0: resolved unknowns and root cause findings
├── data-model.md                   # Phase 1: type definitions, updated constants
├── quickstart.md                   # Phase 1: validation scenarios
├── contracts/
│   ├── processing-modal.md         # ProcessingModal component props contract
│   └── workflow-stage.md           # WorkflowProvider state + runSummarize contract
└── checklists/
    └── requirements.md             # Quality checklist (all passing)
```

### Source Code (files touched by this feature)

```text
src/
├── types/
│   └── workflow/
│       └── processing.types.ts     # NEW: ProcessingStage, ProcessingStep types
├── constants/
│   └── workflow.ts                 # MODIFIED: remove PROC_TICK_MS, replace PROC_STEPS with PROCESSING_STEPS
├── components/
│   └── capture-screen/
│       └── processing-modal.tsx    # MODIFIED: procTick → procStage, 4 labels → 3 labels, remove timer math
├── providers/
│   └── workflow/
│       └── workflow-provider.tsx   # MODIFIED: procTick state → procStage: ProcessingStage
└── hooks/
    └── workflow/
        ├── use-workflow-actions.ts         # MODIFIED: update deps type if procTick is in deps interface
        └── workflow-actions.utils.ts       # MODIFIED: remove setInterval/clearInterval, add setProcStage calls
```

No new directories. No new server actions. No new integrations. No MongoDB schema changes.

---

## Implementation Phases

### Phase 0 — Research & Root Cause Investigation ✅ Complete

Findings documented in [`research.md`](research.md). All unknowns resolved:

- Timer mechanism identified: `window.setInterval` at 380ms in `workflow-actions.utils.ts` line 37
- Current labels identified: 4 labels, all to be replaced
- Latency root cause confirmed: free-tier OpenRouter model (queue time, rate limits, retry overhead)
- No code-side avoidable delays found

Latency finding recorded in spec.md → "Latency Root Cause Finding" section.

### Phase 1 — Design & Contracts ✅ Complete

Artifacts:
- [`data-model.md`](data-model.md) — `ProcessingStage` type, `PROCESSING_STEPS` constant, state transition diagram
- [`contracts/processing-modal.md`](contracts/processing-modal.md) — component props contract, rendering contract, label constraints
- [`contracts/workflow-stage.md`](contracts/workflow-stage.md) — `WorkflowProvider` state change, `runSummarize` execution contract, import path
- [`quickstart.md`](quickstart.md) — 5 validation scenarios

### Phase 2 — Task Decomposition

Run `/speckit-tasks` to generate `tasks.md` from this plan.

---

## Implementation Order

The following ordering minimises the risk of breaking the existing workflow mid-implementation:

1. **Add `ProcessingStage` type** (`src/types/workflow/processing.types.ts`) — safe first step, no runtime impact.
2. **Update constants** (`src/constants/workflow.ts`) — replace `PROC_STEPS` with `PROCESSING_STEPS` (3 items); mark `PROC_TICK_MS` for removal (may still be imported; remove import sites first).
3. **Update `WorkflowProvider`** — replace `procTick: number` state with `procStage: ProcessingStage`, initially `'idle'`. Update context type. Update any consumers that read `procTick`.
4. **Update `processing-modal.tsx`** — replace `procTick` prop with `procStage`; replace timer-math step computation with stage-to-step mapping; update labels to match `PROCESSING_STEPS`.
5. **Update `workflow-actions.utils.ts`** — remove `setInterval`/`clearInterval`; insert `setProcStage('preparing')`, `setProcStage('processing')`, `setProcStage('extracting')` at the correct `await` boundaries; ensure `setProcStage('idle')` in `finally`.
6. **Update `use-workflow-actions.ts`** — if `procTick` / `setProcTick` appears in the deps object passed to `runSummarize`, replace with `procStage` / `setProcStage`.
7. **Validate** against [`quickstart.md`](quickstart.md) scenarios.

---

## Risk Notes

- `procTick` may appear in more than one consumer beyond `processing-modal.tsx`. Search for all references before removing from `WorkflowProvider`.
- The `extracting` stage is brief (sub-second). Verify it is visually observable during manual testing; if not, consider whether it adds UX value or can be folded into the review screen transition.
- `PROC_TICK_MS` is imported in `workflow-actions.utils.ts`. Removing the constant before removing the import causes a TypeScript error. Remove the `setInterval` call and import first, then remove the constant.
