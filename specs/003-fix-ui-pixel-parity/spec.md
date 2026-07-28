# Feature Specification: Pixel-Perfect UI Parity with HTML Prototype

**Feature Branch**: `003-fix-ui-pixel-parity`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Review and Fix Pixel-Level UI Differences Between HTML Prototype and Next.js Application — the sidebar, the Draft/Saved to CRM chips, and the accent bar all deviate from `Design/POC_Kaffea-X_Prototype.html`; additionally the Capture screen's transcript section (Start button icons appear too large), the Scoring Rubric modal, the Review screen's Meeting Summary section, and the CRM screen's Write to CRM section must be brought to pixel-perfect parity, including verifying the Chat/FAQ panel does not alter available content width or cause layout shifts. Every screen must be reviewed and brought to pixel-perfect parity across layout, spacing, typography, color, sizing, icons, responsiveness, and interactive behavior."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sidebar matches the prototype exactly (Priority: P1)

A user browsing the meeting library sidebar sees a layout, spacing, and set of status indicators that are visually identical to the HTML prototype — including the "Drafts" / "Saved to CRM" grouping, item spacing, and the small status indicator on each meeting row.

**Why this priority**: The sidebar is the primary navigation surface visible on every screen of the app. It was explicitly called out as broken, and any deviation here is the most visible and most frequently encountered inconsistency.

**Independent Test**: Open the meeting library with a mix of draft and committed meetings, place the prototype and the app side by side at the same viewport width, and confirm the sidebar's structure, spacing, and status indicators overlay without visible difference.

**Acceptance Scenarios**:

1. **Given** the sidebar is showing meetings in both the "Drafts" and "Saved to CRM" groups, **When** compared against the prototype at the same viewport size, **Then** group headers, item counts, item rows, and spacing between elements match the prototype exactly.
2. **Given** a meeting row that has not yet been committed to CRM, **When** viewed in the app, **Then** its status indicator matches the prototype's "Draft" indicator in label, color, padding, and position.
3. **Given** a meeting row that has been committed to CRM, **When** viewed in the app, **Then** its status indicator matches the prototype's "Saved to CRM" indicator in label, color, padding, and position.
4. **Given** the sidebar is collapsed or the viewport is narrowed below the mobile breakpoint, **When** the sidebar opens as an overlay/drawer, **Then** its behavior and appearance match the prototype's responsive sidebar treatment.

---

### User Story 2 - Draft and Saved to CRM chips match the prototype exactly (Priority: P2)

A user viewing any meeting record — in the sidebar, on the review screen, or on the commit screen — sees the "Draft" and "Saved to CRM" status chips rendered with the same padding, margins, alignment, and spacing as the prototype, wherever they appear.

**Why this priority**: These chips appear in multiple places across the app (sidebar rows, review, commit) and were specifically flagged as inconsistent. Fixing them as a single, consistently-styled element prevents the same mismatch from recurring in more than one place.

**Independent Test**: Locate every screen where a "Draft" or "Saved to CRM" chip appears, compare each occurrence against the corresponding prototype element, and confirm padding, margin, alignment, and spacing match in every location.

**Acceptance Scenarios**:

1. **Given** a "Draft" chip rendered anywhere in the app, **When** measured against the prototype's equivalent element, **Then** internal padding, outer margin, corner rounding, and text alignment match exactly.
2. **Given** a "Saved to CRM" chip rendered anywhere in the app, **When** measured against the prototype's equivalent element, **Then** internal padding, outer margin, corner rounding, and text alignment match exactly.
3. **Given** both chip types appear near each other (e.g., in a list), **When** viewed in the app, **Then** the spacing between chips and surrounding content matches the prototype.

---

### User Story 3 - Accent bar matches the prototype exactly (Priority: P3)

A user viewing any screen heading decorated with an accent bar sees a bar with the same color, thickness, length, and position as the corresponding accent bar in the prototype.

**Why this priority**: The accent bar is a recurring visual/branding element used to mark section headings throughout the app. It is lower-traffic than the sidebar or the chips but still visible on most screens, and correcting it removes another explicitly-reported inconsistency.

**Independent Test**: Identify every heading in the app that uses an accent bar, compare each against its corresponding prototype heading at the same viewport width, and confirm color, size, and placement match.

**Acceptance Scenarios**:

