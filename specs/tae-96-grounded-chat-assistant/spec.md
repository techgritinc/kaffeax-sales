# Feature Specification: Grounded Chat Assistant

**Feature Branch**: `feat/chat-panel`

**Created**: 2026-07-29

**Status**: Draft

**Input**: User description: "The application processes meeting transcripts from Zoom, Microsoft Teams, Webex, and Google Meet, and uses the Claude API or OpenRouter models (`TranscriptSummarizer`) to generate a structured meeting summary, action items, and lead scores based on a predefined scoring rubric. Currently, the right-hand assistant chatbot (`ChatPanel`) relies on client-side mock or canned responses (`cannedResponse`) and hardcoded context (`DEFAULT_CHAT_COMPANY` and `DEFAULT_CHAT_SIGNALS`). This implementation plan outlines the architecture, data flow, and design options for transforming the chatbot into a strictly context-aware, session-scoped assistant powered by the Claude API or OpenRouter in real time. The chatbot must answer questions exclusively using the current meeting's cleaned transcript and generated summary. It should explicitly refuse to answer questions outside this scope and must not rely on hallucinated or external knowledge. Strict Context Boundary (Grounding & Guardrail Prompt Design) vs. Hallucination Control — the chatbot must never generate responses using pre-trained external knowledge, such as general world facts, competitors not mentioned in the transcript, or generic sales advice."

## Clarifications

### Session 2026-07-29

- Q: Should the chat conversation survive a page reload / reopening the meeting later? → A: Persisted per meeting (changed from the earlier session-only decision)
- Q: Should the assistant remember earlier turns in the same conversation? → A: Stateless single-turn — persisted turns are restored for display only and are never sent to the AI
- Q: How should the answer appear in the panel? → A: Single response with the existing pending indicator; no progressive streaming
- Q: Ticket ID and spec directory → A: TAE-96, unchanged

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask a real question about the meeting on screen (Priority: P1)

A salesperson has just had a meeting analyzed and is reviewing the generated summary, action items, and lead score. Something in the summary is thin — they want to know what the prospect actually said about pricing. They open the follow-up panel, type "what did they say about pricing?", and receive an answer drawn from what was actually said in *this* meeting, with the specific words, numbers, and names that appeared in it.

**Why this priority**: This is the entire value of the feature. Today the panel returns pre-written text that is identical for every meeting, so any answer that looks correct is a coincidence. Without this story there is no product. With only this story, a user can interrogate their own meeting and get trustworthy answers — a complete, shippable slice.

**Independent Test**: Analyze two visibly different meetings, ask each the same question, and confirm the two answers differ and each reflects only its own meeting's content. Fully testable without refusal behaviour, error handling, or meeting-switching features.

**Acceptance Scenarios**:

1. **Given** a meeting has been analyzed and its summary is on screen, **When** the user asks a question whose answer appears in the meeting content, **Then** the assistant returns an answer whose every factual claim can be located in that meeting's transcript or analysis output.
2. **Given** a meeting where the prospect stated a specific figure, date, or name, **When** the user asks about it, **Then** the answer reproduces that detail exactly as stated rather than approximating or rounding it.
3. **Given** two different analyzed meetings, **When** the user asks the identical question of each, **Then** the two answers are different and each is specific to its own meeting.
4. **Given** the user submits a question, **When** the assistant is generating the answer, **Then** the panel shows a pending indicator, and the complete answer replaces it once ready.
5. **Given** a question about a topic that would belong to this meeting but was never actually discussed, **When** the user asks it, **Then** the assistant states the meeting did not cover it rather than producing a plausible-sounding answer.

---

### User Story 2 - Get refused, clearly, when the question leaves the meeting (Priority: P2)

The same salesperson asks "who are this roastery's biggest competitors?" — no competitor was ever named in the call — or "what's the best way to close a warm lead?" The assistant does not answer from general knowledge. It says plainly that it can only answer from this meeting's transcript and analysis, and that the question falls outside them.

**Why this priority**: This is the feature's core safety property and the reason it is being specified as its own body of work. An assistant that silently answers from pre-trained knowledge is worse than the canned responses it replaces, because its output is confident, meeting-shaped, and wrong — and it will be pasted into CRM notes. P2 rather than P1 only because the grounded-answer path must exist before refusals can be exercised against it.

**Independent Test**: Run a fixed set of out-of-scope questions (world facts, unnamed competitors, generic sales advice, other meetings, instruction-override attempts) against an analyzed meeting and confirm every one is refused rather than answered.

**Acceptance Scenarios**:

