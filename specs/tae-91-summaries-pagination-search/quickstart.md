# Quickstart: Validation Guide

## Prerequisites

- MongoDB running with the dev connection string in `.env.development`.
- `npm run dev` server running.
- At least **12 transcripts** in the database (to test pagination). Use the existing "New" button to create dummy transcripts, or seed via MongoDB Compass.

---

## Scenario 1 — Initial Load (10 items)

1. Open the app. Expand the sidebar.
2. **Expect**: Exactly 10 summary cards visible.
3. **Expect**: A "Load More" button visible below the groups.
4. **Expect**: No search results (search bar empty).

**Pass criteria**: 10 items, button visible.

---

## Scenario 2 — Load More

1. With 12 transcripts in the DB and 10 loaded, click "Load More".
2. **Expect**: Button shows a loading spinner briefly.
3. **Expect**: After fetch completes, all 12 items are visible.
4. **Expect**: "Load More" button disappears (no more pages).

**Pass criteria**: 12 items visible, button gone.

---

## Scenario 3 — Load More (exact page boundary)

1. Seed exactly 20 transcripts.
2. Open app → 10 loaded, button visible.
3. Click "Load More" → 20 loaded, button disappears.

**Pass criteria**: Button disappears exactly when all 20 items are loaded.

---

## Scenario 4 — Search (results in first 10)

1. With 10+ transcripts, search for a word that appears in one of the first 10 titles.
2. **Expect**: Matching items appear, non-matching items disappear.
3. **Expect**: "Load More" button is hidden while search is active.
4. Clear the search bar.
5. **Expect**: Original 10 paginated items restored, "Load More" reappears (if applicable).

**Pass criteria**: Correct filtering; button hidden during search; list restored on clear.

---

## Scenario 5 — Search (results beyond page 1)

1. Seed 25 transcripts. The oldest 15 are not in the initial 10.
2. Type a search term that matches only a transcript outside the first 10.
3. **Expect**: Matching item appears in search results (fetched from the full DB).
4. **Expect**: "Load More" is hidden.
5. Clear search.
6. **Expect**: Paginated list restored (10 items), "Load More" visible.

**Pass criteria**: Search finds items not in the current page; list correctly restored.

---

## Scenario 6 — Debounce (no wasted calls)

1. Open the browser DevTools → Network tab, filter by Fetch/XHR.
2. Type "meeting" quickly (one character at a time, fast).
3. **Expect**: Network requests only fire after you stop typing for ~300 ms. Not one request per keystroke.

**Pass criteria**: Fewer network requests than keystrokes.

---

## Scenario 7 — Stale result discard

1. Type "a" in the search bar.
2. Immediately type "b" (before the first response arrives).
3. **Expect**: Only the result for "ab" (or whatever the final debounced query is) appears. No flash of the "a" results.

**Pass criteria**: UI shows only the latest search result.

---

## Scenario 8 — Empty state

1. With 0 transcripts (or after clearing all), open the sidebar.
2. **Expect**: "No summaries yet" empty state message.
3. **Expect**: No "Load More" button.

**Pass criteria**: Empty state shown, no button.

---

## Scenario 9 — Error recovery (Load More failure)

1. Disconnect from MongoDB (or stop the dev server briefly).
2. With items already loaded, click "Load More".
3. **Expect**: An error message appears inline (not a full-page crash).
4. **Expect**: Previously loaded items remain visible.

**Pass criteria**: Graceful error without losing loaded data.

---

## Reference

- Server action contracts: [`contracts/recents-server-actions.md`](./contracts/recents-server-actions.md)
- Context interface: [`contracts/recents-context.md`](./contracts/recents-context.md)
- Data model: [`data-model.md`](./data-model.md)
