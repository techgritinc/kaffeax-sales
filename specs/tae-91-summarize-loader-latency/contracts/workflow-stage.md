# Contract: Workflow Stage State & runSummarize

**Feature**: tae-91-summarize-loader-latency
**Files**:
- `src/providers/workflow/workflow-provider.tsx`
- `src/hooks/workflow/workflow-actions.utils.ts`

---

## WorkflowProvider State Change

### Removed

```
procTick: number          // timer-driven counter
setProcTick: Dispatch<SetStateAction<number>>
```

### Added

```
procStage: ProcessingStage          // 'idle' | 'preparing' | 'processing' | 'extracting'
setProcStage: Dispatch<SetStateAction<ProcessingStage>>
```

`procStage` initialises as `'idle'`. It is reset to `'idle'` in both the success path (after transitioning to the review step) and the error path (in the `finally` block of `runSummarize`).

---

## runSummarize Execution Contract

### Removed

```typescript
// Remove this block entirely
const ticker = window.setInterval(() => setProcTick(t => t + 1), PROC_TICK_MS)
// ... in finally:
clearInterval(ticker)
```

### Added Stage Transitions

The following `setProcStage` calls are inserted at the corresponding `await` boundaries:

```
setProcStage('preparing')
await createDraftTranscript(...)       // step 0 active during this call

setProcStage('processing')
const result = await runAiSummarization(...)  // step 1 active during this call

if result.success:
  setProcStage('extracting')           // step 2 active briefly during state transition
  // ... set review data, transition to 'review' step
  setProcStage('idle')

if result.failure:
  // error handling — show error, do not advance to 'extracting'
  setProcStage('idle')                 // in finally
```

### Error Handling Contract

- On `runAiSummarization` returning `{ success: false, error: string }`: set the workflow-level error state, set `procStage` to `'idle'`. Do not advance to `'extracting'`.
- On unhandled exception in the `catch` block: same — set error state, set `procStage` to `'idle'` in `finally`.
- No `procStage` value other than `'idle'` persists after `runSummarize` completes (success or failure).

### Idempotency / Duplicate Submit Prevention (FR-008)

The Summarize button is disabled whenever `procStage !== 'idle'`. This replaces any ad-hoc `isProcessing` boolean if one existed. The `procStage` enum is the single source of truth for "is a summarization in progress".

---

## Import Path (§XVII — No Barrel Imports)

```typescript
// Correct — import directly from source
import type { ProcessingStage } from '@/types/workflow/processing.types'

// Forbidden — no barrel/index.ts
import type { ProcessingStage } from '@/types/workflow'
```
