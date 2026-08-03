# Feature Specification: AI-Generated Suggested Questions

**Feature Branch**: `feat/chat-panel`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "The suggested questions displayed in the chat panel are currently hard-coded in `chat-messages.tsx` using a static array (`What pricing did they mention?`, `Any competitor references?`, `Summarize next steps`). This approach should be replaced with dynamically generated AI suggestions. The application should generate three unique, relevant, and randomized suggested questions using AI, based on both the cleaned transcript and the AI-generated meeting summary (narrative, action items, key topics, decisions, important entities, other extracted meeting context). The suggestions should be generated once during transcript processing and displayed when the chatbot is opened for the first time. Pre-generate during workflow analysis so the chatbot makes no extra AI call when it loads: generate the summary, generate three suggested questions from the cleaned transcript and summary, and store both on the transcript record. Update `chat-messages.tsx` to remove the hard-coded array, render the stored questions as the suggestion chips, display exactly three, and gracefully handle cases where suggestions are unavailable by showing no chips or using an optional fallback strategy."

**Relationship to TAE-96 grounded chat assistant**: This specification is a follow-on slice of the same ticket and depends on `specs/tae-96-grounded-chat-assistant/`. That specification defines the assistant's grounding guarantee, its refusal behaviour, its per-meeting persisted conversation, and its stateless single-turn answering. This one defines only where the panel's *suggested question chips* come from. Every requirement below inherits that specification's constraints unchanged — in particular FR-018 (no pre-written response content may reach a user), FR-016 (each question must be self-contained because turns are independent), and FR-024 (the panel's visual design does not change).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open the panel and see questions worth asking (Priority: P1)

A salesperson finishes reviewing a freshly analyzed meeting and opens the follow-up panel for the first time. Beneath the opening message sit three suggested questions that are visibly about *this* meeting — they name the thing the prospect actually hesitated over, the commitment that was actually made, the topic that actually dominated the call. The user clicks one instead of composing a question, and gets a grounded answer immediately.

**Why this priority**: This is the whole feature. Today the same three generic chips appear on every meeting, so they are either irrelevant or coincidentally relevant, and a chip that leads to "that wasn't discussed in this meeting" actively teaches the user that the assistant is not worth using. With only this story shipped, the panel's first impression becomes meeting-specific and the chips become a working entry point into the assistant.

**Independent Test**: Analyze two visibly different meetings, open the panel on each, and confirm each shows three chips drawn from its own meeting's content, that the two sets differ, and that clicking any chip returns a grounded answer rather than a refusal.

**Acceptance Scenarios**:

1. **Given** a meeting that has been analyzed successfully, **When** the user opens the follow-up panel for the first time, **Then** exactly three suggested questions are shown beneath the opening message, and each one refers to something present in that meeting's transcript or analysis output.
2. **Given** two different analyzed meetings, **When** the user opens the panel on each, **Then** the two sets of three suggestions are different from each other.
3. **Given** the three suggestions shown for one meeting, **When** they are read together, **Then** each asks about a different aspect of the meeting — no two are restatements of the same question.
4. **Given** a suggested question is displayed, **When** the user clicks it, **Then** it is submitted exactly as if the user had typed it, and the assistant returns a grounded answer rather than stating the topic was not discussed.
5. **Given** the user opens the panel, **When** the suggestions appear, **Then** they are already present with the opening message — no loading state, placeholder chips, or delay precedes them.
6. **Given** a meeting is re-analyzed, **When** the user opens the panel afterwards, **Then** the suggestions reflect the new analysis rather than the previous one.

---

### User Story 2 - The panel is never broken by missing suggestions (Priority: P2)

A salesperson opens the panel on a meeting analyzed before this feature existed, or on one where suggestion generation failed. The panel opens normally: opening message, input, everything usable. There is simply no suggestion row — and no generic placeholder chip pretending to be about this meeting.

**Why this priority**: Suggestions are an accelerator, not a prerequisite. Every meeting already analyzed in the system predates this feature, so the no-suggestions path is the *common* path on day one, not an exotic edge. It must be visibly deliberate rather than a broken-looking gap.

**Independent Test**: Open the panel on a meeting record with no stored suggestions and on one where generation was forced to fail; confirm both open cleanly with no suggestion row, no empty heading, and a fully usable input.

**Acceptance Scenarios**:

1. **Given** an analyzed meeting with no stored suggestions, **When** the user opens the panel, **Then** no suggestion row and no "Suggested" heading are shown, and the rest of the panel is unchanged and fully usable.
2. **Given** suggestion generation failed while the meeting analysis succeeded, **When** the user views the meeting, **Then** the analysis is presented as successful and no error or warning about suggestions is shown anywhere in the interface.
3. **Given** fewer than three usable suggestions were produced for a meeting, **When** the user opens the panel, **Then** no suggestion row is shown at all rather than one or two chips.
4. **Given** the panel has no suggestion row, **When** the user types their own question, **Then** the assistant behaves exactly as it does for a meeting that has suggestions.

---

### User Story 3 - Suggestions belong to the meeting, not the session (Priority: P3)

A salesperson asks a question, switches to a different meeting, and comes back a day later. The first meeting still shows its own conversation; the second showed its own three suggestions. Nothing from one meeting's suggestions ever appears while another meeting is open, and reopening a meeting the user has already talked to does not top its restored conversation with a fresh set of chips.

**Why this priority**: Prevents the same cross-meeting confusion the parent specification guards against, and keeps the opening state honest for meetings that already have history. Reachable only once a user works across meetings or returns to one, so it follows the two stories above.

**Independent Test**: Show suggestions on meeting A, switch to meeting B, confirm B shows its own three and none of A's; ask a question on A, reopen A, and confirm the restored conversation is shown without a fresh suggestion row.

**Acceptance Scenarios**:

1. **Given** the panel is showing one meeting's suggestions, **When** the user opens a different meeting, **Then** the suggestions are replaced by that meeting's own, and no suggestion from the previous meeting remains visible.
2. **Given** a meeting whose conversation was persisted earlier, **When** the user reopens it, **Then** the restored conversation is shown and no suggestion row is prepended to it.
3. **Given** the capture stage before any analysis has run, **When** the user is on screen, **Then** no suggestions are shown, consistent with the assistant being unavailable at that stage.
4. **Given** a meeting is deleted, **When** its record is removed, **Then** its stored suggestions are removed with it and nothing is left orphaned.

---

### Edge Cases

- **Very short or near-empty transcript**: not enough content to ask three distinct meaningful questions. No suggestion row is shown rather than three padded or generic questions.
- **Analysis produced empty sections** (nothing decided, no action items): suggestions must come only from the sections that do have content, and must not ask about a section that is empty — a chip must never lead to "not discussed".
- **Very long transcript**: the same grounding size ceiling as the assistant applies. Suggestion generation must either succeed or be abandoned quietly; a partially-read transcript must not silently produce suggestions implying full coverage.
- **AI returns a malformed set**: fewer than three, more than three, duplicates, empty strings, prose instead of questions, or a wrapped/annotated response. The set is rejected as a whole and nothing is stored.
- **AI returns questions that are not grounded** (asks about something absent from the meeting): treated as a defect against FR-006 and caught by SC-002, since such a chip produces a refusal.
- **Transcript containing text addressed to an AI assistant**: treated purely as meeting content to derive questions from, never as instructions to follow.
- **Suggestion contains a name, figure, or sensitive detail from the meeting**: acceptable — it is meeting-derived content, and it inherits the meeting record's handling and retention expectations. It must never reach application logs.
- **Unusually long suggestion, a single unbroken long word, quotes, or non-Latin characters**: must not break the chip row's layout at any supported viewport width.
- **Suggestion generation is slow**: it must not extend the analysis wait beyond the agreed bound, and must not be the reason an otherwise complete analysis appears to hang.
- **Re-analysis of a meeting**: the previous set is replaced entirely, never merged with or appended to the new one.
- **Chip clicked while a question is already in flight**: blocked exactly as a typed submission is.
- **Chip clicked twice**: behaves as asking the same question twice — the same submission rules and the same answer expectations apply.
- **Meeting analyzed before this feature existed**: no stored suggestions, no row, no backfill.

## Requirements *(mandatory)*

### Functional Requirements

**Generation timing and lifecycle**

- **FR-001**: Suggested questions MUST be generated once, during the meeting's AI analysis step, after the meeting summary and lead score are available.
- **FR-002**: Suggested questions MUST be stored against the meeting record alongside its analysis output, and MUST be available to the panel without any AI request at the time the panel opens.
- **FR-003**: Opening, closing, or reopening the panel MUST NOT trigger suggestion generation, and MUST NOT change the stored suggestions.
- **FR-004**: Re-analyzing a meeting MUST replace its stored suggestions completely with a newly generated set.
- **FR-005**: A meeting's stored suggestions MUST be removed when that meeting is deleted.

**Suggestion content and quality**

