# Feature Specification: Zoho CRM Integration

**Feature Branch**: `feat/tae-86-zoho-crm-api-client-setup`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Create a repository layer for Zoho CRM API calls isolated under integrations/zoho. When users click 'Approve' on the Review screen, a server action collects meeting data (Summary, Score, Signals, Action Items, etc.) and writes it to the matching CRM lead record via email lookup."

**Update (2026-07-29)**: The AI summarization pipeline is now fully bound to the frontend and producing live meeting data (summary, score, signals, action items) on the Review screen. The remaining work is to correctly wire the "Approve" button's server action to orchestrate the existing auth service and CRM client against this live data: fetch the stored token, validate expiry, refresh and persist if needed, then use it for the lead search and update calls. Zoho CRM field API Names for the Leads module are still pending — the user will supply them once the corresponding custom fields are created in Zoho.

**Update (2026-07-29, post-analysis)**: A `/speckit-analyze` pass found the "Approve" button's actual implementation (`runApprove`) never calls the Zoho integration layer at all — it only flips the transcript's persisted status to `saved` unconditionally, with no CRM write, no token check, and no failure path. The clarifications below close that gap.

## Clarifications

### Session 2026-07-29

- Q: When the Zoho CRM write fails (lead not found, API unreachable, etc.), what status should the transcript be persisted with? → A: Revert/remain `draft` — CRM failure does not introduce a separate persisted state; the user can simply click Approve again to retry.
- Q: The Review screen currently lets the user correct the AI-extracted prospect email inline before approving. Should that remain? → A: No (superseded 2026-07-30 — see below).
- **Superseded 2026-07-30**: The prospect email field is restored as the Review screen's one editable field — the user/admin manually corrects the AI-extracted email here to ensure an accurate CRM match; this is deliberate, not an oversight. No other field is editable. The corrected email is persisted (via the existing `updateTranscript` action) immediately before `commitToCrm` runs, so the CRM lookup always uses the corrected value. Additionally, the "Update CRM" re-approval action is removed entirely — once a transcript is `saved`, Approve/Reject no longer render; there is no re-push path.

**Update (2026-07-30, UI polish)**: Real-world testing surfaced four UI issues in the Approve → CRM-write flow that need fixing: (1) toast notifications visibly shift position right after appearing, (2) there is no in-progress indicator while the CRM write is happening, so users can't tell if Approve did anything, (3) the CRM confirmation screen shows placeholder/fabricated data (a company name and a job title the system never captures) and a redundant status badge, and (4) the prospect-email field stays editable even when viewing a meeting that has already been saved to CRM, which shouldn't be possible to change after the fact. See User Story 4 below.

**Update (2026-07-30, follow-up)**: The initial FR-019 fix removed the job-title placeholder but left a dangling em-dash (`—`) in place of the untracked contact name, followed by ` · {email}` — since the name is never captured, this always rendered as `— · email@example.com`. Fixed: the contact line now joins only the non-empty parts (name, email) with `·`, falling back to a single `—` only if both are empty. See FR-019.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Approve Meeting and Push to CRM (Priority: P1)

A sales team member reviews an AI-generated meeting summary on the Review screen. Every field is read-only except the prospect email, which they can correct if the AI extracted it incorrectly or not at all. They click the "Approve" button, and the system persists that email correction, then automatically finds the matching lead in Zoho CRM by prospect email and appends the meeting data (summary, score, what was heard, what was discussed, signals detected, action items, meeting title, attendees) to that CRM record. Once approved, the record is done — there is no "update CRM" re-push action.

**Why this priority**: This is the core value proposition — automating the transfer of meeting intelligence from the sales tool into the CRM, eliminating manual data entry and ensuring CRM records stay current.

**Independent Test**: Can be fully tested by approving a meeting on the Review screen and verifying the data appears on the matching lead record in Zoho CRM. Delivers immediate value by removing manual CRM data entry for every meeting.

**Acceptance Scenarios**:

1. **Given** a reviewed meeting with a valid prospect email, **When** the user clicks "Approve", **Then** the system looks up the lead by email in Zoho CRM, appends the meeting data to the matching record, and persists the transcript's status as `saved` only after the CRM write succeeds.
2. **Given** a reviewed meeting where the prospect email does not match any lead in Zoho CRM, **When** the user clicks "Approve", **Then** the system displays a clear error message indicating the lead was not found, no data is written, and the transcript's status remains `draft` so the user can retry.
3. **Given** a reviewed meeting with a valid prospect email, **When** the user clicks "Approve" but the Zoho API is unreachable, **Then** the system displays an error message, the transcript's status remains `draft`, and the user can retry the action.
4. **Given** a reviewed meeting, **When** the user views the Review screen, **Then** all fields except the prospect email (summary, score, signals, action items) are displayed read-only with no edit controls — the prospect email is editable, and Approve and Reject are the only available actions. Once a meeting is approved, no further action is available on it from this screen (no "update CRM" re-push).

