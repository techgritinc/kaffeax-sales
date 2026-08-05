# Quickstart: Validating Call Duration & Background Summary Generation

**Feature**: [spec.md](./spec.md) | **Contracts**: [contracts/server-actions.md](./contracts/server-actions.md)

## Prerequisites

- `.env.development` configured per [CLAUDE.md](../../CLAUDE.md) (`MONGO_URI`, etc.)
- `npm install`
- At least one transcript with `durationSeconds` set on it in Mongo (for scenario 1) — a document without the field, or with it unset, for scenario 2.

## Setup

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scenario 1 — Duration shown on the Review screen (User Story 2, P2)

1. Open (or create and summarize) a meeting whose stored transcript has `durationSeconds` set, e.g. `5400` (1h 30m).
2. Navigate to the Review screen for that meeting.
3. **Expected**: immediately after the date in the meta strip, a clock icon and `1h 30m` are shown, separated from the date the same way attendees/date/email are separated elsewhere in the strip.
4. Repeat with a transcript where `durationSeconds` is e.g. `120` (2m — actually pick `2700` for 45m to match spec example) → **expected**: `45m`, no `0h` prefix.
5. Repeat with `durationSeconds` unset/`undefined` → **expected**: no clock icon, no duration text, no leftover separator dot.

## Scenario 2 — Run a summary in the background (User Story 1, P1)

1. On the capture screen, paste/load a transcript and click "Summarise".
2. While the processing modal is showing, click "Run in background".
3. **Expected**: the modal dismisses and you can immediately navigate elsewhere in the app (e.g. open another recent meeting).
4. **Expected**: the meeting's entry in the recents sidebar shows a "Processing…" state.
5. Wait for generation to finish (up to a few minutes with the free-tier model).
6. **Expected**: a toast reading "Summary generation is successful" appears while you're active in the app (no need to be back on the original screen), and the recents sidebar entry updates to its success state (band badge) without a manual page refresh.
7. Reload the browser tab entirely after step 6's toast has appeared, then reopen the meeting.
8. **Expected**: the summary is present and the status is `success` — confirming the background result was persisted, not just held in memory.

## Scenario 3 — Refresh during the synchronous (non-background) wait marks the transcript `cancelled`

1. Start a new summary generation and, this time, do **not** click "Run in background" — leave the processing modal showing.
2. Refresh the browser tab while the modal is still visible (before generation completes).
3. **Expected**: after reload, the meeting's sidebar entry shows a `cancelled` state ("Cancelled — reopen to retry"), not stuck on "Processing…".
4. Click the cancelled meeting in the sidebar.
5. **Expected**: its raw transcript is loaded back into the capture-screen textarea, and clicking "Summarise" again starts a fresh generation.

## Scenario 4 — Background generation survives a refresh (contrast with Scenario 3)

1. Repeat Scenario 2 steps 1–2 (click "Run in background").
2. Immediately refresh the browser tab.
3. **Expected**: the meeting's status is **not** `cancelled` — it remains `processing` (or has already reached `success`/`failed` if enough time passed) once generation completes, confirming refresh only cancels the synchronous path.

## Scenario 5 — Duplicate-generation prevention

1. Start a background generation for a meeting.
2. While it's still `processing`, reopen the same meeting and attempt to click "Summarise" again.
3. **Expected**: no second generation starts; the UI reflects that the meeting is already processing rather than restarting it.

## Verification commands

```bash
npm run type-check
npm run lint
npm run build
```

All three must pass (per CLAUDE.md's `npm run validate` pipeline) before this feature is considered done.
