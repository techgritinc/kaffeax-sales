# Contract: Transcript Server Actions

**File**: `src/features/workflow/actions/transcript.actions.ts`

All actions are Next.js Server Actions (`'use server'`), call only `transcriptRepository` methods (never the Mongoose model directly), validate input with Zod, and log-and-rethrow user-safe errors on operational failure per constitution §XIV.

## `createDraftTranscript`

```ts
function createDraftTranscript(input: { rawTranscript: string }): Promise<{ id: string }>
```

- **Validates**: `createDraftTranscriptSchema` — `rawTranscript` non-empty string.
- **Behavior**: Computes `cleanedTranscript = cleanTranscript(rawTranscript)`. Calls `transcriptRepository.create({ userId: DEFAULT_USER_ID, title: <generated>, status: 'draft', aiProcessingStatus: 'pending', source: 'manual', originalTranscript: rawTranscript, cleanedTranscript })`.
- **Returns**: `{ id }` — the new Mongo document id, as soon as the insert completes (before any AI call).
- **Errors**: DB write failure → logged, rethrown as a user-safe `SUMMARIZE_ERROR`-style message (new constant in `action.constants.ts`).

## `runAiSummarization`

```ts
function runAiSummarization(input: { id: string; signals: SimplifiedSignal[] }): Promise<
  | { success: true; record: MeetingRecord }
  | { success: false; error: string }
>
```

- **Validates**: `id` non-empty string; `signals` array (each item matching `SimplifiedSignal` shape).
- **Behavior**:
  1. `transcriptRepository.findById(id)` — if not found, throw (programmer/integration error, not user-facing).
  2. `TranscriptSummarizer.summarize(record.fields.cleanedTranscript, { signals })`.
  3. On success: `transcriptRepository.update(id, { summary, leadScore, aiProcessingStatus: 'success' })`, map to `MeetingRecord` via `toMeetingRecord`, return `{ success: true, record }`.
  4. On `SummarizationError`: `transcriptRepository.update(id, { aiProcessingStatus: 'failed' })`, return `{ success: false, error: <user-safe message from the SummarizationError> }`. `status` remains `'draft'` in both outcomes.
- **Errors**: A DB failure at either read or write step is an operational error → logged and rethrown user-safe; a `SummarizationError` is an expected outcome, not thrown.

## `getTranscriptById` (existing — unchanged, satisfies the "/summaries/:id GET" requirement)

```ts
function getTranscriptById(id: string): Promise<MeetingRecord | null>
```

- Reads through `transcriptRepository.findById`. Called when a recents-bar item is clicked. No `/app/api/` route is introduced — this Server Action is the "GET endpoint" per constitution §X and the checklist note.

## `getTranscripts` (existing — unchanged, feeds the recents bar)

```ts
function getTranscripts(): Promise<StoredTranscript[]>
```

- Used server-side in `page.tsx` to seed `RecentsProvider`; each result is mapped through `toRecentItem()` before being handed to the provider (the action itself keeps returning full domain objects per §IX — projection happens in the mapper layer).

## `updateTranscript` (existing — unchanged, used by `approve()`)

```ts
function updateTranscript(record: MeetingRecord): Promise<MeetingRecord>
```

- Used when the user enters a contact email and approves — sets `status: 'saved'`. Unreachable unless `aiProcessingStatus === 'success'` (enforced client-side by the capture-session provider, not by this action).

## `deleteTranscript` (existing — unchanged)

No behavioral change.

## Removed

- `resetTranscripts()` — no real-DB equivalent required; was mock-only.
