# Feature Specification: Backend Integration with Frontend

**Feature Branch**: `tae-82-backend-frontend-integration`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Backend Integration with Frontend — replace the mock data layer currently powering the UI with the real database and AI repository layers: bind the recents bar to real transcript metadata, add a capability to fetch a single summary by its database id, wire the 'Summarize' button through a two-phase draft-then-AI-processing flow that always persists the raw and cleaned transcript before calling the AI, track AI processing success/failure so an interrupted or failed run cannot skip ahead to Review/CRM, always send the freshest rubric signals at the moment Summarize is clicked, and introduce a Context API so rubric signals and recents-bar metadata are shared application state instead of mock props. Zoho CRM write-back stays out of scope. Remove the mock data layer and the mock-driven providers/workflow directory entirely."

## Clarifications

### Session 2026-07-28

- Q: Should the Summarize button remain disabled after a failed AI run, or re-enable for retry? → A: Disable the Summarize button immediately on click; automatically re-enable it only if processing fails, so the rep can retry without reloading.
- Q: Is the AI-processing loading indicator a blocking overlay, and should it be dismissible? → A: Blocking modal/overlay covering the screen while processing runs, with outside-click and Escape-to-dismiss explicitly disabled — it can only go away when processing finishes (success or failure).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See real saved summaries in the recents bar (Priority: P1)

A sales rep opens the app and sees the recents bar populated with their actual previously-captured meetings — not sample data — showing each meeting's title, whether it's still a draft or has been saved to CRM, its lead-temperature badge, and when it was captured.

**Why this priority**: This is the foundation every other story depends on — until the recents bar reflects real data, no other real-data flow (opening a summary, resuming an interrupted one) can be demonstrated or trusted.

**Independent Test**: Can be fully tested by capturing and summarizing at least one transcript, reloading the app, and confirming the recents bar shows that meeting (title, DRAFT/CRM status, HOT/WARM/COLD badge, date/time) sourced from the database rather than fixture data.

**Acceptance Scenarios**:

1. **Given** a rep has previously summarized two meetings — one still a draft and one saved to CRM — **When** they open the app, **Then** the recents bar shows both, correctly grouped/labeled by DRAFT vs CRM status, each with its title, lead-temperature badge, and capture date/time.
2. **Given** no meetings have ever been captured, **When** the rep opens the app, **Then** the recents bar shows an empty state rather than sample/mock entries.
3. **Given** a meeting exists but its AI processing has not yet completed successfully, **When** the recents bar renders it, **Then** its badge reflects an "in progress"/"pending" state rather than a fabricated HOT/WARM/COLD value.

---

### User Story 2 - Open a specific summary from the recents bar (Priority: P1)

A sales rep clicks a specific meeting in the recents bar and is taken to that exact meeting's full summary, loaded from the database by its unique id, resuming at the correct step of the workflow.

**Why this priority**: Without this, the recents bar is decorative — reps cannot actually return to and act on their past work, which is the core value of the recents bar existing at all.

**Independent Test**: Can be fully tested by capturing a transcript, letting it summarize successfully, noting its id, reloading the app, and clicking it from the recents bar to confirm the same content loads and the Review step is reachable.

**Acceptance Scenarios**:

1. **Given** a meeting whose AI processing completed successfully, **When** the rep clicks it in the recents bar, **Then** the app loads that exact record by its database id and lands on the Review step with the AI-generated summary visible.
2. **Given** a meeting whose AI processing failed or never finished (e.g., the rep refreshed mid-processing), **When** the rep clicks it in the recents bar, **Then** the app loads that record but keeps them on the Capture step, with the Review and CRM steps blocked.
3. **Given** an id that no longer exists in the database, **When** it is requested, **Then** the app surfaces a not-found outcome rather than a crash or blank screen.

---

### User Story 3 - Summarize a transcript end-to-end against real data (Priority: P1)

A sales rep pastes or extracts a transcript, clicks "Summarize," and the system durably saves their raw input immediately, then runs the real AI analysis against the cleaned transcript and the current rubric signals, updating that same saved record with the results — so no work is ever silently lost even if the AI step fails.

**Why this priority**: This is the core operational loop of the product — everything else exists to support this action producing a trustworthy, persisted result.

**Independent Test**: Can be fully tested by pasting a transcript and clicking Summarize, then confirming (a) a database record exists immediately with the raw and cleaned transcript even before AI processing finishes, and (b) that same record is updated in place with the AI-generated summary and a success/failure processing outcome once analysis completes.

