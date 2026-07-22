# Feature Specification: Layout & Spacing Pixel Parity (Header, Review Screen, Chat/FAQ)

**Feature Branch**: `004-layout-spacing-parity`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Several areas where the Next.js application does not match the HTML prototype — layout properties such as width, min-width, spacing, padding, margins, and alignment. The implementation should be a pixel-perfect replica of the HTML prototype. Specific areas: (1) Header — extra spacing/padding around the header section causing a visible gap; (2) Review screen Email Capture — too much space between the email icon and the starred input field; (3) Follow-up 'Ask about this lead' card — the space between the accent bar and the content is larger than the prototype; (4) Chat Panel / Review sections 'What We Heard', 'What Was Covered', 'What Was Decided', and 'Actions' — differences in spacing, margins, padding, or alignment; (5) Meeting Summary section — width, spacing, and alignment differences, with the Chat/FAQ panel possibly affecting the layout."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Header matches the prototype exactly (Priority: P1)

A user on any screen sees the application header rendered with the same width, height, padding, and internal spacing as the prototype — with no extra spacing or padding creating a visible gap around the header.

**Why this priority**: The header is present on every screen of the application, so any spacing or gap defect there is the most frequently seen and most visually prominent inconsistency. It frames every other screen.

**Independent Test**: Place the app and the prototype side by side at the same viewport width and confirm the header bar's outer dimensions, internal padding, and the spacing between its elements overlay without a visible gap or offset.

**Acceptance Scenarios**:

1. **Given** the header is displayed at desktop width, **When** compared against the prototype's header, **Then** the header's height, horizontal/vertical padding, and outer margins match exactly, with no extra gap above, below, or beside it.
2. **Given** the header contains its logo, navigation/step elements, and any right-aligned controls, **When** compared against the prototype, **Then** the spacing and alignment between those elements match exactly.
3. **Given** the viewport is narrowed to the tablet and mobile breakpoints, **When** compared against the prototype, **Then** the header's padding and spacing match the prototype at each breakpoint.

---

### User Story 2 - Meeting Summary section matches the prototype exactly (Priority: P1)

A user on the Review screen sees the Meeting Summary section at the same content width, spacing, and alignment as the prototype, and the presence or absence of the Chat/FAQ panel changes the layout only in the way the prototype does — with no unexpected width reduction, misalignment, or layout shift.

**Why this priority**: The Meeting Summary is the primary content of the Review screen. A width or alignment defect — especially one caused by the Chat/FAQ panel — visibly degrades the most important screen in the workflow and was explicitly called out.

**Independent Test**: Open the Review screen next to the prototype with the Chat/FAQ panel both visible and collapsed; confirm the Meeting Summary's content width, spacing, and alignment match the prototype in each chat state and at each breakpoint.

**Acceptance Scenarios**:

1. **Given** the Review screen with the Chat/FAQ panel visible, **When** compared against the prototype in the same chat state, **Then** the Meeting Summary content width, internal spacing, and alignment match the prototype exactly.
2. **Given** the Review screen with the Chat/FAQ panel collapsed, **When** compared against the prototype in the same chat state, **Then** the Meeting Summary reflows to the prototype's width and layout with no visual state absent from the prototype.
3. **Given** the Chat/FAQ panel is toggled open or closed, **When** observed in the app, **Then** the Meeting Summary does not exhibit any width reduction, misalignment, or layout shift that the prototype does not exhibit.

---

### User Story 3 - Review content sections match the prototype exactly (Priority: P2)

A user reviewing a meeting sees the "What We Heard," "What Was Covered," "What Was Decided," and "Actions" sections with the same spacing, margins, padding, and alignment as the prototype.

**Why this priority**: These four sections make up the bulk of the Review screen's body. Collectively their spacing/alignment drift is highly visible, though each individual section is lower-traffic than the header or the summary.

**Independent Test**: Open the Review screen next to the prototype and compare each of the four sections' section heading spacing, inter-item spacing, card padding, column layout, and alignment against the corresponding prototype section.

**Acceptance Scenarios**:

1. **Given** the "What We Heard" section, **When** compared against the prototype, **Then** its heading spacing, grid/column layout, item spacing, padding, and alignment match exactly.
2. **Given** the "What Was Covered" and "What Was Decided" sections (shown side by side), **When** compared against the prototype, **Then** the two-column layout, gap between columns, list item spacing, and padding match exactly.
3. **Given** the "Actions" section, **When** compared against the prototype, **Then** its heading spacing, row layout, item spacing, and alignment match exactly.
4. **Given** each section at the tablet and mobile breakpoints, **When** compared against the prototype, **Then** the responsive spacing and column collapse match the prototype at each breakpoint.

---

### User Story 4 - Review email-capture field matches the prototype exactly (Priority: P2)

A user viewing the prospect email field on the Review screen sees the spacing between the email icon and the required ("starred") input field match the prototype — not wider than intended.

**Why this priority**: The email-capture field is a small but explicitly-reported spacing defect on the Review screen. It is a contained, verifiable fix.

**Independent Test**: Locate the email field (email icon + required input) on the Review screen, compare it against the prototype's equivalent field, and confirm the gap between the icon and the input, and the field's overall padding/alignment, match exactly.

**Acceptance Scenarios**:

1. **Given** the email-capture field, **When** compared against the prototype, **Then** the horizontal spacing between the email icon and the input field matches exactly.
2. **Given** the email-capture field, **When** compared against the prototype, **Then** the field's internal padding, the required-field ("starred") marker position, and the vertical alignment of the icon to the input match exactly.

---

### User Story 5 - Follow-up card accent-bar spacing matches the prototype exactly (Priority: P3)

