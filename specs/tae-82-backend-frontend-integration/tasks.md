---

description: "Task list for Backend Integration with Frontend"
---

# Tasks: Backend Integration with Frontend

**Input**: Design documents from `specs/tae-82-backend-frontend-integration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not included — no test infrastructure exists in this repo yet (CLAUDE.md: "No tests yet") and tests were not requested in spec.md.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to spec.md user stories — US1, US2, US3, US4
- Every task includes an exact file path

## Path Conventions

Single Next.js App Router project — all paths are relative to repository root, rooted at `src/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type/constant groundwork with no cross-file dependencies, needed before the Foundational rewrite.

- [X] T001 [P] Add `AiProcessingStatus` type and `AI_PROCESSING_STATUSES` constant (`'pending' | 'success' | 'failed'`), and narrow `TRANSCRIPT_STATUSES` from 4 values to `['draft', 'saved']`, in `src/types/transcript.types.ts`
- [X] T002 [P] Rename snake_case fields to camelCase in `src/types/meeting.types.ts`: `lead_score`→`leadScore`, `recap_email`→`recapEmail`, `summary.meeting_title`→`summary.meetingTitle`, `summary.open_questions`→`summary.openQuestions`, `summary.next_steps`→`summary.nextSteps`, `nextStep.due_date`→`nextStep.dueDate`
- [X] T003 [P] Rename `detected_signals`→`detectedSignals` in `src/types/scoring.types.ts`
- [X] T004 [P] Create `src/constants/user.ts` exporting a `DEFAULT_USER_ID` constant (replaces the mock `DEMO_USER_ID`)

**Checkpoint**: Types and constants ready — Foundational rewrite can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Real-DB repository layer, updated model/mapper, provider shells, and mock-layer removal — all four user stories depend on this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Add `aiProcessingStatus` field (enum `AI_PROCESSING_STATUSES`, default `'pending'`, required) and change the `status` field default from `'processing'` to `'draft'` in `src/lib/db/models/transcript.model.ts` (depends on T001)
- [X] T006 [P] Create `cleanTranscript(raw: string): string` in `src/lib/utils/transcript-cleaner.utils.ts`, stripping timestamps and speaker-line hyphen/formatting artifacts
- [X] T007 Rewrite `src/repositories/transcript.repository.ts` to query the real `Transcript` Mongoose model via `withDb()` (`findById`, `create`, `update`, `delete`, list-for-recents), removing the mock-only `reset()` and all `getStore()`/`reseedTranscripts()` usage (depends on T005)
- [X] T008 [P] Rewrite `src/repositories/rubric-signal.repository.ts` to query the real `RubricSignal` Mongoose model via `withDb()`, removing the mock-only `reset()` and all `getStore()`/`reseedRubricSignals()` usage
- [X] T009 Update `src/features/workflow/utils/transcript.mapper.ts`: use camelCase field names throughout, map the new `aiProcessingStatus` field, and add a `toRecentItem()` projection (`StoredTranscript` → `RecentItem`: `status` `'CRM'` if source `status === 'saved'` else `'DRAFT'`; `badge` = uppercased `leadScore.band` only when `aiProcessingStatus === 'success'`) (depends on T001, T002, T003, T007)
- [X] T010 [P] Update `src/features/meeting-review/components/review-screen.tsx` to use the renamed camelCase fields (`leadScore`, `meetingTitle`, `recapEmail`, `detectedSignals`, `openQuestions`, `nextSteps`) (depends on T002, T003)
- [X] T011 [P] Update `src/features/meeting-review/components/action-items.tsx` to use the renamed camelCase `dueDate` field (depends on T002)
- [X] T012 Update `src/features/workflow/actions/transcript.actions.ts`: replace the `DEMO_USER_ID` import from `@/lib/db/mock/transcripts.fixture` with `DEFAULT_USER_ID` from `src/constants/user.ts`, and remove the mock-only `resetTranscripts()` action (depends on T004, T007)
- [X] T013 [P] Delete the mock data layer: `src/lib/db/mock/store.ts`, `src/lib/db/mock/transcripts.fixture.ts`, `src/lib/db/mock/rubric-signals.fixture.ts`, `src/lib/db/mock/seed-builder.ts` (depends on T007, T008, T012)
- [X] T014 [P] Delete `src/providers/workflow/engine.ts` and `src/providers/workflow/curated.ts` (depends on T009)
- [X] T015 [P] Create `src/providers/recents/recents-context.ts` defining the `RecentItem` interface (`id`, `title`, `status: 'DRAFT' | 'CRM'`, `badge?: 'HOT' | 'WARM' | 'COLD'`, `when`), `RecentsContextValue`, and a `useRecents()` hook that throws when called outside `<RecentsProvider>`
- [X] T016 [P] Create `src/providers/rubric-signals/rubric-signals-context.ts` defining `RubricSignalsContextValue` (`signals`, `banding`, `addSignal`, `updateSignal`, `removeSignal`) and a `useRubricSignals()` hook that throws when called outside `<RubricSignalsProvider>`
- [X] T017 Implement `src/providers/recents/recents-provider.tsx`: `RecentsProvider` accepting `initialRecents`, exposing `prependRecent`, `updateRecent`, and `refreshRecents` (re-fetches via `getTranscripts()` + `toRecentItem`) (depends on T009, T015)
- [X] T018 Implement `src/providers/rubric-signals/rubric-signals-provider.tsx`: `RubricSignalsProvider` accepting `initialRubric`, exposing `signals`/`banding` state and `addSignal`/`updateSignal`/`removeSignal` calling the existing `createRubricSignal`/`updateRubricSignal`/`deleteRubricSignal` Server Actions with optimistic local updates (depends on T016)
- [X] T019 Slim `src/providers/workflow/workflow-provider.tsx`, `src/providers/workflow/workflow-context.ts`, and `src/providers/workflow/use-workflow-actions.ts` to capture-session concerns only, removing the `addSignal`/`updateSignal`/`removeSignal` logic now owned by `RubricSignalsProvider` (depends on T018)
- [X] T020 Update `src/app/page.tsx` to seed and nest all three providers server-side: `getRubric()` → `RubricSignalsProvider`, `(await getTranscripts()).map(toRecentItem)` → `RecentsProvider`, wrapping `WorkflowProvider` and `AppShell`, in the order `<RubricSignalsProvider><RecentsProvider><WorkflowProvider><AppShell/></WorkflowProvider></RecentsProvider></RubricSignalsProvider>` (depends on T017, T018, T019)

