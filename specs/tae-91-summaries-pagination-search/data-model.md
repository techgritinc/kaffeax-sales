# Data Model: Recent Summaries Pagination & Search

## Existing Entities (unchanged)

### `RecentItem` — sidebar display projection

Defined in `src/providers/recents/recents-context.ts`. Unchanged by this feature.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | MongoDB `_id` as string |
| `title` | `string` | Meeting title |
| `status` | `'DRAFT' \| 'CRM'` | Derived from `TranscriptFields.status` |
| `badge` | `'HOT' \| 'WARM' \| 'COLD' \| undefined` | Derived from `leadScore.band`, only set on `success` |
| `aiProcessingStatus` | `AiProcessingStatus` | `'pending' \| 'success' \| 'failed'` |
| `when` | `string` | Formatted `updatedAt` |

### `StoredTranscript` — raw persistence shape

Defined in `src/types/transcript.types.ts`. Unchanged — repository methods continue to return this type.

---

## New Entity

### `RecentsPageResult` — paginated server action response

**File**: `src/types/recents.types.ts` (new file)

| Field | Type | Notes |
|-------|------|-------|
| `items` | `StoredTranscript[]` | One page of raw transcripts; caller maps with `toRecentItem` |
| `total` | `number` | Total documents in the collection (unfiltered, for pagination math) |
| `hasMore` | `boolean` | `true` when `page * limit < total` |

**Why `StoredTranscript[]` and not `RecentItem[]`**: The server action layer returns raw storage shapes. The mapping to `RecentItem` happens in the provider (consistent with the existing pattern where `getTranscripts()` returns `StoredTranscript[]` and `RecentsProvider.refreshRecents()` calls `.map(toRecentItem)`).

---

## Schema Change — Mongoose text index on `title`

**File**: `src/lib/db/models/transcript.model.ts`

Add one index to the `transcriptSchema`:

```
{ title: 1 }  with collation: { locale: 'en', strength: 2 }
```

**Purpose**: Enables efficient case-insensitive substring search on the `title` field. The collation index (`strength: 2` = case- and accent-insensitive) allows `Transcript.find({ title: { $regex: q, $options: 'i' } }).collation(...)` to use the index rather than scanning the collection.

**Effect on existing data**: Index is non-unique and non-sparse — Mongoose creates it on startup if it does not exist. No data migration required.

---

## Context Interface Change — `RecentsContextValue`

**File**: `src/providers/recents/recents-context.ts`

Fields added to `RecentsContextValue`:

| Field | Type | Notes |
|-------|------|-------|
| `total` | `number` | Total transcript count; used for "Load More" visibility math |
| `hasMore` | `boolean` | `recents.length < total` — pre-computed in provider |
| `isLoadingMore` | `boolean` | `true` while a "Load More" fetch is in-flight |
| `loadMore` | `() => Promise<void>` | Fetches the next page and appends to `recents` |

Fields retained (unchanged):

| Field | Notes |
|-------|-------|
| `recents` | Now contains only loaded pages (not all transcripts) |
| `prependRecent` | Unchanged |
| `updateRecent` | Unchanged |
| `refreshRecents` | Now resets to page 1 via `getTranscriptPage(1)` |

---

## State Machine — `RecentsProvider`

```
INITIAL
  ├─ recents = initialRecents (page 1, max 10)
  ├─ page = 1
  ├─ total = initialTotal
  └─ hasMore = recents.length < total

LOAD_MORE triggered
  ├─ isLoadingMore = true
  ├─ calls getTranscriptPage(page + 1)
  ├─ appends result.items.map(toRecentItem) to recents
  ├─ page = page + 1
  ├─ total = result.total  (re-synced in case new items were added)
  ├─ hasMore = recents.length < total
  └─ isLoadingMore = false

REFRESH triggered (e.g. after new transcript created)
  ├─ calls getTranscriptPage(1)
  ├─ recents = result.items.map(toRecentItem)  (replaces all)
  ├─ page = 1
  ├─ total = result.total
  ├─ hasMore = recents.length < total
  └─ isLoadingMore = false (unchanged)
```
