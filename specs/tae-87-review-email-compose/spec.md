# Feature Specification: Review Email Compose

**Feature Branch**: `tae-87-review-email-compose`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "Email button on the Review screen that opens the Outlook desktop app with a pre-generated subject line and rich-formatted body containing all review summary sections (Summary, What We Heard, Signals Detected, What Was Discussed, What Was Covered, Action Items) with styling fidelity. Recipients are added manually by the sender."

## Clarifications

### Session 2026-08-03

- Q: Should the email body require any manual steps (clipboard copy/paste) to populate? → A: No. Both subject and body MUST be automatically pre-filled in the compose window when it opens. Zero manual content transfer steps.
- Q: Should the email include the lead score and band (HOT/WARM/COLD, numeric score)? → A: No. Lead score and band are internal sales metrics and MUST NOT appear in the email body.
- Q: Should the flow include any intermediate UX (toast notifications, visible file downloads)? → A: No. Clicking Email MUST directly open the mail client compose window with pre-filled content. No toast notifications, no visible file downloads, no intermediate steps. A single-action, straight-forward flow.
- Q: Given that direct open (mailto) only supports plain text, is well-structured plain text acceptable instead of HTML bold/styled formatting? → A: Yes. Direct single-click flow with structured plain text (uppercase headings, bullet characters, numbered lists) is the priority. Rich HTML formatting is not required.
- Q: When the email body is very long, is it acceptable to truncate list sections (e.g., cap "What Was Covered" at 5 items with a "[... and N more]" note) to keep the mailto URL short? → A: No. Zero data loss takes priority — every populated section MUST appear in full, regardless of how long the resulting mailto URL becomes. No truncation of any kind.
- Q: Should section headings keep a dash separator line beneath them (e.g., `WHAT WE HEARD` followed by `-------------`)? → A: No. Headings use uppercase text only, with no separator line, for a cleaner and more consistent layout across all sections.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rich Email Compose from Review (Priority: P1)

After reviewing an AI-generated meeting summary, a sales rep clicks the "Email" button on the Review screen. The desktop Outlook application opens directly with a new compose window containing a pre-filled subject line and a structured email body. The body contains all summary sections from the Review screen — narrative, signals heard, topics covered, decisions made, and action items — organized with clear headings and structured lists. The recipient fields are empty so the rep can choose who receives the recap. No intermediate steps (downloads, toasts, prompts) occur between clicking the button and the compose window appearing.

**Why this priority**: This is the entire feature — without the formatted email compose, there is no value delivered. Everything else is an edge case or refinement.

**Independent Test**: Can be fully tested by clicking the "Email" button on any Review screen that has a completed AI analysis, verifying that Outlook opens with the expected content and formatting.

**Acceptance Scenarios**:

1. **Given** a Review screen displaying a completed meeting summary with all sections populated, **When** the rep clicks the "Email" button, **Then** the desktop Outlook application opens a new compose window with the subject line and body both automatically pre-filled — the body containing all review sections with formatted headings and structured content, with no manual steps required to populate the content.
2. **Given** the Outlook compose window has opened with pre-filled content, **When** the rep inspects the email body, **Then** section headings (Summary, What We Heard, What Was Covered, What Was Decided, Action Items) are visually distinguished using plain-text conventions (e.g., uppercase), lists use bullet characters or numbering, and the content order matches the Review screen layout.
3. **Given** the Outlook compose window has opened, **When** the rep inspects the To, CC, and BCC fields, **Then** all recipient fields are empty and the rep can manually type or select recipients before sending.

---

### User Story 2 - Partial Data Handling (Priority: P2)

When a Review screen has some sections with no data (e.g., no decisions were made, or no action items exist), clicking "Email" still opens Outlook with the available sections formatted correctly. Empty sections are omitted from the email body rather than showing blank or placeholder content.

**Why this priority**: Real meetings often lack data in one or more sections. Graceful omission prevents the email from looking incomplete or broken.

**Independent Test**: Can be tested by clicking "Email" on a Review screen where at least one section (e.g., Decisions or Action Items) has no data, and verifying the email body excludes those sections cleanly.

**Acceptance Scenarios**:

1. **Given** a Review screen where "What Was Decided" has no entries, **When** the rep clicks "Email", **Then** the email body omits the "What Was Decided" section entirely and the remaining sections flow together without gaps or orphaned headings.
2. **Given** a Review screen where only the Summary narrative is populated and all other sections are empty, **When** the rep clicks "Email", **Then** the email body contains only the greeting and narrative paragraph with no empty section stubs.

---

### User Story 3 - Subject Line Generation (Priority: P3)

The email subject line is automatically generated from the meeting title so the recipient immediately understands the context. The subject follows a consistent format that identifies the email as a meeting follow-up.

**Why this priority**: A meaningful subject line improves open rates and searchability, but the rep can always edit it in Outlook before sending.

**Independent Test**: Can be tested by clicking "Email" and verifying the subject line in the Outlook compose window matches the expected format derived from the meeting title.

**Acceptance Scenarios**:

1. **Given** a Review screen for a meeting titled "Platform Demo with Acme Corp", **When** the rep clicks "Email", **Then** the Outlook compose window subject line reads "Meeting Follow-Up: Platform Demo with Acme Corp".
2. **Given** a Review screen for a meeting with a long title, **When** the rep clicks "Email", **Then** the subject line contains the full meeting title without truncation.

---

### Edge Cases

- What happens when the email body content is extremely long (many signals, many action items)? The content MUST still be included in full, with no truncation, even if the resulting mailto URL becomes very long; the rep can edit before sending.
- What happens when the user's system has no default mail client configured? The system should attempt to open the compose window; if it fails, the behavior is determined by the operating system's default handling.
- What happens when special characters (quotes, ampersands, angle brackets) appear in the meeting data? All content must be properly encoded to prevent corruption of the email content or formatting.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST open the desktop Outlook application (or default mail client) in compose mode when the user clicks the "Email" button on the Review screen.
- **FR-002**: System MUST pre-fill the email subject line using the format "Meeting Follow-Up: [meeting title]" where the meeting title is taken from the current review's summary data.
- **FR-003**: System MUST automatically pre-fill the email body with all populated sections from the Review screen in the following order: greeting, Summary (narrative), What We Heard (detected signals), What Was Covered (topics), What Was Decided (decisions), Action Items (next steps and commitments). The body content MUST appear in the compose window immediately when it opens — no manual clipboard, paste, or content transfer steps are permitted.
- **FR-004**: System MUST visually distinguish section headings in the email body using plain-text formatting conventions (e.g., uppercase headings) to create clear visual hierarchy in the compose window. Headings MUST NOT include a separator line beneath them.
- **FR-005**: System MUST render list-based sections (topics, decisions, action items) as sequentially numbered plain-text lists, not as comma-separated text. Detected signals within "What We Heard" are grouped by weight (Hot/Warm/Cold) and rendered as indented bullet items under each weight label.
- **FR-006**: System MUST leave all recipient fields (To, CC, BCC) empty so the sender manually selects recipients.
- **FR-007**: System MUST omit any section from the email body where the underlying data is empty, rather than showing an empty heading or placeholder text.
- **FR-008**: System MUST include the signal weight category (Hot, Warm, Cold) alongside each detected signal in the "What We Heard" section of the email body.
- **FR-009**: System MUST include the owner and due date (or "TBD" if absent) for each action item in the email body.
- **FR-010**: System MUST properly encode all content to prevent special characters from breaking the email formatting or structure.
- **FR-011**: System MUST include a professional greeting at the top of the email body and a sign-off at the bottom.
- **FR-012**: The flow MUST be a single direct action: click the Email button → mail client compose window opens with subject and body pre-filled. No intermediate steps of any kind are acceptable — no toast notifications, no visible file downloads, no clipboard prompts, no paste instructions, no browser download bars. The user's only action is clicking the button; the next thing they see is the compose window ready to add recipients.
- **FR-013**: System MUST NOT include the lead score, band classification (HOT/WARM/COLD), or numeric score in the email body. These are internal sales metrics not intended for external recipients.
- **FR-014**: System MUST NOT truncate, cap, or omit any populated list item for length reasons. All entries in every populated section MUST appear in full, regardless of the resulting mailto URL length.

### Key Entities

- **Meeting Summary**: The AI-generated analysis containing the narrative, attendees, topics, decisions, next steps, and commitments displayed on the Review screen.
- **Detected Signals**: Categorized buyer signals (Hot/Warm/Cold) with labels and evidence, displayed in the "What We Heard" section.
- **Action Items**: Combined list of next steps (with owner and due date) and commitments (with side attribution) from the meeting.
- **Recap Email**: The pre-composed email content (subject and formatted body) generated from the review data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Email button clicks on a Review screen with a completed analysis result in the mail client opening a compose window with pre-filled content.
- **SC-002**: Email body content matches the Review screen data with zero data loss — every populated section's content appears in the email in full, with no truncation, regardless of the resulting message length.
- **SC-003**: Section headings in the email body are visually distinguished (using uppercase plain-text conventions) when viewed in the Outlook compose window, creating clear hierarchy that mirrors the Review screen structure.
- **SC-004**: Sales reps can send the pre-composed email within 30 seconds of clicking the Email button (time to add recipients and hit Send), compared to manually composing the same content.
- **SC-005**: Empty sections produce no visual artifacts (no orphaned headings, no blank lines where a section would be) in the email body.

## Assumptions

- The user's workstation has a desktop email client (Outlook or compatible) installed and configured as the default mail handler.
- The Review screen already has a completed AI analysis with at least the Summary narrative populated before the Email button is actionable.
- The email body uses plain-text formatting (uppercase headings with no separator line, numbered lists for topics/decisions/action items, indented bullets for signal sub-groups) which is universally compatible with all email clients.
- The existing Email button on the Review screen is the entry point — no new UI elements are needed beyond enhancing the button's behavior.
- The greeting uses a generic salutation (e.g., "Hi,") since the recipient is unknown at compose time (the sender adds recipients manually).
- The sign-off includes the sender's name derived from the KaffaX-side attendee in the meeting data.
