# Tasks: Recent Summaries Pagination & Search

**Input**: Design documents from `specs/tae-91-summaries-pagination-search/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: No test tasks — no test infrastructure in this project (constitution note).

**Organization**: Tasks grouped by user story to enable independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no conflicting dependencies)
- **[Story]**: User story this task belongs to (US1 / US2 / US3)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New files that are pure building blocks — no callers yet, no risk of breaking anything.

- [x] T001 [P] Create `src/types/recents.types.ts` — export `RecentsPageResult` interface with `items: StoredTranscript[]`, `total: number`, `hasMore: boolean` (per `data-model.md`)
- [x] T002 [P] Create `src/constants/workflow/recents.constants.ts` — export `RECENTS_PAGE_SIZE = 10` and `SEARCH_DEBOUNCE_MS = 300`

**Checkpoint**: Both files compile cleanly with `npm run type-check` before continuing.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data layer changes that all three user stories depend on. No UI changes.

**⚠️ CRITICAL**: All user story phases depend on this phase being complete.

- [x] T003 [P] Add case-insensitive collation index on `title` to `src/lib/db/models/transcript.model.ts` — append `transcriptSchema.index({ title: 1 }, { collation: { locale: 'en', strength: 2 } })` after the existing index declarations (per `research.md` Q2)
- [x] T004 Add `findPage(page: number, limit: number)` method to `TranscriptRepository` in `src/repositories/transcript.repository.ts` — clamp `page` to ≥ 1, run `Promise.all([Transcript.countDocuments(), Transcript.find().sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit)])`, map through `toStoredTranscript`, return `RecentsPageResult` (per `contracts/recents-server-actions.md`)
- [x] T005 Add `searchByTitle(query: string, limit = 20)` method to `src/repositories/transcript.repository.ts` — return `[]` if `query.trim()` is empty, escape the query string to prevent regex injection, execute `Transcript.find({ title: { $regex: escapedQuery, $options: 'i' } }).sort({ createdAt: -1 }).limit(limit).collation({ locale: 'en', strength: 2 })`, map through `toStoredTranscript` (per `contracts/recents-server-actions.md`)
- [x] T006 Add `getTranscriptPage(page: number, limit = RECENTS_PAGE_SIZE)` server action to `src/server-actions/workflow/transcript.actions.ts` — wrap in `try/catch`, delegate to `transcriptRepository.findPage(page, limit)`, clamp to page ≥ 1 (per `contracts/recents-server-actions.md`)
- [x] T007 Add `searchTranscripts(query: string)` server action to `src/server-actions/workflow/transcript.actions.ts` — return `[]` defensively if query is empty, delegate to `transcriptRepository.searchByTitle(query)`, wrap in `try/catch` (per `contracts/recents-server-actions.md`)

**Checkpoint**: Verify `findPage` and `searchByTitle` return correct shapes. Call `getTranscriptPage(1)` from a temporary test in the browser console or via a quick server-action smoke test before continuing to Phase 3.

---

## Phase 3: User Story 1 — Load Initial Summaries (Priority: P1) 🎯 MVP

**Goal**: On app open, exactly the 10 most recent summaries render. "Load More" button is visible only when total > 10. No extra data is fetched.

**Independent Test**: Open the app with > 10 summaries in the DB. Count: exactly 10 cards visible, "Load More" button present. Then open with ≤ 10 summaries: all cards visible, no button.

### Implementation for User Story 1

- [x] T008 [US1] Update `RecentsContextValue` interface in `src/providers/recents/recents-context.ts` — add `total: number`, `hasMore: boolean`, `isLoadingMore: boolean`, `loadMore: () => Promise<void>` fields (per `contracts/recents-context.md`); update the default context object to match
- [x] T009 [US1] Rewrite `RecentsProvider` in `src/providers/recents/recents-provider.tsx` — update `RecentsProviderProps` to add `initialTotal: number`; add `page` and `total` state; implement `loadMore()` that calls `getTranscriptPage(page + 1)`, appends items, increments page, re-syncs total; rewrite `refreshRecents()` to call `getTranscriptPage(1)` and reset to page 1 (per `data-model.md` state machine and `contracts/recents-context.md`)
- [x] T010 [US1] Update `src/app/page.tsx` — replace `getTranscripts()` with `getTranscriptPage(1, RECENTS_PAGE_SIZE)`, extract `result.items` as `initialRecents`, pass `result.total` as `initialTotal` to `<RecentsProvider>` (per `research.md` Q6 and `contracts/recents-context.md`)
- [x] T011 [US1] Rewrite signature and paginated path in `src/hooks/meeting-library/use-library-search.ts` — remove `recents` parameter, call `useRecents()` internally to get `recents`, `hasMore`, `loadMore`, `isLoadingMore`; when `query` is empty return paginated items split into `drafts`/`saved` from context; forward `hasMore`, `loadMore`, `isLoadingMore`; stub search path as `isSearchActive: false`, `isSearching: false` (search completed in T015) (per `contracts/recents-context.md`)
- [x] T012 [US1] Update `src/components/meeting-library/sidebar.tsx` — remove `recents: RecentItem[]` from `SidebarProps`, remove `recents` from the `useLibrarySearch()` call site (per `contracts/recents-context.md`)
- [x] T013 [US1] Update `src/components/common/app-shell/app-shell.tsx` — remove `recents` prop from the `<Sidebar>` usage (per `contracts/recents-context.md`)

**Checkpoint**: App opens and shows exactly 10 summaries (quickstart Scenario 1). "Load More" button renders but clicking it may not yet work (US2). Confirm `npm run type-check` passes.

---

## Phase 4: User Story 2 — Load More Summaries (Priority: P2)

**Goal**: Clicking "Load More" fetches the next 10 summaries, appends them to the list, and hides the button when the last page is reached.

**Independent Test**: With 25 summaries in the DB — click "Load More" once → 20 visible; click again → 25 visible, button gone.

### Implementation for User Story 2

- [x] T014 [US2] Add "Load More" button to `src/components/meeting-library/sidebar.tsx` — render below the groups list; visible only when `hasMore && !isSearchActive`; disabled and shows a spinner while `isLoadingMore`; calls `loadMore()` on click (per `contracts/recents-context.md` and quickstart Scenarios 2–3)

**Checkpoint**: Run quickstart Scenarios 2 and 3 (load more, exact page boundary). Button must disappear when `hasMore === false`.

---

## Phase 5: User Story 3 — Search Summaries by Text (Priority: P3)

**Goal**: Typing in the search bar triggers a debounced, full-DB search. Results replace the paginated list. "Load More" is hidden. Clearing restores the paginated state instantly.

**Independent Test**: With 25 summaries loaded (only 10 visible), type a search term that matches a summary on page 3 → it appears. Clear → original 10 items restored immediately, no network call.

### Implementation for User Story 3

- [x] T015 [US3] Complete `src/hooks/meeting-library/use-library-search.ts` — add `useRef<number>` for `requestIdRef` stale-discard; add `useEffect` on `query` that sets a 300 ms `setTimeout` (cleared on cleanup); on timer fire increment `requestIdRef`, capture the id, call `searchTranscripts(query)`, only commit results if `requestIdRef.current === capturedId`; set `isSearching: true` on timer fire, `false` on response; set `isSearchActive: query.trim().length > 0`; when `isSearchActive` return search results split into `drafts`/`saved` (per `research.md` Q3, Q4 and `contracts/recents-context.md`)
- [x] T016 [US3] Wire search feedback into `src/components/meeting-library/sidebar.tsx` — show a loading indicator on or near the search input when `isSearching === true`; render an empty-state message (e.g. `No meetings found for "[query]"`) when `isSearchActive && drafts.length === 0 && saved.length === 0`

**Checkpoint**: Run quickstart Scenarios 4–7 (search within page, search beyond page 1, debounce, stale result discard).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T017 [P] Run `npm run validate` (type-check → lint → build) and fix any errors surfaced
- [x] T018 [P] Execute all 9 manual validation scenarios in `specs/tae-91-summaries-pagination-search/quickstart.md` — check off each scenario and note any failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately, run T001/T002 in parallel.
- **Foundational (Phase 2)**: Depends on Phase 1 (T001, T002). T003 is parallel with T004/T005/T006/T007; T004 → T006 (sequential); T005 → T007 (sequential); T004 and T005 are same file (sequential).
- **US1 (Phase 3)**: Depends on Phase 2 complete. T008 → T009 → T011; T010 after T009; T012 → T013. T008 and T003 can be started in parallel once Phase 1 done.
- **US2 (Phase 4)**: Depends on T009 (loadMore in provider) and T012 (sidebar prop removed).
- **US3 (Phase 5)**: Depends on T011 (hook base) and T007 (searchTranscripts server action).
- **Polish (Phase 6)**: Depends on all desired user stories complete.

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only — no dependency on US2/US3.
- **US2 (P2)**: Depends on US1 (provider has loadMore, sidebar structure is updated).
- **US3 (P3)**: Depends on US1 (hook rewrite base) and Phase 2 (searchTranscripts action). US3 does NOT depend on US2.

### Parallel Opportunities Within Phase 2

```text
# Start these in parallel once Phase 1 is done:
T003  Add collation index to transcript.model.ts
T004  Add findPage() to transcript.repository.ts  →  T006 getTranscriptPage() action
T005  Add searchByTitle() to transcript.repository.ts  →  T007 searchTranscripts() action
```

### Parallel Opportunities Within Phase 3 (US1)

```text
# After T009 (provider) and T003 (model) are done, these are independent:
T010  Update app/page.tsx
T011  Rewrite hook signature (then T012 → T013 follows sequentially)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001, T002)
2. Complete Phase 2: Foundational (T003–T007)
3. Complete Phase 3: User Story 1 (T008–T013)
4. **STOP and VALIDATE**: Open app, confirm exactly 10 summaries, no type errors
5. Ship US1 or continue to US2

### Incremental Delivery

1. Setup + Foundational → data layer ready
2. Add US1 (T008–T013) → initial pagination works; validate via quickstart Scenario 1
3. Add US2 (T014) → Load More works; validate via quickstart Scenarios 2–3
4. Add US3 (T015–T016) → debounced search works; validate via quickstart Scenarios 4–7
5. Polish (T017–T018) → full validation pass

---

## Notes

- `[P]` = different files, no dependency conflict — safe to parallelise
- `[US1/US2/US3]` maps each task to a user story for traceability
- T004 and T005 are in the same file (`transcript.repository.ts`) — do NOT run in parallel; write both methods in one edit pass
- T006 and T007 are in the same file (`transcript.actions.ts`) — same rule
- T011 deliberately stubs the search path — this is intentional so US1 can be validated independently before US3 is started
- No tests (no test infrastructure yet); manual validation via `quickstart.md`
