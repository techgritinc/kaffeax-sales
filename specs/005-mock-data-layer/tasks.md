---

description: "Task list for Mock Data Layer with Server Actions"
---

# Tasks: Mock Data Layer with Server Actions

**Input**: Design documents from `specs/005-mock-data-layer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: NOT requested (no test framework in the repo). Verification is `npm run validate` + the `quickstart.md` parity/boundary checks. No test tasks are generated.

**Organization**: Tasks are grouped by user story. Because this is a data-layer refactor of a working app, the build must stay green at every checkpoint; the ordering below preserves that (new source is added additively in US1, the boundary is flipped in US2, mutations move in US3, types are swept in US4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 (maps to spec.md user stories)

## Path Conventions

Single Next.js project rooted at `src/` (per plan.md Structure Decision).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Directory scaffolding for the new layers.

- [X] T001 Create directory scaffolding: `src/lib/db/mock/`, `src/repositories/`, `src/features/workflow/actions/`, `src/features/workflow/utils/` (per plan.md Project Structure)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure, fixture-independent pieces every story needs (types, constants, mappers).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add the presentation-supplement type (`TranscriptPresentation`) and `DEMO_USER_ID` constant to `src/types/transcript.types.ts` (keep it Mongoose-free per constitution §XI; fields per data-model.md "Presentation supplement")
- [X] T003 Add the `RUBRIC_BANDING_RULE` constant (the banding string currently in `DEFAULT_RUBRIC.banding`) to `src/constants/rubric.ts`
- [X] T004 [P] Implement the transcript mapper in `src/features/workflow/utils/transcript.mapper.ts` — `toMeetingRecord(fields, supplement, rubric)` and `toTranscript(record)`; include `kaffea_x ↔ kaffeax` side normalization and detected-signal weight re-derivation from the rubric (field table in data-model.md; contract in contracts/mapping-contract.md)
- [X] T005 [P] Implement the rubric mapper in `src/features/workflow/utils/rubric.mapper.ts` — `toRubric(signals)` (attach `RUBRIC_BANDING_RULE`, `signalId→id`) and `toRubricSignals(rubric)` (`id→signalId`, `isActive:true`)

**Checkpoint**: Types, constants, and pure mappers exist and type-check; no behavior change yet.

---

## Phase 3: User Story 1 - Single source of truth for mock data (Priority: P1) 🎯 MVP

**Goal**: All mock data lives in one dedicated location, structured to match the Transcript and RubricSignal MongoDB models; a stateful mock store seeds from it.

**Independent Test**: `src/lib/db/mock/` holds every seed record in persistence-model shape; the store seeds/resets from the fixtures; `CURATED` is relocated to the engine domain. App still builds and renders identically (still using legacy `seed.ts` exports until US2).

- [X] T006 [P] [US1] Create `src/lib/db/mock/transcripts.fixture.ts` — the 3 seeded transcripts (Cascade Ember, Blue Ridge Roasters, Portland Pour) authored in `TranscriptFields` shape + `TranscriptPresentation` supplement, plus the sample `originalTranscript` text (migrated from `SEED_LIBRARY` and `SAMPLE`; no duplication)
- [X] T007 [P] [US1] Create `src/lib/db/mock/rubric-signals.fixture.ts` — the 7 default signals in `RubricSignalFields` shape (`isActive:true`), migrated from `DEFAULT_RUBRIC.signals`
- [X] T008 [US1] Implement the in-memory store in `src/lib/db/mock/store.ts` — singleton collections for transcripts + rubric signals + sample text, lazy seed from T006/T007 fixtures, and `resetStore()` (depends on T006, T007)
- [X] T009 [P] [US1] Relocate `CURATED` out of `seed.ts`: create `src/providers/workflow/curated.ts` and update the dynamic import in `src/providers/workflow/engine.ts` (research.md D5 — engine logic otherwise unchanged)

**Checkpoint**: Mock data centralized and model-shaped; store works; engine owns `CURATED`. Build green.

---

## Phase 4: User Story 2 - Data reached only through Server Actions (Priority: P1) 🎯 MVP

**Goal**: The app obtains its data exclusively through Server Actions (backed by repositories over the store); no UI/provider imports mock data directly.

**Independent Test**: quickstart.md §3 boundary checks return empty (no direct mock/seed imports in UI/provider); `page.tsx` hydrates the provider from read actions; app renders identically with no loading flash.

- [X] T010 [P] [US2] Implement `TranscriptRepository` in `src/repositories/transcript.repository.ts` — `findAll/findById/create/update/delete/reset` over the store, returning `TranscriptFields` only (contracts/mapping-contract.md; never imports view-models)
- [X] T011 [P] [US2] Implement `RubricSignalRepository` in `src/repositories/rubric-signal.repository.ts` — `findActive/create/update/delete/reset` over the store, returning `RubricSignalFields`
- [X] T012 [US2] Implement read actions in `src/features/workflow/actions/transcript.actions.ts` (`'use server'`): `getTranscripts`, `getTranscriptById`, `getSampleTranscript`, `getCrmRecords` — call the repository and map to view-models (contracts/transcript-actions.md) (depends on T010, T004)
- [X] T013 [US2] Implement the read action `getRubric` in `src/features/workflow/actions/rubric.actions.ts` (`'use server'`) — map active signals to `Rubric` (depends on T011, T005)
- [X] T014 [US2] Convert `src/app/page.tsx` to an `async` Server Component that calls `getTranscripts`/`getRubric`/`getSampleTranscript` and passes `initialLibrary`/`initialRubric`/`initialSample` as props to `WorkflowProvider` (research.md D4)
- [X] T015 [US2] Rewire `src/providers/workflow/workflow-provider.tsx` to accept the initial props and initialize `library`/`rubric`/`transcript`/`crm` from them (remove `SAMPLE`/`DEFAULT_RUBRIC`/`SEED_LIBRARY` imports); pass the sample string into `useWorkflowActions` (depends on T014)
- [X] T016 [US2] Rewire `src/providers/workflow/use-workflow-actions.ts` to use the injected sample/initial snapshots (remove `SAMPLE`/`SEED_LIBRARY` imports); `loadSample`/`resetDemo` use injected values (depends on T015)
- [X] T017 [US2] Delete `src/providers/workflow/seed.ts` and confirm no remaining references exist outside `src/lib/db/mock/` and the engine (run quickstart.md §3b) (depends on T015, T016, T009)

**Checkpoint**: UI → Server Action → Repository → store; zero direct mock imports; reads identical to before.

---

## Phase 5: User Story 3 - Database-shaped CRUD operations (Priority: P2)

**Goal**: Full stateful CRUD; live mutations route through Server Actions and persist to the store, with identical user-visible behavior (optimistic client state).

**Independent Test**: Exercise create/update/delete via the workflow (process/approve/patch/reject, rubric edits, reset); the store reflects each change on subsequent reads; UX/timing unchanged (research.md D2).

- [X] T018 [US3] Add mutation actions to `src/features/workflow/actions/transcript.actions.ts` (`'use server'`): `createTranscript`, `updateTranscript`, `deleteTranscript`, `resetTranscripts` (contracts/transcript-actions.md) (depends on T012)
- [X] T019 [US3] Add mutation actions to `src/features/workflow/actions/rubric.actions.ts` (`'use server'`): `createRubricSignal`, `updateRubricSignal`, `deleteRubricSignal`, `resetRubric` (contracts/rubric-signal-actions.md) (depends on T013)
- [X] T020 [US3] Route transcript mutations through actions in `src/providers/workflow/use-workflow-actions.ts` while keeping optimistic client state: `process → createTranscript`, `approve → updateTranscript(status:'saved', zohoLeadId)`, `patch` persisted on the create/approve transition, `reject → deleteTranscript`, `resetDemo → resetTranscripts` (depends on T018)
- [X] T021 [US3] Route rubric mutations through actions in `src/providers/workflow/workflow-provider.tsx` while keeping optimistic state: `addSignal → createRubricSignal`, `updateSignal → updateRubricSignal`, `removeSignal → deleteRubricSignal`, `resetDemo → resetRubric` (depends on T019)
- [X] T022 [US3] Add structured error handling + logging to all Server Actions (no bare `catch`, user-safe messages, no stack traces, `await`/`.catch` on all async) per constitution §XIV (depends on T018, T019)

**Checkpoint**: Mutations persist to the store and reflect in reads; behavior identical to pre-refactor.

---

## Phase 6: User Story 4 - Consolidated, model-aligned TypeScript types (Priority: P2)

**Goal**: One authoritative persisted type per modeled concept; duplicate/outdated types removed; view-models retained (Q1); zero `any`.

**Independent Test**: `npm run type-check` passes; a search shows a single authoritative persisted shape for Transcript/RubricSignal; no `any`/non-null assertions in the new code.

- [X] T023 [US4] Sweep `src/types/` and the new files for duplicate/outdated persisted-concept types; remove genuinely redundant duplicates of the persistence models (retain the distinct view-models per Q1); note anything intentionally kept
- [X] T024 [US4] Verify persistence types stay Mongoose-free and are the single authoritative persisted shapes, and that no `any`/non-null assertions were introduced across the mock/repository/action/mapper/provider changes

**Checkpoint**: Type story clean; all persisted concepts have one authoritative definition.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Prove the refactor end-to-end.

- [X] T025 [P] Run `npm run validate` (type-check → lint → build) and resolve any drift (zero errors, zero warnings)
- [ ] T026 [P] Execute quickstart.md §2 behavior-parity checklist against current behavior and `Design/POC_Kaffea-X_Prototype.html` (sidebar, capture, rubric, processing, approve/reject, rubric edits, reset, chat, no loading flash)
- [X] T027 Run quickstart.md §3 boundary checks (all `rg` searches empty/expected) and §4 migration-readiness inspection (only repository bodies would change on a real-DB swap; supplement isolated in `transcripts.fixture.ts`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately
- **Foundational (Phase 2)**: after Setup — BLOCKS all user stories
- **US1 (Phase 3)**: after Foundational
- **US2 (Phase 4)**: after US1 (needs the store + centralized fixtures; flips the app to the new source)
- **US3 (Phase 5)**: after US2 (mutation actions extend the read-action files and the rewired provider)
- **US4 (Phase 6)**: after US3 (final type sweep once all code exists)
- **Polish (Phase 7)**: after all desired stories

> Note: unlike a greenfield feature, these stories are **sequential** (a refactor of one working app), not independently parallelizable across the whole set. Parallelism exists *within* phases (see [P]).

### Within-story / cross-file parallel opportunities

- T004 ∥ T005 (two mapper files)
- T006 ∥ T007 ∥ T009 (two fixtures + CURATED relocation — distinct files)
- T010 ∥ T011 (two repository files); then T012 ∥ T013 (two action files)
- T025 ∥ T026 (validation ∥ manual parity review)

---

## Parallel Example: Phase 3 (US1)

```bash
# Author both fixtures and relocate CURATED in parallel (different files):
Task: "Create transcript fixtures in src/lib/db/mock/transcripts.fixture.ts"
Task: "Create rubric-signal fixtures in src/lib/db/mock/rubric-signals.fixture.ts"
Task: "Relocate CURATED to src/providers/workflow/curated.ts + update engine.ts import"
# Then (barrier): implement the store, which depends on both fixtures:
Task: "Implement in-memory store in src/lib/db/mock/store.ts"
```

---

## Implementation Strategy

### MVP scope

Both US1 and US2 are **P1** — the MVP is **US1 + US2**: mock data centralized and model-shaped (US1) *and* reached only through Server Actions with the app fully rewired (US2). At that checkpoint the core architecture is delivered and the app behaves identically. US3 (stateful mutations) and US4 (type sweep) are P2 increments layered on top.

### Incremental delivery

1. Setup + Foundational → shared pieces ready
2. US1 → centralized model-shaped mock source (build green, app unchanged)
3. US2 → server-action boundary wired; **MVP complete** — validate parity + boundary checks
4. US3 → mutations persist through actions — validate CRUD + parity
5. US4 → type consolidation — validate `type-check`
6. Polish → full `validate` + quickstart

### Key risks to watch during implementation

- **Behavior parity (SC-006)**: keep optimistic client state; never introduce a loading flash or per-keystroke round-trip (research.md D2).
- **Lossy schema / presentation supplement (research.md D1)**: do not drop company/title/confidence/topics/commitments/recap-subject — carry them in the supplement; keep it isolated in `transcripts.fixture.ts`.
- **File size (§V)**: keep each new file ≤150 LOC; split fixtures/mappers if needed.

---

## Notes

- No test tasks (tests not requested; no framework present). Verification = `npm run validate` + quickstart.md.
- [P] = different files, no dependency on an incomplete task.
- Commit after each task or logical group; keep the build green at every checkpoint.
- The DB swap seam is the repository bodies only — never change action signatures, mappers, or UI to satisfy a future MongoDB migration.
