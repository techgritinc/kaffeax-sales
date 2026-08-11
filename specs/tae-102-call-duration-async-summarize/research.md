# Research: Call Duration Display & Background Summary Generation

**Feature**: [spec.md](./spec.md) | **Date**: 2026-08-04

This feature has no `NEEDS CLARIFICATION` markers remaining in the Technical Context (all clarified during `/speckit-clarify` or resolved below with a documented decision). Each subsection covers one open technical question raised by the spec.

## 1. How to run summary generation "in the background" within this stack

**Decision**: Use Next.js 16's `after()` (from `next/server`) inside the existing `runAiSummarization` Server Action call path. The action synchronously marks the transcript `processing` and returns immediately; the actual LLM call and the terminal DB write (`success`/`failed`) are scheduled via `after()` so they run once the response has been sent, without blocking the client.

**Rationale**:
- The app has no queue/worker infrastructure (verified: no Bull/BullMQ/cron/worker packages, no `/app/api` background jobs) and the constitution forbids introducing new route handlers for mutations (§X) or unvetted dependencies (§I) — adding a job queue would be a disproportionate amount of new infrastructure for this feature.
- `after()` is stable as of Next 15.1 and explicitly documented (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`) as supported for this project's deployment target: a self-hosted Node.js server (`next start`, no static export, no Vercel-specific adapter in `package.json`). The Node.js server target has full support per the platform support table in that doc.
- It runs server-side, decoupled from the originating HTTP request/response lifecycle — once scheduled, it keeps running even if the client's tab closes or reloads, which is exactly the guarantee the "Run in background" option needs (confirmed in Clarifications: background generation is unaffected by refresh/reload).

**Alternatives considered**:
- **New job queue (e.g., BullMQ + Redis)**: rejected — new persistent infrastructure dependency, disproportionate to a single long-running LLM call, and would need its own worker process to run alongside `next start`.
- **Fire-and-forget `void asyncFn()` without `after()`**: rejected — without `after()`, Next.js does not guarantee the function body continues executing once the response has been flushed; `after()` is the documented, supported primitive for exactly this.

## 2. How the client learns that a background generation has finished (for the success toast)

**Decision**: Extend `RecentsProvider` with a short client-side polling interval that is only active while at least one item in the current `recents` list has `aiProcessingStatus === 'processing'`. Each poll re-fetches the first page via the existing `getTranscriptPage` Server Action, diffs statuses against the previous snapshot, and for any item that transitioned `processing → success`, triggers the existing `notify(...)` toast mechanism (rendered at `app-shell.tsx`, so it is visible regardless of which screen/step the user is on).

**Rationale**:
- No push/real-time infrastructure exists (no WebSockets, no SSE, no `swr`/`react-query`). Introducing one would be disproportionate to notifying about a single background job's completion (constitution §XV: prefer simplicity, justify new dependencies).
- `getTranscriptPage` and the `RecentItem`/`updateRecent` plumbing already exist and are reused as-is — no new Server Action is needed for the read path.
- Polling only while something is actually `processing` keeps the added request volume proportional to actual usage (near-zero most of the time) rather than a permanent background poll.

**Alternatives considered**:
- **WebSocket/SSE push channel**: rejected — new infrastructure and a new dependency category not otherwise used anywhere in the app, for a single notification use case.
- **No live update; rely on next full page load**: rejected — fails SC-004 ("notified while remaining active in the application").

## 3. How to detect "user refreshed/reloaded during the synchronous (on-screen) wait" and mark the transcript `cancelled`

**Decision**: Track the in-flight synchronous generation's transcript id in `sessionStorage` (a single key) for the duration of the on-screen wait only. On successful completion or failure, the key is cleared as part of the normal `runSummarize` flow. On app bootstrap (client mount), if that key is still present, it means the previous page load ended (via refresh/reload) before the awaited Server Action call resolved; the client makes a normal, awaited call to a new `cancelProcessing(id)` Server Action, which downgrades that transcript's status to `cancelled` only if it is still `pending`/`processing` (a no-op if it already finished — avoids a race where the response actually arrived just before the key was read). The key is set **only** for the synchronous wait path; choosing "Run in background" clears/never sets it, so a background generation is never affected by this mechanism (matches the Clarifications decision).

**Rationale**:
- `sessionStorage` persists across a same-tab refresh/reload and is cleared only when the tab/window closes — exactly the lifetime needed to distinguish "user reloaded mid-wait" from "user closed the tab" (the latter doesn't need a UI update since there's no tab left to show it in).
- This stays entirely within Server Actions + a plain client-side check on mount — no new route handler, no `navigator.sendBeacon`, no reliance on undocumented server-side abort detection.
- It is intentionally a **reconciliation on next load**, not a live "catch the refresh as it happens" mechanism — there is no reliable, documented way to run code server-side at the exact moment a browser tab is refreshed mid-request in this framework, so reconciling on the next mount is the practical, constitution-compliant approach.

**Alternatives considered**:
- **`navigator.sendBeacon` / `fetch(..., { keepalive: true })` on `pagehide`**: rejected — Server Actions are invoked through Next's internal RSC action-id protocol, not a plain stable URL; beaconing to it is undocumented and fragile, and a plain mutation endpoint would require a `/app/api/` route handler, which the constitution prohibits for mutations (§X).
- **Server-side request-abort detection** (watching the incoming request's abort signal inside the Server Action): rejected — not a documented, reliably-exposed capability of Next.js Server Actions, and disconnect timing (TCP-level) is not guaranteed to fire before the async work completes anyway.

## 4. Preventing a duplicate generation for the same meeting

**Decision**: Before starting either the synchronous or background path, the shared generation-starter reads the transcript's current `aiProcessingStatus`; if it is already `processing`, the call is a no-op (returns the existing state rather than starting a second generation).

**Rationale**: Single check, single source of truth (the persisted status), no new locking primitive needed — consistent with the existing pattern where `transcriptRepository` is the sole gate on transcript state.

## 5. Retrying a `cancelled` meeting

**Decision**: `MeetingRecord` (the frontend-safe projection returned by `getTranscriptById`/`openFromRecent`) gains an `originalTranscript: string` field, populated by the existing `toMeetingRecord` mapper. `openFromRecent` (in `use-workflow-actions.ts`) calls `setTranscript(record.originalTranscript)` in addition to `setDraft(...)` whenever the opened record's status is not `success`, so the raw transcript is back in the capture-screen textarea and the user can click "Summarize" again immediately.

**Rationale**: `MeetingRecord` currently carries no transcript text at all, so today opening a non-`success` recent item (including the existing `failed` case) loads the draft metadata but leaves the textarea empty — this was already an incomplete retry path. Surfacing `originalTranscript` on `MeetingRecord` fixes the retry path for `cancelled` as required by FR-015, and incidentally makes retrying a `failed` item work the same way (no separate mechanism needed).

## 6. Duration display formatting

**Decision**: Store call length as `durationSeconds?: number` (optional — omitted/`undefined` when unknown) on `TranscriptFields`. A small pure utility (`formatCallDuration`) renders it as `"1h 30m"`, `"45m"`, or `"1m"` (hours segment dropped under an hour; minutes always shown, rounded down to the nearest whole minute, minimum `"1m"` for any non-zero duration under 60 seconds) and returns `null` when the input is `undefined`, so the `MetaStrip` component can conditionally render nothing (no clock icon, no placeholder).

**Rationale**: Matches the existing optional/omit pattern already used elsewhere in `TranscriptFields` (e.g. `zohoLeadId: string | null`) and keeps formatting logic as a pure, independently-testable utility per constitution §VII, colocated in `src/lib/utils/workflow/` alongside the other transcript-formatting helpers (`transcript.mapper.ts`).

**Alternatives considered**: Storing as `durationMinutes` — rejected in favor of seconds for precision (a source feed that reports exact call length in seconds, e.g. a future Zoom/Teams webhook integration, shouldn't need to lose sub-minute precision at the storage layer even though the display rounds down).
