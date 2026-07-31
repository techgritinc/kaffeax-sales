# Feature Specification: Lead Score Percentage

**Feature Branch**: `feat/tae-83-lead-score-percentage`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "I just got a confirmation about the numeric scoring, since we have all the things at place we have to configure that now, we have to show that in the percentage format such as if a summary is getting 5 hot points that will sum up to 100 so we can't show that as 100/100, we have to show the percentage out of 100. Let's carefully spec out this."

## Clarifications

### Session 2026-07-27

- Q: What are the point values for hot, warm, and cold tier signals? → A: hot = 10, warm = 6, cold = 2
- Q: What is the display format for the score in the UI? → A: "X/100" format (e.g., "75/100", "80/100") — denominator is always 100, not the raw max score
- Q: What is the exact field name for the numeric points value stored per signal in the Mongoose schema and on `SimplifiedSignal`? → A: `numericWeight` (field name `numericWeight: number`); hardcoded tier-weight constants are categorically prohibited — all signal point values come from the database
- Q: Does adding `numericWeight` require a data migration for existing rubric signal documents? → A: No migration — no documents exist in the collection yet; `numericWeight` MUST be set at creation time for all new signals going forward
- Q: Should the structured analysis pipeline be shared between the Claude and OpenRouter integrations, and where should the shared logic live? → A: Yes — extract a provider-agnostic shared utility (prompt building, JSON parsing/validation, hallucination filtering, result assembly) into `src/lib/utils/`; both integrations call their own LLM API, then call the same utility. OpenRouter is a first-class integration with identical structured analysis capabilities.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Percentage Score on Lead Result (Priority: P1)

A sales operations user reviews the output of a transcript analysis. The result currently shows a qualitative band (hot / warm / cold). They need to also see a numeric score displayed as "X/100" — for example, "80/100" — so they can understand precisely how much of the scoring rubric the prospect satisfied, not just which tier they fell into.

**Why this priority**: The band alone collapses nuance. Two prospects can both score "warm" but one triggered 4 out of 5 warm signals and the other only 1. The percentage exposes that gap immediately and is the primary deliverable of this feature.

**Independent Test**: Call the transcript analysis with a rubric containing N signals. Verify the returned lead score result includes a `scorePercentage` field that equals the correct ratio of detected-to-possible score, expressed as an integer 0–100.

**Acceptance Scenarios**:

1. **Given** a transcript analysed against a rubric of 5 signals and all 5 are detected, **When** the lead score result is produced, **Then** `scorePercentage` equals `100`.
2. **Given** a transcript analysed against a rubric of 5 signals and 4 are detected, **When** the lead score result is produced, **Then** `scorePercentage` equals the correct percentage for 4 out of 5 signals (e.g., 80 for equal-weight signals).
3. **Given** a transcript with no detected signals, **When** the lead score result is produced, **Then** `scorePercentage` equals `0`.
4. **Given** an empty rubric (no signals provided), **When** the lead score result is produced, **Then** `scorePercentage` equals `0`.

---

### User Story 2 - Percentage Reflects Tier Weighting (Priority: P2)

When the rubric contains signals of different tiers (hot, warm, cold), the percentage should reflect the relative importance of each tier — so detecting a hot signal contributes more to the score than detecting a cold signal, making the percentage a meaningful quality indicator rather than a simple count.

**Why this priority**: Without tier weighting the percentage loses alignment with the band logic. A cold-heavy rubric where all cold signals are detected should not score 100% if hot signals were missed. Tier weighting ensures the percentage is consistent with the qualitative band result.

**Independent Test**: Analyse a transcript against a mixed-tier rubric. Verify that detecting only the highest-tier signals produces a higher percentage than detecting only the lowest-tier signals, even when the raw count is identical.

**Acceptance Scenarios**:

1. **Given** a rubric with 2 hot and 3 cold signals, **When** only the 2 hot signals are detected, **Then** `scorePercentage` is higher than if only the 3 cold signals were detected.
2. **Given** all signals in a rubric are the same tier, **When** K out of N are detected, **Then** `scorePercentage` equals `round((K / N) × 100)`.

---

### Edge Cases