1. **Given** a primary (large) heading accent bar, **When** compared against the prototype's primary accent bar, **Then** color, height, width, and position relative to the heading text match exactly.
2. **Given** a secondary (small) heading accent bar, **When** compared against the prototype's secondary accent bar, **Then** color, height, width, and position relative to the heading text match exactly.
3. **Given** the viewport is resized to a smaller breakpoint where the prototype shrinks the accent bar, **When** viewed in the app, **Then** the accent bar resizes and repositions to match the prototype at that breakpoint.

---

### User Story 4 - Full application visual audit (Priority: P4)

A reviewer stepping through every screen of the application — capture, processing, review, commit, and library/sidebar — finds no visible difference from the prototype in layout, spacing, typography, color, component sizing, icons, responsiveness, or interactive states (hover, active, focus, disabled).

**Why this priority**: This is the comprehensive validation pass the request calls for. It depends on the more targeted fixes in US1–US3 being complete first, and catches any remaining inconsistency not already named.

**Independent Test**: Walk through each screen in the app at each supported viewport width, compare side-by-side against the matching prototype view, and log any visual difference found; the story is complete when no differences remain.

**Acceptance Scenarios**:

1. **Given** any screen in the application, **When** compared against its corresponding prototype view at desktop width, **Then** layout, spacing, typography, color, and component sizing match exactly.
2. **Given** any screen in the application, **When** compared against its corresponding prototype view at the supported mobile/tablet breakpoints, **Then** responsive behavior matches the prototype at each breakpoint.
3. **Given** an interactive element (button, chip, sidebar item, input) in a hover, active, focus, or disabled state, **When** compared against the prototype's equivalent state, **Then** the visual treatment matches exactly.

---

### User Story 5 - Capture screen transcript section matches the prototype exactly (Priority: P2)

A user on the Capture screen sees the transcript section — its heading, textarea, footer, and action buttons (including the "Start" control) — rendered identically to the prototype, with correctly sized icons inside the buttons.

**Why this priority**: The transcript section is the primary working area of the Capture screen, and its Start-button icons were explicitly reported as rendering larger than the prototype. This is a concrete, confirmed defect on a high-traffic screen.

**Independent Test**: Open the Capture screen next to the prototype's capture view at the same viewport width and confirm the transcript heading, textarea, footer, action-button dimensions, and the icons inside those buttons overlay without visible difference.

**Acceptance Scenarios**:

1. **Given** the "Start" button (and any sibling transcript action buttons) in the Capture transcript section, **When** compared against the prototype, **Then** the icon dimensions inside the button match the prototype exactly and do not appear enlarged.
2. **Given** the transcript action buttons, **When** compared against the prototype, **Then** button height, width, internal padding, corner rounding, icon-to-label spacing, and the gap between adjacent buttons match the prototype.
3. **Given** the transcript textarea and its footer, **When** compared against the prototype, **Then** width, min-width, height, padding, border, border-radius, and focus-state treatment match the prototype.
4. **Given** the full transcript section, **When** compared against the prototype at each supported breakpoint, **Then** spacing, alignment, and layout match the prototype.

---

### User Story 6 - Scoring Rubric modal matches the prototype exactly (Priority: P3)

A user who opens the Scoring Rubric on the Capture screen sees a modal/card whose width, alignment, spacing, padding, typography, and internal layout are identical to the prototype's rubric presentation.

**Why this priority**: The rubric drives the meeting score and is a distinct, self-contained surface that was explicitly called out for side-by-side comparison. It is lower-traffic than the transcript area but must match exactly where it appears.

**Independent Test**: Open the Scoring Rubric next to the prototype's rubric view and confirm the container width, header, section rows, counts, add-control, and typography overlay without visible difference.

**Acceptance Scenarios**:

1. **Given** the rubric container, **When** compared against the prototype, **Then** width, max-width, alignment, outer margins, and internal padding match exactly.
2. **Given** the rubric header, section rows, section labels, section counts, and add-control, **When** compared against the prototype, **Then** spacing, alignment, and sizing of each element match exactly.
3. **Given** all text within the rubric, **When** compared against the prototype, **Then** font size, weight, line height, and color match exactly.

---

### User Story 7 - Review screen Meeting Summary section matches the prototype exactly (Priority: P2)

A user on the Review screen sees the Meeting Summary section at the same content width, spacing, and alignment as the prototype, and the presence or absence of the Chat/FAQ panel changes the layout only in the way the prototype does — with no unexpected width reduction or layout shift.

**Why this priority**: The Meeting Summary is the main content of the Review screen, and a Chat/FAQ panel that steals width or shifts content would visibly break parity across the whole screen. This was explicitly flagged for investigation.

