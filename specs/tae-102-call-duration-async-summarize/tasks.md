---

description: "Task list for tae-102-call-duration-async-summarize"
---

# Tasks: Call Duration Display & Background Summary Generation

**Input**: Design documents from `/specs/tae-102-call-duration-async-summarize/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/server-actions.md](./contracts/server-actions.md), [quickstart.md](./quickstart.md)

**Tests**: Not included — the repository has no test infrastructure configured yet (CLAUDE.md: "No tests yet") and the spec does not request TDD. Validation is manual, via [quickstart.md](./quickstart.md) plus `npm run validate`.

**Organization**: Tasks are grouped by user story from spec.md so each can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps the task to US1 (background generation + cancellation) or US2 (call duration display)
- File paths are exact and relative to the repository root

## Phase 1: Setup

**Purpose**: Project initialization and scaffolding.

No setup tasks are required. This feature adds no new dependency, build step, or scaffolding (research.md — every decision deliberately reused existing infrastructure: `after()`, Server Actions, the existing recents/toast plumbing). Proceed directly to Phase 2.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared groundwork that both user stories would otherwise duplicate.

No cross-story foundational tasks are required. US1 and US2 touch different fields on the same handful of shared files (`transcript.types.ts`, `transcript.model.ts`, `meeting.types.ts`, `transcript.mapper.ts`) but are otherwise fully independent additive changes — see the per-story tasks below. Proceed directly to Phase 3 (US1, the priority order from spec.md).

---

## Phase 3: User Story 1 - Generate summaries without being stuck waiting (Priority: P1) 🎯 MVP

**Goal**: Let a user send a summary generation to the background and keep working, with "Processing" status shown in Recents, a success toast and persisted status on completion, and a new "Cancelled" status (with one-click retry) when a *synchronous* (non-background) wait is interrupted by a page refresh/reload.

**Independent Test**: Follow [quickstart.md](./quickstart.md) Scenarios 2–5: start a background generation and navigate away (toast + Recents update on completion); refresh mid-synchronous-wait (status becomes `cancelled`, retry reloads the transcript); refresh mid-background-wait (unaffected); attempt a duplicate generation (rejected).

### Implementation for User Story 1

- [X] T001 [US1] Extend `AI_PROCESSING_STATUSES`/`AiProcessingStatus` in `src/types/transcript.types.ts` to `['pending', 'processing', 'success', 'failed', 'cancelled']` per data-model.md
- [X] T002 [US1] Update the Mongoose `aiProcessingStatus` enum in `src/lib/db/models/transcript.model.ts` to reference the extended `AI_PROCESSING_STATUSES` constant from T001 (depends on T001)
- [X] T003 [P] [US1] Add `originalTranscript: string` to `MeetingRecord` in `src/types/meeting.types.ts` (data-model.md §"New field (retry support)")
- [X] T004 [US1] Populate `originalTranscript` from `stored.fields.originalTranscript` inside `toMeetingRecord` in `src/lib/utils/workflow/transcript.mapper.ts` (depends on T003)
- [X] T005 [US1] In `runAiSummarization` (`src/server-actions/workflow/transcript-ai.actions.ts`): change the status write at generation start from `'pending'` to `'processing'`; add a guard that returns `{ success: false, error: '…', alreadyProcessing: true }` without starting work when the transcript's current `aiProcessingStatus` is already `'processing'` (depends on T001, T002; contracts/server-actions.md §1)
- [X] T006 [US1] Extract the shared generation body (LLM call → terminal `success`/`failed` write → suggested-questions follow-up) out of `runAiSummarization` into an internal helper function in `src/server-actions/workflow/transcript-ai.actions.ts` so both the synchronous and background entry points call the same logic (depends on T005)
- [X] T007 [US1] Add `runAiSummarizationInBackground(input: { id, signals })` to `src/server-actions/workflow/transcript-ai.actions.ts`: run the same duplicate-guard as T005, synchronously write `aiProcessingStatus: 'processing'`, then schedule the T006 helper via `after()` from `next/server` and return immediately (depends on T006; contracts/server-actions.md §2)
- [X] T008 [US1] Add `cancelProcessing(id: string): Promise<{ cancelled: boolean }>` to `src/server-actions/workflow/transcript-ai.actions.ts`: idempotently transitions `pending`/`processing` → `cancelled`, no-ops otherwise (depends on T001, T002; contracts/server-actions.md §3)
- [X] T009 [US1] Add structured error logging (constitution §XIV — no bare `catch {}`, no internal details surfaced to the user) around the `after()`-scheduled work in T007 and around `cancelProcessing` in T008 (depends on T007, T008)
- [X] T010 [US1] ~~In `runSummarize`, write the transcript id to the `kx.activeForegroundGenerationId` sessionStorage key~~ — **superseded during post-implementation bug-fixing**: `runSummarize` now *always* calls `runAiSummarizationInBackground` (never the blocking `runAiSummarization`) and polls `getTranscriptById` on a short client-side interval, so the sessionStorage marker is set around the whole poll loop instead of a single blocking await. Root cause: the original blocking call serialized every other Server Action on the same client (Next.js queues same-client action calls), freezing navigation to other recents while a summary was generating — see progress ledger for full analysis. (depends on T005; research.md §3)
- [X] T011 [US1] ~~Add a new `runSummarizeInBackground` action~~ — **superseded**: since T010's fix made `runSummarize` itself non-blocking (it now delegates to `runAiSummarizationInBackground` and polls), a separate `runSummarizeInBackground` action is no longer needed. "Run in background" (`summarizeInBackground` in `use-workflow-actions.ts`) now just abandons the in-flight foreground poll via a generation-nonce guard (`abandonForegroundGeneration`) and frees the UI immediately — the underlying generation (already running via `after()`) is unaffected. (depends on T007)
- [X] T012 [US1] Add an `onRunInBackground` prop to `ProcessingModalProps` in `src/components/capture-screen/processing-modal.tsx` and render a "Run in background" action (visible while `procStage` is `'preparing'`/`'processing'`) that calls it (depends on none; contracts/server-actions.md §7)
- [X] T013 [US1] Wire `onRunInBackground` from the modal's caller (`app-shell.tsx`) to call `summarizeInBackground` and dismiss the modal immediately (depends on T011, T012)
- [X] T014 [US1] On client mount (in `src/hooks/workflow/use-workflow-actions.ts`), check the `kx.activeForegroundGenerationId` `sessionStorage` key; if present, call `cancelProcessing` (T008) for that id and clear the key (depends on T008, T010; research.md §3)
- [X] T015 [US1] In `openFromRecent` (`src/hooks/workflow/use-workflow-actions.ts`), call `setTranscript(record.originalTranscript)` whenever the opened record's `aiProcessingStatus !== 'success'`, so `cancelled` (and `failed`) meetings reload their raw transcript into the capture-screen textarea for retry (depends on T004; FR-015)
- [X] T016 [US1] ~~Add a bounded poll to `recents-provider.tsx`~~ — **relocated**: implemented in `workflow-provider.tsx` instead, since that provider (not `RecentsProvider`) has access to both `recents` and the `notify` toast action. Poll while `recents.some(r => r.aiProcessingStatus === 'processing')`; on each tick diff against the previous snapshot and fire the "Summary generation is successful" toast on `processing → success` transitions. (depends on T001, T002; research.md §2)
- [X] T017 [US1] Update `src/components/meeting-library/sidebar-item.tsx` to render explicit `processing` and `cancelled` branches (dot color/pulse + label text) instead of letting them fall into the current shared `else` → `"Processing…"` branch; `cancelled` renders "Cancelled — reopen to retry" with a non-pulsing rust dot (depends on T001, T002; contracts/server-actions.md §8)

**Checkpoint**: User Story 1 is fully functional and independently testable via quickstart.md Scenarios 2–5.

---

## Phase 4: User Story 2 - See call duration on the Review screen (Priority: P2)

**Goal**: Show the call's duration, with a clock icon, immediately after the date in the Review screen's meta strip — omitted entirely when unknown.

**Independent Test**: Follow [quickstart.md](./quickstart.md) Scenario 1 — open Review screens for meetings with a known duration (≥1h, <1h) and with no duration set, and confirm the display in each case. Fully testable without any User Story 1 work in place.

### Implementation for User Story 2

- [X] T018 [P] [US2] Add `durationSeconds?: number` to `TranscriptFields` in `src/types/transcript.types.ts` (data-model.md — omitted/`undefined` means unknown, never defaulted to `0`)
- [X] T019 [US2] Add the corresponding optional `durationSeconds: { type: Number, required: false }` field to the Mongoose schema in `src/lib/db/models/transcript.model.ts`, with no default value (depends on T018)
- [X] T020 [P] [US2] Add `durationSeconds?: number` to `MeetingRecord` in `src/types/meeting.types.ts`
- [X] T021 [US2] Populate `durationSeconds` from `stored.fields.durationSeconds` inside `toMeetingRecord` in `src/lib/utils/workflow/transcript.mapper.ts` (depends on T018, T020)
- [X] T022 [P] [US2] Create `formatCallDuration(durationSeconds?: number): string | null` in a new file `src/lib/utils/workflow/duration.utils.ts` — returns `null` for `undefined`; otherwise `"1h 30m"` style output, dropping the hours segment under an hour (e.g. `"45m"`), rounding down to whole minutes with `"1m"` as the floor for any non-zero duration under 60 seconds (research.md §6)
- [X] T023 [P] [US2] Add a `Clock` entry to `IconName` and its SVG path to `ICON_PATHS` in `src/components/ui/icon/icon-paths.tsx`, following the existing 24×24/`stroke=currentColor` convention used by the other icons in that file
- [X] T024 [US2] Add `durationSeconds?: number` to `MetaStripProps` in `src/components/review-screen/meta-strip.tsx` and render a `Clock` icon + `formatCallDuration(durationSeconds)` immediately after the existing date `<span>`, separated by the same `MetaDot` pattern already used between the other meta items; render nothing (no icon, no dot) when the formatted result is `null` (depends on T022, T023; contracts/server-actions.md §6)
- [X] T025 [US2] Pass `durationSeconds={draft.durationSeconds}` from `src/components/review-screen/review-screen.tsx` (where `<MetaStrip>` is already invoked) through to the prop added in T024 (depends on T021, T024)

**Checkpoint**: User Stories 1 and 2 are both independently functional; all quickstart.md scenarios pass.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation once both stories are in place.

- [X] T026 Run `npm run validate` (type-check → lint → build) and resolve any findings — both stories together must pass with zero warnings (constitution §IV)
- [ ] T027 Walk through all 5 scenarios in [quickstart.md](./quickstart.md) end-to-end in the running dev app — **not yet performed by the agent**; user should verify manually against the running dev server

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — skipped, no tasks.
- **Foundational (Phase 2)**: None — skipped, no tasks.
- **User Story 1 (Phase 3)**: No dependency on US2. Internal order: T001→T002 (enum) must precede T005/T007/T008/T016/T017 (anything reading/writing the new status values); T003→T004 (type) must precede T015 (consumes `originalTranscript`); T005→T006→T007 is a strict chain (shared helper extraction before the background entry point exists); T010 and T011 must both exist before T014 (reconciliation needs the marker contract from both) and before T013 (wiring needs both the modal hook and the background action).
- **User Story 2 (Phase 4)**: No dependency on US1. T018/T020 (types) → T019/T021 (schema/mapper) → T024 (component) → T025 (wiring). T022 and T023 have no dependencies and can start immediately in parallel with the type changes.
- **Polish (Phase 5)**: Depends on both Phase 3 and Phase 4 being complete.

### Parallel Opportunities

- T003 (US1) and T018/T020/T022/T023 (US2) can all start immediately in parallel with each other and with T001 — they touch different fields/files or, where the same file is touched (`transcript.types.ts`, `meeting.types.ts`), different, non-overlapping additions.
- Once Phase 3 and Phase 4 are each internally sequenced as above, the two stories can be built by two different people entirely in parallel — neither reads nor writes the other's new fields.

---

## Parallel Example: Kicking off both stories at once

```bash
# Person/agent A starts User Story 1's type groundwork:
Task: "Extend AI_PROCESSING_STATUSES/AiProcessingStatus in src/types/transcript.types.ts (T001)"
Task: "Add originalTranscript to MeetingRecord in src/types/meeting.types.ts (T003)"

