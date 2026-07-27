# Contract: Lead Score Result Shape

**Feature**: TAE-83 Lead Score Percentage
**File**: `src/types/transcript.types.ts` + `src/types/claude.types.ts`
**Date**: 2026-07-27

---

## Updated `TranscriptLeadScore`

This is the shape returned by `StructuredSummarizationResult.leadScore` after this feature ships.

```typescript
interface TranscriptLeadScore {
  band?: LeadScoreBand;          // 'hot' | 'warm' | 'cold'
  detectedSignals: DetectedSignal[];
  rationale: string;
  scorePercentage?: number;      // NEW — integer 0–100; absent on legacy documents
}
```

### Consumer behaviour

Consumers of `TranscriptLeadScore` that need the percentage MUST guard for absence:

```typescript
// Safe read
const score = leadScore.scorePercentage ?? 0;

// Display format (UI layer only)
const display = `${score}/100`;   // e.g. "75/100"
```

The display string `X/100` is NEVER stored; it is assembled at render time.

---

## `StructuredSummarizationResult` (unchanged shape, field now populated)

```typescript
interface StructuredSummarizationResult {
  success: true;
  summary: TranscriptSummary;
  leadScore: TranscriptLeadScore;   // leadScore.scorePercentage is now always set
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}
```

When the structured analysis path runs (i.e., `options.signals` is provided), `leadScore.scorePercentage` is **always** present and is an integer in [0, 100].

---

## `processStructuredResponse` function contract (NEW — shared utility)

**File**: `src/lib/utils/structured-analysis.utils.ts`

```typescript
function processStructuredResponse(
  rawText: string,             // raw LLM output text (may contain ```json fences)
  signals: SimplifiedSignal[], // full rubric from DB; each carries numericWeight: number
): { summary: TranscriptSummary; leadScore: TranscriptLeadScore } | SummarizationError
// Pure, synchronous, deterministic
// Called by both Claude and OpenRouter summarizers
```

**Internal pipeline** (in order):
1. Strip ` ```json ` fences from `rawText`
2. `JSON.parse` → `SummarizationError { category: 'api_error' }` on failure
3. `AiSummaryResponseSchema.safeParse` → `SummarizationError { category: 'api_error' }` on Zod failure
4. Filter out hallucinated signal IDs (IDs not present in `signals`) — log each via `console.warn`
5. `determineBand(filteredSignals, signals)` — log discrepancy vs AI-suggested band via `console.warn` if they differ
6. `computeScorePercentage(filteredSignals, signals)`
7. Assemble and return `{ summary: TranscriptSummary, leadScore: TranscriptLeadScore }`

**Integration caller pattern** (both Claude and OpenRouter):
```typescript
// After receiving rawText from LLM:
const processed = processStructuredResponse(rawText, signals);
if (!processed.success) return processed; // SummarizationError passthrough
return {
  success: true,
  summary: processed.summary,
  leadScore: processed.leadScore,
  model: llmResponse.model,
  usage: { inputTokens: ..., outputTokens: ... },
} satisfies StructuredSummarizationResult;
```

---

## `buildSummarizationPrompt` function contract (MOVED to shared utility)

**File**: `src/lib/utils/structured-analysis.utils.ts` (moved from `src/integrations/claude/prompt.ts`)

```typescript
function buildSummarizationPrompt(signals: SimplifiedSignal[]): { system: string }
// Pure, synchronous
// Returns the system prompt string to be passed to ANY LLM API call
// Called by both Claude and OpenRouter summarizers before their LLM call
```

`src/integrations/claude/prompt.ts` is **deleted** after this move.

---

## `computeScorePercentage` function contract

**File**: `src/lib/utils/scoring.utils.ts`

```typescript
function computeScorePercentage(
  detectedSignals: DetectedSignal[],   // hallucination-filtered; IDs guaranteed to exist in inputSignals
  inputSignals: SimplifiedSignal[],    // full rubric from DB; each carries numericWeight: number
): number
// Returns: integer in [0, 100]
// Pure, synchronous, deterministic
// Reads numericWeight directly from inputSignals — no constants lookup
```

**Computation**:
```
totalPossible  = sum of signal.numericWeight for each signal in inputSignals
detectedPoints = sum of inputSignal.numericWeight for each detectedSignal whose id matches an inputSignal
```

**Guarantees**:
| Condition | Return value |
|-----------|-------------|
| `inputSignals` is empty | `0` |
| `detectedSignals` is empty | `0` |
| All `inputSignals` detected | `100` |
| Partial detection | `round((detectedPoints / totalPossible) × 100)`, clamped to [0, 100] |