**Independent Test**: Open the Review screen next to the prototype's review view with the Chat/FAQ panel both visible and collapsed, and confirm the Meeting Summary's content width, hero block, narrative summary, and signal chips match the prototype in each chat state.

**Acceptance Scenarios**:

1. **Given** the Review screen with the Chat/FAQ panel visible, **When** compared against the prototype in the same chat state, **Then** the Meeting Summary content width, spacing, and alignment match the prototype exactly.
2. **Given** the Review screen with the Chat/FAQ panel collapsed, **When** compared against the prototype in the same chat state, **Then** the Meeting Summary reflows to the prototype's width and layout with no visual state absent from the prototype.
3. **Given** the Chat/FAQ panel is toggled open or closed, **When** observed in the app, **Then** the Meeting Summary does not exhibit any layout shift, overlap, or width reduction that the prototype does not exhibit.

---

### User Story 8 - CRM screen Write to CRM section matches the prototype exactly (Priority: P3)

A user on the CRM screen sees the Write to CRM section with the same width, spacing, padding, margins, and alignment as the prototype, and the Chat/FAQ panel affects its layout only as the prototype does.

**Why this priority**: The Write to CRM section is the terminal step of the core workflow and shares the same Chat/FAQ panel layout risk as the Review screen. Correcting it ensures the whole commit flow matches the prototype.

**Independent Test**: Open the CRM screen next to the prototype's commit view with the Chat/FAQ panel both visible and collapsed, and confirm the Write to CRM section's width, spacing, padding, margins, and alignment match the prototype in each chat state.

**Acceptance Scenarios**:

1. **Given** the Write to CRM section, **When** compared against the prototype at the same viewport width and chat state, **Then** width, spacing, padding, margins, and alignment match exactly.
2. **Given** the Chat/FAQ panel is visible versus collapsed, **When** the CRM screen is compared against the prototype in each state, **Then** the Write to CRM section reflows exactly as the prototype does with no unexpected layout shift or width change.

### Edge Cases

