# Data Model: Lead Score Percentage

**Feature**: TAE-83 Lead Score Percentage
**Date**: 2026-07-27

---

## Modified Entity: `TranscriptLeadScore`

**File**: `src/types/transcript.types.ts`

**Change**: Add optional `scorePercentage` field.

```
TranscriptLeadScore
├── band?:              LeadScoreBand         (existing — 'hot' | 'warm' | 'cold')
├── detectedSignals:    DetectedSignal[]       (existing)
├── rationale:          string                 (existing)
└── scorePercentage?:   number                 (NEW — integer 0–100)
```

**Validation rules**:
- `scorePercentage` is an integer in the range [0, 100] when present.
- `scorePercentage` is absent on legacy transcript documents that pre-date this feature.
- When present, `scorePercentage` is always set by the structured analysis path; it is never set by the unstructured (plain text) analysis path.

**MongoDB impact**: No migration required. `scorePercentage` is stored as a number sub-field of the `leadScore` embedded document. Existing documents simply lack the field; Mongoose returns `undefined` for missing optional fields.

---

## Modified Entity: `RubricSignalFields` + `SimplifiedSignal`

**Files**: `src/types/rubric-signal.types.ts` (both interfaces), `src/lib/db/models/rubric-signal.model.ts` (Mongoose schema)

**Change**: Add required `numericWeight` field.

```
RubricSignalFields (existing, extended)
├── signalId:       string        (existing)
├── label:          string        (existing)
├── weight:         SignalWeight  (existing — 'hot' | 'warm' | 'cold')
├── source:         SignalSource  (existing)
├── hints:          string[]      (existing)
├── isActive:       boolean       (existing)
└── numericWeight:  number        (NEW — integer ≥ 0; e.g., 10 for hot, 6 for warm, 2 for cold)

SimplifiedSignal (existing, extended)
├── id:             string        (existing)
├── label:          string        (existing)
├── tier:           SignalWeight  (existing)
├── hints?:         string[]      (existing)
└── numericWeight:  number        (NEW — copied from RubricSignalFields.numericWeight by simplifySignals())
```

**Rules**:
- `numericWeight` MUST be set when creating a new rubric signal — it is required at creation time.
- `numericWeight` is a plain integer ≥ 0. No negative values.
- `simplifySignals()` in `src/lib/utils/scoring.utils.ts` MUST propagate `numericWeight` into the output `SimplifiedSignal`.
- No data migration needed — the collection has no existing documents.

**Mongoose schema change** (`rubric-signal.model.ts`):
```
numericWeight: { type: Number, required: true, min: 0 }
```

---

## New Utility Function: `computeScorePercentage`

**File**: `src/lib/utils/scoring.utils.ts`

**Signature**:
```
computeScorePercentage(
  detectedSignals: DetectedSignal[],
  inputSignals:    SimplifiedSignal[],
): number
```

**Computation**:
```
totalPossible  = sum of numericWeight for every signal in inputSignals
detectedPoints = sum of numericWeight for every detected signal ID matched in inputSignals

if totalPossible === 0: return 0
return clamp(round((detectedPoints / totalPossible) × 100), 0, 100)
```

**Invariants**:
- Returns `0` when `inputSignals` is empty (totalPossible = 0).
- Returns `0` when `detectedSignals` is empty.
- Returns `100` when every signal in `inputSignals` is detected.
- Result is always a whole integer (rounded) in [0, 100].
- Pure function — no side effects, no async.

---

## New Shared Utility: `processStructuredResponse`

**File**: `src/lib/utils/structured-analysis.utils.ts` (NEW)

**Exports**:
1. `buildSummarizationPrompt(signals: SimplifiedSignal[]): { system: string }` — moved from `src/integrations/claude/prompt.ts` (that file is deleted)
2. `processStructuredResponse(rawText: string, signals: SimplifiedSignal[]): { summary: TranscriptSummary; leadScore: TranscriptLeadScore } | SummarizationError`

**Pipeline inside `processStructuredResponse`**:
```
rawText
  → strip ```json fences (clean raw LLM output)
  → JSON.parse
  → AiSummaryResponseSchema.safeParse  (Zod — returns SummarizationError on failure)
  → hallucination filter (strip detected signal IDs absent from signals[])
  → determineBand(filteredSignals, signals)
  → computeScorePercentage(filteredSignals, signals)
  → build TranscriptSummary + TranscriptLeadScore
  → return { summary, leadScore }
```

**Why it does NOT include `model` / `usage`**: Those values come from the LLM API response, which is provider-specific. Each integration adds them after receiving the return value and assembles the final `StructuredSummarizationResult`.

**Validation rules**:
- Returns a `SummarizationError` with `category: 'api_error'` if `JSON.parse` fails.
- Returns a `SummarizationError` with `category: 'api_error'` if `AiSummaryResponseSchema` validation fails.
- Hallucination warnings MUST be logged (same `console.warn` as current Claude implementation).
- Band discrepancy warnings MUST be logged when the computed band differs from the AI-suggested band.

---

## Relationships

```
TranscriptLeadScore.scorePercentage
    ← computed by computeScorePercentage(filteredSignals, inputSignals)
    ← filteredSignals = hallucination-filtered DetectedSignal[] (from AI response)
    ← inputSignals = SimplifiedSignal[] (from rubric, passed by caller; each carries numericWeight)

computeScorePercentage
    ← reads numericWeight directly from SimplifiedSignal objects (sourced from DB)
    ← called inside processStructuredResponse() in structured-analysis.utils.ts

SimplifiedSignal.numericWeight
    ← copied from RubricSignalFields.numericWeight by simplifySignals()
    ← RubricSignalFields.numericWeight stored in MongoDB (set at signal creation time)

processStructuredResponse(rawText, signals)
    ← called by BOTH Claude and OpenRouter TranscriptSummarizer after receiving raw LLM text
    ← calls determineBand() + computeScorePercentage() internally
    ← returns { summary, leadScore } — integrations add model + usage to build StructuredSummarizationResult

buildSummarizationPrompt(signals)
    ← called by BOTH integrations to build the system prompt before their LLM API call
    ← lives in src/lib/utils/structured-analysis.utils.ts (moved from claude/prompt.ts)
```
