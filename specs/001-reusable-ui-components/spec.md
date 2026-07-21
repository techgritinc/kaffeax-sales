# Feature Specification: Reusable UI Components — Kaffea-X Prototype Reproduction

**Feature Branch**: `feature/reusable_ui_components`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "Review the Design folder, specifically POC_Kaffea-X_Prototype.html. Analyze the prototype, extract all UI components, and implement them within their respective UI component folders. The Next.js application must match the HTML prototype exactly in terms of UI/UX, responsiveness, behavior, and overall visual appearance, including mock data functionality — a pixel-perfect replica with no visual differences. All components must be dynamic, reusable, and modular. The primary objective is to identify reusable UI patterns and common components from the prototype, implement them as reusable components, and organize them appropriately to support scalability, maintainability, and future development."

## Overview

The Kaffea-X prototype (`Design/POC_Kaffea-X_Prototype.html`) is a single-file, client-side demonstration of a sales-operations tool that turns a meeting transcript into a scored lead, lets a reviewer edit the extracted dossier, and commits it to a (mocked) CRM. This feature reproduces that prototype as a running application built from a library of reusable, modular UI components — visually and behaviourally indistinguishable from the prototype, with the same mock data and interactions.

The deliverable has two inseparable dimensions:

1. **Fidelity** — the running application must be a 1:1 pixel-perfect match to the prototype in layout, styling, responsiveness, interactions, and mock-data behaviour.
2. **Architecture** — the UI must be decomposed into atomic reusable primitives and composed feature components, configured through inputs (props), organised so shared components are separated from feature-specific ones, and structured for long-term scalability and maintenance.

No design enhancements, styling changes, layout adjustments, or new features may be introduced. The prototype is the canonical source of truth; when in doubt, the prototype wins.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture a transcript and get a scored dossier (Priority: P1)

A sales reviewer opens the app on the Capture screen, pastes (or drags in / loads a sample) a meeting transcript, and clicks **Summarise**. A processing overlay animates through its steps, then the app advances to the Review screen showing the extracted meeting dossier: title, band badge (Hot/Warm/Cold), numeric score out of 100, attendees, meeting date, prospect-email field, summary narrative, the "What we heard" three-column signal grid with hover evidence, topics/decisions, and action items.

**Why this priority**: This is the core value loop and the minimum viable slice — without capture-to-review there is no product. It exercises the primary layout shell, the largest share of reusable primitives (buttons, cards, badges, inputs, textarea, tooltips), and the mocked processing/detection/scoring behaviour.

**Independent Test**: Load the app, paste or load-sample a transcript, click Summarise, and confirm the processing overlay runs and the Review dossier renders with a band, score, signals, and evidence matching the prototype exactly.

**Acceptance Scenarios**:

1. **Given** the Capture screen with an empty transcript, **When** the reviewer views the Summarise button, **Then** it is disabled and the word count reads zero, matching the prototype.
2. **Given** a transcript pasted into the textarea, **When** the reviewer clicks **Load sample**, **Then** the sample Zoom transcript populates the textarea and the live word count updates.
3. **Given** a valid transcript, **When** the reviewer clicks **Summarise**, **Then** a full-screen processing overlay animates through "Reading transcript → Extracting entities → Scoring intent → Drafting recap" and then the Review screen appears.
4. **Given** the Review screen, **When** it renders, **Then** the band badge, score (Hot 93 / Warm 68 / Cold 34), detected signals, and hover-evidence tooltips reproduce the prototype's appearance and content.
5. **Given** a transcript file is dragged onto the drop zone (`.txt/.md/.vtt/.srt`), **When** it is dropped, **Then** its text loads into the transcript field.

---

### User Story 2 - Review, edit, and commit to CRM (Priority: P2)

On the Review screen the reviewer fills in the required prospect email, optionally edits inline fields, then **Approves** (committing a new record) or **Rejects** it. Approving a fresh draft mints a CRM activity id, advances to the Commit screen confirming the meeting is "Written to CRM," and shows a commit card with company, band, contact, rationale, write-time, and the activity id. An already-committed record shows **Update CRM** instead. Rejecting removes the draft and returns to Capture. A toast confirms each outcome.

**Why this priority**: This completes the workflow and delivers the "to CRM" business outcome. It depends on US1's dossier but is independently demonstrable from a seeded draft.

**Independent Test**: Open a draft in Review, enter a prospect email, click Approve, and confirm a CRM id is minted, the Commit screen renders with a matching commit card, and the success toast appears.

**Acceptance Scenarios**:

1. **Given** a draft dossier with an empty prospect email, **When** the reviewer views the Approve button, **Then** it is disabled until a prospect email is entered (with the rust required-asterisk styling).
2. **Given** a completed draft, **When** the reviewer clicks **Approve**, **Then** a CRM activity id is generated, the app moves to the Commit screen, and a success toast appears.
3. **Given** an already-committed record in Review, **When** the reviewer views the action buttons, **Then** **Update CRM** is shown instead of Approve/Reject, and using it updates the record and shows a toast.
4. **Given** a draft in Review, **When** the reviewer clicks **Reject**, **Then** the draft is removed, the app returns to Capture, and a rejection toast appears.
5. **Given** the Commit screen, **When** it renders, **Then** each commit card shows the company, band badge, "Written to Zoho" status pill, contact line, rationale blockquote, write-time, and monospace activity id, and offers "Open in Review."

---

### User Story 3 - Browse and reopen recent meetings (Priority: P3)

The left sidebar lists recent meetings grouped into **Drafts** and **Saved to CRM** with counts, a search box that filters by company name, band dots, status chips, and per-item meta. Selecting an item opens it in the Review screen. The sidebar collapses to a narrow rail and, on narrow viewports, becomes a drawer with a backdrop.

**Why this priority**: Provides navigation and continuity across records but is not required for the core capture→commit loop.

**Independent Test**: With the seeded library present, type a company name in the sidebar search and confirm the list filters; click a saved record and confirm it opens in Review.

**Acceptance Scenarios**:

1. **Given** the seeded library, **When** the sidebar renders, **Then** it shows Drafts and Saved-to-CRM groups with correct counts and per-item band dots, titles, meta, and status chips matching the prototype.
2. **Given** the sidebar search, **When** the reviewer types a company name, **Then** the list filters to matching records; a non-matching query shows the empty state.
3. **Given** the sidebar, **When** the reviewer collapses it, **Then** it shrinks to a 56px rail with an expand control; the main layout reflows.
4. **Given** a viewport ≤900px, **When** the sidebar is opened, **Then** it appears as a drawer with a backdrop that closes it on click.

---

### User Story 4 - Refine the scoring rubric (Priority: P4)

From the Capture screen the reviewer opens the **Scoring rubric** modal. The left column shows the banding rules and a "how scoring works" help panel; the right column lists editable signals — each with an inline label, a HOT/WARM/COLD segmented weight picker, and delete — plus an inline composer to add a new signal. Closing the modal (backdrop or close button) returns to Capture; edited signals influence subsequent processing.

**Why this priority**: A configuration/refinement surface that enriches the demo but is not on the critical path.

**Independent Test**: Open the rubric modal, add a new signal, change a signal's weight band, delete a signal, close the modal, and confirm the changes persist for the next Summarise run.

**Acceptance Scenarios**:

1. **Given** the Capture screen, **When** the reviewer clicks the floating **Scoring rubric** pill, **Then** the two-column rubric modal opens over a backdrop.
2. **Given** the rubric modal, **When** the reviewer edits a signal label or changes its HOT/WARM/COLD segment, **Then** the change is reflected immediately in the signal list.
3. **Given** the rubric composer, **When** the reviewer adds a new signal, **Then** it is appended with a generated id and appears in the list.
4. **Given** an open rubric modal, **When** the reviewer clicks the backdrop or close button, **Then** the modal closes and the Capture screen is shown.

---

### User Story 5 - Converse with the assistant panel (Priority: P5)

On the Review and Commit screens a right-hand chat rail greets the reviewer with context, offers suggested-prompt chips, and answers with canned responses keyed to topics (pricing, next steps, competitor, budget, timeline). Messages send on Enter or the send button, show a "Thinking…" pending state, and auto-scroll. The panel collapses, leaving a floating button to reopen it.

**Why this priority**: Ancillary assistive surface; the workflow is fully usable without it.

**Independent Test**: On the Review screen, click a suggested chip or type a keyword like "pricing," and confirm a canned assistant response appears after a pending state and the view auto-scrolls.

**Acceptance Scenarios**:

1. **Given** the Review screen, **When** the chat rail renders, **Then** it shows a context greeting, suggested chips, and an input bar matching the prototype.
2. **Given** the chat input, **When** the reviewer sends a message containing a known keyword, **Then** a matching canned response appears after a brief "Thinking…" state and the panel scrolls to the newest message.
3. **Given** the chat panel, **When** the reviewer collapses it, **Then** it hides and a floating chat button appears; clicking the button reopens the panel.

---

### Edge Cases

