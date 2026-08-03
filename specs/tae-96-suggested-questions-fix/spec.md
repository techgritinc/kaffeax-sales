# Feature Specification: Suggested Questions Reach the Panel

**Ticket**: TAE-96

**Feature Branch**: `feat/tae-96-chat-panel-ui-follow-up-fab`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "The suggested question chips displayed in the chat panel are hard-coded values from the codebase. Instead, these questions should be generated dynamically by AI based on the cleaned transcript and the AI-generated meeting summary. There appears to be an issue because I still do not see the auto-generated suggested questions in the chat panel. The application is continuing to display the hard-coded questions instead of the dynamically generated ones. Expected: after the user clicks Summarize and the meeting summary has been successfully generated, the chat panel should open, the system should retrieve the AI-generated suggested questions created during transcript processing, and the chat panel should display three unique, context-aware suggested questions based on the meeting summary and cleaned transcript. No hard-coded fallback questions should be displayed unless the AI-generated suggestions are genuinely unavailable. Investigate the root cause: whether generation runs during processing, whether suggestions are saved to the transcript record, whether the record carries them to the panel, whether the panel renders them, whether a static array is still in use, whether state, caching, or serialization prevents them reaching the interface, and whether fallback logic is always used even when generated suggestions exist. Expected outcome: hard-coded chips are completely replaced with dynamically generated suggestions, and after a meeting is summarized the panel immediately displays three AI-generated, meeting-specific suggested questions retrieved from the processed transcript data."