1. **Given** an analyzed meeting, **When** the user asks about a general world fact unrelated to the meeting, **Then** the assistant refuses and explains it can only answer from this meeting.
2. **Given** an analyzed meeting in which no competitor was named, **When** the user asks who the prospect's competitors are, **Then** the assistant states no competitors were named and supplies none from outside knowledge.
3. **Given** an analyzed meeting, **When** the user asks for generic sales coaching or best-practice advice, **Then** the assistant refuses rather than offering advice.
4. **Given** an analyzed meeting, **When** the user asks about a different meeting, a different prospect, or their overall pipeline, **Then** the assistant refuses and states it is scoped to the current meeting only.
5. **Given** a question that is partly answerable from the meeting and partly not, **When** the user asks it, **Then** the assistant answers the grounded part and explicitly identifies the part it cannot answer.
6. **Given** a question instructing the assistant to ignore its constraints, adopt a different persona, or answer from general knowledge, **When** the user submits it, **Then** the assistant maintains its scope restriction and refuses.
7. **Given** a transcript whose text happens to contain instructions addressed to an AI assistant, **When** any question is asked, **Then** the assistant treats that text as meeting content to report on, never as instructions to follow.

---

### User Story 3 - Each meeting keeps its own conversation (Priority: P3)

A salesperson reviews one meeting, asks two questions, then opens a different meeting from their recent list. The panel swaps to *that* meeting's conversation — restored if they have asked about it before, an empty opening state if they have not — and no message from the previous meeting remains visible. Coming back to the first meeting a day later, its two questions and answers are still there.

**Why this priority**: Prevents the most damaging class of confusion — attributing one prospect's words to another — while making the panel's history durable enough to be worth reading. Lower priority than the guardrail itself because it only becomes reachable once a user works across multiple meetings.

**Independent Test**: Ask a question about meeting A, switch to meeting B, confirm A's messages are gone and B's own conversation is shown, then switch back to A and confirm its conversation returned intact.

**Acceptance Scenarios**:

1. **Given** a conversation has taken place about one meeting, **When** the user opens a different meeting, **Then** the panel shows that meeting's own conversation — restored if one exists, otherwise the opening state — and no message from the previous meeting is visible.
2. **Given** the user has switched meetings, **When** they ask a question, **Then** the answer is grounded in the newly opened meeting only.
3. **Given** a conversation has taken place, **When** the user reloads the page and reopens that meeting, **Then** the conversation is restored in its original order with its original content.
4. **Given** a restored conversation is on screen, **When** the user asks a new question, **Then** the answer is grounded in the meeting content alone and is unaffected by the restored turns.
5. **Given** a meeting is open, **When** the panel's opening message is shown, **Then** it reflects that meeting's actual prospect and actual detected signals rather than fixed placeholder text.
6. **Given** a request is in flight, **When** the user switches meetings or closes the panel before it returns, **Then** the late answer is not rendered, and is never stored against the wrong meeting.

---

### User Story 4 - Failures say what happened (Priority: P3)

A question is asked while the AI service is rate-limited or unreachable. The user sees a clear, non-technical message telling them what went wrong and that they can retry — not a silent nothing, not a pending indicator that never resolves, and never a fabricated answer.

**Why this priority**: Required for the feature to be usable in real conditions, but the primary flows must exist before their failure modes can be handled.

**Independent Test**: Force service-failure, rate-limit, and timeout conditions and confirm each produces a distinct, user-appropriate message and a panel the user can retry from.

**Acceptance Scenarios**:

1. **Given** the AI service returns an error, **When** the user has asked a question, **Then** a user-friendly message appears in place of an answer and the user can ask again immediately.
2. **Given** the service is rate-limited, **When** the user asks a question, **Then** the message tells them to try again shortly without exposing service or system detail.
3. **Given** any failure, **When** the message is shown, **Then** it contains no stack traces, service or model identifiers, or internal system information.
4. **Given** a request is already in flight, **When** the user submits another question, **Then** the second submission is prevented until the first resolves.
5. **Given** empty or whitespace-only input, **When** the user submits, **Then** nothing is sent and nothing is added to the conversation.

---

### Edge Cases

