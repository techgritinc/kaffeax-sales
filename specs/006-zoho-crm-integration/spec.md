# Feature Specification: Zoho CRM Integration

**Feature Branch**: `feat/tae-86-zoho-crm-api-client-setup`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Create a repository layer for Zoho CRM API calls isolated under integrations/zoho. When users click 'Approve' on the Review screen, a server action collects meeting data (Summary, Score, Signals, Action Items, etc.) and writes it to the matching CRM lead record via email lookup."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Approve Meeting and Push to CRM (Priority: P1)

A sales team member reviews an AI-generated meeting summary on the Review screen. They verify the summary, score, signals detected, and action items are accurate. They click the "Approve" button, and the system automatically finds the matching lead in Zoho CRM by prospect email and appends the meeting data (summary, score, what was heard, what was discussed, signals detected, action items, meeting title, attendees) to that CRM record.

**Why this priority**: This is the core value proposition — automating the transfer of meeting intelligence from the sales tool into the CRM, eliminating manual data entry and ensuring CRM records stay current.

**Independent Test**: Can be fully tested by approving a meeting on the Review screen and verifying the data appears on the matching lead record in Zoho CRM. Delivers immediate value by removing manual CRM data entry for every meeting.

**Acceptance Scenarios**:

1. **Given** a reviewed meeting with a valid prospect email, **When** the user clicks "Approve", **Then** the system looks up the lead by email in Zoho CRM and appends the meeting data to the matching record.
2. **Given** a reviewed meeting where the prospect email does not match any lead in Zoho CRM, **When** the user clicks "Approve", **Then** the system displays a clear error message indicating the lead was not found, and no data is written.
3. **Given** a reviewed meeting with a valid prospect email, **When** the user clicks "Approve" but the Zoho API is unreachable, **Then** the system displays an error message and the user can retry the action.

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

### Edge Cases

- What happens when the Zoho API rate limit is exceeded during a CRM write?
- How does the system behave when the access token refresh itself fails due to network issues?
- What happens when the lead exists but the CRM module fields (API Names) have not yet been created — does the update fail gracefully?
- What happens when the prospect email matches multiple leads in Zoho CRM?
- What happens when the meeting data contains fields that exceed Zoho's character limits?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated integration layer for Zoho CRM API communication, isolated under `integrations/zoho`, with its own types and error handling.
- **FR-002**: System MUST validate and refresh the Zoho access token before every API call by checking the token's creation time against a 10-minute expiry window, using the stored refresh token to obtain a new access token when expired.
- **FR-003**: System MUST persist Zoho access tokens in the existing `zohocredentials` MongoDB collection, storing the token value and its creation/expiry timestamp.
- **FR-004**: System MUST provide a function to search for a lead in Zoho CRM by email address, returning the lead record or a not-found result.
- **FR-005**: System MUST provide a function to update a lead record in Zoho CRM with meeting data, using the Zoho record ID obtained from the email lookup.
- **FR-006**: System MUST expose a server action that collects all meeting data from the Review screen (summary, score, what was heard, what was discussed, signals detected, action items, meeting title, attendees) and orchestrates the CRM write.
- **FR-007**: System MUST register the required Zoho environment variables (organization ID, refresh token, client ID, client secret, token generation URL) in the environment validation schema so missing variables crash the process at startup.
- **FR-008**: System MUST use placeholder API Names for CRM module fields, clearly documented so they can be swapped for real API Names once the fields are created in Zoho.
- **FR-009**: System MUST never expose internal Zoho API error details, stack traces, or token values to the end user.
- **FR-010**: System MUST log all Zoho API interactions (token refresh, lead search, lead update) with sufficient context for debugging, excluding sensitive data (tokens, credentials).

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

## Assumptions

- The Zoho CRM is already configured and operational in the development environment with an active organization, client credentials, and refresh token.
- The `zohocredentials` MongoDB collection already exists (used by the reference KX application) and follows the same single-document pattern for token storage.
- The "Leads" module in Zoho CRM is the target module; contacts and other modules are out of scope for this feature.
- Zoho CRM field API Names are placeholders for now — the actual field names will be provided by the user after creating the custom fields in Zoho.
- Email is the unique identifier used to match a prospect in the sales tool to a lead in Zoho CRM.
- The Review screen already surfaces all necessary meeting data (summary, score, signals, action items, attendees, etc.) and the "Approve" button triggers the CRM write flow.
- The Zoho API uses v8 endpoints, consistent with the reference KX repository.
- Only one lead is expected per email; if multiple leads share an email, the system uses the first match returned by Zoho.