- What happens when a sidebar group (Drafts or Saved to CRM) is empty? The empty-state message and spacing must still match the prototype's empty-state treatment.
- How does the sidebar status indicator behave when a meeting's commit state changes while the sidebar is open (draft → saved to CRM)? The indicator must update to the correct matching style without a layout shift.
- How do accent bars behave on headings that wrap to two lines? Position and sizing must remain consistent with the prototype's behavior in the same case.
- What happens at viewport widths between named breakpoints (e.g., mid-resize)? The transition between breakpoint-specific styles must not introduce a visual state absent from the prototype.
- How are long company/meeting names truncated in sidebar rows and chips? Truncation behavior must match the prototype exactly, including any ellipsis treatment.
- What happens to the Review and CRM main content when the Chat/FAQ panel is toggled at the mobile breakpoint, where the prototype turns the chat into a full-screen takeover rather than a side column? The transition and the reclaimed content width must match the prototype at that breakpoint.
- How do the transcript action buttons behave when their labels are hidden or wrapped at narrow widths? Icon sizing and button dimensions must remain consistent with the prototype at that width.
- What happens to the Scoring Rubric layout when a rubric section has zero items or a very large count? Spacing and alignment must match the prototype's treatment of the same case.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The sidebar MUST reproduce the prototype's structure exactly, including header, search, "Drafts" group, "Saved to CRM" group, item counts, and per-item layout, at every supported viewport width.
- **FR-002**: Every meeting row in the sidebar MUST display a status indicator whose label, color, padding, margin, and position match the prototype's "Draft" or "Saved to CRM" indicator for that row's commit state.
- **FR-003**: The "Draft" and "Saved to CRM" chip styling MUST be visually identical wherever the chip appears in the application (sidebar, review screen, commit screen, or elsewhere), rather than styled independently per location.
- **FR-004**: Every accent bar in the application MUST match the prototype's corresponding accent bar in color, height, width, and position relative to its associated heading, for both the primary and secondary accent bar variants.
- **FR-005**: Accent bars and sidebar/chip elements MUST resize and reposition at each supported responsive breakpoint to match the prototype's behavior at that breakpoint.
- **FR-006**: All interactive states (hover, active, focus, disabled) for sidebar items, chips, and other reviewed components MUST visually match the prototype's corresponding states.
- **FR-007**: Every screen in the application (capture, processing, review, commit, and library) MUST be reviewed against its corresponding prototype view and MUST match in layout, spacing, typography, color, component sizing, and icon usage.
- **FR-008**: Any visual difference identified during the review MUST be corrected before the feature is considered complete; no known pixel-level discrepancy may remain undocumented.
- **FR-009**: The Capture screen transcript section — heading, textarea, footer, and action buttons — MUST match the prototype in width, height, padding, margins, spacing, border, border-radius, and alignment.
- **FR-010**: Icons inside the transcript action buttons (including the "Start" control) MUST match the prototype's icon dimensions exactly and MUST NOT render larger than the prototype; button dimensions, internal padding, icon-to-label spacing, and inter-button gaps MUST also match.
- **FR-011**: The Scoring Rubric modal/card MUST match the prototype in container width and max-width, alignment, outer margins, internal padding, per-element spacing and sizing (header, section rows, labels, counts, add-control), and typography (font size, weight, line height, color).
- **FR-012**: The Review screen Meeting Summary section MUST match the prototype's content width, spacing, and alignment in every Chat/FAQ panel state (visible and collapsed) at every supported breakpoint.
- **FR-013**: The CRM screen Write to CRM section MUST match the prototype's width, spacing, padding, margins, and alignment in every Chat/FAQ panel state at every supported breakpoint.
- **FR-014**: The Chat/FAQ panel MUST alter the available content width and layout of the Review and CRM screens only in the manner the prototype does (matching the prototype's grid/column and mobile-takeover behavior); toggling it MUST NOT introduce any layout shift, overlap, or width change absent from the prototype.

### Key Entities

- **Meeting Record**: A captured meeting shown in the sidebar and library, carrying a commit state (draft vs. saved to CRM) that determines which status indicator/chip style is displayed.
- **Screen/View**: One of the application's distinct screens (capture, processing, review, commit, library) that has a corresponding reference view in the HTML prototype used as the comparison baseline.
- **Chat/FAQ Panel**: A collapsible side panel present on the Review and CRM screens (a full-screen takeover at the mobile breakpoint in the prototype) whose visible/collapsed state governs the available content width of the main section beside it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Side-by-side visual comparison of the sidebar (including status indicators) between the app and the prototype shows zero perceptible differences at every supported viewport width.
- **SC-002**: Side-by-side visual comparison of "Draft" and "Saved to CRM" chips, in every location they appear, shows zero perceptible differences in padding, margin, alignment, or spacing.
- **SC-003**: Side-by-side visual comparison of accent bars on every screen shows zero perceptible differences in color, size, or position.
- **SC-004**: 100% of application screens have been reviewed against the prototype, with all identified discrepancies resolved and none remaining open.
- **SC-005**: A reviewer stepping through the full application at each supported screen size reports no visual or interactive-behavior difference from the prototype.
- **SC-006**: Side-by-side visual comparison of the Capture screen transcript section — including the icons inside the "Start" and sibling action buttons — shows zero perceptible differences in icon size, button dimensions, spacing, padding, margins, or alignment.
- **SC-007**: Side-by-side visual comparison of the Scoring Rubric modal shows zero perceptible differences in width, alignment, spacing, padding, typography, or internal layout.
- **SC-008**: Side-by-side visual comparison of the Review Meeting Summary section and the CRM Write to CRM section, with the Chat/FAQ panel both visible and collapsed, shows zero perceptible differences in content width, spacing, padding, margins, or alignment, and toggling the Chat/FAQ panel produces no layout shift absent from the prototype.

## Assumptions

- `Design/POC_Kaffea-X_Prototype.html` remains the single, unchanged source of truth for all visual comparisons during this effort.
- "Pixel-perfect" is evaluated by side-by-side visual comparison at the application's supported viewport widths (desktop, tablet, and mobile breakpoints already defined in the prototype), not by automated pixel-diffing tooling, since no such tooling currently exists in the project.
- The set of supported screens is the set already implemented in the application (capture, processing, review, commit, library/sidebar) — no new screens are introduced by this effort.
- Where the "Draft" / "Saved to CRM" indicator appears in more than one place, it is expected to share one consistent visual style rather than allowing each location to diverge independently, matching the prototype's use of a single reusable style for this element.
- The "Scoring Rubric modal" refers to the prototype's rubric presentation (the `.kx-rubric-*` card/surface) on the Capture screen; whether it renders as an inline card or an overlay, its container width, spacing, and typography are the comparison baseline.
- The Chat/FAQ panel's effect on content width is intended to match the prototype's layout mechanism (a dedicated column that reserves space when visible and reflows the main content when collapsed), not to overlay or squeeze content in a way the prototype does not.
