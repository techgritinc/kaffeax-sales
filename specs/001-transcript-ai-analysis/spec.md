# Feature Specification: Transcript AI Analysis & Scoring

**Feature Branch**: `feat/tae-82-summary-scoring-prompt-engineering`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "Design a reliable prompt for structured transcript summarization and lead scoring with configurable rubric signals from the database, per-signal numeric point values, strict schema validation of AI responses, and a versioned prompt template stored in code."

## Clarifications

### Session 2026-07-24

- Q: How should the 0–100 score be calculated? → A: Sum of detected signal point values (each signal carries its own numeric `pointValue`), capped at 100
- Q: What contact fields are extracted from the transcript in this phase? → A: Email only — name, company, job title, and other contact fields are out of scope for this phase and deferred to a future requirement
- Q: Where is the numeric point value stored? → A: Per-signal `pointValue: number` field on each rubric-signal document — individual signals can carry different point values even within the same weight category
- Q: What content populates the Outlook email body when the Email button is clicked? → A: Formatted meeting summary — narrative paragraph + topics covered + decisions + action items with owners and due dates
- Q: Where should the prompt template be stored? → A: Versioned constant in a dedicated code file (e.g., `src/integrations/claude/prompt.ts`), version-controlled via git alongside the schema validator
- Q: How should the HOT/WARM/COLD band be determined? → A: Deterministic signal-presence rules — HOT = ≥1 hot-weight signal + next step agreed; WARM = ≥1 warm-weight signal or hot-weight signal without next step; COLD = no qualifying signals. Score is calculated separately and independently from band assignment.

## User Scenarios & Testing

### User Story 1 - Transcript Summarization (Priority: P1)

A sales representative completes a meeting and the raw transcript is available in the system. The system analyzes the full transcript using a versioned prompt template and produces a structured meeting dossier containing: a descriptive meeting title, a narrative summary paragraph, list of attendees with their roles (internal team vs. prospect), topics covered during the meeting, decisions made, action items with owners and due dates, commitments from each side, and any open questions. This dossier populates the review screen for the rep to review, edit, and approve.

**Why this priority**: The structured summary is the core value proposition — it transforms a raw transcript into an actionable meeting dossier the sales team can review and act on. Without this, the review screen has nothing to display.

**Independent Test**: Provide a sample meeting transcript and verify the review screen displays all sections (Summary, What we heard, What was covered, What was decided, Action items) with content accurately extracted from the transcript.

**Acceptance Scenarios**:

1. **Given** a complete meeting transcript is available, **When** the system processes it using the prompt template, **Then** a structured dossier is returned with all required sections populated
2. **Given** a transcript mentions attendee names and companies, **When** processed, **Then** attendees are correctly identified with their affiliation (internal team vs. prospect side)
3. **Given** a transcript contains discussions about next steps, deadlines, and responsibilities, **When** processed, **Then** action items are extracted with the correct owner and due date where mentioned
4. **Given** commitments are made by both sides during the meeting, **When** processed, **Then** each commitment is captured with the responsible party (internal team or prospect) correctly attributed
5. **Given** a very short transcript with minimal content, **When** processed, **Then** the system still returns a valid structure with available sections populated and empty lists for sections with no content

---

### User Story 2 - Lead Scoring Against Configurable Rubric (Priority: P1)

When a transcript is analyzed, the system fetches the currently active rubric signals from the database — each signal carries a weight category (hot/warm/cold), detection hints, and a numeric point value. The full rubric is injected into the prompt so the AI detects which signals are present in the transcript and extracts verbatim evidence for each. The system then applies deterministic banding rules to assign a lead score band (HOT, WARM, or COLD) and separately calculates a numeric score (0–100) by summing the point values of all detected signals, capped at 100.

**Why this priority**: Lead scoring drives the sales pipeline — it tells reps which prospects to prioritize. Without scoring, the system is a transcription tool, not a sales intelligence tool. Tied with P1 because the narrative summary itself references the score band.