**Checkpoint**: Foundation ready — real DB-backed repositories, camelCase types, all three providers wired in `page.tsx`, mock layer fully removed. User story implementation can now begin.

---

## Phase 3: User Story 1 - See real saved summaries in the recents bar (Priority: P1) 🎯 MVP

**Goal**: The recents bar renders real persisted summary records — title, DRAFT/CRM status, HOT/WARM/COLD badge, capture date/time — instead of mock data, with correct empty and pending states.

**Independent Test**: Capture and summarize at least one transcript, reload the app, and confirm the recents bar shows it (title, status, badge, date/time) sourced from the database rather than fixture data.

### Implementation for User Story 1

- [X] T021 [US1] Update the recents-bar section of `src/components/common/app-shell/app-shell.tsx` to render from `useRecents().recents` instead of mock/prop data: show each item's title, `DRAFT`/`CRM` status, badge, and `when`; render an empty state when `recents.length === 0`; render a pending/in-progress indicator (not a fabricated badge) when an item's `badge` is undefined (depends on T020)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently (quickstart.md Scenario 1).

---

## Phase 4: User Story 2 - Open a specific summary from the recents bar (Priority: P1)

**Goal**: Clicking a recents-bar item loads that exact record by its database id and either lands on Review (if AI processing succeeded) or stays on Capture with Review/CRM blocked (if not), with a graceful not-found outcome for a missing id.

**Independent Test**: Capture a transcript, let it summarize successfully, note its id, reload, and click it from the recents bar to confirm the same content loads and Review is reachable; also confirm an incomplete/failed record keeps the user on Capture.

### Implementation for User Story 2

- [X] T022 [US2] Add hydration/navigation-gating logic to `src/providers/workflow/use-workflow-actions.ts`: an `openFromRecent(id)` action that calls `getTranscriptById(id)`, forces `step: 'capture'` and blocks `goTo('review')`/`goTo('commit')` when the hydrated record's `aiProcessingStatus !== 'success'`, and surfaces a not-found outcome when the action resolves `null` (depends on T020)
- [X] T023 [US2] Wire each recents-bar item's click handler in `src/components/common/app-shell/app-shell.tsx` to call `openFromRecent(item.id)` from T022 and render the not-found outcome when applicable (depends on T022, T021)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently (quickstart.md Scenarios 3 and 4).