# Person/agent B starts User Story 2 entirely in parallel:
Task: "Add durationSeconds to TranscriptFields in src/types/transcript.types.ts (T018)"
Task: "Add durationSeconds to MeetingRecord in src/types/meeting.types.ts (T020)"
Task: "Create formatCallDuration in src/lib/utils/workflow/duration.utils.ts (T022)"
Task: "Add Clock icon to src/components/ui/icon/icon-paths.tsx (T023)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3 (User Story 1) — T001 through T017.
2. **STOP and VALIDATE**: run quickstart.md Scenarios 2–5.
3. Ship — the background-generation pain point (the stated primary driver of this request) is resolved without touching the duration display at all.

### Incremental Delivery

1. Phase 3 (US1) → validate → ship.
2. Phase 4 (US2) → validate → ship.
3. Phase 5 polish once both are live.

### Parallel Team Strategy

With two people: one takes Phase 3 (US1) end-to-end, the other takes Phase 4 (US2) end-to-end — confirmed independent above, no shared blocking file edits.

---

## Notes

- No `[P]` marker on most US1 tasks: nearly every task in that story either shares `transcript-ai.actions.ts` (T005–T009) or has a direct read/write dependency on a preceding task's output (T010→T014, T011→T013, T004→T015) — genuine parallelism there is limited.
- US2 has more `[P]` opportunities (T018, T020, T022, T023) since duration storage, formatting, and the icon are independent until they're wired together in T024.
- Commit after each task or logical group; stop at either checkpoint to validate that story independently before continuing.
- This feature intentionally introduces no test tasks — see the "Tests" note at the top of this file.
