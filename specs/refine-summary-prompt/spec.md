# Feature Specification: Concise, Non-Redundant Call Summary

**Feature Branch**: `[refine-summary-prompt]`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "The call summarization prompt (`src/constants/summarization.ts`) currently produces a narrative that dumps the entire call into large, hard-to-read paragraphs, and duplicates commitments across the 'What Was Discussed' and 'Action Items' sections. The summary should instead read as a proper synthesis that answers why the meeting happened, what mattered most, and what remains unresolved — without repeating the same fact under multiple headings — while still preserving every guardrail, figure, and commitment from the transcript."

## Clarifications

### Session 2026-08-06

- Q: Should the narrative's three questions (why the meeting happened / what mattered most / what remains unresolved) be visually delineated with explicit headings, labels, or bullet points? → A: No. The narrative stays flowing prose in the existing 1-2 paragraph format. The three questions must be answerable from that prose, but no headings, labels, or bullet points may be introduced to mark them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scannable synthesis instead of a wall of text (Priority: P1)

A sales manager opens a generated call summary to quickly understand what happened on a call they didn't attend. Today they're met with a single dense multi-paragraph narrative that restates the transcript almost turn-by-turn, forcing them to read the whole thing to find what matters. Instead, the narrative should read as a synthesis organized around three questions: why the meeting happened, what mattered most, and what remains unresolved.

**Why this priority**: This is the core complaint — the summary is currently unreadable and doesn't serve its purpose of fast comprehension. Without this, the feature delivers no value.

**Independent Test**: Generate a summary for a sample call transcript and verify the narrative — still flowing 1-2 paragraph prose, with no added headings or labels — lets a reader identify (a) the reason/context for the meeting, (b) the most important outcomes, and (c) any open/unresolved items, in a form a reader can scan in under a minute.

**Acceptance Scenarios**:

1. **Given** a call transcript with a clear trigger for the meeting (e.g. a referral, a follow-up, a specific pain point), **When** the summary is generated, **Then** the narrative explicitly states why the meeting took place.
2. **Given** a call transcript containing multiple discussion points of varying importance, **When** the summary is generated, **Then** the narrative highlights the most important outcomes rather than restating every exchange in sequence.
3. **Given** a call transcript where a concern or question was raised but never resolved by the end of the call, **When** the summary is generated, **Then** the narrative identifies it as unresolved.

---

### User Story 2 - No duplicated facts across sections (Priority: P1)

A sales rep reviews the "What Was Discussed" and "Action Items" sections of a summary and currently sees the same commitment restated in both places (e.g. "set up trial access" appears as both a discussion point and an action item). This makes the sections feel redundant and erodes trust in the output.

**Why this priority**: Duplication was called out explicitly as a correctness problem, not just a style issue — it makes two sections of the report unreliable indicators of what's actually new information.

**Independent Test**: Generate a summary for a call containing at least one commitment that is both discussed and later confirmed as a next step, and verify that fact appears in exactly one of "What Was Discussed" / "What Was Decided" / "Action Items" — never in more than one.

**Acceptance Scenarios**:

1. **Given** a call where a commitment is proposed and then confirmed as a follow-up task, **When** the summary is generated, **Then** that commitment appears only under Action Items, not under What Was Discussed or What Was Decided.
2. **Given** a call where a decision is reached that is not itself an assignable follow-up task, **When** the summary is generated, **Then** that decision appears only under What Was Decided.
3. **Given** a call where a topic is discussed but no decision or commitment results from it, **When** the summary is generated, **Then** that topic appears only under What Was Discussed.

---

### User Story 3 - No loss of critical detail while becoming concise (Priority: P2)

Sales management relies on the summary to catch every guardrail, constraint, figure, and commitment mentioned on a call, even after the narrative becomes shorter and better organized. A shorter summary must not come at the cost of dropping material facts.

**Why this priority**: Conciseness is worthless — and actively harmful — if it's achieved by silently discarding information management depends on for accountability. This is what keeps the fix safe to ship.

**Independent Test**: Take a transcript with a known, enumerable list of guardrails, figures, and commitments; generate the summary; confirm every item on that list is still traceable somewhere in the output (narrative or structured fields), even though the narrative itself is shorter.

**Acceptance Scenarios**:

1. **Given** a transcript containing specific numbers (prices, volumes, dates), **When** the summary is generated, **Then** every such figure still appears somewhere in the output, verbatim.
2. **Given** a transcript containing an explicit constraint or boundary raised by either party, **When** the summary is generated, **Then** that constraint still appears somewhere in the output.
3. **Given** a transcript containing five distinct concerns raised by the prospect, **When** the summary is generated, **Then** all five are still individually identifiable in the output, not merged into a vague generalization.

