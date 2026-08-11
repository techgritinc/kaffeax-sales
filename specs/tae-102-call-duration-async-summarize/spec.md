# Feature Specification: Call Duration Display & Background Summary Generation

**Feature Branch**: `tae-102-call-duration-async-summarize`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "with the positive flow of application we are good at this point, we got some enhancements and improvements. we need to include the duration of the call on the 'Review' screen. Just after the date, we need to include the duration, just a clock icon and the duration ex: 1h 30m kind of. Enhancement: Currently as we click on 'Summarize' button, with the free model it is taking 2 to 3 minutes to generate the summary, we cannot hold the users on this screen showing the loading state. We have to give them an option more over like a button that says 'Run in background' and when clicked, the process happens in the backend and once generated it will update the user with a toast that, 'Summary generation is successful'. While the task is moved to background, the aiProcessingStatus would be 'Processing', let's show the same when the user clicks on 'Run in background', and once the processing is done, we update the same in the db as well and it should update the status in the recent summary section as well."

## Clarifications

### Session 2026-08-04

- Q: Should refresh/reload cancel a synchronous (on-screen) wait only, or also a "Run in background" generation whose originating tab is refreshed/closed? → A: Only the synchronous/on-screen wait is cancelled on refresh/reload — a "Run in background" generation is unaffected and continues to completion even if its originating tab is refreshed or closed.
- Q: Should a user be able to retry summarization right away for a meeting marked "Cancelled"? → A: Yes — opening a "Cancelled" meeting loads its raw transcript back into the text area, and the user retries by clicking "Summarize" again, same as a fresh generation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate summaries without being stuck waiting (Priority: P1)

A sales rep starts summary generation for a call and, instead of being forced to stare at a loading screen for 2-3 minutes, chooses to send the generation to the background and immediately continues with other work. When the summary is ready, they are notified so they can come back and review it whenever it's convenient.

**Why this priority**: This is the core pain point driving the request — the current blocking wait actively costs users time and makes the tool feel slow, on every single summarization.

**Independent Test**: Can be fully tested by starting a summary generation, choosing to run it in the background, navigating away from the screen, and confirming the user is not blocked and is later notified of completion — delivers value on its own regardless of the duration display change.

**Acceptance Scenarios**:

1. **Given** a user has started summary generation and is on the loading state, **When** they choose to run it in the background, **Then** they are freed to leave the screen and use other parts of the application immediately.
2. **Given** a summary generation has been moved to the background, **When** the user views the meeting's entry in the recent summaries list, **Then** it shows a "Processing" status until generation finishes.
3. **Given** a background summary generation finishes successfully, **When** processing completes, **Then** the user is shown a confirmation toast (e.g., "Summary generation is successful") and the meeting's status updates to reflect completion.
4. **Given** a background summary generation finishes successfully, **When** the status is updated, **Then** the completed status is saved so it persists across page reloads and future visits, and the recent summaries list reflects it without the user having to manually refresh.
5. **Given** a user prefers to simply wait, **When** they do not choose the background option, **Then** the existing on-screen wait behavior remains available to them.

---

### User Story 2 - See call duration on the Review screen (Priority: P2)

A sales rep reviewing a call wants to know at a glance how long the call lasted, without opening the recording or transcript separately.

**Why this priority**: A smaller, self-contained visual enhancement that improves the review experience but does not block or depend on the background-processing work.

**Independent Test**: Can be fully tested by opening the Review screen for a call that has a known duration and confirming the duration is displayed correctly next to the date — delivers value independently of User Story 1.

**Acceptance Scenarios**:

1. **Given** a call has a recorded duration, **When** a user opens the Review screen for that call, **Then** the duration is displayed immediately after the date, shown with a clock icon and formatted as hours and minutes (e.g., "1h 30m").
2. **Given** a call lasted less than one hour, **When** the duration is displayed, **Then** it is shown using only the minutes portion (e.g., "45m") without a redundant "0h".
3. **Given** a call's duration is not available, **When** a user opens the Review screen for that call, **Then** the duration and clock icon are omitted rather than showing an error or a placeholder like "0h 0m".

---

### Edge Cases