- **FR-006**: Every generated suggestion MUST be answerable from that meeting's cleaned transcript or analysis output alone — a suggestion whose answer is not present in the meeting content is a defect, because the assistant will refuse it.
- **FR-007**: Suggestion generation MUST draw on both the cleaned transcript and the full analysis output (summary narrative, what-we-heard, what-was-covered, what-was-decided, action items, attendees, lead score band, score percentage, rationale, and detected signals).
- **FR-008**: A stored set MUST contain exactly three suggestions.
- **FR-009**: The three suggestions in a set MUST be distinct from one another — no duplicates and no rephrasings of the same question — and MUST each address a different aspect of the meeting.
- **FR-010**: Each suggestion MUST be self-contained and answerable on its own, with no pronouns or references that depend on another suggestion or on an earlier conversation turn, because the assistant answers every question independently.
- **FR-011**: Each suggestion MUST be phrased naturally, in the concise style a salesperson would use, and MUST be short enough to sit in the existing chip row without altering the panel's layout.
- **FR-012**: Suggestions MUST vary across meetings — the same three questions MUST NOT be produced for meetings with materially different content, and generic questions that would fit any meeting MUST NOT be produced.
- **FR-013**: The transcript and analysis output MUST be treated entirely as content to derive questions from, and never as instructions to follow, regardless of what text they contain.
- **FR-014**: A generated set MUST be validated before it is stored — count, distinctness, non-emptiness, and length — and a set failing validation MUST be discarded whole rather than stored partially.

**Panel presentation**

- **FR-015**: The hard-coded suggestion array MUST be removed; no suggestion shown to a user may originate from anywhere but that meeting's stored, generated set.
- **FR-016**: When a meeting has a stored set, the panel MUST render its three suggestions in the existing chip row, in the position, order, and visual style the panel already uses.
- **FR-017**: When a meeting has no stored set, the panel MUST render no chip row and no "Suggested" heading, and MUST NOT substitute placeholder, generic, or previously-used suggestions.
- **FR-018**: Suggestions MUST accompany the opening message only; a restored conversation MUST NOT be prepended with a suggestion row.
- **FR-019**: Clicking a suggestion MUST submit it exactly as a typed question of the same text, subject to the same in-flight blocking rules.
- **FR-020**: Suggestions MUST be scoped to the meeting currently open; opening another meeting MUST replace them, and a suggestion belonging to another meeting MUST never be visible.
- **FR-021**: The panel MUST retain its existing visual design exactly — this feature changes where the chip text comes from, not how the panel looks.

**Resilience, cost, and observability**

- **FR-022**: A failure to generate, validate, or store suggestions MUST NOT fail the meeting analysis: the summary, lead score, and analysis status MUST be recorded exactly as they are today.
- **FR-023**: A suggestion failure MUST NOT surface any error, warning, or empty state to the user beyond the absence of the chip row.
- **FR-024**: Suggestion generation MUST NOT delay the analysis result beyond the bound in SC-005, and MUST NOT be able to leave the analysis step unresolved.
- **FR-025**: Any AI resource consumption for suggestion generation MUST be recorded consistently with how the analysis step records its own, so per-meeting cost remains complete and attributable.
- **FR-026**: Generation attempts, outcomes, and failures MUST be logged with enough context to diagnose problems, and MUST NOT include transcript content, analysis content, generated suggestion text, personal data, or credentials.

### Key Entities

- **Suggested Question Set**: Exactly three self-contained natural-language questions belonging to one meeting, derived from that meeting's cleaned transcript and analysis output. Produced once during analysis, replaced wholesale on re-analysis, read-only thereafter. Lifetime is bounded by its meeting's. A meeting either has a complete set of three or has none — never a partial set.
- **Suggestion Source Material**: The meeting's cleaned transcript plus its complete analysis output — the same material that grounds the assistant's answers. It is the only permitted basis for a suggestion, which is what makes every suggestion answerable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of meetings whose analysis completes successfully after this feature ships either have exactly three stored suggestions or have none — no meeting has one or two.
- **SC-002**: Across at least 10 analyzed meetings (30 suggestions), at least 29 of 30 suggestions receive a grounded answer from the assistant rather than a refusal or a "not discussed in this meeting" response. A chip that leads to a refusal is counted as a failure.
- **SC-003**: Across the same 10 meetings, no suggestion text appears verbatim in more than two of the ten sets, and every set of three is internally distinct in 100% of cases.
- **SC-004**: Suggestions are visible in the same render as the opening message in 100% of panel opens, with no measurable additional wait compared with the current hard-coded chips.
- **SC-005**: Suggestion generation adds no more than 5 seconds to the analysis wait at the 95th percentile, and the analysis step never fails or hangs because of it — 100% of forced suggestion failures still produce a successful analysis.
- **SC-006**: With suggestion generation forced to fail, 100% of affected meetings still open the panel cleanly with no chip row, no heading, and no user-visible error.
- **SC-007**: A salesperson unfamiliar with a given meeting can, using only the three suggestions, learn three substantive facts about that meeting that they could not have guessed from the meeting title alone — verified across at least 5 meetings.
- **SC-008**: The panel is visually indistinguishable from the current implementation at 1440px, 1100px, 900px, and 560px in both the has-suggestions and no-suggestions states, confirmed against the canonical design prototype; the chip row never wraps to more than two lines and never causes horizontal overflow.
- **SC-009**: Zero occurrences of transcript content, analysis content, or generated suggestion text in application logs across the full evaluation run.
- **SC-010**: The AI cost of suggestion generation is recorded and attributable per meeting, so per-meeting cost reporting remains complete without adding instrumentation.
- **SC-011**: Zero user-visible suggestions originate from a fixed list — confirmed by finding no hard-coded suggestion text anywhere in the delivered feature and by SC-003.