- **No successful analysis for the open meeting**: analysis is still pending or has failed. The assistant must state it has nothing to answer from rather than answering from absent or partial content.
- **Analysis succeeded but a section is empty**: questions about that section must be answered as "not discussed", never filled in.
- **Question asks for an opinion or prediction** ("will they buy?"): the assistant confines itself to what was stated — timeline, budget, intent as spoken — and does not forecast.
- **Question asks why the lead scored as it did**: the assistant may explain using the recorded rationale and detected signals, since those are part of this meeting's analysis output, but must not invent scoring reasoning that was never recorded.
- **Very long transcript**: a transcript large enough to exceed what can be sent in one request. The assistant must either still answer correctly or state it cannot process a transcript of this size — it must never answer from a silently truncated portion while implying full coverage.
- **Question in a different language from the transcript**: the assistant answers in the question's language while still confining content to the meeting.
- **Self-contradictory meeting content**: the prospect states something then corrects it. Both must be surfaced rather than one silently chosen.
- **Repeated identical question**: asking the same thing twice must not produce contradictory answers.
- **Demo/sample transcript loaded**: behaves identically — grounded in whatever transcript is currently loaded, with no special-casing.
- **Sensitive detail in the question or transcript**: must never reach application logs. Note that a stored conversation contains transcript-derived content, so it inherits the same handling and retention expectations as the meeting record itself.
- **Extremely long single question**: must be either handled or rejected with a clear message, never silently truncated into a different question.
- **Meeting deleted while it has a stored conversation**: the conversation goes with it; nothing is left orphaned.
- **Very long stored conversation** (dozens of exchanges): reopening the meeting must still present the panel promptly and scroll correctly, with the most recent exchanges visible first.
- **Persistence fails while the answer succeeded**: the user still gets their answer; the turn may be absent when they return, and that is preferable to failing a good answer.

## Requirements *(mandatory)*

### Functional Requirements

**Grounding and answer content**

- **FR-001**: The assistant MUST answer using only the current meeting's cleaned transcript and its generated analysis output (summary narrative, what-we-heard, what-was-covered, what-was-decided, action items, attendees, lead score band, score percentage, rationale, and detected signals).
- **FR-002**: The assistant MUST NOT introduce any fact, name, figure, organisation, product, date, or claim that does not appear in the material named in FR-001.
- **FR-003**: The assistant MUST reproduce specific details — figures, dates, durations, names, distinctive phrasing — exactly as they appear in the meeting content, without rounding, approximating, or generalising.
- **FR-004**: When the meeting content does not contain the answer, the assistant MUST say so explicitly rather than producing a plausible answer.
- **FR-005**: The assistant MUST make its grounding visible in the answer — indicating what was said, or which part of the analysis the answer draws on — so the user can verify it against the meeting.
- **FR-006**: The assistant MUST NOT offer generic sales advice, coaching, methodology, or recommendations that are not restatements of what was decided or committed in the meeting.
- **FR-007**: The assistant MUST NOT provide opinions, predictions, or forecasts about the prospect or the deal.

**Refusal behaviour**

- **FR-008**: The assistant MUST refuse questions that cannot be answered from the current meeting's content, and the refusal MUST state that its scope is limited to this meeting.
- **FR-009**: A refusal MUST be presented as a successful response, matching the tone and presentation of a normal answer — not as an error state.
- **FR-010**: For a question that is partly in scope, the assistant MUST answer the in-scope portion and explicitly name the portion it cannot address.
- **FR-011**: The assistant MUST maintain its scope restriction when a question attempts to override it — including instructions to ignore prior rules, adopt another persona, or answer from general knowledge.
- **FR-012**: The system MUST treat the transcript and analysis output entirely as content to be reported on and never as instructions to be followed, regardless of what text they contain.

**Conversation scoping, persistence, and state**

- **FR-013**: The conversation MUST be scoped to the meeting currently open; opening a different meeting MUST replace the visible conversation with that meeting's own, and MUST never show a message belonging to another meeting.
- **FR-014**: The conversation MUST be persisted against its meeting and restored — in original order, with original content — whenever that meeting is reopened, including after a page reload. Only completed exchanges MUST be persisted: a question together with its answer or refusal. Operational failure notices MUST be shown live and MUST NOT be stored, so a restored conversation contains only exchanges that actually completed.
- **FR-015**: Each question MUST be answered independently, using only the meeting content and that question; earlier turns MUST NOT influence the answer.
- **FR-016**: Because turns are independent, a question that depends on an earlier turn (e.g. "and who owns that?") MUST be met with a request to restate it self-containedly rather than a guess at the referent.
- **FR-017**: An in-flight request MUST be abandoned if the open meeting changes or the panel closes before it returns: its answer MUST NOT be rendered, and MUST NOT be stored against any meeting other than the one the question was asked about. Storing it against the correct meeting is permitted and expected — the user may return to that meeting and find it there.
- **FR-031**: Restored turns MUST be display-only. They MUST NOT be sent to the AI, included in the grounding material, or influence any answer in any way (this is what keeps FR-015 true alongside FR-014).
- **FR-032**: A failure to persist a turn MUST NOT prevent the answer from being shown. The answer is delivered, the failure is logged, and the user is not shown an error for a successful answer.
- **FR-033**: A meeting's stored conversation MUST be removed when that meeting is deleted. No conversation may outlive its meeting.