- What happens when the rubric is empty (no signals provided)? → `scorePercentage` MUST be `0`.
- What happens after hallucination filtering removes signals that the AI reported but were not in the rubric? → Filtered-out signals MUST NOT contribute to the detected count; only validated detected signals count.
- What happens if the computed raw percentage has a decimal (e.g., 33.33...)? → Round to the nearest whole integer.
- What happens when all signals are detected and the computed value exceeds 100 due to floating-point arithmetic? → Clamp at `100`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST compute a numeric `scorePercentage` (integer, 0–100 inclusive) alongside the existing band classification for every structured transcript analysis result.
- **FR-002**: `scorePercentage` MUST be derived from the ratio of the weighted score of detected signals to the total possible weighted score of all rubric signals, multiplied by 100 and rounded to the nearest whole number.
- **FR-003**: Signal numeric weights MUST be stored in the database as a `numericWeight: number` field on each rubric signal document (`RubricSignalFields`). The scoring computation MUST read `numericWeight` from the signal objects provided by the database — hardcoded tier-weight constants are categorically prohibited. Every signal MUST have `numericWeight` set at creation time.
- **FR-004**: `scorePercentage` MUST be `0` when the rubric contains no signals.
- **FR-005**: `scorePercentage` MUST be `0` when no signals from the rubric are detected in the transcript.
- **FR-006**: `scorePercentage` MUST be `100` when every signal in the rubric is detected.
- **FR-007**: The computation MUST be a pure, deterministic function — given the same detected signals and rubric signals, the result is always identical.
- **FR-008**: Hallucinated signals (IDs not present in the rubric) MUST be excluded from both numerator and denominator before the percentage is computed.
- **FR-009**: The computed result MUST be clamped to the range [0, 100] to guard against floating-point edge cases.
- **FR-010**: The score MUST be displayed in "X/100" format where X is the `scorePercentage` integer — the denominator is always 100, never the raw maximum score. For example, a score of 75 displays as "75/100", a score of 100 displays as "100/100".
- **FR-011**: Both the Claude and OpenRouter AI integrations MUST implement the full structured analysis path — producing `scorePercentage`, `band`, `detectedSignals`, and `rationale` — with identical behavior for the same inputs. The shared processing pipeline (prompt construction, response parsing, schema validation, hallucination filtering, band and score computation, result assembly) MUST NOT be duplicated across integrations; it MUST be extracted into a provider-agnostic utility callable by both.

### Key Entities

- **Lead Score Result** (existing, extended): The output object for a structured transcript analysis. Gains a new `scorePercentage: number` field alongside the existing `band`, `detectedSignals`, and `rationale`.
- **Signal Numeric Weight** (`numericWeight`): A numeric field added to `RubricSignalFields` and its Mongoose schema. Carries the actual point value assigned to that signal (e.g., 10 for a hot signal). Required on all new signals; propagated through `SimplifiedSignal` so the scoring utility reads it directly. No data migration needed — the rubric signal collection has no existing documents.
- **Rubric Signal** (`RubricSignalFields`, existing, extended): Gains a required `numericWeight: number` field in both the TypeScript interface (`src/types/rubric-signal.types.ts`) and the Mongoose schema. `SimplifiedSignal` also gains `numericWeight: number` so the field flows through to the scoring computation.
- **Shared Structured Analysis Utility** (new): A provider-agnostic pure utility that takes raw LLM response text and the rubric signals as input and returns a fully validated `StructuredSummarizationResult` or an error. Both the Claude and OpenRouter integrations call this utility after receiving raw text from their respective LLM API. Centralises: prompt construction, JSON parsing, schema validation, hallucination filtering, band determination, percentage computation, and result assembly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every structured analysis result that includes a lead score band also includes a `scorePercentage` value — no result omits the field. When displayed in the UI, the score appears as "X/100" (e.g., "75/100") with 100 always as the denominator.
- **SC-002**: For a rubric of N equal-weight signals with K detected, `scorePercentage` equals `round((K / N) × 100)` in 100% of cases.
- **SC-003**: For mixed-tier rubrics, detecting only high-tier signals always produces a higher or equal `scorePercentage` than detecting the same count of low-tier signals.
- **SC-004**: `scorePercentage` is always an integer in the range [0, 100] — no decimals, no values outside the range.
- **SC-005**: The percentage computation function produces identical output for identical inputs across all invocations.

## Assumptions

- The existing `determineBand()` logic and the hot/warm/cold band remain unchanged. `scorePercentage` is an additive field — it does not replace or alter the band classification.
- The percentage is computed server-side as part of the scoring utility layer, not calculated on the client.
- Signals in the rubric that are never detected still count toward the total possible score (denominator), so a low detection rate correctly yields a low percentage.
- The percentage is stored and returned as part of the `TranscriptLeadScore` data structure as a plain integer (0–100). Display formatting as "X/100" (e.g., "75/100") is a UI concern — the denominator rendered in the UI is always the literal string "100", not the computed raw maximum score.
- Signal point values are stored in the database as `numericWeight: number` on each rubric signal document. The scoring utility reads this field directly from the signal objects passed to it — no tier-based constants lookup occurs. Hardcoded weight constants are categorically prohibited.
- No data migration is required: the rubric signal collection contains no existing documents. `numericWeight` is a required field for all new signals created after this feature ships.
- When no rubric signals are supplied (unstructured analysis path), `scorePercentage` is not applicable and the field is absent from the result.
- Both the Claude and OpenRouter integrations are in scope for this feature. OpenRouter is used as the primary development and testing provider. All structured analysis logic that is not specific to the LLM API call itself (prompt construction, response parsing, schema validation, hallucination filtering, scoring, result assembly) is extracted into a shared utility callable by both integrations. The only per-integration difference is the mechanism used to send the prompt and receive raw text from the respective LLM API.
