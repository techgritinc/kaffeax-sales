# Research: Recent Summaries Pagination & Search

## Q1 — Pagination Strategy: Offset vs. Cursor

**Decision**: Offset-based pagination (`skip` / `limit` via page number).

**Rationale**: The data set is sorted by `createdAt` descending and items are only appended at the head (new transcripts). Cursor-based pagination (keyset) adds complexity without meaningful benefit at this scale. The "Load More" UX appends pages sequentially, so there is no random-access requirement. MongoDB `skip` is efficient within the first few pages of a 10,000-document collection.

**Alternatives considered**: Cursor pagination (keyset on `createdAt`) — rejected because the UI never needs to jump to an arbitrary page, and implementation complexity is higher with no user-visible benefit.

---

## Q2 — Search Strategy: MongoDB `$text` vs. Regex vs. Atlas Search

**Decision**: Case-insensitive `$regex` on `title`.

**Rationale**:
- `$text` (full-text index) matches whole words only. Typing "Acme Cor" will not match "Meeting with Acme Corp" — this is a poor experience for a title search bar.
- `$regex` supports substring matching (e.g., `/acme cor/i` matches "Meeting with Acme Corp"), which is the expected UX.
- MongoDB Atlas Search (Lucene-based) supports substring + typo tolerance but requires an Atlas cluster and adds operational complexity.
- At ≤ 10,000 documents, a regex query with a collation index on `title` performs well within the sub-800 ms target.
- Adding a collation-aware index (`{ title: 1 }` with `collation: { locale: 'en', strength: 2 }`) makes case-insensitive regex queries use the index rather than a full collection scan.

**Alternatives considered**:
- MongoDB `$text` full-text index — rejected (whole-word only, poor partial-match UX).
- Atlas Search — rejected (requires Atlas tier, operational overhead, out of scope).

**Index to add to `transcript.model.ts`**:
```ts
transcriptSchema.index({ title: 1 }, { collation: { locale: 'en', strength: 2 } });
```

**Repository query**:
```ts
Transcript.find({ title: { $regex: query, $options: 'i' } })
  .sort({ createdAt: -1 })
  .limit(limit)
  .collation({ locale: 'en', strength: 2 });
```

---

## Q3 — Stale Request Cancellation (Server Actions vs. AbortController)

**Decision**: Stale-result discard via `requestId` ref (not AbortController).

**Rationale**: Next.js Server Actions are plain `async` functions called over POST. There is no public API to cancel an in-flight server action (the underlying `fetch` is managed by the Next.js runtime). AbortController cannot be passed to a server action call. The "cancel on new query" behaviour is therefore implemented as:

1. A `requestIdRef` (a `useRef<number>`) increments on every debounced call.
2. Each async handler captures the current ID at call time.
3. When the server action resolves, the handler only updates state if `requestIdRef.current === capturedId`.
4. Rapid queries cause earlier IDs to be overtaken; their responses are silently discarded.

This produces identical user-visible behaviour to a true cancellation: only the result of the latest query appears on screen.

**Alternatives considered**: Creating a `/app/api/transcripts/search` route handler to enable AbortController — rejected (constitution §X prohibits route handlers; the stale-discard pattern achieves the same observable outcome).

---

## Q4 — Debounce Mechanism

**Decision**: `useEffect` with `setTimeout` / `clearTimeout`.

**Rationale**: No external debounce library needed. A standard pattern:
1. `useEffect` runs when `query` changes.
2. Sets a `setTimeout` for `SEARCH_DEBOUNCE_MS` (300 ms).
3. Returns a cleanup function that calls `clearTimeout`.
4. If the user types again before 300 ms elapses, the previous timer is cleared and a new one starts.
5. Only when the user pauses for 300 ms does the server action fire.

**Alternatives considered**: `lodash.debounce` or `use-debounce` package — rejected (the pattern is 6 lines of standard React; no dependency justified).

---

## Q5 — Where Search Logic Lives: Hook vs. Provider vs. Component

**Decision**: Debounced search + pagination state fully encapsulated in a rewritten `useLibrarySearch` hook. Provider exposes raw pagination primitives; hook orchestrates the view logic.

**Rationale**:
- The `useLibrarySearch` hook is already the single point where the sidebar transforms raw `RecentItem[]` into `drafts`/`saved` groups. Extending it to own search state keeps that responsibility in one place.
- `RecentsProvider` should remain a pure pagination state manager (page, total, loadMore) — it should not know about debounce or search queries.
- `Sidebar` stays as a dumb rendering component: it calls the hook, renders the groups, and renders the "Load More" button.

**Alternatives considered**: Putting search logic in `RecentsProvider` — rejected (provider grows too complex, mixes pagination concerns with UI-driven search timing concerns).

---

## Q6 — `RecentsProvider` initialisation for SSR

**Decision**: `app/page.tsx` calls `getTranscriptPage(1, RECENTS_PAGE_SIZE)` and passes both `initialRecents` and `initialTotal` to `RecentsProvider`.

**Rationale**: The page already calls `getTranscripts()` for SSR seeding. Replacing that call with `getTranscriptPage` is a minimal change. The `total` is needed immediately to decide whether to show "Load More" on first render; passing it as a prop avoids an extra client-side fetch.
