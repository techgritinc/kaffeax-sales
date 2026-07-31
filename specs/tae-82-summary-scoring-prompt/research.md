# Research: Summary Scoring & Prompt Engineering

**Feature**: tae-82-summary-scoring-prompt | **Date**: 2026-07-27

## R1: Prompt Strategy — System Prompt vs. User Content

**Decision**: Use a system prompt for instructions and the signal rubric; pass the transcript as the user message.

**Rationale**: The Claude API's `system` parameter is purpose-built for persistent instructions (output format, scoring rules, behavioral constraints). Mixing instructions into the user content risks the model treating instructions as part of the transcript. The system prompt stays constant per call (only the signal list varies); the user message is just the raw transcript text. This clean separation makes the prompt testable in isolation and keeps the summarizer's API call logic simple.

**Alternatives considered**:
- Single user message with instructions + transcript concatenated: Rejected — instruction-following degrades when instructions are buried in long content.
- Multi-turn conversation with instructions in a prior assistant turn: Rejected — unnecessary complexity, no benefit for single-shot summarization.

## R2: Transcript Delivery — Inline Text vs. File Upload

**Decision**: Pass the transcript as inline text content in the user message.

**Rationale**: Claude's context window (200K tokens for Claude Sonnet/Opus) handles typical sales meeting transcripts (30-90 min ≈ 5K-25K tokens) without issue. The transcript is already available as a plain text string from the database. Inline text keeps the implementation simple and avoids base64 encoding overhead.

**Alternatives considered**:
- File attachment (base64 PDF): Rejected — adds encoding overhead, no benefit for plain text transcripts.
- Chunked summarization for long transcripts: Deferred — not needed for typical meeting lengths. If transcripts exceed context limits, the system returns a structured error per FR-010.

## R3: Structured JSON Output — Enforcement Strategy

**Decision**: Use a system prompt that instructs JSON-only output, combined with Zod validation of the parsed response.

**Rationale**: Claude follows system prompt instructions reliably for structured output. The prompt explicitly states: return only valid JSON, no markdown fences, no commentary. The response is stripped of any accidental fences (defensive) and parsed with `JSON.parse` inside a try-catch. The parsed object is validated against the `AiSummaryResponseSchema`. This two-layer approach (prompt instruction + runtime Zod validation) gives high reliability without depending on beta features like `tool_choice: {type: "tool"}`.

**Alternatives considered**:
- Claude's tool-use/function-calling for forced JSON: Considered — viable but adds SDK complexity and doesn't generalize. Kept as a future optimization if JSON reliability drops below 95%.
- Returning markdown and parsing sections: Rejected — fragile, regex-dependent, doesn't scale to schema evolution.

## R4: Signal Simplification Format

**Decision**: Simplify rubric signals to `{ id, label, tier, hints? }` — include `hints` only when the source signal has a non-empty hints array.

**Rationale**: The full `RubricSignalFields` type includes fields the AI doesn't need (`source`, `isActive`, timestamps). Stripping them reduces prompt tokens. `hints` are included when present because they provide concrete keyword guidance that measurably improves detection accuracy for signals with ambiguous labels. When hints are absent, the label text alone is sufficient.

**Alternatives considered**:
- Pass full `RubricSignalFields` objects: Rejected — wastes tokens on irrelevant metadata.
- Pass only labels without IDs: Rejected — the AI must reference signal IDs in `detectedSignals` for correlation back to the rubric.
- Always include hints (even empty arrays): Rejected — empty arrays add token noise with no benefit.
- Always exclude hints: Rejected — hints measurably improve detection for signals with general labels.

## R5: Band Classification Logic — Where It Lives

**Decision**: The highest-tier-wins logic is a pure utility function `determineBand()` in `src/lib/utils/scoring.utils.ts`, not embedded in the prompt or the AI's responsibility.

**Rationale**: The classification rule is deterministic: if any hot signal detected → hot; else if any warm → warm; else cold. Implementing this in code eliminates the risk of the model miscategorizing when multiple tiers are present. The AI's job is to detect which signals are present and provide evidence. Band assignment is a post-processing step — the AI's advisory `leadScoreBand` output is compared for discrepancies and logged, but the code-computed band is authoritative.

**Note on camelCase**: Per §XVIII of the constitution, the AI response field is `leadScoreBand` (camelCase), not `lead_score_band`. The Zod schema enforces this.

**Alternatives considered**:
- Delegate band determination entirely to AI: Rejected — non-deterministic; the model could make inconsistent judgments across calls.
- Embed the rule in the prompt and verify in code: Rejected — redundant; code should be the authority, not the verifier.

## R6: Weight Configuration — Scope Boundary

**Decision**: Weight configuration (numeric score values per tier) is out of scope for this feature and is handled by a teammate.

**Rationale**: The user confirmed that weight storage belongs in the database and is part of the teammate's scope. The numeric score display (e.g., "98/100") in the prototype is deferred until the formula is confirmed with the client. This feature produces only the hot/warm/cold band classification. No weight constants, no weight repository, no numeric score calculation.

**Alternatives considered**:
- Store weights as constants: Rejected — contradicts "configurable without deployment" principle; user explicitly decided DB storage.
- Store weights in DB as part of this feature: Rejected — teammate scope boundary.

## R7: Prompt Template Architecture

**Decision**: The prompt builder is a single exported function `buildSummarizationPrompt(signals: SimplifiedSignal[])` in `src/integrations/claude/prompt.ts` that returns `{ system: string }`. The transcript is passed by the caller as the user message content.

**Rationale**: Separating prompt construction from the API call keeps the prompt independently testable. The function takes simplified signals and returns the system prompt string. The user message is just the transcript — no wrapping or template needed. This is Claude-specific (system prompt format, JSON instructions tailored to Claude's behavior).

**Alternatives considered**:
- Shared prompt builder for Claude and OpenRouter: N/A — OpenRouter is out of scope for this feature.
- Store prompt as a raw string with `${placeholder}` interpolation: Rejected — no type safety, harder to maintain as the schema evolves.
- Database-stored prompt template: Rejected — adds CRUD complexity for configuration that changes only during development.