**Acceptance Scenarios**:

1. **Given** a rep has pasted a transcript, **When** they click Summarize, **Then** a draft record is immediately created containing the raw transcript and a cleaned version (timestamps and speaker-line artifacts removed), before any AI result is available.
2. **Given** that draft record now exists, **When** AI analysis completes successfully, **Then** the same record (same id) is updated with the AI-generated summary and lead-score information, its processing outcome is marked successful, and it remains in draft status until the rep approves it.
3. **Given** AI analysis fails (provider error, timeout, invalid response), **When** the failure occurs, **Then** the same record's processing outcome is marked failed, the raw and cleaned transcript remain saved, and the rep is not routed past the Capture step.
4. **Given** an admin adds a new rubric signal in the UI after the app loaded but before the rep clicks Summarize, **When** Summarize runs, **Then** the AI analysis is performed using the full, current set of rubric signals — including the one just added — not a stale set captured at page load.

---

### User Story 4 - Rubric signals and recents metadata as shared application state (Priority: P2)

Rubric signals (used to guide AI analysis) and recents-bar summary metadata are available as shared state across the relevant screens, so any part of the UI that needs the current signals or the current list of summaries reads from one consistent, live source instead of being handed a fixed snapshot.

**Why this priority**: This underpins the "always freshest signals" guarantee in Story 3 and keeps the recents bar and any signal-editing UI in sync without prop-drilling or duplicated fetches; it's an enabler rather than an independently visible feature to end users.

**Independent Test**: Can be fully tested by adding a rubric signal on one screen and confirming it's immediately reflected wherever rubric signals are displayed or used, without a full page reload.

**Acceptance Scenarios**:

1. **Given** the app has loaded rubric signals once, **When** an admin adds, edits, or removes a signal, **Then** every consumer of rubric signals (the signal panel and the next Summarize call) reflects that change immediately.
2. **Given** a new summary is created or an existing one's status changes (e.g., draft → saved to CRM), **When** that happens, **Then** the recents bar updates to reflect it without requiring a manual refresh.

---

### Edge Cases

- Double-submission is prevented: the Summarize action is disabled the instant it is clicked (FR-014) and cannot be triggered again on the same transcript while a run is in flight.
- Clicking outside the loading indicator, or pressing Escape, while AI processing is in flight MUST NOT dismiss the indicator or interrupt processing (FR-015).
- If the rep navigates away or closes the tab between the draft-creation save and the AI result being written back, no work is lost: the raw/cleaned transcript is already durably persisted (FR-004), and the record's processing outcome simply remains non-successful until (or unless) analysis completes — reopening it from the recents bar keeps the rep on Capture per FR-009, same as any other incomplete run.
- The Summarize action requires non-empty, non-whitespace transcript content before a draft record is created; an empty or whitespace-only transcript is rejected at the point of click rather than producing an empty persisted record.
- While a summary's AI processing is still in flight, the recents bar displays it with a pending/in-progress indicator rather than a fabricated HOT/WARM/COLD badge (per User Story 1, Acceptance Scenario 3) until the processing outcome resolves to success or failure.
- An empty rubric-signal set (no active signals) at the moment Summarize is clicked is a valid state, not an error: AI analysis proceeds using the cleaned transcript alone.
- Approval is unreachable for a record whose processing outcome is not successful, because FR-009 already blocks navigation to the Review and CRM steps for that record — there is no separate approval-time check to design.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST populate the recents bar from real, persisted summary records rather than fixture/mock data, showing for each record: meeting title, lifecycle status (draft vs saved-to-CRM), lead-temperature badge (hot/warm/cold), and capture date/time.
- **FR-002**: System MUST provide a capability to fetch one specific summary record in full by its unique database identifier, for use when a recents-bar entry is opened.
- **FR-003**: System MUST return a clear not-found outcome when a requested summary id does not exist, without crashing the requesting screen.
- **FR-004**: When a rep clicks Summarize, the system MUST immediately create a persisted record containing at minimum the raw transcript and a cleaned transcript (timestamps and speaker-line hyphen/formatting artifacts removed), before AI analysis begins.
- **FR-005**: The persisted-record schema/validation MUST allow this initial save to succeed with only the raw and cleaned transcript (plus any unavoidable minimum identifying fields) populated — all AI-derived fields MUST be optional until AI processing completes.
- **FR-006**: System MUST immediately begin AI analysis after the initial save, using the cleaned transcript and the full set of rubric signals current as of the moment Summarize was clicked — not a snapshot taken at page load.
- **FR-007**: On successful AI analysis, the system MUST update the same record (matched by the id created in FR-004) with the AI-generated summary and lead-score results, while keeping the record in draft lifecycle status.
- **FR-008**: System MUST track and persist a processing outcome (success or failure) on the record, distinct from the record's draft/saved-to-CRM lifecycle status.
- **FR-009**: When a rep opens a record whose processing outcome is not "successful" (never completed, or failed), the system MUST keep them on the Capture step and MUST block navigation to the Review and CRM steps for that record.
- **FR-010**: System MUST make the current, live set of rubric signals available wherever they are needed (signal display and the Summarize action) through shared application state rather than a one-time snapshot passed at load.
- **FR-011**: System MUST make recents-bar summary metadata available as shared application state so it reflects newly created or updated records without requiring a full page reload.
- **FR-012**: The rep-facing approval step MUST continue to require a contact email before a record can be marked approved/saved-to-CRM; the actual write to the external CRM system remains explicitly out of scope for this feature.
- **FR-013**: System MUST remove the mock data layer and the mock-driven workflow provider/engine entirely, along with any UI code path that depends on them, once the real data flows above are in place.
- **FR-014**: System MUST disable the Summarize action immediately upon click and keep it disabled for the duration of AI processing; it MUST automatically re-enable only if that processing run fails, so the rep can retry without reloading the page.
- **FR-015**: While AI processing is in flight, the system MUST show a blocking loading indicator that cannot be dismissed by an outside click, an Escape key press, or any other interaction — it MUST only close once processing has finished (successfully or with failure).