**Independent Test**: Process a transcript containing clear buying signals against a rubric with known `pointValue` fields. Verify the correct band is assigned by the banding rules, and the numeric score equals the sum of detected signal point values (capped at 100).

**Acceptance Scenarios**:

1. **Given** a rubric with active hot-weight signals exists (each with a `pointValue`), **When** a transcript containing hot buying signals and an agreed next step is processed, **Then** the lead is scored HOT, matching signals are listed with evidence, and the numeric score equals the sum of their `pointValue` fields capped at 100
2. **Given** a rubric with warm-weight signals exists, **When** a transcript contains warm signals but no cold-overriding signals and no agreed next step, **Then** the lead is scored WARM with correct numeric score
3. **Given** a rubric exists, **When** a transcript contains no qualifying signals, **Then** the lead is scored COLD with a rationale explaining the absence of qualifying signals and a numeric score of 0
4. **Given** the rubric signals are updated by an administrator (signals added, removed, weights changed, or `pointValue` changed), **When** a new transcript is processed afterward, **Then** the scoring reflects the updated rubric — not a stale version
5. **Given** a signal is detected, **When** the evidence is displayed on the review screen, **Then** the evidence is a verbatim or near-verbatim excerpt from the actual transcript text
6. **Given** multiple signals are detected with different `pointValue` fields, **When** the score is calculated, **Then** the score equals the arithmetic sum of all detected signals' `pointValue` fields, capped at 100

---

### User Story 3 - Strict Response Validation (Priority: P2)

Every response from the AI analysis is validated against a strict schema before being stored or displayed. The schema defines the exact shape, types, and constraints of every field in the output — including required fields, enumerated values, array structures, and nested objects. If the response does not conform to the schema, it is rejected and the system handles the failure gracefully. The user sees a clear error state on the review screen, never corrupted or partially-rendered data.

**Why this priority**: Unreliable AI output can break the review screen and corrupt the database. Strict validation is the safety net that guarantees type consistency from the AI response through the database to the review screen. Without it, every downstream feature is fragile.

**Independent Test**: Process a known-good transcript and verify the response passes schema validation. Then simulate a malformed response (missing required fields, wrong types) and verify it is rejected with an appropriate error, and the user sees an error state on the review screen.

**Acceptance Scenarios**:

1. **Given** the AI returns a well-formed response matching the schema, **When** validation runs, **Then** the response passes and is stored in the database
2. **Given** the AI returns a response missing required fields (e.g., no narrative, no band), **When** validation runs, **Then** the response is rejected and a structured error is returned
3. **Given** the AI returns a response with incorrect types (e.g., a string where an array of action items is expected), **When** validation runs, **Then** the response is rejected
4. **Given** the AI returns a band value outside the allowed set (not hot/warm/cold), **When** validation runs, **Then** the response is rejected
5. **Given** validation fails, **When** the user views the transcript status, **Then** they see a clear error state — not blank, broken, or partially-rendered sections

---

### User Story 4 - Outlook Email Pre-fill (Priority: P3)

When the sales rep clicks the "Email" button on the review screen, the system opens the Outlook compose screen with the email body pre-filled with a formatted version of the meeting summary. The formatted body includes the narrative paragraph, topics covered, decisions reached, and action items with owners and due dates. No email is generated or stored by the system — the rep reviews the pre-filled content in Outlook and sends it manually.

**Why this priority**: Saves the rep time composing the follow-up email manually. Depends on the summary being complete (P1), making it a natural P3 that builds on the first story.

**Independent Test**: After a transcript is processed and the review screen is displayed, click the Email button and verify Outlook opens with the compose screen pre-filled with the correctly formatted meeting summary content matching the review screen data.

**Acceptance Scenarios**:

1. **Given** a processed transcript with a complete summary, **When** the rep clicks the Email button, **Then** Outlook opens with the compose screen and the body pre-filled with the formatted meeting summary
2. **Given** the pre-filled email body, **When** displayed in Outlook, **Then** it contains the narrative paragraph, topics covered, decisions, and action items with owners and due dates — in a readable, professional format
3. **Given** meeting-specific details (company name, attendee names, agreed next steps), **When** the email body is pre-filled, **Then** these details are referenced in the body — not generic placeholders
4. **Given** the Email button is clicked, **When** Outlook opens, **Then** no email is sent automatically — the rep is in full control of review and send