---

### Edge Cases

- What happens when a call is purely exploratory and reaches no decisions or action items? (The "unresolved" and "what mattered most" components must still be populated meaningfully; "decided" and "action items" may legitimately be empty.)
- How does the summary handle a call where every discussion topic converts directly into an action item, leaving nothing that is "discussed but not decided or actioned"? (What Was Discussed may legitimately be an empty list.)
- How does the summary handle a very long, complex call with many action items? (The narrative must stay concise; the structured lists — e.g. Action Items — must still capture every item individually rather than being condensed for brevity.)
- What happens when the same underlying fact is relevant to more than one of the three narrative questions (why it happened / what mattered / what's unresolved)? (It should be placed under the single most relevant question rather than repeated under multiple ones.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The generated narrative MUST remain flowing prose in the existing 1-2 paragraph format — no headings, labels, or bullet points introduced to mark structure — while still letting a reader identify from that prose: (a) why the meeting took place, (b) the most important outcomes from the call, and (c) what remains unresolved at its end.
- **FR-002**: No fact, decision, or commitment MUST be repeated — verbatim or in close paraphrase — across the "What Was Discussed", "What Was Decided", and "Action Items" outputs. Each fact belongs in exactly one of these.
- **FR-003**: A forward-looking commitment that has an owner and will happen after the call MUST be classified as an Action Item, and MUST NOT also appear under What Was Discussed or What Was Decided.
- **FR-004**: An agreement about how the parties will proceed that is not itself a discrete, assignable follow-up task MUST be classified as What Was Decided.
- **FR-005**: A topic or piece of information exchanged during the call that is neither a decision nor a future commitment MUST be classified as What Was Discussed.
- **FR-006**: The generated narrative MUST stay within the existing 1-2 paragraph format — never a longer multi-paragraph, turn-by-turn retelling of the entire call — while still satisfying the existing requirement that no guardrail, constraint, figure, or commitment be lost.
- **FR-007**: The "what remains unresolved" portion of the narrative MUST capture open questions, concerns, or undecided points that were raised but not addressed or resolved by the end of the call; it MUST be empty only when every raised concern was in fact addressed or resolved.
- **FR-008**: Every claim in the restructured summary MUST still be sourced strictly from the transcript, consistent with the existing transcript-only, zero-inference accuracy rules — this feature changes organization and format only, not sourcing rules.
- **FR-009**: Fields not targeted by this feature (attendees, detected signals, lead score band, score rationale, and the individual pain points captured under "what we heard") MUST retain their current purpose and behavior; only the narrative composition and the discussed/decided/action-item de-duplication are in scope.

### Key Entities

- **Call Summary**: The full structured output produced for one call, comprising a narrative (organized around why/what-mattered/unresolved), discussion topics, decisions, action items, attendees, detected signals, and a lead score.
- **Narrative Component**: One of the three questions the narrative's flowing prose must answer — Purpose (why the meeting happened), Key Outcomes (the most important results), and Unresolved (open items) — woven into the existing 1-2 paragraph narrative without introducing headings, labels, or bullet points to mark them.
- **Action Item**: A forward-looking commitment with an owner and, when mentioned, a due date — distinct from a decision already reached during the call and from a topic merely discussed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reader can identify why a call happened, its most important outcome, and any unresolved item within 60 seconds of reading a generated summary.
- **SC-002**: Across a sample set of generated summaries, zero facts, decisions, or commitments appear more than once across the What Was Discussed, What Was Decided, and Action Items sections.
- **SC-003**: The generated narrative's length is reduced by at least 50% (by word count) compared to the current wall-of-text style, while staying within the existing 1-2 paragraph format, for calls of comparable length and complexity.
- **SC-004**: 100% of guardrails, constraints, figures, and commitments explicitly present in a transcript remain traceable somewhere in the generated summary after the restructuring — no regression in completeness versus the current output.

## Assumptions

- The existing accuracy and completeness mandate (transcript-only sourcing, zero information loss, exact commitments) remains in force; this feature changes how information is organized and de-duplicated, not the rules for what may be included.
- "Summary" refers to the AI-generated call summary already produced by the existing summarization integrations; no new AI provider, model, or generation pathway is introduced by this feature.
- Any UI components that render the summary's discussion/decision/action-item sections will continue to work with the existing field names; this feature does not require a UI redesign, only a change in the content and organization the AI produces.
- No new configuration or user-facing settings are introduced — this is a refinement of the automatic summary generation behavior for all calls.
