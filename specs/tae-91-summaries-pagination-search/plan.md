# Implementation Plan: Recent Summaries Pagination & Search

**Branch**: `feat/tae-91-audit-log-service` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/tae-91-summaries-pagination-search/spec.md`

## Summary

Paginate the recent summaries rail bar (10 items per page, "Load More" appends the next page) and replace the current client-side title filter with a debounced, server-side text search across the full Transcript collection. The search is debounced using a `setTimeout`/`clearTimeout` pattern inside a `useEffect`; stale in-flight server action results are discarded via a `requestId` ref (server actions cannot be cancelled with AbortController, so the "cancel" is implemented as stale-result discard — same user-visible behaviour).

## Technical Context

**Language/Version**: TypeScript 5 (strict)

**Primary Dependencies**: Next.js 16 App Router, React 19, Mongoose 8, Tailwind CSS v4

**Storage**: MongoDB via Mongoose — `Transcript` collection. A case-insensitive regex query on the `title` field handles search (no external text index required; at current scale regex is sufficient and avoids a MongoDB Atlas text-index limitation where partial-word matches are not supported).

**Testing**: No test infrastructure yet (per constitution note). Manual validation via `quickstart.md`.

**Target Platform**: Next.js server (SSR + Server Actions)

**Project Type**: Full-stack web application (App Router)

**Performance Goals**: Initial load ≤ 1 s, Load More ≤ 500 ms, search results ≤ 800 ms after debounce fires — all at ≤ 10,000 documents.

**Constraints**: No `/app/api/` route handlers (constitution §X). No barrel files (constitution §XVII). 150-line file limit for components (constitution §V). No `any` / non-null assertions (constitution §III).

**Scale/Scope**: Single-tenant, single-user for now. Page size fixed at 10.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate | Rule | Status |
|------|------|--------|
| No route handlers | §X — server actions only for data operations | ✅ Only new server actions added |
| Repository layer | §IX — DB calls only in repository classes | ✅ New repo methods added |
| No barrel imports | §XVII — direct imports only | ✅ All imports from source files |
| TypeScript strict | §III — no `any`, no `!` | ✅ Enforced in all new code |
| File size ≤ 150 lines | §V — each file single responsibility | ✅ Hook rewrite stays within limit |
| camelCase everywhere | §XVIII — all types/fields camelCase | ✅ No snake_case introduced |
| No inline styles | §II — Tailwind utilities only | ✅ No `style={{}}` in new components |
| Type isolation | §XI — plain types in `src/types/`, no Mongoose types leaked | ✅ New `recents.types.ts` is Mongoose-free |
| Constants in `src/constants/` | §XV — no magic numbers in components | ✅ `recents.constants.ts` introduced |
| Directory structure | §2.0.0 — no `features/` dir | ✅ All paths follow actual layout |

## Project Structure

### Documentation (this feature)

```text
specs/tae-91-summaries-pagination-search/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── recents-server-actions.md
│   └── recents-context.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── page.tsx                                    # Modified: getTranscriptPage instead of getTranscripts
├── components/
│   └── meeting-library/
│       └── sidebar.tsx                             # Modified: remove recents prop, add Load More button
├── constants/
│   └── workflow/
│       └── recents.constants.ts                   # New: RECENTS_PAGE_SIZE, SEARCH_DEBOUNCE_MS
├── hooks/
│   └── meeting-library/
│       └── use-library-search.ts                   # Modified: full rewrite (debounced server search)
├── lib/
│   └── db/
│       └── models/
│           └── transcript.model.ts                # Modified: add title text index
├── providers/
│   └── recents/
│       ├── recents-context.ts                     # Modified: add loadMore, hasMore, total, isLoadingMore
│       └── recents-provider.tsx                   # Modified: pagination state + loadMore()
├── repositories/
│   └── transcript.repository.ts                   # Modified: add findPage(), searchByTitle()
├── server-actions/
│   └── workflow/
│       └── transcript.actions.ts                  # Modified: add getTranscriptPage(), searchTranscripts()
└── types/
    └── recents.types.ts                            # New: RecentsPageResult
```

**Structure Decision**: No new directories. All changes slot into the existing technical-category layout (§2.0.0). The new `recents.constants.ts` file belongs under `constants/workflow/` since recents is a workflow-domain concern.

## Complexity Tracking

No constitution violations. All changes fit within existing patterns.

## Implementation Phases

### Phase A — Data Layer (no UI changes)
1. Add case-insensitive regex index to `transcript.model.ts` on `title` for faster search queries.
2. Add `findPage(page, limit)` and `searchByTitle(query)` to `TranscriptRepository`.
3. Add `getTranscriptPage(page, limit)` and `searchTranscripts(query)` server actions.
4. Add `RecentsPageResult` type to `src/types/recents.types.ts`.
5. Add constants file `src/constants/workflow/recents.constants.ts`.

### Phase B — Provider & Context
1. Extend `RecentsContextValue` with `total`, `hasMore`, `loadMore`, `isLoadingMore`.
2. Update `RecentsProvider` to track `page` and `total` state; implement `loadMore()`.
3. Update `refreshRecents()` to call `getTranscriptPage(1)` and reset pagination.
4. Update `app/page.tsx` to call `getTranscriptPage(1, RECENTS_PAGE_SIZE)` and pass `initialTotal`.

### Phase C — Hook Rewrite
1. Rewrite `use-library-search.ts`:
   - When query is empty: return paginated items from context + expose `hasMore` / `loadMore`.
   - When query is non-empty (after debounce): call `searchTranscripts`, expose results.
   - Stale-result guard: `requestIdRef` ensures only the latest response updates state.
   - Return `isSearchActive` so the sidebar can hide "Load More" during search.

### Phase D — Sidebar UI
1. Remove `recents: RecentItem[]` prop from `Sidebar` (hook now reads from context directly).
2. Update `app-shell.tsx` to stop passing `recents` to `<Sidebar>`.
3. Add "Load More" button at the bottom of the sidebar groups list.
4. Button is hidden when `isSearchActive === true` or `hasMore === false`.
5. Button shows a spinner while `isLoadingMore === true`.