---

### User Story 2 - Automatic Token Refresh Before CRM Calls (Priority: P1)

Before any Zoho CRM API call, the system checks whether the current access token is still valid (not expired beyond the 10-minute window). If expired, it automatically generates a new access token using the stored refresh token, persists the new token in the database, and then proceeds with the API call — all transparently to the user.

**Why this priority**: Without valid authentication, no CRM operations can succeed. This is a prerequisite for all Zoho API interactions and must be bulletproof.

**Independent Test**: Can be tested by letting the access token expire, then triggering any CRM operation — the system should silently refresh the token and succeed without user intervention.

**Acceptance Scenarios**:

1. **Given** a valid (non-expired) access token exists in the database, **When** a CRM API call is made, **Then** the system uses the existing token without refreshing.
2. **Given** the access token has been created more than 10 minutes ago, **When** a CRM API call is made, **Then** the system generates a new access token via the refresh token, stores it in the database, and uses the new token for the API call.
3. **Given** the refresh token itself is invalid or revoked, **When** a CRM API call is made, **Then** the system logs the error with context and returns a structured error message — never exposing raw Zoho error details to the user.

---

### User Story 3 - Lead Lookup by Email (Priority: P1)

The system can find a specific lead in Zoho CRM by searching with the prospect's email address. This is the mechanism by which the system matches internal meeting records to external CRM records.

**Why this priority**: Email-based lookup is the bridge between the meeting data and the CRM record. Without it, the system cannot determine which lead to update.

**Independent Test**: Can be tested by providing an email known to exist in the CRM and verifying the correct lead record is returned, and by providing an unknown email to verify a null/not-found result.

**Acceptance Scenarios**:

1. **Given** a valid prospect email that exists as a lead in Zoho CRM, **When** the system searches for the lead, **Then** it returns the matching lead record.
2. **Given** an email that does not match any lead in Zoho CRM, **When** the system searches for the lead, **Then** it returns a not-found result (not an error).
3. **Given** an empty or malformed email, **When** the system attempts a lookup, **Then** it rejects the request before making any API call.

---

### User Story 4 - Reliable Approve Feedback & CRM Confirmation Screen (Priority: P2)

A sales team member clicks "Approve" and needs clear, uninterrupted feedback about what's happening: a stable toast that doesn't jump around, a visible in-progress indicator while the write is happening, and — once it succeeds — an automatic landing on a confirmation screen that shows only real, captured information about the meeting. If they reopen an already-saved meeting later, the prospect email (the one field that was ever editable) is locked, since the CRM write already happened against it.

**Why this priority**: This doesn't change what data reaches Zoho (User Story 1 already does that correctly) — it fixes trust and clarity in the experience around that write, so users aren't left wondering whether Approve worked or whether they're looking at real data.

**Independent Test**: Can be tested by clicking Approve and observing the toast, the loading indicator, the resulting confirmation screen's content, and by reopening a saved meeting to confirm the email field is locked.

**Acceptance Scenarios**:

1. **Given** any Approve outcome (lead not found, API unreachable, or a successful write), **When** the resulting toast appears, **Then** it displays in its final on-screen position immediately, with no visible shift or jump afterward.
2. **Given** the user clicks "Approve", **When** the CRM write is in progress, **Then** a full-viewport overlay appears showing only a rotating spinner in the same green used for the "HOT" band indicator — no text — and the user cannot interact with anything underneath it (including by clicking outside the spinner) until the write finishes.
3. **Given** the CRM write completes successfully, **When** the overlay is dismissed, **Then** the system automatically navigates to the CRM confirmation screen showing the just-saved record.
4. **Given** the CRM write fails, **When** the overlay is dismissed, **Then** the user remains on the Review screen and sees the failure toast (per User Story 1) — there is no automatic navigation on failure.
5. **Given** a meeting shown on the CRM confirmation screen, **When** the user views it, **Then** the heading shows the meeting's title (not a company name placeholder), only the lead-score band indicator is shown (no separate "Saved to CRM" badge), and the contact line shows the contact's name and email only — no job-title placeholder, since the system does not capture a contact's job title.
6. **Given** a meeting that has already been saved to CRM, **When** the user reopens it in Review mode (e.g., via "Open in Review" from the confirmation screen), **Then** the prospect email field is disabled and cannot be edited.
7. **Given** a meeting still in draft (not yet saved to CRM), **When** the user views it in Review mode, **Then** the prospect email field remains fully editable, unaffected by the disabling behavior in Scenario 6.

---

### Edge Cases