### Key Entities *(include if feature involves data)*

- **Summary Record**: A single captured meeting. Holds the raw transcript, the cleaned transcript, a title, a lifecycle status (draft / saved-to-CRM), a processing outcome (pending / success / failed) separate from lifecycle status, the AI-generated summary content, lead-score/badge information once available, contact email, and capture date/time.
- **Rubric Signal**: A configurable cue (with a label and a hot/warm/cold weight) that the AI analysis uses to detect buying signals in a transcript. Can be added, edited, removed, or toggled active by an admin at any time.
- **Recents Bar Item**: The subset of a Summary Record's fields needed for list display — title, lifecycle status, badge, and date/time — kept in sync with the underlying records.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of recents-bar entries and summary detail views are sourced from persisted records, with zero references to sample/fixture data remaining anywhere in the running application.
- **SC-002**: 100% of Summarize clicks result in a durably saved raw-and-cleaned transcript record, even in cases where the subsequent AI analysis fails — no captured transcript is ever lost.
- **SC-003**: When a rubric signal is added immediately before clicking Summarize, it is reflected in that specific run's analysis 100% of the time, with no page reload required.
- **SC-004**: 100% of attempts to open a summary whose AI processing did not succeed land the rep on the Capture step, never on a partially-populated Review or CRM step.
- **SC-005**: Reps can go from pasting a transcript to seeing it appear correctly in the recents bar (title, status, badge, date/time) without encountering any mock-data artifacts or dead UI states.

## Assumptions

- Zoho CRM integration remains explicitly out of scope, per the source request; the approval step continues to capture a contact email and update the record's lifecycle status to saved-to-CRM, but no outbound call to Zoho (or any external CRM) is made as part of this feature.
- "Fetch a summary by its database id" is a data-retrieval capability the recents bar relies on; how that capability is technically exposed (e.g., a server-side data function invoked when a recents-bar item is opened) is a planning-phase decision, not a business requirement of this spec.
- "Cleaned transcript" means the raw transcript with timestamps and speaker-line hyphen/formatting artifacts stripped, per the source description — no further summarization or NLP normalization is implied by "cleaning."
- The existing draft/saved-to-CRM and hot/warm/cold vocabulary already used elsewhere in the product maps directly onto the "DRAFT | CRM" status and "HOT | WARM | COLD" badge described here; no new vocabulary is being introduced to end users.
- A meeting title is available (rep-entered or otherwise defaulted) at the moment the initial draft record is created, so the record satisfies minimum required-field validation before AI processing supplies any additional content.
- Rubric-signal freshness (FR-006) is satisfied by reading current shared application state at the moment Summarize is clicked; it does not require a fresh database round-trip on every keystroke elsewhere in the UI.
- Removing the mock data layer and mock workflow provider (FR-013) is understood to include deleting their source files, not merely ceasing to reference them.
