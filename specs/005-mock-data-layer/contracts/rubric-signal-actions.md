# Contract: Rubric Signal Server Actions

**File**: `src/features/workflow/actions/rubric.actions.ts` (`'use server'`)
**Consumes**: `RubricSignalRepository` (`src/repositories/rubric-signal.repository.ts`)
**Returns to UI**: view-model `Rubric` via `rubric.mapper.ts`. UI never sees `RubricSignalFields`.

All actions are `async`. Errors handled per constitution §XIV.

## Read

| Action | Signature | Behavior |
|---|---|---|
| `getRubric` | `() => Promise<Rubric>` | All active signals mapped to `RubricSignal[]` + the constant banding string. Used for hydration and re-scoring. |

## Mutations (routed from provider `addSignal`/`updateSignal`/`removeSignal`, optimistic)

| Action | Signature | Behavior |
|---|---|---|
| `createRubricSignal` | `(label: string, weight: Weight) => Promise<Rubric>` | Persist a new signal (`source:'proposed'`, `hints:[]`, `isActive:true`, minted `signalId`); returns the updated rubric. |
| `updateRubricSignal` | `(id: string, patch: Partial<RubricSignal>) => Promise<Rubric>` | Persist edits to an existing signal. |
| `deleteRubricSignal` | `(id: string) => Promise<Rubric>` | Remove a signal. |
| `resetRubric` | `() => Promise<Rubric>` | Re-seed default rubric signals (`resetDemo`). |

## Guarantees

- **Weight is authoritative on the signal** (matches current behavior where detected-signal weight is resolved from the rubric by id).
- **Signature stability / behavior parity**: as in `transcript-actions.md`. The banding string is a constant returned alongside the mapped signals; it is not persisted per-signal.
- Returning the full `Rubric` after each mutation keeps the client's optimistic state and the store convergent without extra reads.
