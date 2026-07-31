# Feature Specification: Summary Scoring & Prompt Engineering

**Feature Branch**: `feat/tae-82-summary-scoring-prompt-engineering`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Architect the prompt engineering layer and rubric-signal-driven scoring logic for the transcript summarization pipeline"

## Clarifications

### Session 2026-07-27

- Q: Where should weight configuration values (hot=20, warm=10, cold=5) live? → A: Store in the database — matches the "configurable without deployment" principle. Not hardcoded constants.
- Q: Should signal hints be included in the simplified signal payload sent to the AI? → A: Include hints only when they exist (skip empty arrays) — hybrid approach that improves detection without bloating the prompt.
- Q: What is the scope boundary for this feature? → A: Claude integration layer only. The server action and rubric signal fetching from the database are handled by a teammate. This feature receives the transcript and rubric signals as parameters to the summarizer. No server action, no repository, no OpenRouter integration, no DB fetching within this feature's scope.
- Q: What casing convention should the AI response JSON use? → A: camelCase everywhere — no snake_case in any data structures, JSON schemas, or AI response contracts. Constitution updated with this rule.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Summarize a Sales Meeting Transcript (Priority: P1)

A salesperson clicks the "Summarize" button on a transcript detail screen. The server action (built by a teammate) collects the transcript and the active rubric signals from the database, then passes both to the Claude `TranscriptSummarizer.summarize()` method. The summarizer constructs a prompt from the signals, calls the Claude API, validates the response, computes the lead score band, and returns a structured result containing a narrative overview, key points heard, topics covered, decisions made, action items with owners, attendees, and a hot/warm/cold lead classification with detected signal evidence and a rationale.

**Why this priority**: This is the core pipeline — without it, no summarization or scoring happens. Every downstream feature (review, CRM write-back, recap email) depends on this structured output.

**Independent Test**: Can be fully tested by calling `TranscriptSummarizer.summarize()` with a sample transcript string and an array of rubric signals, then verifying the returned object matches the expected structure with all required fields populated. No database or server action needed for testing.

**Acceptance Scenarios**:

1. **Given** a non-empty transcript and a list of rubric signals passed as parameters, **When** the summarize method is invoked, **Then** the system returns a structured object containing narrative, whatWeHeard, whatWasCovered, whatWasDecided, actionItems, attendees, lead score band, detected signals with evidence, and rationale.
2. **Given** a transcript where the prospect mentions challenges distributing coffee and frustration with listing channels, **When** the summarize method is invoked with hot signals including those phrases, **Then** the lead score band is "hot" and the detected signals array includes entries with evidence quoting the relevant transcript passages.
3. **Given** a transcript with no qualifying signals detected, **When** the summarize method is invoked, **Then** the lead score band is "cold", the detected signals array is empty, and the rationale explains that no qualifying signals were found.

---

### User Story 2 - Handle Edge Cases Gracefully (Priority: P1)

The summarizer handles all edge cases without crashing: zero signals provided, malformed AI responses, hallucinated signal IDs, and transcripts near the context window limit. Every error scenario returns a structured error response, never an unhandled exception.

**Why this priority**: P1 because the caller (server action) depends on the summarizer never throwing unexpectedly. Structured error responses let the caller decide how to handle failures (retry, display error, etc.).

**Independent Test**: Can be tested by calling the summarize method with edge-case inputs (empty signals array, deliberately malformed mock responses) and verifying structured error responses are returned.

**Acceptance Scenarios**:

1. **Given** an empty signals array, **When** the summarize method is invoked, **Then** the system produces a valid summary with a "cold" band and a rationale stating no scoring criteria were provided.
2. **Given** the AI returns malformed JSON, **When** the response is parsed, **Then** the system returns a structured error with `category: 'api_error'` and a user-friendly message.
3. **Given** the AI hallucinates a signal ID not in the input rubric, **When** the response is validated, **Then** the hallucinated signal is stripped from the detected signals array and a warning is logged.

---

### Edge Cases