## Assumptions

- **Ticket and scope**: This is a follow-on slice of TAE-96 and depends on the grounded chat assistant specified in `specs/tae-96-grounded-chat-assistant/`. It changes only the source of the panel's suggestion chips. The assistant's answering behaviour, refusal behaviour, persistence, and stateless single-turn model are unchanged.
- **Suggestions are stable per meeting, not per open** (interpreting "randomized"): because generation happens once during analysis, a given meeting shows the same three suggestions every time it is opened. "Fresh" and "varied" therefore mean *across meetings*, not across opens of the same meeting. This is the direct consequence of pre-generating, which the request selected for its latency and cost benefits. Re-rolling suggestions on each open, or generating a larger pool and sampling three per open, is out of scope.
- **Exactly three**: the count is fixed at three to match the existing chip row. It is not user-configurable and does not adapt to transcript length.
- **No fallback content**: when a set is unavailable the row is hidden entirely. A generic fallback list is deliberately rejected — it would reintroduce the pre-written content the parent specification requires be removed, and a chip that is not about this meeting is worse than no chip.
- **No backfill**: meetings analyzed before this feature ships keep no suggestions and are not regenerated in bulk. They gain suggestions only if re-analyzed.
- **Service selection is inherited**: suggestion generation uses the same AI service selection and configuration the analysis step already uses. A different service, model, or credential for suggestions is out of scope.
- **Whether generation is a separate AI request or folded into the existing analysis request is an architecture decision**, unconstrained here and to be resolved in planning. This specification requires only that it happen during analysis, that its cost be recorded, that its failure be isolated, and that it not exceed the SC-005 latency bound.
- **Grounding material already exists**: the cleaned transcript and the analysis output are produced and stored by the existing analysis step. This feature consumes them and does not change how they are produced or what they contain.
- **Suggestions inherit the meeting's retention**: they live as long as the meeting record and are deleted with it. Separate expiry, archival, or redaction is out of scope.
- **Single-user application**: with one identity and no authentication, "the user's suggestions" and "the meeting's suggestions" are the same thing. Per-user personalisation of suggestions is out of scope until authentication exists.
- **Visual design is settled**: the chip row's position, count, spacing, and styling are fixed by the canonical design prototype and by the current implementation. Only the text changes.
- **English-dominant content**: transcripts are expected to be predominantly English, and suggestions are expected in the transcript's dominant language. Other languages are best-effort and not part of the acceptance bar.

## Out of Scope

- Changing the assistant's answering, refusal, grounding, or persistence behaviour in any way.
- Regenerating or refreshing suggestions on panel open, on a user action, on a timer, or via a "show me different questions" control.
- More or fewer than three suggestions, or a user-configurable count.
- Backfilling suggestions for meetings analyzed before this feature ships.
- Personalising suggestions to a user, role, team, or past behaviour.
- Suggested follow-up questions generated *after* an answer, or mid-conversation suggestion refreshes.
- Tracking which suggestions users click, or optimising suggestions from that data.
- Editing, pinning, hiding, or reordering suggestions.
- Changes to the analysis prompt's summary or scoring output contract, the scoring rubric, or the CRM commit step.
- Any new visual treatment for the chip row, including loading, empty, or error states.

## Dependencies

- Requires the grounded chat assistant (TAE-96, `specs/tae-96-grounded-chat-assistant/`) — suggestions are only useful, and only verifiable via SC-002, because clicking one produces a grounded answer.
- Requires the existing analysis step to have produced a cleaned transcript and a complete analysis output for the meeting.
- Requires the existing AI service configuration already validated at application startup.
- Requires the meeting record to carry the stored suggestions to the panel through the path that already carries the opening message's meeting context, so no new fetch occurs on panel open.
