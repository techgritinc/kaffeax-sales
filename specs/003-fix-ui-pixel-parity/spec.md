# Feature Specification: Pixel-Perfect UI Parity with HTML Prototype

**Feature Branch**: `003-fix-ui-pixel-parity`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Review and Fix Pixel-Level UI Differences Between HTML Prototype and Next.js Application — the US3 Sidebar, the Draft/Saved to CRM chips, and the accent bar all deviate from `Design/POC_Kaffea-X_Prototype.html`; every screen must be reviewed and brought to pixel-perfect parity across layout, spacing, typography, color, sizing, icons, responsiveness, and interactive behavior."

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

### Edge Cases

- What happens when a sidebar group (Drafts or Saved to CRM) is empty? The empty-state message and spacing must still match the prototype's empty-state treatment.
- How does the sidebar status indicator behave when a meeting's commit state changes while the sidebar is open (draft → saved to CRM)? The indicator must update to the correct matching style without a layout shift.
- How do accent bars behave on headings that wrap to two lines? Position and sizing must remain consistent with the prototype's behavior in the same case.
- What happens at viewport widths between named breakpoints (e.g., mid-resize)? The transition between breakpoint-specific styles must not introduce a visual state absent from the prototype.
- How are long company/meeting names truncated in sidebar rows and chips? Truncation behavior must match the prototype exactly, including any ellipsis treatment.

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

### Key Entities

- **Meeting Record**: A captured meeting shown in the sidebar and library, carrying a commit state (draft vs. saved to CRM) that determines which status indicator/chip style is displayed.
- **Screen/View**: One of the application's distinct screens (capture, processing, review, commit, library) that has a corresponding reference view in the HTML prototype used as the comparison baseline.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Side-by-side visual comparison of the sidebar (including status indicators) between the app and the prototype shows zero perceptible differences at every supported viewport width.
- **SC-002**: Side-by-side visual comparison of "Draft" and "Saved to CRM" chips, in every location they appear, shows zero perceptible differences in padding, margin, alignment, or spacing.
- **SC-003**: Side-by-side visual comparison of accent bars on every screen shows zero perceptible differences in color, size, or position.
- **SC-004**: 100% of application screens have been reviewed against the prototype, with all identified discrepancies resolved and none remaining open.
- **SC-005**: A reviewer stepping through the full application at each supported screen size reports no visual or interactive-behavior difference from the prototype.

## Assumptions

- `Design/POC_Kaffea-X_Prototype.html` remains the single, unchanged source of truth for all visual comparisons during this effort.
- "Pixel-perfect" is evaluated by side-by-side visual comparison at the application's supported viewport widths (desktop, tablet, and mobile breakpoints already defined in the prototype), not by automated pixel-diffing tooling, since no such tooling currently exists in the project.
- The set of supported screens is the set already implemented in the application (capture, processing, review, commit, library/sidebar) — no new screens are introduced by this effort.
- Where the "Draft" / "Saved to CRM" indicator appears in more than one place, it is expected to share one consistent visual style rather than allowing each location to diverge independently, matching the prototype's use of a single reusable style for this element.