---

## Phase 5: User Story 3 - Summarize a transcript end-to-end against real data (Priority: P1)

**Goal**: Clicking Summarize durably persists the raw+cleaned transcript immediately, then runs real AI analysis against the freshest rubric signals and patches the same record with the result and a processing outcome — with the button disabling on click, re-enabling only on failure, and a non-dismissible blocking overlay while processing runs.

**Independent Test**: Paste a transcript and click Summarize; confirm a database record exists immediately with the raw and cleaned transcript before AI processing finishes, and that same record is updated in place with the AI-generated summary and a success/failure processing outcome once analysis completes.

### Implementation for User Story 3

- [X] T024 [US3] Add `createDraftTranscriptSchema` (`{ rawTranscript: z.string().min(1) }`) and `runAiSummarizationSchema` (`{ id: z.string().min(1), signals: SimplifiedSignal.array() }`) to `src/schemas/transcript.schema.ts`
- [X] T025 [US3] Add user-safe error message constants for draft-creation and AI-summarization failures to `src/features/workflow/constants/action.constants.ts`
- [X] T026 [US3] Implement `createDraftTranscript({ rawTranscript })` in `src/features/workflow/actions/transcript.actions.ts`: validate via T024's schema, compute `cleanedTranscript = cleanTranscript(rawTranscript)`, call `transcriptRepository.create({ userId: DEFAULT_USER_ID, title: <generated>, status: 'draft', aiProcessingStatus: 'pending', source: 'manual', originalTranscript: rawTranscript, cleanedTranscript })`, return `{ id }`; log-and-rethrow a user-safe error (T025) on DB failure (depends on T024, T025, T006, T012)
- [X] T027 [US3] Implement `runAiSummarization({ id, signals })` in `src/features/workflow/actions/transcript.actions.ts`: validate via T024's schema, `transcriptRepository.findById(id)`, call `TranscriptSummarizer.summarize(cleanedTranscript, { signals })`; on success `transcriptRepository.update(id, { summary, leadScore, aiProcessingStatus: 'success' })` and return `{ success: true, record }`; on `SummarizationError`, `transcriptRepository.update(id, { aiProcessingStatus: 'failed' })` and return `{ success: false, error }`; log-and-rethrow user-safe on any DB failure (depends on T026)
- [X] T028 [US3] Wire the Summarize handler in `src/providers/workflow/use-workflow-actions.ts`: disable the Summarize action immediately on click; read `useRubricSignals().signals`, map through `simplifySignals()`; call `createDraftTranscript`, then `useRecents().prependRecent` with the new DRAFT item (no badge); call `runAiSummarization` with the fresh signals; on success call `useRecents().updateRecent` with the badge and navigate to Review, keeping the button disabled; on failure call `useRecents().updateRecent` (still DRAFT, no badge) and re-enable the Summarize button (depends on T026, T027, T018, T020)
- [X] T029 [US3] Add/update the processing overlay in the capture-screen component (`src/features/workflow` capture UI) so it is shown for the duration of T028's call, and disable outside-click and Escape-key dismissal — it can only close when processing resolves, success or failure (depends on T028)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently (quickstart.md Scenarios 2 and 3).

---

## Phase 6: User Story 4 - Rubric signals and recents metadata as shared application state (Priority: P2)

**Goal**: Rubric-signal edits and recents-bar updates propagate immediately to every consumer through the Context API providers built in Foundational, with no page reload and no prop-drilled mock data remaining.

**Independent Test**: Add a rubric signal on one screen and confirm it's immediately reflected wherever rubric signals are displayed or used (including the next Summarize call), without a full page reload.

### Implementation for User Story 4

- [X] T030 [US4] Update the rubric-signal editor UI component(s) to call `useRubricSignals().addSignal`/`updateSignal`/`removeSignal` instead of the old workflow-provider-based methods (depends on T018, T019)
- [X] T031 [US4] Confirm the approve flow in `src/providers/workflow/use-workflow-actions.ts` calls `useRecents().updateRecent(id, { status: 'CRM' })` immediately after `updateTranscript` succeeds, so the recents bar reflects the saved-to-CRM change without reload (depends on T020, T028)

**Checkpoint**: All four user stories now independently functional and integrated (quickstart.md Scenarios 5 and 6).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories.