- What happens if a background summary generation fails? The meeting's status must reflect the failure (not remain stuck on "Processing" indefinitely) and the user must be informed, so they know to retry.
- What happens if a user starts a second background generation for a different meeting while one is already processing? Each meeting tracks and displays its own processing status independently; multiple background generations may be in flight at once.
- What happens if a user closes the browser tab or logs out while a summary is processing in the background? Generation continues and completes independently of the user's active session; the result is visible (via status and toast, where applicable) the next time the user is active in the application.
- What happens if a user re-opens the same meeting while its summary is still processing in the background? The screen reflects the "Processing" status rather than allowing a duplicate generation to be started for the same meeting.
- What happens if the call duration is zero or extremely short (e.g., under a minute)? The system displays the duration in minutes (e.g., "1m") rather than omitting it.
- What happens if a user refreshes or reloads the page while waiting synchronously (on-screen, not in background) for a summary to generate? The interrupted generation for that meeting is marked with a "Cancelled" status rather than being left stuck on "Processing" or "Pending" indefinitely. A generation that was sent to run in the background is unaffected by the same refresh/reload and continues to completion.
- What happens when a user opens a meeting marked "Cancelled"? Its raw transcript is loaded back into the text area so the user can retry by clicking "Summarize" again, the same as starting a fresh generation — no separate reset step is required.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Review screen MUST display the call's duration immediately after the call date.
- **FR-002**: The duration MUST be shown with a clock icon and formatted in hours and minutes (e.g., "1h 30m"), dropping the hours segment when the call lasted under an hour (e.g., "45m").
- **FR-003**: When a call's duration is unavailable, the Review screen MUST omit the duration and its icon rather than showing an error or placeholder value.
- **FR-004**: When a summary generation is in progress, the system MUST offer users a "Run in background" option as an alternative to waiting on-screen.
- **FR-005**: Choosing "Run in background" MUST allow the user to leave the current screen and continue using the application while generation continues.
- **FR-006**: While a summary is generating in the background, the system MUST mark that meeting's processing status as "Processing" and reflect this in the recent summaries list.
- **FR-007**: Upon successful completion of a background summary generation, the system MUST notify the user with a success confirmation (e.g., a toast reading "Summary generation is successful").
- **FR-008**: Upon completion of a background summary generation (success or failure), the system MUST persist the final processing status so it is durable across page reloads and future sessions.
- **FR-009**: The recent summaries list MUST reflect a meeting's final processing status (success or failure) once background generation completes, without requiring the user to manually refresh the page.
- **FR-010**: If a background summary generation fails, the system MUST update that meeting's status to reflect the failure and inform the user, rather than leaving it indefinitely marked as "Processing".
- **FR-011**: Users MUST retain the ability to wait for a summary synchronously on-screen instead of choosing the background option.
- **FR-012**: The system MUST prevent starting a duplicate background generation for a meeting that already has one in progress.
- **FR-013**: If a user refreshes or reloads the page while a summary is generating synchronously (on-screen, not sent to background), the system MUST mark that meeting's processing status as "Cancelled" rather than leaving it stuck on "Processing"/"Pending".
- **FR-014**: A "Run in background" generation MUST be unaffected by a refresh/reload of its originating tab and MUST continue to completion.
- **FR-015**: Opening a meeting marked "Cancelled" MUST load its raw transcript back into the text area, allowing the user to retry by clicking "Summarize" again without any additional reset step.

### Key Entities *(include if feature involves data)*

- **Meeting/Call Record**: The reviewed call/transcript entity; gains a duration attribute (length of the call) displayed alongside its existing date on the Review screen.
- **Summary Processing Status**: Represents the lifecycle of AI summary generation for a meeting. Extends the existing states to include an active "Processing" state (distinct from the initial pending state) so the recent summaries list can show in-progress background generation, a "Cancelled" state for a synchronous (on-screen) generation interrupted by a page refresh/reload, in addition to the existing success/failure outcomes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view a call's duration on the Review screen without opening the recording or transcript separately.
- **SC-002**: Users can start a summary generation and resume other work within seconds, instead of being blocked for the full 2-3 minute generation time.
- **SC-003**: 100% of background summary generations that complete (successfully or with failure) update the recent summaries list without requiring a manual page refresh.
- **SC-004**: Users are notified of a successful background summary generation while remaining active in the application, without needing to keep the originating screen open.
- **SC-005**: Users can distinguish, at a glance from the recent summaries list, which meetings are still processing versus completed versus failed.

## Assumptions

- Call duration data is available from the same source that provides the call date (e.g., recording/transcript metadata); this feature displays it and does not define how it is captured.
- "Run in background" is offered as an additional choice alongside the existing on-screen wait, not a replacement — users who prefer to wait may still do so.
- Background generation continues server-side independent of the user's browser session; if the user is not actively in the application when it completes, they see the updated status the next time they return rather than requiring a real-time push notification while away.
- Toast notification for successful completion is delivered while the user is active within the application; no separate email or external notification channel is in scope.
- The existing recent summaries list is the single place users check for in-progress and completed summary status — no new dedicated notifications page is required.
- Duplicate-generation prevention (FR-012) applies per meeting/call record, not globally across the application.
