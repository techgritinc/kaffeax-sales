# Contract: Updated Recents Context & Hook

## `RecentsContextValue` (updated interface)

**File**: `src/providers/recents/recents-context.ts`

```ts
export interface RecentsContextValue {
  /** Currently loaded RecentItems (one or more pages). */
  recents: RecentItem[];
  /** Total documents in the collection; used to compute hasMore. */
  total: number;
  /** True when more pages exist beyond the currently loaded set. */
  hasMore: boolean;
  /** True while a loadMore fetch is in-flight. */
  isLoadingMore: boolean;

  /** Prepend a new item at the head (called immediately after transcript creation). */
  prependRecent: (item: RecentItem) => void;
  /** Patch a single item's fields (called during AI processing status updates). */
  updateRecent: (id: string, patch: Partial<RecentItem>) => void;
  /** Fetch the next page and append to recents. No-op if hasMore is false. */
  loadMore: () => Promise<void>;
  /** Reset to page 1 (called after a new transcript is summarised). */
  refreshRecents: () => Promise<void>;
}
```

**Breaking change from prior interface**: `total`, `hasMore`, `isLoadingMore`, and `loadMore` are new required fields. Any code that spreads or implements `RecentsContextValue` must be updated.

---

## `RecentsProviderProps` (updated)

**File**: `src/providers/recents/recents-provider.tsx`

```ts
export interface RecentsProviderProps {
  children: ReactNode;
  initialRecents: RecentItem[];
  /** Total transcript count at SSR time — used to initialise hasMore. */
  initialTotal: number;
}
```

**Caller** (`app/page.tsx`) must now call `getTranscriptPage(1, RECENTS_PAGE_SIZE)` and pass `result.total` as `initialTotal`.

---

## `UseLibrarySearch` (updated hook return type)

**File**: `src/hooks/meeting-library/use-library-search.ts`

```ts
export interface UseLibrarySearch {
  /** Current search input value. */
  query: string;
  /** Update the search query (triggers debounce). */
  setQuery: (value: string) => void;
  /** Draft items to render (from paginated context OR search results). */
  drafts: RecentItem[];
  /** CRM-committed items to render (from paginated context OR search results). */
  saved: RecentItem[];
  /** True while a search fetch is in-flight (debounce fired, response pending). */
  isSearching: boolean;
  /** True when the query input is non-empty (used to hide Load More). */
  isSearchActive: boolean;
  /** Forwarded from RecentsContext — whether more paginated pages exist. */
  hasMore: boolean;
  /** Forwarded from RecentsContext — triggers loading the next page. */
  loadMore: () => Promise<void>;
  /** Forwarded from RecentsContext — true while loadMore fetch is in-flight. */
  isLoadingMore: boolean;
}
```

**Signature change**: The hook no longer accepts `recents` as a parameter. It calls `useRecents()` internally.

```ts
// Before
export function useLibrarySearch(recents: RecentItem[]): UseLibrarySearch

// After
export function useLibrarySearch(): UseLibrarySearch
```

**Side effects**: One `useEffect` — fires when `query` changes. Sets a 300 ms timer; cleans up on re-render. On timer fire, calls `searchTranscripts(query)` server action and updates local search state.

---

## `SidebarProps` (updated)

**File**: `src/components/meeting-library/sidebar.tsx`

```ts
// Before
export interface SidebarProps {
  recents: RecentItem[];
  activeId: string | null;
  onSelect: (item: RecentItem) => void;
  onNew: () => void;
  onCollapse: () => void;
}

// After — recents removed; Load More state comes from useLibrarySearch
export interface SidebarProps {
  activeId: string | null;
  onSelect: (item: RecentItem) => void;
  onNew: () => void;
  onCollapse: () => void;
}
```

**Caller** (`app-shell.tsx`) must stop passing `recents` to `<Sidebar>`.

The component renders a "Load More" button below the group lists when `hasMore && !isSearchActive`. During `isLoadingMore`, the button shows a spinner and is disabled.