**Relationship to prior specifications**: This is a defect-remediation slice of TAE-96. It depends on `specs/tae-96-grounded-chat-assistant/` (the assistant's grounding and refusal behaviour) and remediates `specs/tae-96-dynamic-suggested-questions/`, which specified this capability and whose delivery does not produce visible suggestions. Every requirement in those specifications remains in force. This one adds only what is needed to make the specified behaviour actually observable, plus the reliability floor that was missing.

## Diagnosis Summary

Behavioural findings from the current system, stated without reference to implementation:

1. **The generation step does run** during meeting analysis, after the summary and lead score are available, and it does write to the meeting record when it produces a usable set.
2. **The record does carry suggestions to the panel**, and the panel does render whatever set it is given. No static list remains anywhere in the delivered application — the only hard-coded question text left in the repository is inside the non-executing design prototype used as the visual reference.
3. **The set is almost always discarded before it is stored.** A whole-set quality gate rejects any set containing a question longer than a very short character ceiling (roughly six words). Questions that satisfy the specification's own quality bar — naming the concrete thing the meeting discussed — routinely exceed that ceiling, so the set is thrown away and the meeting is left with none.
4. **The retry after a rejected set cannot succeed.** Generation is configured for fully deterministic output and the retry re-issues an identical request, so the second attempt reproduces the first rejected set exactly. The retry consumes budget and time without changing the outcome.
5. **The observable result** is therefore a meeting with no stored suggestions and a panel with no chip row — not a panel showing hard-coded chips. The user's report of seeing the old chips is consistent with comparing against the design prototype or with a stale build; it is not reproducible from the current application, whereas the empty row is.

The defect is therefore *suppression*, not *substitution*: the pipeline is wired end to end and silently throws away nearly every set it generates. Requirements below target that.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Summarize a meeting and see its own three questions (Priority: P1)

A salesperson pastes a transcript, clicks Summarize, and lands on the review screen. They open the follow-up panel and find three chips beneath the opening message that are unmistakably about this call — they name the volume that was quoted, the objection that was raised, the person who owns the next step. They tap one and get a grounded answer.

**Why this priority**: This is the entire point of the ticket and the thing the user reports as missing. Everything else in this specification exists to make this outcome reliable. With only this story shipped, the panel stops being a dead end on the very first meeting a user analyses.

**Independent Test**: Analyse a transcript with clearly quantified content, open the panel, and confirm three chips appear that each name something specific to that transcript, and that tapping each returns a grounded answer rather than a refusal.

**Acceptance Scenarios**:

1. **Given** a transcript of ordinary length with substantive content, **When** the user clicks Summarize and analysis completes successfully, **Then** the meeting has exactly three stored suggestions.
2. **Given** that meeting, **When** the user opens the follow-up panel for the first time, **Then exactly** three chips are shown beneath the opening message, each naming a concrete detail from that transcript or its analysis.
3. **Given** the three chips, **When** they are read together, **Then** each asks about a different aspect of the call and none is a rephrasing of another.
4. **Given** a chip is displayed, **When** the user taps it, **Then** it is submitted exactly as a typed question of the same text and the assistant returns a grounded answer rather than stating the topic was not discussed.
5. **Given** the panel opens, **When** the chips appear, **Then** they are present in the same render as the opening message, with no loading state, placeholder, or delay.
6. **Given** two visibly different transcripts, **When** each is analysed and its panel opened, **Then** the two sets of three differ from each other.
7. **Given** a meeting is re-analysed, **When** the user opens the panel afterwards, **Then** the chips reflect the new analysis and none of the previous set remains.

---

### User Story 2 - Good questions are not thrown away for being a few characters long (Priority: P1)

A salesperson analyses a call where the prospect quantified an order, pushed back on lead times, and assigned a follow-up. The questions worth asking necessarily name those things, and naming them takes more than a handful of characters. The panel shows all three anyway, laid out cleanly, rather than showing nothing because one question ran slightly long.

**Why this priority**: Shares P1 with Story 1 because Story 1 cannot be delivered without it. The current quality gate and the current quality bar are in direct conflict: a question specific enough to pass the "must name the concrete thing" rule is usually too long to pass the length rule, so the honest outcome of a correct generation is an empty panel. Until that conflict is resolved, Story 1 fails on most real transcripts no matter how well generation performs.

**Independent Test**: Analyse at least ten varied real-length transcripts and confirm that the proportion ending with three stored suggestions meets the bar in SC-001, and that in every case where suggestions are shown, the chip row respects the layout constraints in SC-007.

**Acceptance Scenarios**:

1. **Given** a set of three questions that are each specific, distinct, self-contained, and answerable from the meeting, **When** the set is assessed for storage, **Then** it is stored, and no question is rejected merely for naming a concrete detail from the meeting.
2. **Given** a question long enough to threaten the chip row's layout, **When** it is assessed, **Then** it is handled by a rule derived from what the row can actually display, and the outcome is verifiable against the layout bar in SC-007.
3. **Given** a set is rejected for any reason, **When** another attempt is made, **Then** that attempt is materially different from the rejected one and has a genuine chance of producing a different, acceptable set.
4. **Given** repeated attempts all fail, **When** the analysis finishes, **Then** attempts stop at a bounded count and the analysis still completes successfully within the bound in SC-005.
5. **Given** a set that genuinely violates quality — a duplicate, an empty question, the wrong count, or prose instead of questions, **When** it is assessed, **Then** it is still rejected as a whole and never stored partially.

---

### User Story 3 - When suggestions are genuinely unavailable, the panel is still honest (Priority: P2)

A salesperson opens the panel on a meeting analysed before this capability existed, or on one where generation genuinely could not produce a usable set. The panel opens normally — opening message, input, everything usable — with no chip row at all. It does not pretend to have meeting-specific suggestions it does not have, and it does not offer generic ones that would lead the user into a refusal.

**Why this priority**: Every meeting already in the system predates this capability, so the unavailable path is a real and common path, not an exotic edge. It must look deliberate rather than broken. It follows the P1 stories because it is a floor, not the value.

**Independent Test**: Open the panel on a meeting with no stored suggestions and on one where generation was forced to fail; confirm both open cleanly, with a fully usable input and no error, warning, or partial row.

**Acceptance Scenarios**:

1. **Given** an analysed meeting with no stored suggestions, **When** the user opens the panel, **Then** the panel is fully usable and no partial or empty chip row is shown.
2. **Given** generation failed while the meeting analysis succeeded, **When** the user views the meeting, **Then** the analysis is presented as successful and no error or warning about suggestions appears anywhere in the interface.
3. **Given** fewer than three usable suggestions were produced, **When** the user opens the panel, **Then** no chip row and no "Suggested" heading are shown at all — not one or two chips, and not a generic, placeholder, or previously-used substitute.
4. **Given** the panel shows no chip row, **When** the user types their own question, **Then** the assistant behaves exactly as it does for a meeting that has suggestions.
5. **Given** a meeting is deleted, **When** its record is removed, **Then** its stored suggestions are removed with it.

---

### User Story 4 - Diagnosing a missing chip row does not require guesswork (Priority: P3)

An engineer is told the chips are missing on a particular meeting. They can determine, from the system's own operational record, whether generation ran, whether it produced a set, and if the set was discarded, which quality rule discarded it — without re-running the meeting and without reading any transcript or question text.

**Why this priority**: The absence of exactly this made the reported defect look like "hard-coded chips are still showing" when the real behaviour was "every set is being discarded". The two have completely different fixes. It is P3 because it improves the next investigation rather than the current user outcome.

**Independent Test**: Force a rejection, then determine from the operational record alone which rule rejected it and that the analysis still succeeded — confirming no transcript, analysis, or question text was recorded.

**Acceptance Scenarios**:

1. **Given** generation ran for a meeting, **When** its outcome is inspected, **Then** the attempt, the outcome, and — on rejection — the specific quality rule responsible are all determinable.
2. **Given** a rejection is recorded, **When** the record is inspected, **Then** it contains no transcript content, no analysis content, no generated question text, no personal data, and no credentials.
3. **Given** a meeting shows no chip row, **When** its record is inspected, **Then** it is distinguishable whether generation was never attempted, attempted and failed to return, or returned a set that was discarded.

---

### Edge Cases

- **Very short or near-empty transcript**: too little content for three distinct meaningful questions. No chip row is shown, rather than three padded or generic questions.
- **Analysis produced empty sections** (nothing decided, no action items): questions must come only from sections with content, and must never ask about an empty section, because such a chip produces a refusal.
- **A question that is specific but long**: the current failure mode. It must not cause the whole set to be discarded unless it genuinely cannot be displayed.
- **A question long enough to break the row**: must not cause horizontal overflow, and must not make its chip taller than two lines of text, at any supported width.
- **A single unbroken long word, quotes, or non-Latin characters in a question**: must not break the row's layout at any supported width.
- **Very long transcript above the grounding ceiling**: generation is abandoned quietly; a partially-read transcript must never produce questions implying full coverage.
- **AI returns a malformed set**: fewer or more than three, duplicates, empty strings, prose, or a wrapped response. Rejected whole; nothing stored.
- **Every attempt is rejected**: attempts stop at a bounded count, the analysis completes successfully, and the reason is diagnosable.
- **Deterministic repeated attempts**: a retry that cannot differ from the attempt it replaces is not a retry; it must not be counted as one.
- **Transcript containing text addressed to an AI assistant**: treated purely as meeting content to derive questions from, never as instructions.
- **A question containing a name, figure, or sensitive detail**: acceptable as meeting-derived content, inheriting the meeting record's retention. It must never reach application logs.
- **Chip tapped while a question is already in flight**: blocked exactly as a typed submission is.
- **Chip tapped twice**: behaves as asking the same question twice.
- **Meeting analysed before this capability existed**: no stored suggestions, no backfill.
- **Stale client state**: after analysis completes, the panel must reflect the set stored for that analysis, never a set from a previous analysis or another meeting.

## Requirements *(mandatory)*

### Functional Requirements

**The reported defect**

- **FR-001**: A meeting whose analysis completes successfully, whose transcript has substantive content, and for which generation returns a well-formed response MUST end with exactly three stored suggestions — the current outcome of storing none MUST NOT occur for such a meeting.
- **FR-002**: The panel MUST display the three stored suggestions for the meeting that was just summarized, in the same render as the opening message, with no request made at the time the panel opens.
- **FR-003**: No suggestion shown to a user may originate from any fixed list, from another meeting, or from a previous analysis of the same meeting.
- **FR-004**: After analysis completes, the panel MUST reflect the set stored by that analysis; no stale state, retained value, or cached response may cause a previous set or an empty row to be shown in its place.

**Quality gate correctness**

- **FR-005**: Every quality rule that can discard a set MUST be justified by an observable user-facing consequence — an unanswerable question, a duplicate, an unusable count, or content the chip row genuinely cannot display. A rule with no such consequence MUST NOT discard a set.
- **FR-006**: The length rule MUST be derived from what the existing chip row can display within the layout bar in SC-007, and MUST NOT be set so tightly that questions meeting the specificity requirement in FR-011 are routinely discarded.
- **FR-007**: A set MUST still be rejected whole, and never stored partially, when it contains the wrong number of questions, a duplicate, an empty question, or content that is not a question.
- **FR-008**: When a set is rejected and another attempt is made, that attempt MUST differ materially from the rejected one — an attempt that is guaranteed to reproduce the rejected set MUST NOT be issued or counted as an attempt.
- **FR-009**: Attempts MUST stop at a bounded count, and exhausting them MUST leave the meeting with no suggestions rather than a partial or unvalidated set.

**Content and grounding (inherited, restated for verification)**

- **FR-010**: Every stored suggestion MUST be answerable from that meeting's cleaned transcript or analysis output alone.
- **FR-011**: Generation MUST draw on both the cleaned transcript and the full analysis output, and each question MUST name a concrete detail from the meeting rather than a generic category.
- **FR-012**: The three questions in a set MUST be distinct from one another and MUST each address a different aspect of the meeting.
- **FR-013**: Each question MUST be self-contained and answerable on its own, with no pronoun or reference depending on another question or an earlier turn.
- **FR-014**: The transcript and analysis output MUST be treated entirely as content to derive questions from and never as instructions to follow.
- **FR-015**: Generation MUST happen once during the meeting's analysis step, after the summary and lead score are available; opening, closing, or reopening the panel MUST NOT trigger it or change the stored set.
- **FR-016**: Re-analysing a meeting MUST replace its stored set completely, and deleting a meeting MUST remove its stored set.

**Panel presentation**

- **FR-017**: When a meeting has a stored set, the panel MUST render its three questions in the existing chip row, in the position, order, and visual style the panel already uses, with no change to the panel's visual design.
- **FR-018**: The chip row MUST accompany the opening message only; a restored conversation MUST NOT be prepended with one.
- **FR-019**: Tapping a suggestion MUST submit it exactly as a typed question of the same text, subject to the same in-flight blocking rules.
- **FR-020**: Suggestions MUST be scoped to the meeting currently open; opening another meeting MUST replace them, and a suggestion belonging to another meeting MUST never be visible.
- **FR-021**: When a meeting-specific set is unavailable, the panel MUST render no chip row and no "Suggested" heading, MUST NOT substitute generic, placeholder, or previously-used questions, MUST NOT show a partial row of one or two chips, and MUST remain fully usable.

**Resilience, cost, and observability**

- **FR-022**: A failure to generate, assess, or store suggestions MUST NOT fail the meeting analysis: the summary, lead score, and analysis status MUST be recorded exactly as they are today.
- **FR-023**: A suggestion failure MUST NOT surface any error, warning, or empty state to the user beyond the absence of the chip row.
- **FR-024**: Generation MUST NOT delay the analysis result beyond the bound in SC-005 and MUST NOT be able to leave the analysis step unresolved.
- **FR-025**: Any AI resource consumption for generation, including every attempt made, MUST be recorded consistently with how the analysis step records its own, so per-meeting cost remains complete and attributable.
- **FR-026**: For every meeting, it MUST be determinable from the system's operational record whether generation was attempted, what its outcome was, and — on rejection — which quality rule was responsible.
- **FR-027**: Operational records for generation MUST NOT include transcript content, analysis content, generated question text, personal data, or credentials.

### Key Entities

- **Suggested Question Set**: Exactly three self-contained natural-language questions belonging to one meeting, derived from that meeting's cleaned transcript and analysis output. Produced once during analysis, replaced wholesale on re-analysis, read-only thereafter. A meeting either has a complete set of three or has none — never a partial set. Lifetime is bounded by its meeting's.
- **Suggestion Source Material**: The meeting's cleaned transcript plus its complete analysis output — the same material that grounds the assistant's answers, and the only permitted basis for a question.
- **Set Assessment Outcome**: The verdict on one generated set — accepted, or rejected with the specific rule responsible. It is what makes a missing chip row diagnosable, and it carries no meeting content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across at least 10 varied real-length transcripts with substantive content, at least 9 end with exactly three stored suggestions. Today this figure is near zero, which is the defect.
- **SC-002**: 100% of meetings whose analysis completes successfully have either exactly three stored suggestions or none — no meeting has one or two.
- **SC-003**: Across at least 10 analysed meetings, at least 29 of the 30 resulting suggestions receive a grounded answer rather than a refusal or a "not discussed in this meeting" response. A chip leading to a refusal counts as a failure.
- **SC-004**: Across the same 10 meetings, no question text appears verbatim in more than two of the ten sets, and every set of three is internally distinct in 100% of cases.
- **SC-005**: Generation, including all attempts, adds no more than 5 seconds to the analysis wait at the 95th percentile; and with generation forced to fail, 100% of affected meetings still produce a successful analysis with no user-visible error.
- **SC-006**: Suggestions are visible in the same render as the opening message in 100% of panel opens on a meeting that has a stored set, with no measurable additional wait, and no panel open in the evaluation run shows a set belonging to another meeting or to a superseded analysis.
- **SC-007**: At 1440px, 1100px, 900px, and 560px, in both the has-suggestions and no-suggestions states: the panel is visually indistinguishable from the canonical design prototype; the chip row's wrapping behaviour matches the prototype's own at the same width; no individual chip exceeds two lines of text; and nothing causes horizontal overflow — for every set stored during the evaluation run.
- **SC-008**: For 100% of forced rejections, the responsible quality rule is determinable from the operational record without re-running the meeting.
- **SC-009**: Zero occurrences of transcript content, analysis content, or generated question text in application logs across the full evaluation run.
- **SC-010**: Zero attempts are issued that are guaranteed to reproduce a set already rejected in the same analysis.
- **SC-011**: The AI cost of generation, across all attempts, is recorded and attributable per meeting, so per-meeting cost reporting remains complete.
- **SC-012**: Zero user-visible suggestions originate from a fixed list in any state, confirmed by SC-004 and by finding no fixed question text anywhere on the panel's executing path.
- **SC-014**: Across every meeting in the evaluation run that has no stored set — including at least 3 analysed before this remediation — 100% show no chip row and no "Suggested" heading, and 0% show a partial row of one or two chips.
- **SC-013**: A salesperson unfamiliar with a given meeting can, from its three suggestions alone, learn three substantive facts about it they could not have guessed from the meeting title — verified across at least 5 meetings.

## Assumptions

- **This is a remediation slice, not a new capability**: the behaviour was specified in `specs/tae-96-dynamic-suggested-questions/` and remains in force. This specification changes only what is needed to make it observable, plus the reliability and diagnosability floor whose absence let the defect go undetected.
- **The defect is suppression, not substitution**: no fixed question list remains on any executing path. The hard-coded questions the report describes exist only in the design prototype used as the visual reference. The reproducible current behaviour is an absent chip row, and the requirements target that. If a build showing the old chips can be reproduced, that is a separate finding to be raised against this specification.
- **The length rule is the primary cause and must be re-derived, not merely loosened**: the correct ceiling is whatever the existing chip row can display within SC-007. Choosing that number is a planning decision, constrained here only by FR-006 and SC-007.
- **Suggestions remain stable per meeting**: generation happens once during analysis, so a meeting shows the same three questions on every open. "Varied" means across meetings, not across opens. Re-rolling on open, or sampling from a larger pool, remains out of scope.
- **Exactly three**: fixed by the existing chip row. Not user-configurable and not adaptive to transcript length.
- **No fallback content, ever** (decision recorded 2026-07-31): when a meeting-specific set is unavailable the chip row is hidden entirely. The request's wording permitted a generic fallback when suggestions are "genuinely unavailable"; that reading was considered and rejected, preserving `specs/tae-96-dynamic-suggested-questions/` FR-017 unchanged. A generic chip is not merely unhelpful — because the assistant answers only from this meeting, it reliably produces a refusal, which teaches the user the panel does not work. No chip is better than a chip that leads nowhere. This makes the no-suggestions path the common path on day one, which is why User Story 3 and SC-014 exist.
- **No backfill**: meetings analysed before this remediation ships gain suggestions only if re-analysed. Combined with the no-fallback decision above, those meetings show a panel with no chip row until they are re-analysed.
- **Service selection is inherited**: generation uses the AI service selection and configuration the analysis step already uses. A different service, model, or credential is out of scope. Adjusting request parameters so that a retry can differ from the attempt it replaces (FR-008) is in scope, since determinism is part of the defect.
- **Grounding material already exists**: the cleaned transcript and analysis output are produced and stored by the existing analysis step, unchanged by this work.
- **Suggestions inherit the meeting's retention** and are deleted with it. Separate expiry, archival, or redaction is out of scope.
- **Single-user application**: with one identity and no authentication, "the user's suggestions" and "the meeting's suggestions" are the same thing. Per-user personalisation is out of scope.
- **Visual design is settled**: the chip row's position, count, spacing, and styling are fixed by the canonical design prototype and the current implementation. Only where the text comes from, and how much of it fits, may change.
- **English-dominant content**: transcripts are expected to be predominantly English, and questions in the transcript's dominant language. Other languages are best-effort and outside the acceptance bar.
- **Verification requires real transcripts**: SC-001, SC-003, SC-004, and SC-013 cannot be met with synthetic fixtures alone, because the defect is specifically that real-world questions are rejected where contrived short ones would pass.

## Out of Scope

- Changing the assistant's answering, refusal, grounding, or persistence behaviour.
- Regenerating or refreshing suggestions on panel open, on a user action, on a timer, or via a "show me different questions" control.
- More or fewer than three suggestions, or a user-configurable count.
- Backfilling suggestions for meetings analysed before this remediation ships.
- Personalising suggestions to a user, role, team, or past behaviour.
- Suggested follow-ups generated after an answer, or mid-conversation refreshes.
- Tracking which suggestions users tap, or optimising suggestions from that data.
- Editing, pinning, hiding, or reordering suggestions.
- Changes to the analysis output contract, the scoring rubric, or the CRM commit step.
- Any new visual treatment for the chip row, including loading, empty, or error states.
- A generic fallback question list, a partial row of one or two chips, or any other substitute shown when a meeting-specific set is unavailable.
- Changing the design prototype, which is a reference artefact and not part of the running application.

## Dependencies

- Requires the grounded chat assistant (`specs/tae-96-grounded-chat-assistant/`) — suggestions are only verifiable via SC-003 because tapping one produces a grounded answer.
- Supersedes the delivery of `specs/tae-96-dynamic-suggested-questions/` while inheriting all of its requirements.
- Requires the existing analysis step to have produced a cleaned transcript and a complete analysis output for the meeting.
- Requires the existing AI service configuration already validated at application startup.
- Requires the meeting record to carry the stored set to the panel through the path that already carries the opening message's meeting context, so no request occurs on panel open.
- Requires a corpus of at least 10 varied real-length transcripts to verify SC-001, SC-003, SC-004, and SC-013.
