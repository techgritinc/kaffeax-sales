# Data Model: Summarize Loader Accuracy & Response Performance

**Feature**: tae-91-summarize-loader-latency
**Date**: 2026-07-31

No new database entities or MongoDB schema changes are introduced by this feature. All changes are confined to client-side and application-layer type definitions.

---

## New Types

### `ProcessingStage`

Represents the active stage of the summarization pipeline. Replaces the `procTick: number` counter currently used in `WorkflowProvider`.

```
ProcessingStage = 'idle' | 'preparing' | 'processing' | 'extracting'
```

| Value | Meaning | Real trigger |
|-------|---------|-------------|
| `'idle'` | No summarization in progress | Initial state; reset after completion or error |
| `'preparing'` | `createDraftTranscript` is running | Set immediately before the first server action call |
| `'processing'` | `runAiSummarization` is running | Set immediately before the second server action call |
| `'extracting'` | AI response received; parsing and state transition in progress | Set when `runAiSummarization` returns `{ success: true }` |

**Location**: `src/types/workflow/` (new file, e.g. `processing.types.ts`, or added to an existing workflow type file if one exists)

**Constraints**:
- Must be a string union type, not an enum (aligns with project TypeScript conventions)
- No `any` — all consumers type-narrow on the union
- camelCase per §XVIII

---

### `ProcessingStep`

Describes a single labelled step in the loader UI, tied to a `ProcessingStage`.

```
ProcessingStep {
  label: string          // User-visible label; vendor-neutral
  stage: ProcessingStage // The pipeline stage this step represents
}
```

**Location**: Same file as `ProcessingStage`

---

## Updated Constants

### `PROCESSING_STEPS` (replaces `PROC_STEPS`)

The canonical ordered list of loader steps, defined in `src/constants/workflow.ts` (or a domain-specific file under `src/constants/workflow/`).

| Index | Stage | Label |
|-------|-------|-------|
| 0 | `'preparing'` | `'Preparing Transcript'` |
| 1 | `'processing'` | `'Agent Processing'` |
| 2 | `'extracting'` | `'Extracting Summary'` |

### Removed Constants

- `PROC_TICK_MS` — The 380ms timer interval is removed entirely. No replacement; stage transitions are driven by `await` boundaries in `runSummarize`.
- `PROC_STEPS` — Superseded by `PROCESSING_STEPS`.

---

## Unchanged Entities

The following existing entities are referenced by this feature but are not modified:

| Entity | Location | Role |
|--------|----------|------|
| `MeetingRecord` | `src/types/` | Returned by `runAiSummarization` on success |
| `Transcript` | `src/types/` | Input to the summarization pipeline |
| `RubricSignal` | `src/types/` | Passed as context to the AI call; unchanged |

---

## State Transition Diagram

```
idle
 │
 │ user clicks Summarize
 ▼
preparing ──── createDraftTranscript fails ──► error (modal closed, error shown)
 │
 │ createDraftTranscript succeeds
 ▼
processing ─── runAiSummarization fails ─────► error (modal closed, error shown)
 │
 │ runAiSummarization succeeds
 ▼
extracting
 │
 │ state transition to review screen
 ▼
idle
```
