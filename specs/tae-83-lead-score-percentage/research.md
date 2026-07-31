# Research: Lead Score Percentage

**Feature**: TAE-83 Lead Score Percentage
**Date**: 2026-07-27

No external research required. All decisions derive from the existing codebase and the project constitution.

---

## Decision 1: Signal Weight Source — Database Field, Not Constants

**Decision**: `numericWeight: number` is stored in the database as a field on each `RubricSignalFields` document and propagated through `SimplifiedSignal`. No `SIGNAL_TIER_POINTS` constants file is created.

**Rationale**: The stated architectural principle for this project is that all signal-related information must come from the database, never from client-side hardcoded values. Storing `numericWeight` in the DB makes the scoring rubric fully configurable per deployment without code changes. Hardcoded constants would couple the scoring logic to a specific tier-to-points mapping, preventing future customization.

**Alternatives considered**:
- `src/constants/scoring.constants.ts` with `SIGNAL_TIER_POINTS = { hot: 10, warm: 6, cold: 2 }` — **rejected**: violates the stated principle that all signal data comes from the database; creates a hidden coupling between DB signal tiers and hardcoded point values.
- Inline tier-to-points lookup inside `computeScorePercentage()` — **rejected**: violates §XV (magic numbers) AND the DB-first principle.

---

## Decision 2: Utility Function Placement

**Decision**: Add `computeScorePercentage()` to the existing `src/lib/utils/scoring.utils.ts`.

**Rationale**: The file already contains `determineBand()` and `simplifySignals()`, both of which operate on the same `DetectedSignal[]` + `SimplifiedSignal[]` input shape. The new function is logically part of the same scoring utility module. Keeping them together avoids artificial fragmentation and lets the caller import both band and percentage from a single utility file.

**Alternatives considered**:
- New file `src/lib/utils/score-percentage.utils.ts` — rejected: unnecessary fragmentation; the functions are semantically coupled (both compute derived scoring values from the same inputs).

---

## Decision 3: Field Optionality on `TranscriptLeadScore`

**Decision**: Add `scorePercentage` as an **optional** field (`scorePercentage?: number`) on `TranscriptLeadScore`.

**Rationale**: `TranscriptLeadScore` is stored in MongoDB and the type is used when reading existing transcript documents. Making the field required would create a TypeScript error whenever a legacy document (without `scorePercentage`) is read from the database. Optional preserves backward compatibility with zero migration overhead. New analyses always populate the field; consumers that need it can guard with `?? 0` or check presence explicitly.

**Alternatives considered**:
- Required field `scorePercentage: number` — rejected: would require a MongoDB migration to backfill existing documents and would break TypeScript compilation in any code that constructs `TranscriptLeadScore` without the new field.

---

## Decision 4: Display Format is UI-Only

**Decision**: `scorePercentage` is stored and returned as a plain integer (e.g., `75`). The "X/100" display format (e.g., `"75/100"`) is applied in the UI rendering layer. No formatted string is stored or returned from the scoring utility or the summarizer.

**Rationale**: Separation of concerns — the data layer stores raw values, the presentation layer formats them. This allows future display changes (e.g., switching to `75%` or a progress bar) without touching the data model. Constitution §XV aligns with this: formatting is a UI concern.

**Alternatives considered**:
- Store a pre-formatted string `"75/100"` in `scorePercentage` — rejected: mixing presentation into data; breaks type safety (would need `string | number`), makes arithmetic on the value impossible.

---

## Decision 6: Shared Structured Analysis Pipeline

**Decision**: Extract the entire structured analysis pipeline (prompt building, JSON cleaning/parsing, schema validation, hallucination filtering, band + percentage computation, result assembly) into a single provider-agnostic utility `processStructuredResponse(rawText, signals)` in `src/lib/utils/structured-analysis.utils.ts`. Move `buildSummarizationPrompt()` from `src/integrations/claude/prompt.ts` into the same file. Delete `prompt.ts` after the move.

**Rationale**: Both integrations produce identical output from the same inputs — the only difference is HOW each calls the LLM (SDK stream vs `fetch`). Extracting the pipeline into a shared utility eliminates duplication, makes both summarizers thin wrappers (call LLM → pass raw text to shared utility), and ensures future scoring/parsing changes apply to both providers automatically. Moving the prompt builder out of the Claude integration directory places it in neutral territory per §VII (pure utility function), consistent with the existing `scoring.utils.ts` pattern.

**Alternatives considered**:
- Move only `buildSummarizationPrompt`, duplicate the rest — rejected: still duplicates JSON parsing, validation, and filtering; any future change requires two edits.
- Keep `buildSummarizationPrompt` in `src/integrations/claude/prompt.ts` and have OpenRouter cross-import from there — rejected: cross-integration imports are semantically wrong; the Claude integration directory should not be a dependency of OpenRouter.
- Create `src/integrations/shared/` directory — rejected: the constitution does not define this path; `src/lib/utils/` is the established home for shared pure utilities per §VII.

---

## Decision 5: Hallucinated Signal Exclusion

**Decision**: `computeScorePercentage()` takes the already-filtered `DetectedSignal[]` (post-hallucination-filter) as input. It does NOT re-apply hallucination filtering itself.

**Rationale**: The hallucination filter already runs in `transcript-summarizer.ts` before `determineBand()` is called. Applying it again in the percentage utility would be redundant and would couple the utility to a concern outside its scope. The caller (`summarizeStructured`) ensures only validated signals are passed in.

**Alternatives considered**:
- Re-apply filtering inside `computeScorePercentage()` — rejected: duplication of logic, violates single-responsibility; the utility should be a pure mathematical function.