- [X] T032 [P] Run `npm run validate` (type-check → lint → build) and resolve any errors/warnings across all touched files
- [ ] T033 Walk through quickstart.md Scenarios 1–6 against a real MongoDB instance and confirm every "Expected" outcome
- [X] T034 [P] Grep-sweep the codebase for any remaining references to `getStore`, `reseedTranscripts`, `reseedRubricSignals`, or `DEMO_USER_ID` and remove them

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion.
  - US1 (Phase 3) has no dependency on US2/US3/US4.
  - US2 (Phase 4) depends on US1's `app-shell.tsx` recents rendering (T021) to attach its click handler.
  - US3 (Phase 5) depends on Foundational's `RubricSignalsProvider`/`RecentsProvider` (T018, T020) for signal freshness and recents updates.
  - US4 (Phase 6) depends on Foundational's providers (T018–T020) and on US3's `updateRecent` call site (T028) for the approve-flow check.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Within Each User Story

- Schema/constants before actions (US3: T024, T025 before T026, T027).
- Actions before the UI wiring that calls them (US3: T026, T027 before T028; T028 before T029).
- Foundational providers before story-level consumption in every story.

### Parallel Opportunities

- All Setup tasks (T001–T004) can run in parallel — four different files.
- Within Foundational: T006, T008, T010, T011 can run in parallel with the T005→T007→T009 chain; T013 and T014 can run in parallel with each other once their dependencies clear; T015 and T016 can run in parallel.
- Once Foundational completes, US1 and the schema/constants portion of US3 (T024, T025) can start in parallel; US2 must wait on US1's T021.
- T032 and T034 in Polish can run in parallel; T033 is a manual walkthrough best run after both.

---

## Parallel Example: Setup Phase

```bash
Task: "Add AiProcessingStatus type and AI_PROCESSING_STATUSES constant in src/types/transcript.types.ts"
Task: "Rename snake_case fields to camelCase in src/types/meeting.types.ts"
Task: "Rename detected_signals to detectedSignals in src/types/scoring.types.ts"
Task: "Create src/constants/user.ts exporting DEFAULT_USER_ID"
```

## Parallel Example: Foundational Phase

```bash
Task: "Create cleanTranscript() in src/lib/utils/transcript-cleaner.utils.ts"
Task: "Rewrite src/repositories/rubric-signal.repository.ts to use the real Mongoose model"
Task: "Update src/features/meeting-review/components/review-screen.tsx to camelCase fields"
Task: "Update src/features/meeting-review/components/action-items.tsx to camelCase dueDate"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: confirm the recents bar shows real persisted data (quickstart.md Scenario 1).
5. Demo if ready.

### Incremental Delivery

1. Setup + Foundational → real DB, providers, mock layer removed.
2. Add US1 → recents bar reflects real data → validate independently.
3. Add US2 → clicking a recents item opens the exact record with correct navigation gating → validate independently.
4. Add US3 → full Summarize flow (draft persist → AI → update, disable/re-enable button, blocking overlay) → validate independently.
5. Add US4 → rubric-signal edits and recents updates propagate live via Context → validate independently.
6. Polish → `npm run validate` + full quickstart.md walkthrough.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (Foundational has the most cross-file dependencies — coordinate on T005→T009→T020 chain).
2. Once Foundational is done:
   - Developer A: User Story 1, then User Story 2 (shares `app-shell.tsx`).
   - Developer B: User Story 3 (actions + capture-screen wiring).
   - Developer C: User Story 4 (rubric editor UI + approve-flow check), once T018/T019 land.
3. Stories complete and integrate independently; Polish runs last for everyone.

---

## Notes

- [P] tasks touch different files with no incomplete dependencies.
- [Story] labels map tasks to spec.md's US1–US4 for traceability; Setup, Foundational, and Polish tasks carry no story label by design.
- No test tasks are included — testing infrastructure does not exist in this repo (CLAUDE.md) and none was requested in spec.md.
- Zoho CRM write-back is explicitly out of scope (per spec.md Assumptions) — no task references it.
- Commit after each task or logical group, per the user's own workflow (commits/pushes are not made automatically on the user's behalf).
- Stop at any checkpoint to validate a story independently before continuing.
- Avoid: vague tasks, same-file conflicts marked `[P]`, cross-story dependencies that break independent testability beyond the ones explicitly called out above.