**Panel behaviour and presentation**

- **FR-018**: All pre-written and placeholder response content MUST be removed — no answer shown to a user may originate from anywhere but a live response about the open meeting.
- **FR-019**: The panel's opening message MUST reflect the open meeting's actual prospect company and actual detected signals; the hardcoded placeholder company and signal text MUST be removed.
- **FR-020**: While a question is being answered the panel MUST show a pending indicator, replaced by the complete answer when it arrives.
- **FR-021**: The user MUST be prevented from submitting a new question while one is in flight.
- **FR-022**: Empty or whitespace-only submissions MUST be rejected without adding anything to the conversation.
- **FR-023**: Answers MUST remain readable at every supported viewport width, including the panel's mobile full-screen presentation, however long the answer is.
- **FR-024**: The panel MUST retain its existing visual design exactly — this feature changes where answers come from, not how the panel looks.

**Availability, errors, and observability**

- **FR-025**: When the open meeting has no successful analysis, the assistant MUST state it has nothing to answer from and MUST NOT attempt an answer.
- **FR-026**: Every failure — service unavailable, rate-limited, timed out, content too large, unusable response — MUST produce a distinct user-appropriate message and leave the panel usable.
- **FR-027**: User-facing messages MUST NOT expose stack traces, service or model identifiers, or any internal system detail.
- **FR-028**: Every question attempt, outcome, and failure MUST be logged with enough context to diagnose problems, and MUST NOT include transcript content, question text, personal data, or credentials.
- **FR-029**: The resource consumption of each answer MUST be recorded consistently with how the existing analysis step records its own, so the assistant's cost is measurable per meeting.
- **FR-030**: The assistant MUST remain unavailable during the capture stage, before any meeting has been analyzed, preserving current behaviour.

### Key Entities

- **Meeting Context**: The complete and only permitted grounding material for an answer — the current meeting's cleaned transcript plus its generated analysis output (summary sections, action items, attendees, lead score, rationale, detected signals). Assembled per question; never mixed across meetings.
- **Question**: One user-submitted, self-contained natural-language question about the open meeting.
- **Answer**: One response to a question — either *grounded* (every claim traceable to the Meeting Context, with the grounding surfaced) or a *refusal* (a statement that the question falls outside the Meeting Context). Both are successful outcomes.
- **Conversation**: The ordered sequence of question-and-answer *exchanges* belonging to one meeting. Persisted against that meeting and restored on reopen; each exchange carries the question, the response text, and whether that response was an answer or a refusal. Display-only — restored exchanges are shown to the user and never fed back into subsequent answers. Lifetime is bounded by its meeting's.
- **Failure Notice**: A user-safe message shown in place of an answer when a question could not be answered for operational reasons. Distinct from a refusal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across a 30-question evaluation set of in-scope questions spanning at least three different meetings, 100% of factual claims in the answers are locatable in that meeting's transcript or analysis output. Zero fabricated facts is the pass bar — a single fabrication fails the feature.
- **SC-002**: Across a 20-question adversarial set (world facts, unnamed competitors, generic sales advice, other meetings, instruction-override attempts), at least 95% are refused, and no refusal failure yields an answer containing outside-knowledge facts.
- **SC-003**: Asked about a topic genuinely absent from a meeting, the assistant states the meeting did not cover it in at least 95% of cases instead of producing an answer.
- **SC-004**: The same question asked of two different meetings yields two different, meeting-specific answers in 100% of trials — demonstrating no fixed responses remain anywhere in the path.
- **SC-005**: 95% of questions receive an answer within 10 seconds of submission, and 99% within 20 seconds.
- **SC-006**: 100% of failure conditions produce a visible non-technical message and a panel the user can immediately retry from; no condition leaves an unresolved pending indicator.
- **SC-007**: A salesperson unfamiliar with a given meeting can answer five factual questions about it using the panel alone, without opening the raw transcript, with 100% accuracy when checked against the transcript.
- **SC-008**: Zero occurrences of transcript content, question text, or personal data in application logs across the full evaluation run.
- **SC-009**: The cost of every answer is recorded and attributable, so per-meeting assistant cost can be reported without adding instrumentation.
- **SC-010**: The panel is visually indistinguishable from the current implementation at every supported viewport width, confirmed against the canonical design prototype.
- **SC-011**: A conversation of at least 10 question-and-answer exchanges (10 questions with their 10 responses) is restored in its original order with its original content in 100% of trials — after a page reload, and after switching away to another meeting and back.
- **SC-012**: Across the full evaluation run, no answer differs in content because a stored conversation was present — the same question on the same meeting yields the same grounded facts with an empty conversation and with one containing 10 prior exchanges.