- What happens when zero signals are provided? The system produces a valid summary but classifies the lead as "cold" with a rationale stating no scoring criteria were provided.
- What happens when the transcript is extremely long (e.g., a 2-hour meeting)? The system must handle transcripts up to the model's context window limit. If the transcript exceeds the limit, the system returns a structured error rather than truncating silently.
- What happens when the AI returns malformed JSON? The response must be validated against the expected schema. If validation fails, the system returns a structured error indicating the AI output could not be parsed.
- What happens when the AI hallucinates a signal that was not in the rubric? The prompt must instruct the model to only report signals from the provided list. Detected signals must reference a signal ID from the input rubric.
- What happens when multiple signal tiers are detected (e.g., 2 hot and 3 warm)? The highest tier wins: if any hot signal is detected, the band is "hot." If only warm and cold, it is "warm." If only cold, it is "cold."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `TranscriptSummarizer.summarize()` method MUST accept rubric signals as a parameter (via options or directly) alongside the transcript string.
- **FR-002**: System MUST construct a prompt that combines the transcript with the provided rubric signals and instructions for structured output generation.
- **FR-003**: System MUST accept rubric signals as a lightweight structure containing signal ID, label text, weight tier (hot/warm/cold), and hints (keyword array) when the signal has a non-empty hints array.
- **FR-004**: System MUST instruct the AI model to return a structured JSON response in camelCase matching the defined output schema — no markdown fences, no preamble, no commentary outside the JSON.
- **FR-005**: System MUST validate the AI response against the expected output schema (Zod) before returning it to the caller.
- **FR-006**: System MUST classify the lead score band using highest-tier-wins logic: hot if any hot signal detected, else warm if any warm signal detected, else cold.
- **FR-007**: System MUST include a rationale field in the lead score that cites the specific signals detected and explains the classification.
- **FR-008**: Each detected signal MUST include an evidence field quoting or paraphrasing the relevant portion of the transcript that triggered it.
- **FR-009**: System MUST extract all summary sections from the transcript: narrative overview, what was heard (prospect pain points/needs), what was covered (topics discussed), what was decided, action items with owners, and attendees with their side (company vs. prospect).
- **FR-010**: System MUST handle the case where zero signals are provided by producing a valid summary with a "cold" band and an appropriate rationale.
- **FR-011**: System MUST pass the transcript as inline text content in the API message, not as a file attachment.
- **FR-012**: All data structures, JSON schemas, and AI response contracts MUST use camelCase field names — no snake_case anywhere.
- **FR-013**: The summarizer MUST maintain backward compatibility — when no signals are provided, it falls back to the existing behavior (raw transcript, no structured parsing).

### Key Entities

- **Rubric Signal (input parameter)**: A simplified signal structure received as a parameter, containing signal ID, label text, weight tier (hot/warm/cold), and optional hints. This feature does not fetch signals from the database — it receives them from the caller.
- **Transcript Summary**: The structured AI output containing narrative, whatWeHeard, whatWasCovered, whatWasDecided, actionItems, and attendees.
- **Lead Score**: The classification result containing a band (hot/warm/cold), an array of detected signals with evidence, and a rationale string.
- **Prompt Template**: The engineered system prompt that instructs the AI on output format, scoring rules, and signal matching. Stored as a code module at `src/integrations/claude/prompt.ts`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Given a transcript containing known qualifying phrases, the system correctly identifies and returns matching signals with evidence in under 60 seconds for a typical meeting transcript.
- **SC-002**: The lead score band matches the highest-tier-wins rule in 100% of test cases where signal detection is correct.
- **SC-003**: The structured summary contains all required sections (narrative, whatWeHeard, whatWasCovered, whatWasDecided, actionItems, attendees) for every successfully processed transcript.
- **SC-004**: The AI response passes schema validation in at least 95% of summarization attempts (failures return a structured error, not a crash).
- **SC-005**: The system handles transcript lengths up to the model's context window without silent truncation or data loss.
- **SC-006**: All JSON response fields use camelCase naming — zero snake_case fields in the output.

## Assumptions

- The Claude API supports structured JSON output and can reliably follow system prompt instructions for output formatting.
- Transcripts are provided as plain text strings by the caller. Audio-to-text transcription is handled upstream and is not part of this feature's scope.
- The existing `TranscriptSummarizer` class in `src/integrations/claude/` will be extended to accept rubric signals and use the prompt template — not replaced.
- The prompt template will be stored as a TypeScript module (`src/integrations/claude/prompt.ts`) exporting a builder function, not as a database-stored string.
- The server action, rubric signal fetching from the database, and OpenRouter integration are handled by a teammate and are explicitly out of scope for this feature. This feature defines the signal input structure and consumes it.
- The numeric score display (e.g., "98/100") shown in the prototype is deferred. Only the hot/warm/cold band classification is implemented in this phase.
- The recap email draft generation (PRD §7.4) is a separate feature and not in scope for this specification.
- Zoho CRM write-back (PRD §7.5) is a separate feature and not in scope for this specification.
- Weight configuration storage in the database is handled by the teammate's scope, not this feature.
