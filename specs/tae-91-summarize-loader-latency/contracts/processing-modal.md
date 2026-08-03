# Contract: ProcessingModal Component

**Feature**: tae-91-summarize-loader-latency
**File**: `src/components/capture-screen/processing-modal.tsx`

---

## Current Props (to be replaced)

```
ProcessingModalProps {
  procTick: number    // timer-driven counter — REMOVED
}
```

## Updated Props

```
ProcessingModalProps {
  procStage: ProcessingStage   // 'idle' | 'preparing' | 'processing' | 'extracting'
}
```

### Rendering Contract

| `procStage` | Step 0 ("Preparing Transcript") | Step 1 ("Agent Processing") | Step 2 ("Extracting Summary") |
|-------------|--------------------------------|-----------------------------|-------------------------------|
| `'idle'` | pending | pending | pending |
| `'preparing'` | **active** | pending | pending |
| `'processing'` | done | **active** | pending |
| `'extracting'` | done | done | **active** |

- A step is `done` when its stage has been passed (i.e. `stage index < active stage index`).
- A step is `active` when its stage matches `procStage`.
- A step is `pending` when its stage has not yet been reached.
- When `procStage` is `'idle'`, the modal should not be visible (controlled by the parent via `isOpen` or equivalent).

### Label Constraints

- Step 0 label: `'Preparing Transcript'`
- Step 1 label: `'Agent Processing'`
- Step 2 label: `'Extracting Summary'`
- No label may contain: `'Claude'`, `'Anthropic'`, `'OpenRouter'`, `'recap'`, `'email'`, `'Recap'`, or any other AI vendor name.

### Error State

The modal does not own error state. On failure, `runSummarize` exits the modal by setting `procStage` back to `'idle'` and setting an error flag at the workflow level. The modal has no error display of its own — error UI is handled by the parent screen.

---

## Invariants

- The component is purely presentational — it does not trigger any actions, does not call server actions, and does not manage async state.
- All three steps are always rendered (none are conditionally hidden based on stage).
- `procStage` is the single source of truth for step status; no internal timers or counters.