- What happens when the Zoho API rate limit is exceeded during a CRM write?
- How does the system behave when the access token refresh itself fails due to network issues?
- What happens when the lead exists but a CRM module field rejects the value (invalid picklist value, workflow rule, etc.)? Resolved by FR-014: Zoho's per-record `status`/`code` is inspected even on an HTTP 200 response — a rejected field write is treated as a failure, the transcript's status stays `draft`, and a safe error is returned.
- What happens when the prospect email matches multiple leads in Zoho CRM?
- What happens when the meeting data contains fields that exceed Zoho's character limits?
- What happens when the AI-extracted prospect email is missing or incorrect? The user corrects it directly in the Review screen's email field before clicking Approve; the correction is persisted before the CRM lookup runs, so the lookup always uses the corrected value.
- What happens if the user clicks "Approve" a second time after a failed attempt? Since the transcript status remains `draft` on failure, the retry re-runs the full flow (token check → lead search → update) with no special-cased retry logic needed.
- What happens if the user tries to click "Approve" again (or anywhere else) while the loading overlay is showing? The overlay blocks all interaction with the page underneath it, so a duplicate submission cannot be triggered.
- What happens if a meeting's title is empty when shown on the CRM confirmation screen? It falls back to a generic label (consistent with the existing "Untitled meeting" fallback used elsewhere in the Review screen), rather than showing nothing or the old "Unnamed company" placeholder.
- What happens if the contact's name was never captured for a saved meeting? The contact line falls back the same way the email field already does when missing, rather than showing broken or empty text.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated integration layer for Zoho CRM API communication, isolated under `integrations/zoho`, with its own types and error handling.
- **FR-002**: System MUST validate and refresh the Zoho access token before every API call by checking the token's creation time against a 10-minute expiry window, using the stored refresh token to obtain a new access token when expired.
- **FR-003**: System MUST persist Zoho access tokens in the existing `zohocredentials` MongoDB collection, storing the token value and its creation/expiry timestamp.
- **FR-004**: System MUST provide a function to search for a lead in Zoho CRM by email address, returning the lead record or a not-found result.
- **FR-005**: System MUST provide a function to update a lead record in Zoho CRM with meeting data, using the Zoho record ID obtained from the email lookup.
- **FR-006**: System MUST expose a server action that collects all meeting data from the Review screen (summary, score, what was heard, what was discussed, signals detected, action items, meeting title, attendees) and orchestrates the CRM write.
- **FR-007**: System MUST register the required Zoho environment variables (refresh token, client ID, client secret, token generation URL, CRM API base URL) in the environment validation schema so missing variables crash the process at startup. (Note, 2026-07-30: `ZOHO_ORGANIZATION_ID` was removed — it was never referenced by any Zoho CRM v7 REST call the integration makes, and requiring an unused credential violated the no-dead-code principle.)
- **FR-008**: System MUST use the real Zoho CRM Leads module field API Names configured in `ZOHO_CRM_FIELD_MAP` (`src/constants/zoho-field-map.ts`) — `Meeting_Title`, `Meeting_Band`, `Meeting_Score`, `Meeting_Summary`, `What_We_Heard`, `Detected_Signals`, `What_Was_Covered`, `What_Was_Decided`, `Action_Items` — as provided by the user (2026-07-30), superseding the earlier placeholder names. Only these nine fields are sent to Zoho; no other fields (e.g., a separate rationale or attendees field) are written.
- **FR-009**: System MUST never expose internal Zoho API error details, stack traces, or token values to the end user.
- **FR-010**: System MUST log all Zoho API interactions (token refresh, lead search, lead update) with sufficient context for debugging, excluding sensitive data (tokens, credentials).
- **FR-011**: The Review screen MUST be read-only after AI summary generation, with exactly one exception: the prospect email field remains editable so the user can correct an AI extraction error before Approve. No other field may be edited. Once a transcript's status is `saved`, no further Approve/Reject actions are available for it (no "update CRM" re-push).
- **FR-012**: System MUST persist the transcript's status as `saved` only after the Zoho CRM update succeeds. If the CRM write fails for any reason, the transcript's status MUST remain `draft`, unchanged, so the user can retry Approve without data loss.
- **FR-013**: The server action orchestrating the CRM write MUST access transcript data exclusively through the existing repository layer (`transcriptRepository`), never through direct Mongoose model calls, per the repository-layer principle.
- **FR-014**: The lead-update function MUST inspect Zoho's per-record response (`data[0].status`/`code`), not just the HTTP status. Zoho can return HTTP 200 with a per-record `status: "error"` for validation failures (invalid picklist value, workflow rule rejection, etc.) — this MUST be treated as a failed write (transcript status stays `draft`, error returned), never as a silent success.
- **FR-015**: The `Detected_Signals` CRM field MUST group signals under a heading per band (`HOT`, `WARM`, `COLD`) using each signal's current weight from the active scoring rubric, listing every detected signal under its band's heading. Bands with no signals are omitted. `Meeting_Title` and `Meeting_Summary` are sent verbatim from the transcript's `title` and `summary.narrative` fields with no reformatting.
- **FR-016**: Toast notifications MUST appear in their final on-screen position at first paint, with no visible repositioning or jump after becoming visible, for every tone (success, failure, info).
- **FR-017**: System MUST display a full-viewport, non-dismissible loading overlay from the moment "Approve" is clicked until the CRM write operation (`commitToCrm`) resolves, whether it succeeds or fails. The overlay MUST show only a rotating spinner in the same color used for the "HOT" lead-score band indicator — no text or other content. While shown, the overlay MUST block all interaction with the underlying page, including clicks outside the spinner.
- **FR-018**: On a successful CRM write, system MUST automatically navigate the user to the CRM confirmation screen after the loading overlay is dismissed. On a failed write, system MUST dismiss the overlay and keep the user on the Review screen, showing the failure toast — no automatic navigation on failure.
- **FR-019**: The CRM confirmation screen MUST display the meeting's title as its heading (not a company name), MUST show only the lead-score band indicator (no separate "Saved to CRM" status badge), and MUST show the contact's name and email only in the contact line — no job-title field, since the system does not capture one. Any part of the contact line the system has no value for (currently: name, since it is never captured) MUST be omitted entirely, not shown as a placeholder dash — the line falls back to a single `—` only when every part is empty.
- **FR-020**: When a meeting whose status is `saved` is viewed on the Review screen, the prospect email field MUST be disabled (non-editable). When a meeting's status is `draft`, the prospect email field MUST remain fully editable, unaffected by the disabled state used for saved meetings.