A user viewing the "Ask about this lead" Follow-up card sees the space between the accent bar and the content below it match the prototype — not larger than the original design.

**Why this priority**: This is a single, contained spacing correction on one card. It is lower-traffic than the other areas but was explicitly reported and is quick to verify.

**Independent Test**: Open the Follow-up "Ask about this lead" card next to the prototype and confirm the vertical gap between the accent bar and the content directly beneath it matches exactly.

**Acceptance Scenarios**:

1. **Given** the "Ask about this lead" card, **When** compared against the prototype, **Then** the vertical spacing between the accent bar and the content below it matches exactly (neither larger nor smaller).
2. **Given** the same card at the mobile breakpoint (where the Chat/FAQ panel becomes a full-screen takeover), **When** compared against the prototype, **Then** the accent-bar-to-content spacing still matches.

### Edge Cases

- What happens to the header spacing when the sidebar is collapsed to its rail state or hidden entirely? The header must still match the prototype's spacing in each shell state.
- How does the Meeting Summary reflow at viewport widths between named breakpoints (mid-resize)? The transition must not introduce a width or alignment state absent from the prototype.
- What happens to the review content sections when a section is empty (no items heard, no decisions, no actions)? The empty-state spacing and alignment must match the prototype's empty-state treatment.
- How does the email-capture field behave when the input holds a long email address that approaches or exceeds the field width? Truncation/overflow behavior must match the prototype.
- How do the two-column "Covered"/"Decided" sections behave when one column is much taller than the other? Column alignment and spacing must match the prototype.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application header MUST match the prototype in width, height, outer margins, internal padding, and the spacing/alignment of its contents, with no extra spacing or padding that creates a visible gap around the header, at every supported viewport width and in every shell state (sidebar expanded, rail, or hidden).
- **FR-002**: The Review screen Meeting Summary section MUST match the prototype's content width, internal spacing, and alignment in every Chat/FAQ panel state (visible and collapsed) at every supported breakpoint.
- **FR-003**: Toggling the Chat/FAQ panel MUST change the Meeting Summary's available width and layout only in the manner the prototype does; it MUST NOT introduce any width reduction, misalignment, or layout shift absent from the prototype.
- **FR-004**: The "What We Heard," "What Was Covered," "What Was Decided," and "Actions" sections MUST match the prototype in heading spacing, inter-item spacing, padding, margins, column/grid layout, and alignment, at every supported breakpoint.
- **FR-005**: The Review screen email-capture field MUST match the prototype in the spacing between the email icon and the input field, the field's internal padding, the required-field ("starred") marker position, and the icon-to-input vertical alignment.
- **FR-006**: The "Ask about this lead" Follow-up card MUST match the prototype in the vertical spacing between the accent bar and the content directly below it.
- **FR-007**: Every layout change made under this feature MUST use the project's existing design tokens and utilities rather than introducing hardcoded values, and MUST NOT regress any element already brought to parity under feature `003-fix-ui-pixel-parity`.
- **FR-008**: Any layout, width, spacing, padding, margin, or alignment difference identified during review of the areas above MUST be corrected before the feature is considered complete; no known discrepancy in these areas may remain undocumented.

### Key Entities

- **Screen/View**: One of the application's distinct screens (capture, processing, review, commit, library) that has a corresponding reference view in the HTML prototype used as the comparison baseline. This feature focuses on the shared header (all screens) and the Review screen.
- **Chat/FAQ Panel**: A collapsible side panel (a full-screen takeover at the mobile breakpoint in the prototype) whose visible/collapsed state governs the available content width of the main section beside it — here, the Meeting Summary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Side-by-side visual comparison of the header, at every supported viewport width and shell state, shows zero perceptible differences in dimensions, padding, spacing, or alignment, with no visible gap around the header.
- **SC-002**: Side-by-side visual comparison of the Meeting Summary section, with the Chat/FAQ panel both visible and collapsed, shows zero perceptible differences in width, spacing, or alignment, and toggling the Chat/FAQ panel produces no layout shift absent from the prototype.
- **SC-003**: Side-by-side visual comparison of the "What We Heard," "What Was Covered," "What Was Decided," and "Actions" sections shows zero perceptible differences in spacing, margins, padding, or alignment.
- **SC-004**: Side-by-side visual comparison of the Review email-capture field shows zero perceptible difference in the icon-to-input spacing, padding, and alignment.
- **SC-005**: Side-by-side visual comparison of the "Ask about this lead" Follow-up card shows zero perceptible difference in the accent-bar-to-content spacing.
- **SC-006**: No element previously brought to parity under `003-fix-ui-pixel-parity` regresses as a result of the changes in this feature.

## Assumptions

- `Design/POC_Kaffea-X_Prototype.html` remains the single, unchanged source of truth for all visual comparisons during this effort.
- "Pixel-perfect" is evaluated by side-by-side visual comparison at the application's supported viewport widths (desktop, tablet, and mobile breakpoints already defined in the prototype), not by automated pixel-diffing tooling, since no such tooling currently exists in the project.
- This feature builds on the completed `003-fix-ui-pixel-parity` work. Where a reported area overlaps with a fix already made in 003 (notably the Meeting Summary + Chat/FAQ layout and the Follow-up accent bar), the residual difference described here is treated as a new, still-open discrepancy — either a spacing rule not yet addressed or one noticed only on closer comparison — and is corrected against the prototype rule the same way.
- The set of screens in scope is the shared header (all screens) plus the Review screen; no new screens are introduced.
- The "email-capture field" refers to the prospect email input with its leading email icon and required ("starred") marker as rendered on the Review screen; whichever component renders it is the target, and the prototype's equivalent field is the comparison baseline.
