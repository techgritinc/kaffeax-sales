# Quickstart: Summary Scoring & Prompt Engineering

**Feature**: tae-82-summary-scoring-prompt | **Date**: 2026-07-27

## Prerequisites

- Node.js 18+ and npm installed
- `.env.development` configured with:
  - `ANTHROPIC_API_KEY` — Claude API key
  - `CLAUDE_DEFAULT_MODEL` — e.g., `claude-sonnet-4-20250514`
  - `CLAUDE_MAX_TOKENS` — e.g., `8192`

## Sample Signal Data

For testing, pass these simplified signals to the summarizer:

```ts
const signals: SimplifiedSignal[] = [
  {
    id: "hot-distribution-challenge",
    label: "Prospect expressed challenges distributing or building a pipeline of leads to market to",
    tier: "hot",
    hints: ["distribution", "pipeline", "leads", "market"],
  },
  {
    id: "hot-listing-frustration",
    label: "Frustration listing their coffee due to lack of a proper channel",
    tier: "hot",
    hints: ["listing", "channel", "frustration"],
  },
  {
    id: "hot-price-transparency",
    label: "Price-transparency pain",
    tier: "hot",
    hints: ["price", "transparency", "pricing", "cost"],
  },
  {
    id: "hot-logistics-issues",
    label: "Logistics issues",
    tier: "hot",
    hints: ["logistics", "shipping", "delivery", "supply chain"],
  },
  {
    id: "warm-general-interest",
    label: "General interest in the platform but no specific pain point expressed",
    tier: "warm",
    hints: ["interested", "curious", "tell me more"],
  },
  {
    id: "cold-no-fit",
    label: "Prospect indicated no current need or fit for the platform",
    tier: "cold",
    hints: ["not interested", "no need", "not right now"],
  },
];
```

## Validation Scenarios

### Scenario 1: Hot Lead Detection

**Goal**: Verify that a transcript containing hot signals produces a "hot" band classification with cited evidence.

**Steps**:
1. Create a `TranscriptSummarizer` instance
2. Call `summarize()` with a transcript where the prospect says: "We've been really struggling with distribution. We can't find a proper channel to list our coffee and the pricing across platforms is totally opaque."
3. Pass the sample signals array above
4. **Expected**: 
   - `leadScore.band` is `"hot"`
   - `leadScore.detectedSignals` includes entries for `hot-distribution-challenge`, `hot-listing-frustration`, and `hot-price-transparency`
   - Each detected signal has an `evidence` field quoting the relevant passage
   - `summary.narrative` is a non-empty prose overview
   - All summary sections (whatWeHeard, whatWasCovered, etc.) are populated arrays

### Scenario 2: Cold Lead — No Signals Detected

**Goal**: Verify graceful handling when no rubric signals match.

**Steps**:
1. Call `summarize()` with a transcript of a brief, non-committal call: "Thanks for the overview. We're not really looking at anything new right now. Let's maybe revisit next quarter."
2. Pass the full sample signals array
3. **Expected**:
   - `leadScore.band` is `"cold"`
   - `leadScore.detectedSignals` is empty or contains only cold-tier signals
   - `leadScore.rationale` explains that no qualifying hot or warm signals were detected
   - Summary sections are still populated (the meeting itself is still summarized)

### Scenario 3: Zero Signals Provided

**Goal**: Verify the system works when no signals are passed.

**Steps**:
1. Call `summarize()` with any transcript and an empty signals array `[]`
2. **Expected**:
   - `leadScore.band` is `"cold"`
   - `leadScore.detectedSignals` is empty
   - `leadScore.rationale` states no scoring criteria were provided
   - Summary generation still works normally

### Scenario 4: Malformed AI Response

**Goal**: Verify that invalid AI output returns a structured error.

**Steps**:
1. This is a defensive scenario — simulate by temporarily modifying the prompt to request a non-JSON format
2. **Expected**: The system returns a `SummarizationError` with `category: 'api_error'` and a user-friendly message. No crash, no unhandled exception.

## Running the Validation

For direct function-level validation:

```ts
import { TranscriptSummarizer } from '@/integrations/claude/transcript-summarizer';
import type { SimplifiedSignal } from '@/types/rubric-signal.types';

const summarizer = new TranscriptSummarizer();

const transcript = "We've been really struggling with distribution...";
const signals: SimplifiedSignal[] = [/* sample signals above */];

const result = await summarizer.summarize(transcript, { signals });

if (result.success && 'summary' in result) {
  console.log('Summary:', result.summary);
  console.log('Lead Score:', result.leadScore);
} else if (!result.success) {
  console.error('Error:', result.message);
}
```

## References

- [AI Analysis Response Contract](./contracts/ai-analysis-response.md) — full response schema (camelCase)
- [Data Model](./data-model.md) — entity definitions and relationships
- [Spec](./spec.md) — functional requirements and acceptance criteria
