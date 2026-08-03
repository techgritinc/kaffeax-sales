# Contract: Recents Server Actions

**File**: `src/server-actions/workflow/transcript.actions.ts`

These are additions to the existing file. Existing exports (`getTranscripts`, `getTranscriptById`, etc.) are unchanged.

---

## `getTranscriptPage`

Fetches one page of transcripts, ordered by `createdAt` descending.

```ts
export async function getTranscriptPage(
  page: number,
  limit: number = RECENTS_PAGE_SIZE,
): Promise<RecentsPageResult>
```

**Parameters**:
- `page` — 1-indexed page number. Must be ≥ 1.
- `limit` — items per page. Defaults to `RECENTS_PAGE_SIZE` (10). Caller may not pass a value higher than 50.

**Returns**: `RecentsPageResult` — `{ items: StoredTranscript[], total: number, hasMore: boolean }`

**Delegates to**: `transcriptRepository.findPage(page, limit)`

**Error handling**: Wraps in `try/catch`; calls `logAndThrow('getTranscriptPage', error, ACTION_LOAD_ERROR)` on failure.

**Validation**: None beyond Mongoose. Invalid `page` (< 1) returns page 1 (clamped by the repository).

---

## `searchTranscripts`

Performs a case-insensitive substring search on `title` across all transcripts.

```ts
export async function searchTranscripts(query: string): Promise<StoredTranscript[]>
```

**Parameters**:
- `query` — raw search string from the user. Must be non-empty (caller is responsible for not calling with an empty string; the server action returns `[]` defensively if empty is passed).

**Returns**: Up to 20 matching `StoredTranscript[]` items, ordered by `createdAt` descending. 20 is a soft server-side cap; the search is not paginated.

**Delegates to**: `transcriptRepository.searchByTitle(query)`

**Error handling**: Wraps in `try/catch`; calls `logAndThrow('searchTranscripts', error, ACTION_LOAD_ERROR)` on failure.

---

## Repository methods (backing the server actions)

**File**: `src/repositories/transcript.repository.ts`

### `findPage`

```ts
findPage(page: number, limit: number): Promise<{ items: StoredTranscript[], total: number, hasMore: boolean }>
```

- Clamps `page` to ≥ 1.
- Runs `Transcript.countDocuments()` and `Transcript.find().sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit)` in a `Promise.all`.
- Maps docs through `toStoredTranscript`.
- Computes `hasMore = (page * limit) < total`.

### `searchByTitle`

```ts
searchByTitle(query: string, limit: number = 20): Promise<StoredTranscript[]>
```

- Returns `[]` if `query.trim()` is empty.
- Executes `Transcript.find({ title: { $regex: escapedQuery, $options: 'i' } }).sort({ createdAt: -1 }).limit(limit)`.
- The query string is escaped with a simple regex-escape utility to prevent regex injection.
- Maps docs through `toStoredTranscript`.
