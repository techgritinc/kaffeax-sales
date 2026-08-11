# Contracts: Server Actions & Client-Facing Shapes

**Feature**: [spec.md](./spec.md) | **Data model**: [data-model.md](./data-model.md)

This app has no `/app/api/` route handlers for mutations (constitution §X) — its "contracts" are Server Action function signatures and the repository-layer shapes they depend on. This file documents what's added or changed; anything not listed here is unchanged from current behavior.

## 1. `runAiSummarization` (`src/server-actions/workflow/transcript-ai.actions.ts`) — modified

```ts
export async function runAiSummarization(input: {
  id: string;
  signals: SimplifiedSignal[];
}): Promise<
  | { success: true; record: MeetingRecord }
  | { success: false; error: string }
  | { success: false; error: string; alreadyProcessing: true }
>;
```

- **Behavior change**: the internal write that used to set `aiProcessingStatus: 'pending'` at the start of generation now sets `'processing'` instead (FR-006).
- **New guard**: if the transcript's current `aiProcessingStatus` is already `'processing'` when called, returns `{ success: false, error: '…', alreadyProcessing: true }` immediately without starting a second generation (FR-012). Callers treat this as a no-op, not a user-facing failure.
- Unchanged otherwise: still resolves only once generation fully completes (this is the synchronous/"wait on-screen" path).

## 2. `runAiSummarizationInBackground` (same file) — new

```ts
export async function runAiSummarizationInBackground(input: {
  id: string;
  signals: SimplifiedSignal[];
}): Promise<{ started: true } | { started: false; reason: 'already_processing' | 'not_found' }>;
```

- Validates input and current status the same way as `runAiSummarization`'s new guard.
- Synchronously (before returning) writes `aiProcessingStatus: 'processing'` so the caller can update the UI immediately.
- Schedules the actual summarization (LLM call + terminal `success`/`failed` write + suggested-questions follow-up) via `after()` from `next/server`, reusing the same internal generation logic as `runAiSummarization` — no duplicated business logic between the two entry points.
- Returns as soon as the `processing` write is confirmed — does **not** wait for generation to finish. This is what lets the client leave the screen immediately (FR-005).

## 3. `cancelProcessing` (same file) — new

```ts
export async function cancelProcessing(id: string): Promise<{ cancelled: boolean }>;
```

- Idempotent: only transitions `pending`/`processing` → `cancelled`. If the transcript is already `success`, `failed`, or `cancelled`, this is a no-op and returns `{ cancelled: false }`.
- Called exactly once, client-side, on app mount, only when the `kx.activeForegroundGenerationId` sessionStorage marker (data-model.md) indicates the previous page load's synchronous wait never resolved.
- Never called for the background path.

## 4. `transcriptRepository.update` patch shape — extended

No signature change (`update(id: string, patch: Partial<TranscriptFields>)`), but the set of values `aiProcessingStatus` in the patch may hold now includes `'processing'` and `'cancelled'`, and `patch.durationSeconds` (`number | undefined`) is a newly-valid field.

## 5. `getTranscriptById` / `openFromRecent` MeetingRecord shape — extended

`MeetingRecord` (`src/types/meeting.types.ts`) gains:

```ts
export interface MeetingRecord {
  // ...existing fields unchanged...
  durationSeconds?: number;
  originalTranscript: string; // new — see data-model.md
}
```

Populated by `toMeetingRecord` (`src/lib/utils/workflow/transcript.mapper.ts`) directly from the stored `TranscriptFields`.

## 6. UI contract: `MetaStrip` (`src/components/review-screen/meta-strip.tsx`) — extended props

```ts
export interface MetaStripProps {
  attendees: Attendee[];
  email: string;
  onEmailChange: (value: string) => void;
  disabled?: boolean;
  durationSeconds?: number; // new
}
```

- Renders a `Clock` icon + `formatCallDuration(durationSeconds)` output immediately after the existing date span, separated by the same `MetaDot` pattern already used between the other meta items.
- Renders nothing (no icon, no text, no extra `MetaDot`) when `durationSeconds` is `undefined` or `formatCallDuration` returns `null`.

## 7. UI contract: `ProcessingModal` (`src/components/capture-screen/processing-modal.tsx`) — extended props

```ts
export interface ProcessingModalProps {
  procStage: ProcessingStage;
  className?: string;
  onRunInBackground: () => void; // new
}
```

- Adds a "Run in background" action to the existing modal (visible once `procStage` is `'preparing'` or `'processing'`), which calls `onRunInBackground` — wired by the caller to dispatch `runAiSummarizationInBackground` and immediately dismiss the modal / unblock navigation, without waiting for the background call's terminal state.

## 8. UI contract: `SidebarItem` (`src/components/meeting-library/sidebar-item.tsx`) — status rendering

Current logic collapses everything that isn't `success`/`failed` into a single `else` branch rendered as `"Processing…"`. This must become an explicit branch per status so `cancelled` is distinguishable:

| `aiProcessingStatus` | Sidebar meta text | Dot |
|---|---|---|
| `success` | `${badge} · ${when}` (unchanged) | band color (unchanged) |
| `failed` | `Failed — reopen to retry · ${when}` (unchanged) | rust (unchanged) |
| `processing` | `Processing… · ${when}` (unchanged text, now explicit rather than the fallback) | pulsing muted (unchanged) |
| `pending` | `Processing… · ${when}` (unchanged — a freshly-created draft not yet started reads the same as active generation, no behavior change) | pulsing muted (unchanged) |
| `cancelled` (new) | `Cancelled — reopen to retry · ${when}` | rust, no pulse |
