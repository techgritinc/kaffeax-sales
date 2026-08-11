# Data Model: Call Duration Display & Background Summary Generation

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Modified entity: Transcript (`TranscriptFields`, `src/types/transcript.types.ts`)

### New field

| Field | Type | Required | Notes |
|---|---|---|---|
| `durationSeconds` | `number \| undefined` | No | Length of the call in seconds. Omitted/`undefined` when unknown (e.g. no source metadata yet supplies it). Never `0` used as a sentinel for "unknown" — absence means unknown, `0` would mean an actual zero-length call. |

Mirrored on `MeetingRecord` (`src/types/meeting.types.ts`) as `durationSeconds?: number` so the Review screen can read it without a second round trip, and on `RecentItem` is **not** needed (duration is only shown on the Review screen's `MetaStrip`, not in the recents sidebar).

### New field (retry support, see research.md §5)

| Field | Type | Required | Notes |
|---|---|---|---|
| `originalTranscript` | `string` | Yes | Already exists on `TranscriptFields`/`StoredTranscript`; newly surfaced on `MeetingRecord` (previously absent from that projection) so `openFromRecent` can repopulate the capture-screen textarea for retry. |

### Extended enum: `AiProcessingStatus`

Current (`src/types/transcript.types.ts:23`):
```ts
export const AI_PROCESSING_STATUSES = ['pending', 'success', 'failed'] as const;
```

New:
```ts
export const AI_PROCESSING_STATUSES = ['pending', 'processing', 'success', 'failed', 'cancelled'] as const;
```

State meanings:

| State | Meaning |
|---|---|
| `pending` | Draft created, generation not yet started. |
| `processing` | Generation actively running — set for **both** the synchronous (on-screen) path and the "Run in background" path; the two are distinguished client-side by which UI is shown (blocking modal vs. free navigation), not by a different status value. |
| `success` | Generation completed and summary/lead score persisted. |
| `failed` | Generation attempted and errored (LLM failure, validation error, etc.). |
| `cancelled` | **New.** A synchronous (on-screen, not backgrounded) generation was interrupted by the user refreshing/reloading the page before it completed. Never reached from the background path (see Clarifications in spec.md). |

### State transitions

```text
                 ┌──────────────────────────────────────────┐
                 │                                            │
   (draft created)                                            ▼
        pending ──start generation──► processing ──success──► success
                                          │  │
                                          │  └──error────────► failed
                                          │
                                          └──refresh/reload
                                             (sync path only)──► cancelled
                                                                    │
                                                              (retry: reopen,
                                                               click Summarize)
                                                                    │
                                                                    ▼
                                                               processing
```

- `cancelled → processing` and `failed → processing` are the retry transitions (FR-015): reopening the meeting reloads `originalTranscript` into the textarea; clicking "Summarize" starts a fresh generation exactly like a first attempt.
- Starting a second generation while a meeting is already `processing` is rejected (FR-012) — no transition occurs.
- `success` is terminal for a given generation attempt; there is no requirement in this feature to re-summarize a completed meeting.

## Persistence (`src/lib/db/models/transcript.model.ts`)

- `durationSeconds`: add as `{ type: Number, required: false }` — no default (absence is meaningful; do not default to `0`).
- `aiProcessingStatus`: `enum` list extends to the five values above; `default: 'pending'` unchanged.
- Per constitution §XI, the model file only imports `TranscriptFields`/`AI_PROCESSING_STATUSES` from `src/types/transcript.types.ts` — no inline type/enum declarations in the model file itself.

## Client-side ephemeral state (not persisted)

| Key | Location | Lifetime | Purpose |
|---|---|---|---|
| `kx.activeForegroundGenerationId` | `sessionStorage` | Set when a synchronous (non-background) generation starts; cleared on that generation's success/failure; read once on next app mount | Distinguishes "tab reloaded mid-wait" (key still present on mount → call `cancelProcessing`) from a normal load (key absent). See research.md §3. |

No other new persisted or ephemeral entities are introduced. `RecentItem` (`src/providers/recents/recents-context.ts`) requires no shape change — it already carries `aiProcessingStatus`, which now simply has two additional possible values that existing consumers (`SidebarItem`) must render explicitly instead of falling through to a shared "else" branch.