### Key Entities

- **Zoho Credential**: The stored access token along with its expiry timestamp, persisted in MongoDB and refreshed automatically when expired.
- **CRM Lead**: A record in Zoho CRM's Leads module, identified by email, to which meeting data is appended.
- **Meeting Data Payload**: The structured collection of meeting information (summary, score, signals, action items, attendees, topics, decisions) mapped to Zoho CRM field API Names for the update.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can approve a meeting and have all meeting data written to the matching CRM lead record in under 5 seconds (excluding network latency to Zoho).
- **SC-002**: Token refresh happens transparently — users never see authentication errors or need to take manual action to re-authenticate.
- **SC-003**: 100% of CRM writes that fail due to API errors surface a user-friendly error message with a retry option.
- **SC-004**: All Zoho API calls are routed through the integration layer — zero direct Zoho HTTP calls exist outside `integrations/zoho`.
- **SC-005**: The integration layer can be adapted to production Zoho CRM field API Names by changing only field name constants, with no structural code changes required.
- **SC-006**: 100% of Approve-triggered toasts appear in their final position with zero visible repositioning, across both success and failure outcomes.
- **SC-007**: Users always see an unambiguous in-progress indicator between clicking Approve and the operation's outcome becoming visible (either the confirmation screen or an error toast) — no silent gap where the outcome is unknown.
- **SC-008**: Zero duplicate CRM write attempts are possible from repeated user interaction while a write is already in progress.
- **SC-009**: The CRM confirmation screen never displays a fabricated or placeholder value for data the system does not actually capture.

## Assumptions

- The Zoho CRM is already configured and operational in the development environment with an active organization, client credentials, and refresh token (the organization ID itself is not required by the integration — no Zoho CRM v7 REST call in this feature needs it).
- The `zohocredentials` MongoDB collection already exists (used by the reference KX application) and follows the same single-document pattern for token storage.
- The "Leads" module in Zoho CRM is the target module; contacts and other modules are out of scope for this feature.
- Zoho CRM field API Names are the real names configured in `ZOHO_CRM_FIELD_MAP` (see FR-008) — no longer placeholders as of 2026-07-30.
- Email is the unique identifier used to match a prospect in the sales tool to a lead in Zoho CRM.
- The Review screen now surfaces all necessary meeting data (summary, score, signals, action items, attendees, etc.) via the completed AI summarization pipeline, and the "Approve" button triggers the CRM write flow. The screen is read-only except for the prospect email field, which the user can correct before approving.
- The Zoho API uses v7 endpoints (the current stable version); the reference KX repository uses v8, but v7 covers the lead search and update operations needed here.
- Only one lead is expected per email; if multiple leads share an email, the system uses the first match returned by Zoho.
- The system does not currently capture a contact's company or job title — the CRM confirmation screen shows only data the system actually has (meeting title, band, contact name, email), not placeholders for uncaptured fields.
- "Saved" and "draft" are the only two transcript statuses relevant to whether the prospect email field is editable; the `processing`/`failed` AI-processing states are unrelated to this and out of scope for User Story 4.
