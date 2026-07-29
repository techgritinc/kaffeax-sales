# Contract: RubricSignalsContext

**Files**: `src/providers/rubric-signals/rubric-signals-provider.tsx`, `src/providers/rubric-signals/rubric-signals-context.ts`

## Hook

```ts
function useRubricSignals(): RubricSignalsContextValue
```

Throws if called outside `<RubricSignalsProvider>`, matching the existing `useWorkflow()` pattern in `workflow-context.ts`.

## State

| Field | Type | Description |
|---|---|---|
| `signals` | `RubricSignal[]` | Current rubric signal list (client-facing `Rubric['signals']` shape) |
| `banding` | `BandConfig` | Static banding config, seeded once, read-only for the lifetime of the provider |

## Actions

| Action | Signature | Behavior |
|---|---|---|
| `addSignal` | `(input: NewSignalInput) => Promise<void>` | Calls `createRubricSignal`, appends to local `signals` on success |
| `updateSignal` | `(id: string, patch: Partial<RubricSignal>) => Promise<void>` | Calls `updateRubricSignal`, patches matching local entry on success |
| `removeSignal` | `(id: string) => Promise<void>` | Calls `deleteRubricSignal`, removes matching local entry on success |

## Seeding contract

`page.tsx` must call `getRubric()` and pass the result as `initialRubric` to `<RubricSignalsProvider>`, exactly as it currently does for `WorkflowProvider`.

```tsx
<RubricSignalsProvider initialRubric={initialRubric}>
  <RecentsProvider initialRecents={initialRecents}>
    <WorkflowProvider initialSample={initialSample}>
      <AppShell />
    </WorkflowProvider>
  </RecentsProvider>
</RubricSignalsProvider>
```

## Consumption contract (freshness requirement)

Any code path that triggers AI summarization MUST read `signals` from `useRubricSignals()` at the moment the Summarize action fires (not from a value captured earlier), map it through `simplifySignals()` (from `scoring.utils.ts`, unchanged), and pass the result to `runAiSummarization`. This is what guarantees a signal added moments before clicking Summarize is included in that run — see research.md "Rubric-signal freshness at Summarize time."

## Acceptance

- [ ] Adding a signal via `useRubricSignals().addSignal` and then triggering the capture-session provider's `process()` includes the new signal in the `runAiSummarization` call's `signals` argument, without a page reload.
- [ ] `useRubricSignals()` throws when rendered outside the provider (parity with `useWorkflow()`).
