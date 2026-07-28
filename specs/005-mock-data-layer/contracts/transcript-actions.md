# Contract: Transcript Server Actions

**File**: `src/features/workflow/actions/transcript.actions.ts` (`'use server'`)
**Consumes**: `TranscriptRepository` (`src/repositories/transcript.repository.ts`)
**Returns to UI**: view-models (`MeetingRecord`) via `transcript.mapper.ts`. UI never sees `TranscriptFields`.

All actions are `async`. Reads return `null`/empty for missing records (never throw). Mutations return a structured result; internal errors are logged with context and surfaced as user-safe messages (constitution §XIV) — never raw stack traces.

## Read actions (also callable from the `page.tsx` server component for hydration)

| Action | Signature | Behavior |
|---|---|---|
| `getTranscripts` | `() => Promise<MeetingRecord[]>` | Full library, mapped. Order preserved (drafts first, as today). |
| `getTranscriptById` | `(id: string) => Promise<MeetingRecord \| null>` | `null` if absent. |
| `getSampleTranscript` | `() => Promise<string>` | The sample `originalTranscript` text (`SAMPLE`). |
| `getCrmRecords` | `() => Promise<CrmRecord[]>` | Derived projection of `status === 'saved'` transcripts. |

## Mutation actions (routed from `use-workflow-actions.ts`, optimistic on the client)

| Action | Signature | Behavior |
|---|---|---|
| `createTranscript` | `(record: MeetingRecord) => Promise<MeetingRecord>` | Decompose → persist a new record (status `draft`/`processing`). Used after the engine produces a draft. |
| `updateTranscript` | `(id: string, patch: Partial<MeetingRecord>) => Promise<MeetingRecord \| null>` | Persist edits (inline `patch` folded here on transition; approve sets `status:'saved'`, `zohoLeadId`). |
| `deleteTranscript` | `(id: string) => Promise<{ ok: boolean }>` | Reject/discard a draft. Idempotent. |
| `resetTranscripts` | `() => Promise<void>` | Re-seed the store from fixtures (`resetDemo`). |

## Guarantees

- **Signature stability (SC-007)**: These signatures are the migration contract. Swapping the repository's data source from the mock store to Mongoose changes only the repository body — not these signatures, the mappers, or any caller.
- **Behavior parity (SC-006)**: The set/return values reproduce exactly what the current `use-workflow-actions.ts` state transitions produce (create draft, approve→commit, reject→remove, reset).
- **No direct data access**: Actions call repository methods only; no store/Mongoose access inline (constitution §IX).