---

### User Story 5 - Prospect Email Extraction (Priority: P3)

The system attempts to extract the prospect's email address from the transcript. The extracted email carries a confidence level (high, medium, or low) indicating how explicitly it was stated. If no email is found or confidence is low, the field is flagged on the review screen for manual entry by the sales rep — the prospect's email is required for CRM entry. Name, company, job title, and all other contact fields are out of scope for this phase.

**Why this priority**: The prospect's email is needed for CRM entry downstream. It enhances the review screen but is not critical for the core summarization and scoring flow.

**Independent Test**: Process a transcript where the prospect states their email address clearly. Verify it is extracted with high confidence. Process another transcript where no email is mentioned and verify the email field is empty with low confidence, prompting manual entry.

**Acceptance Scenarios**:

1. **Given** a transcript where the prospect states their email address explicitly, **When** processed, **Then** the email field is extracted with high confidence
2. **Given** a transcript with no email address mentioned, **When** processed, **Then** the email field is empty with low confidence, prompting manual entry on the review screen
3. **Given** extracted email is displayed on the review screen with low confidence, **When** the rep views it, **Then** it is visually flagged as needing verification and presented as an editable input

---

### Edge Cases

- What happens when the transcript is empty or contains only filler words and greetings with no substantive content?
- How does the system handle a transcript that is extremely long (e.g., a 2-hour meeting with 50,000+ words)?
- What happens when the AI response is structurally valid but all content sections return empty arrays (no topics, no decisions, no signals)?
- What happens when zero rubric signals are active in the database at the time of processing? (Score = 0, band = COLD)
- How does the system handle intermittent AI service unavailability or timeout during processing?
- What happens when the same transcript is processed a second time — does it overwrite the previous analysis or create a new version?
- What happens when the sum of all detected signal `pointValue` fields exceeds 100? (Must be capped at 100)
- What happens when a detected signal's evidence spans multiple non-contiguous parts of the transcript?

## Requirements

### Functional Requirements

#### Prompt Template Design

- **FR-001**: The system MUST use a single, versioned prompt template stored as a constant in a dedicated code file (e.g., `src/integrations/claude/prompt.ts`) — the same template is applied to every transcript processed by the system
- **FR-002**: The prompt template MUST be structured in three parts: (1) system-level instructions defining the AI's role and output contract, (2) the rubric context block injected at runtime containing all active signals, and (3) the transcript block containing the raw meeting text
- **FR-003**: The prompt template MUST instruct the AI to return its response as a single, valid JSON object matching the defined output schema — no prose, no markdown, no additional commentary outside the JSON
- **FR-004**: The prompt template MUST include explicit instructions for each output section: meeting title, narrative, attendees, topics, decisions, action items, commitments, open questions, detected signals with evidence, scoring rationale, band, and contact extraction
- **FR-005**: The rubric context block injected into the prompt MUST include, for each active signal: the signal label, weight category (hot/warm/cold), numeric `pointValue`, and detection hints — fetched fresh from the database for each analysis run
- **FR-006**: The prompt template MUST instruct the AI on the banding rules explicitly, so it understands the scoring logic context: HOT requires ≥1 hot-weight signal + agreed next step; WARM requires ≥1 warm-weight signal or a hot-weight signal without a next step; COLD applies when no qualifying signals are detected

#### Transcript Summarization

- **FR-007**: System MUST accept a raw meeting transcript and produce a structured analysis containing all sections required by the review screen
- **FR-008**: System MUST generate a descriptive meeting title derived from the transcript content and the determined score band
- **FR-009**: System MUST produce a narrative summary paragraph that explains the meeting outcome and references the scoring result and why the specific band was assigned
- **FR-010**: System MUST extract a list of attendees with their names and affiliation (internal team or prospect side)
- **FR-011**: System MUST identify and list distinct topics covered during the meeting as concise summary points
- **FR-012**: System MUST identify and list decisions made or agreed upon during the meeting
- **FR-013**: System MUST extract action items, each with a description, the responsible owner, and a due date when mentioned in the transcript
- **FR-014**: System MUST extract commitments made by each side (internal team and prospect), each with the responsible party and a description
- **FR-015**: System MUST identify open questions or unresolved items that were raised but not answered during the meeting