- **Empty / whitespace-only transcript**: Summarise stays disabled and word count reads zero; no processing starts.
- **Unreadable or non-text dropped file**: Behaviour matches the prototype's `FileReader` handling; the drop zone accepts only the declared extensions.
- **Missing prospect email at approval**: Approve remains disabled with the required-field (rust) treatment until an email is present.
- **Navigating to a gated step**: Review is reachable only when a draft is ready or a committed record is active; Commit only when the active record is committed — the stepper and navigation enforce the same guards as the prototype.
- **Empty sidebar groups / no search matches**: Empty states render exactly as in the prototype.
- **Narrow viewports (≤1100 / ≤900 / ≤720 / ≤640 / ≤560 / ≤400px)**: Layout reflows at the prototype's breakpoints; sidebar becomes a drawer and chat a full-screen takeover at ≤900px.
- **Prototype quirks**: Known prototype artefacts (e.g. the hardcoded "June 24, 2026" meeting date, and Cascade Ember's duplicated meeting-title phrase) are reproduced faithfully rather than "corrected," per the fidelity-over-enhancement rule. See Assumptions.

## Requirements *(mandatory)*

### Functional Requirements

**Fidelity & behaviour**

- **FR-001**: The application MUST render the three primary workflow views — Capture, Review, and Commit — with the same content, layout, and visual appearance as the prototype.
- **FR-002**: The application MUST reproduce the page shell exactly: fixed 56px header (logo, divider, app label, user block, avatar), left sidebar, main content column with breadcrumb stepper, and right chat rail.
- **FR-003**: The application MUST reproduce the mocked processing behaviour: an animated multi-step overlay ("Reading transcript → Extracting entities → Scoring intent → Drafting recap") shown while a transcript is turned into a dossier.
- **FR-004**: The application MUST reproduce the mocked signal detection, banding (Hot/Warm/Cold), scoring (Hot 93 / Warm 68 / Cold 34), rationale, narrative, and recap generation from the transcript and active rubric, matching the prototype's logic.
- **FR-005**: The application MUST reproduce the Approve, Reject, and Update-CRM flows, including minting draft/CRM/reject identifiers, audit entries, library updates, step transitions, and confirmation toasts.
- **FR-006**: The application MUST reproduce the Capture screen: hero text, transcript card with drag-and-drop, Attach file, Load sample, live word count, error banner, Clear, and Summarise (disabled when empty).
- **FR-007**: The application MUST reproduce the Review dossier: hero with band badge and score, meta strip (attendees, meeting date, required prospect email), summary narrative, three-column "What we heard" signal grid with hover-evidence tooltips and rationale, topics/decisions pair, and the action-items list.
- **FR-008**: The application MUST reproduce the Commit screen and commit cards, including company, band badge, "Written to Zoho" status pill, contact, rationale, write-time, activity id, and "Open in Review."
- **FR-009**: The application MUST reproduce the sidebar library: Drafts and Saved-to-CRM groups with counts, company-name search filter, band dots, titles, meta, status chips, empty states, and collapse/expand rail behaviour.
- **FR-010**: The application MUST reproduce the breadcrumb stepper (Capture › Review › CRM) with the prototype's reachability gating and active/disabled states.
- **FR-011**: The application MUST reproduce the Scoring Rubric modal: banding-rule pills, "how scoring works" help, editable signal cards (inline label, HOT/WARM/COLD segmented weight picker, delete), and the add-signal composer, with backdrop/close dismissal.
- **FR-012**: The application MUST reproduce the chat panel: context greeting, suggested chips, user/assistant bubbles, "Thinking…" pending state, keyword-matched canned responses, Enter-to-send, auto-scroll, collapse, and the floating reopen button.
- **FR-013**: The application MUST reproduce all interactive behaviours present in the prototype, including inline field editing, copy-to-clipboard, email via `mailto:`, hover states, toast auto-dismiss, and modal open/close with backdrop handling.
- **FR-014**: The application MUST reproduce the responsive behaviour at the prototype's breakpoints, including the ≤900px sidebar-drawer and full-screen chat takeover.
- **FR-015**: The application MUST seed and use the same mock data as the prototype — the recent-meetings library, sample transcript, default rubric, and curated extraction — with identical values, shapes, and labels.
- **FR-016**: The application MUST reproduce the prototype's icon set (inline SVG), glyphs (band markers, checkmarks, separators), fonts (Playfair Display, Figtree, monospace stack), and logo/avatar assets.
- **FR-017**: The application MUST present the same loading, empty, and confirmation states the prototype presents for each view and data-dependent surface.

**Architecture & reusability**

- **FR-018**: The UI MUST be decomposed into atomic reusable primitive components (e.g. button variants, inputs, textarea, badges/chips, cards, avatars, segmented control, tabs/breadcrumb, tooltip, spinner/shimmer, toast, icon wrapper) that are self-contained and reusable across any feature without modification.
- **FR-019**: Composed and feature-specific components (e.g. capture card, review dossier sections, signal grid, commit card, sidebar, stepper, chat panel, processing overlay, rubric modal) MUST be built from the atomic primitives and organised separately from the shared primitives.
- **FR-020**: Every component MUST be configurable through inputs (props) rather than duplicated per use; one-off variants MUST be generalised through configuration rather than copied.
- **FR-021**: Shared/common components MUST be separated from feature-specific components, and components MUST be organised in a scalable, consistently named structure suitable for long-term maintenance.
- **FR-022**: The implementation MUST NOT introduce any design enhancement, styling change, layout adjustment, additional feature, or dependency beyond what is required to faithfully reproduce the prototype.
- **FR-023**: All visual values (colours, spacing, typography, radii) MUST derive from the shared design-token source rather than being hardcoded per component, and MUST match the prototype's token values.

### Key Entities *(mock data reproduced from the prototype)*

- **Meeting Record (draft / committed)**: A captured meeting. Attributes: identifier, timestamp/when, committed flag, band, contact, summary, lead score, recap email.
- **Contact**: Company, name, title, email — each carried with a confidence level (high / medium / low).
- **Summary**: Meeting title, narrative, attendees (name + side: Kaffea-X or prospect), topics, decisions, open questions, next steps (description, owner, due date), commitments (side, description).
- **Lead Score**: Band (Hot / Warm / Cold), detected signals (id, label, weight, evidence), rationale.
- **Rubric**: Ordered list of signals — each with id, label, weight band, source, and detection hints — plus the banding rule.
- **Recap Email**: Subject and body.
- **CRM Record**: Identifier, contact, band, rationale, recap, next steps, write timestamp.
- **Audit Entry**: Identifier, model, reviewer, rubric version, outcome (written / updated / rejected), target, timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A side-by-side comparison of the application and the prototype across all views and states shows no perceptible visual difference in layout, colour, typography, spacing, or imagery.
- **SC-002**: Every interactive behaviour demonstrated in the prototype (capture, processing, review, approve/reject/update, sidebar navigation and search, rubric editing, chat, inline editing, toasts, modals, responsive reflow) is reproducible in the application with matching outcomes.
- **SC-003**: The application reflows correctly at every prototype breakpoint (1100 / 900 / 720 / 640 / 560 / 400px), including the sidebar drawer and full-screen chat behaviours, with no layout breakage.
- **SC-004**: The seeded mock data (recent library, sample transcript, default rubric, curated extraction) matches the prototype's values and shapes exactly, and drives the same on-screen results.
- **SC-005**: Every repeated visual element identified in the prototype is implemented once as a reusable, prop-configurable component and reused across views, with no duplicated one-off copies of the same element.
- **SC-006**: Shared primitives and feature-specific components are organised into clearly separated, consistently named groupings, such that a new contributor can locate and reuse a primitive without reading its internals.
- **SC-007**: The application introduces no view, control, styling, or behaviour that is absent from the prototype.
- **SC-008**: All visual values resolve from the shared design-token source; no component contains hardcoded colour/spacing values that bypass the tokens.

## Assumptions

- **Scope is the full running prototype, organised as reusable components.** The description asks for both a pixel-perfect behavioural replica ("including mock data functionality," "identical … interactions, and behavior") and a reusable component architecture. This spec treats the deliverable as the complete application (all three screens plus sidebar, stepper, chat, processing, and rubric surfaces) built from a reusable component library — not a standalone component gallery.
- **All data and network behaviour remain mocked client-side**, exactly as in the prototype. No real CRM, model, or backend integration is introduced by this feature.
- **The visible, mounted UI defines the reproduction surface.** Components defined in the prototype but not mounted in its current render path (e.g. the recap-letter, compact-contact, list/commitment editors, and the unused data-table styling) are out of scope for reproduction; they may inform the reusable library only if a mounted surface needs them.
- **Prototype artefacts are reproduced, not corrected.** Quirks such as the hardcoded "June 24, 2026" meeting date and Cascade Ember's duplicated meeting-title phrase are treated as canonical unless the user explicitly requests a fix, per the fidelity-over-enhancement rule.
- **Image and font assets referenced by the prototype** (`KX-Primary-logo.png`, `favicon.png`, Playfair Display, Figtree) are available to the application and rendered as in the prototype.
- **The prototype's custom stylesheet — not the loaded-but-unused utility CDN — is the styling source of truth**, and its CSS custom properties define the design tokens to be matched.
- **Desktop-first with the prototype's responsive breakpoints**; no additional device targets or breakpoints beyond those the prototype defines are introduced.
