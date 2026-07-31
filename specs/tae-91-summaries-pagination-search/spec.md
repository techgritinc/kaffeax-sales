# Feature Specification: Recent Summaries Pagination & Search

**Feature Branch**: `feat/tae-91-audit-log-service`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Paginate the recent summaries rail bar (10 items initially, Load More button for subsequent pages) and implement debounced/throttled text search with abort controller support across the full MongoDB collection."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load Initial Summaries (Priority: P1)

A user opens the application and sees the recent summaries rail bar. Instead of all summaries being dumped at once, only the 10 most recent summaries are shown. The UI feels fast because it only fetches what is needed.

**Why this priority**: This is the foundational performance improvement. Without it, the list will degrade as data grows. All other stories depend on having a paginated baseline.

**Independent Test**: Navigate to the app; count that exactly 10 summary cards appear in the rail. Confirm no "Load More" button shows if total summaries ≤ 10. Confirm the button appears if total > 10.

**Acceptance Scenarios**:

1. **Given** the user has more than 10 summaries stored, **When** they open the app, **Then** the rail shows exactly the 10 most recent summaries ordered by date descending.
2. **Given** the user has 10 or fewer summaries, **When** they open the app, **Then** all summaries are displayed and no "Load More" button is visible.
3. **Given** a network failure during initial load, **When** the page renders, **Then** an error state is displayed and no partial list is shown.

---

### User Story 2 - Load More Summaries (Priority: P2)

A user has scrolled through the 10 initial summaries and wants to see older ones. They click the "Load More" button, which fetches the next 10 summaries and appends them to the existing list without a full page reload.

**Why this priority**: Enables progressive disclosure of historical data. Without this, the user has no way to access summaries beyond the initial 10.

**Independent Test**: With 25 summaries in the database, click "Load More" once — verify 20 summaries are now visible. Click again — verify all 25 are shown and the button disappears.

**Acceptance Scenarios**:

1. **Given** the user sees 10 summaries and more exist, **When** they click "Load More", **Then** the next 10 summaries are appended to the list and a loading indicator is shown during the fetch.
2. **Given** fewer than 10 remaining summaries exist, **When** the user clicks "Load More", **Then** all remaining summaries are appended and the "Load More" button disappears.
3. **Given** all summaries have been loaded, **When** the user looks at the rail, **Then** no "Load More" button is visible.
4. **Given** the "Load More" request fails, **When** the fetch completes with an error, **Then** an inline error message is displayed and the previously loaded summaries remain intact.

---

### User Story 3 - Search Summaries by Text (Priority: P3)

A user types a search query into the search bar within the recent summaries rail. The system waits briefly after the user stops typing before sending a request, avoiding unnecessary calls on every keystroke. Results matching the query are shown from the full database, not just the currently loaded page. If the user clears the search, the original paginated list is restored.

**Why this priority**: Provides access to summaries not in the current loaded window. This closes the gap where a user can't find an old meeting that hasn't been paginated into view yet.

**Independent Test**: Load 10 summaries; search for a term that matches a summary on "page 3". Verify the matching summary appears in results without clicking "Load More". Clear the search; verify the original 10 summaries are restored.

**Acceptance Scenarios**:

1. **Given** the user types a query, **When** they stop typing for 300ms, **Then** a search request is made and results are rendered (replacing the paginated list for the duration of the search).
2. **Given** the user is still typing, **When** a previous request is in-flight, **Then** that request is automatically cancelled and only the latest query executes.
3. **Given** a search returns no results, **When** the results render, **Then** an empty-state message is shown (e.g., "No meetings found for '[query]'").
4. **Given** the user clears the search bar, **When** the input becomes empty, **Then** the paginated list is restored to its previous state (page 1, 10 items).
5. **Given** the user searches and then clicks "Load More", **Then** the "Load More" button is hidden during active search mode.

---

### Edge Cases

- What happens when the user rapidly clears and re-types the same query? Each intermediary request should be cancelled; only the latest query (after the user pauses typing) fires.
- What happens when the total number of summaries is exactly 10? No "Load More" button should render.
- What if a summary title contains special characters or regex-sensitive characters? The search must not break or throw errors.
- What happens if the database is empty? An appropriate empty state is shown on initial load with no "Load More" button.
- What if the user is mid-search and a "Load More" from a previous session is in-flight? The system should handle concurrent request states gracefully.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The recent summaries API MUST return a maximum of 10 items per page, ordered by date descending.
- **FR-002**: The API response MUST include a pagination indicator (total count or a `hasMore` boolean) so the UI can decide whether to show the "Load More" button.
- **FR-003**: The "Load More" button MUST fetch the next page of results and append them to the existing list without replacing already-loaded items.
- **FR-004**: The "Load More" button MUST be hidden once all summaries have been loaded.
- **FR-005**: The search bar MUST trigger a database-level text search, not a client-side filter of already-loaded items.
- **FR-006**: The search request MUST be delayed until the user has stopped typing for a short, consistent interval before a network call is made — preventing excessive requests on rapid keystrokes.
- **FR-007**: Any in-flight search request MUST be automatically cancelled when a newer search query is issued, ensuring only the latest result is displayed.
- **FR-008**: While a search query is active (non-empty input), the paginated list and "Load More" button MUST be replaced by search results.
- **FR-009**: When the search input is cleared, the paginated list MUST be restored to its current state (page 1, without re-fetching if already cached).
- **FR-010**: A loading indicator MUST be shown during any fetch operation (initial load, "Load More", and search).
- **FR-011**: Error states MUST be surfaced to the user when any fetch fails, without losing previously loaded data.

### Key Entities

- **Summary Metadata**: Represents a single meeting summary entry in the rail. Key attributes: unique identifier, meeting title, date, band/score label. This is a read-only projection of the full summary record.
- **Pagination Cursor**: Represents the current page offset (page number or cursor token) maintained in client state to support "Load More".
- **Search Query**: The text string entered by the user, debounced before being sent to the server.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Initial rail load time remains under 1 second for a collection with up to 10,000 summaries.
- **SC-002**: The "Load More" action appends items within 500ms under normal network conditions.
- **SC-003**: Search results appear within 800ms of the debounce timeout firing, covering a collection of up to 10,000 summaries.
- **SC-004**: Zero wasted API calls occur when the user types and pauses multiple times in quick succession — only the final debounced query executes.
- **SC-005**: No existing loaded summary cards disappear or flicker when a "Load More" action is triggered.
- **SC-006**: Clearing the search input restores the list instantly (no additional network round-trip if data is already in memory).

## Assumptions

- Full-text search capability on summary titles and relevant searchable fields is available in the database, or will be enabled as part of this feature.
- The summaries data volume will grow over time; the pagination page size of 10 is a baseline and may be made configurable in the future, but for this feature it is fixed at 10.
- The search is full-text across meeting titles (and any other already-indexed fields); searching by date range or band is out of scope for this feature.
- The "Load More" pattern (button-triggered pagination) is preferred over infinite scroll for this release. Infinite scroll is not in scope.
- The search and pagination are scoped to the recent summaries rail bar; global search across the entire application is out of scope.
- The existing data access layer for summaries metadata will be updated in-place rather than a new parallel endpoint being created.
- Request cancellation and input debouncing are handled on the client side; no server-side rate limiting is required for this feature.