#### Lead Scoring

- **FR-016**: System MUST fetch the complete set of currently active rubric signals from the database at the time of each analysis — never use a cached or stale rubric
- **FR-017**: System MUST include the full rubric in the prompt (signal labels, weight categories, `pointValue` fields, and detection hints) so signal detection reflects the current configuration
- **FR-018**: System MUST evaluate the transcript against each active rubric signal and determine which signals are present
- **FR-019**: For each detected signal, the system MUST extract a verbatim or near-verbatim evidence excerpt from the transcript text
- **FR-020**: System MUST apply deterministic banding rules to the set of detected signals to produce a final lead score band (hot, warm, or cold):
  - **HOT**: At least one hot-weight signal detected AND a concrete next step was agreed during the meeting
  - **WARM**: At least one warm-weight signal detected with no cold signals present, OR at least one hot-weight signal but no next step agreed
  - **COLD**: No qualifying signals detected, or only cold-weight signals present
- **FR-021**: System MUST calculate the numeric score (0–100) as the arithmetic sum of the `pointValue` fields of all detected signals, capped at a maximum of 100
- **FR-022**: The numeric score and the band are calculated independently — the band is determined by signal-presence rules (FR-020), not by score thresholds
- **FR-023**: System MUST produce a human-readable scoring rationale explaining why the specific band was assigned, referencing the detected signals and the applicable banding rule
- **FR-024**: Each detected signal in the output MUST reference its weight category (hot/warm/cold) from the rubric
- **FR-025**: System MUST verify the AI-reported band against the deterministic banding rules (FR-020) using the set of detected signals — if the AI's band does not match the deterministic calculation, the system MUST use the deterministic result

#### Contact Extraction

- **FR-026**: System MUST attempt to extract the prospect's email address from the transcript — name, company, job title, and all other contact fields are out of scope for this phase
- **FR-027**: The extracted email field MUST carry a confidence level (high, medium, or low) based on how explicitly the email address was stated in the transcript

#### Outlook Email Pre-fill

- **FR-028**: System MUST produce a formatted email body string from the processed summary, containing: the narrative paragraph, a bulleted list of topics covered, a bulleted list of decisions, and a numbered list of action items with owners and due dates
- **FR-029**: The formatted email body MUST reference meeting-specific details (company name, attendee names, agreed next steps) — not generic placeholder text
- **FR-030**: When the rep clicks the Email button on the review screen, the system MUST open Outlook via a mailto link with the pre-filled email body — no email is sent automatically by the system

#### Validation & Reliability

- **FR-031**: System MUST validate the complete AI response against a strict schema before storing it in the database
- **FR-032**: Schema validation MUST enforce correct types, required fields, enumerated values (band: hot/warm/cold, confidence: high/medium/low, attendee side: kaffeax/prospect), and array structures for every section of the output
- **FR-033**: System MUST reject any AI response that does not conform to the schema — malformed data MUST NOT reach the database or the review screen
- **FR-034**: System MUST handle validation failures gracefully: surface a structured error to the user and set the transcript status to `failed`

### Key Entities

