# Contract: RecentsContext

**Files**: `src/providers/recents/recents-provider.tsx`, `src/providers/recents/recents-context.ts`

## Hook

```ts
function useRecents(): RecentsContextValue
```

Throws if called outside `<RecentsProvider>`, matching the existing `useWorkflow()` pattern.

## State

| Field | Type | Description |
|---|---|---|
| `recents` | `RecentItem[]` | Ordered (newest first) list backing the recents bar |

## Actions

| Action | Signature | Behavior |
|---|---|---|
| `prependRecent` | `(item: RecentItem) => void` | Inserts at index 0 — used right after `createDraftTranscript` resolves |
| `updateRecent` | `(id: string, patch: Partial<RecentItem>) => void` | Patches the matching entry in place — used after AI success/failure and after approve |
| `refreshRecents` | `() => Promise<void>` | Re-fetches via `getTranscripts()` + `toRecentItem`, replaces `recents` wholesale |

## Seeding contract

`page.tsx` must call `getTranscripts()`, map each result through `toRecentItem()`, and pass the array as `initialRecents` to `<RecentsProvider>`:

```tsx
const initialRecents = (await getTranscripts()).map(toRecentItem);
```

## Consumption contract (recents-bar display fields)

Per the source request, the recents bar renders exactly: `title`, `status` (`DRAFT | CRM`), `badge` (`HOT | WARM | COLD`, omitted while `aiProcessingStatus !== 'success'`), and `when` (date/time). No other `RecentItem` fields are added without a corresponding spec change.

## Interaction with navigation gating

Clicking a `RecentItem` in the bar calls `getTranscriptById(item.id)` (see `transcript-actions.md`) to hydrate the capture-session provider. If the hydrated record's `aiProcessingStatus !== 'success'`, the capture-session provider forces `step: 'capture'` and blocks `goTo('review')`/`goTo('commit')`, regardless of `RecentsContext` state — `RecentsContext` itself has no gating responsibility, it is a pure list.

## Acceptance

- [ ] Immediately after clicking Summarize, a new `DRAFT` item (no badge) appears at the top of the recents bar without a page reload.
- [ ] Once AI summarization succeeds, that same item updates in place to show the correct `HOT | WARM | COLD` badge, still `DRAFT`.
- [ ] If AI summarization fails, the item remains `DRAFT` with no badge, and reopening it from the bar keeps the user on CAPTURE.
- [ ] After approve, the item's status updates in place to `CRM`.
- [ ] `useRecents()` throws when rendered outside the provider.