## Assumptions

- **Ticket and scope**: This feature is TAE-96. It covers only the follow-up chat panel. The transcript analysis pipeline, the scoring rubric, and the CRM commit step are unchanged.
- **Grounding material already exists**: the cleaned transcript and the generated analysis are already produced and stored by the existing analysis step. This feature consumes them and does not change how they are produced.
- **Service selection is inherited**: the assistant uses the same AI service selection and configuration the existing analysis step already uses. A different service, a separate credential, or a per-user choice of service is out of scope.
- **Conversation is persisted per meeting** (confirmed decision, 2026-07-29): each meeting's conversation is stored against it and restored on reopen. Because the application is currently single-identity, "restored for the user" and "restored for anyone opening that meeting" are the same thing; per-user isolation arrives with authentication.
- **Each question is answered independently** (confirmed decision): prior turns are not carried forward, *including restored ones*. Persistence and memory are separate concerns here — the conversation is stored so the user can re-read it, not so the assistant can consult it. Follow-ups relying on pronouns or implied referents are answered with a request to restate rather than a guess.
- **No retention policy beyond the meeting's own**: a conversation lives as long as its meeting and is deleted with it. Time-based expiry, archival, and redaction are out of scope.
- **Answers are delivered complete** (confirmed decision): the panel shows its existing pending indicator, then the full answer. Progressive/streaming delivery is out of scope this iteration.
- **One question at a time**: no concurrent questions and no queueing. Beyond blocking concurrent submissions, per-user rate limiting and usage quotas are out of scope.
- **Single-user application**: the application currently operates with one identity and no authentication, so multi-user isolation of conversations is out of scope until authentication exists.
- **Retrieval strategy is unconstrained**: nothing here requires or forbids chunking, embedding, or selective retrieval over the transcript. Whether the whole transcript or a subset reaches the model is an architecture decision, bounded only by FR-005 and the very-long-transcript edge case.
- **Visual design is settled**: the panel's appearance is fixed by the canonical design prototype. Only content changes; no new visual direction is introduced.
- **Meeting sources are equivalent**: transcripts from Zoom, Microsoft Teams, Webex, and Google Meet are normalised into the same cleaned transcript before reaching this feature, so the assistant does not branch on source.
- **English-dominant content**: transcripts are expected to be predominantly English. Other languages are handled best-effort and are not part of the acceptance bar.

## Out of Scope

- Comparing or aggregating across multiple meetings, or answering pipeline-level questions.
- Any external lookup — CRM records, web search, company databases, or enrichment services.
- The assistant taking actions: editing the summary, changing the lead score, creating action items, sending email, or writing to the CRM.
- Voice input or spoken output.
- Conversation search, filtering, export, or editing/deleting individual turns (storage itself is in scope; managing what is stored is not).
- Time-based retention, archival, or expiry of stored conversations.
- Multi-turn conversational memory — the assistant never reads the stored conversation.
- Progressive/streaming answer rendering.
- Per-user rate limiting, quotas, or billing enforcement.
- Changes to the analysis prompt, the scoring rubric, or the analysis output contract.
- The source of the panel's suggested-question chips. FR-018 removes pre-written *answer* content; replacing the hard-coded chip list with AI-generated, meeting-specific suggestions is specified separately in `specs/tae-96-dynamic-suggested-questions/` (same ticket, follow-on slice). The chip row's placement and styling remain fixed by FR-024 either way.

## Dependencies

- A successfully analyzed meeting must exist for the assistant to have anything to ground on; the feature is unavailable before analysis completes.
- Requires the existing AI service configuration already validated at application startup.
- Requires the cleaned transcript and analysis output of the currently open meeting to be retrievable.

## Notes for Planning

The feature description asks for an evaluation of three architectural approaches to enforcing the strict context boundary, trading off latency, complexity, cost, and hallucination resistance. That comparison is deliberately absent here: this specification defines the required *behaviour* and the bar it must clear — SC-001 through SC-004 are the hallucination-control acceptance gates. The approach comparison belongs in the planning phase and should be resolved in `research.md`, evaluated against those criteria.