- **Transcript**: A raw text record of a sales meeting conversation, associated with a user. Contains the original transcript text, the processed analysis (summary, lead score, contact), and metadata (source, status, timestamps). Does not store a recap email — email formatting happens at display time.
- **Rubric Signal**: A configurable buying indicator used to score transcripts. Contains a label describing the signal, a weight category (hot/warm/cold) indicating its band impact, a numeric `pointValue` (the points this signal contributes to the 0–100 score), a source category (client-identified or internally-proposed), detection hints to guide the AI in the prompt, and an active/inactive toggle. Managed via CRUD operations by administrators.
- **Detected Signal**: An instance of a rubric signal found in a specific transcript. Contains the signal identifier, label, weight category, `pointValue`, and a verbatim evidence excerpt from the transcript text.
- **Lead Score**: The scoring result for a transcript. Contains the band (hot/warm/cold), numeric score (0–100, calculated as sum of detected signal `pointValue` fields capped at 100), list of detected signals with evidence, and a human-readable rationale. Band and numeric score are calculated independently.
- **Prompt Template**: A versioned, reusable constant stored in `src/integrations/claude/prompt.ts`. Defines the system instructions, the structure for injecting the rubric context block and transcript block, and the exact JSON output contract. Applied identically to every transcript processed by the system.
- **Analysis Output**: The complete structured JSON result of processing a transcript — encompassing the summary sections, lead score, and prospect email extraction. This is the data contract between the AI analysis and the review screen.
- **Banding Rule**: The deterministic logic that maps a set of detected signal weight categories and meeting outcomes (next step agreed or not) to a final band assignment. Defined in application logic, not database-configurable. Applied to verify and override the AI's own band suggestion if they diverge.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 95% of processed transcripts produce a valid, schema-compliant output on the first analysis attempt
- **SC-002**: Users can view a complete, populated review screen within 60 seconds of initiating transcript processing
- **SC-003**: Detected signal evidence quotes are traceable to actual transcript content in 100% of cases — no fabricated evidence
- **SC-004**: Processing the same transcript with the same rubric produces the same lead score band in at least 95% of repeated runs
- **SC-005**: When a rubric signal is added, modified, deactivated, or its `pointValue` changed by an administrator, the very next transcript processed reflects the change
- **SC-006**: Schema validation catches 100% of structurally malformed responses before they reach the database
- **SC-007**: When processing fails (AI service unavailable, validation failure), users see a clear error state within 5 seconds — never a broken or partially-rendered review screen
- **SC-008**: The numeric score equals the arithmetic sum of detected signal `pointValue` fields capped at 100 — verifiable by summing the detected signals listed on the review screen
- **SC-009**: The analysis produces meaningfully different output for transcripts of different meetings — not formulaic boilerplate

## Assumptions

- Summarization, scoring, and contact extraction are performed together in a single analysis pass using the prompt template — the narrative depends on the score band, requiring everything to be determined in one coordinated request
- The AI detects signals and extracts content; the banding logic (mapping detected signals to a final band) is verified by deterministic application rules to ensure reproducibility and testability
- Banding rules are application logic, not database-configurable — the individual rubric signals, their weight categories, and their `pointValue` fields are CRUD-configurable by administrators, but the banding rules themselves are defined in code
- The numeric score is calculated by the application (not the AI) as the sum of detected signal `pointValue` fields capped at 100 — the AI is not asked to compute the final score
- No recap email is generated or stored — the Outlook email body is assembled from the structured summary at display time by the application, and the system opens Outlook via a mailto link when the Email button is clicked
- The rubric signal CRUD functionality already exists in the system via the RubricSignal model — this feature extends that model with a `pointValue` field and consumes the rubric for analysis
- All transcripts are in English
- The existing `TranscriptSummary` and `TranscriptLeadScore` types will need to be extended to accommodate the full output structure required by the review screen — specifically: meeting title on the transcript level, commitments with responsible side, and open questions
- The existing `TranscriptContact` type stores only `email?: string` — this phase does not add name, company, job title, or other contact fields; those are deferred to a future phase. The email field will be extended to carry a confidence level alongside the value.
- The existing `DetectedSignal` type will need a `weight` field to carry the signal's weight category and a `pointValue` field to carry the signal's numeric contribution at the time of detection
- The existing `RubricSignalFields` type will need a `pointValue: number` field added to store the numeric score contribution per signal
- There is no existing AI service integration in the codebase — the integration client, prompt template, and validation layer will be built as part of this feature
- The prompt template and the schema validator are co-located and must be updated together — the prompt defines what the AI returns, and the schema validates it
