# Quickstart: Lead Score Percentage Validation

**Feature**: TAE-83 Lead Score Percentage
**Date**: 2026-07-27

---

## Prerequisites

- Working Next.js dev environment (`npm run dev`)
- Valid `ANTHROPIC_API_KEY` (or `OPENROUTER_API_KEY`) in `.env.development`
- Existing rubric signals in the database, OR use the inline test approach below

---

## Scenario 1: Uniform-tier rubric — all signals same tier

**Goal**: Verify the simple percentage formula works for a uniform-tier rubric.

**Setup**: Provide 5 hot-tier signals in the rubric.

```typescript
const signals: SimplifiedSignal[] = [
  { id: 'sig-1', label: 'Signal 1', tier: 'hot', numericWeight: 10 },
  { id: 'sig-2', label: 'Signal 2', tier: 'hot', numericWeight: 10 },
  { id: 'sig-3', label: 'Signal 3', tier: 'hot', numericWeight: 10 },
  { id: 'sig-4', label: 'Signal 4', tier: 'hot', numericWeight: 10 },
  { id: 'sig-5', label: 'Signal 5', tier: 'hot', numericWeight: 10 },
];
```

Total possible = 5 × 10 = **50 points**.

**Subtest A** — all detected: AI transcript mentions evidence for all 5 signals.

Expected: `result.leadScore.scorePercentage === 100`
Display: `"100/100"`

**Subtest B** — 4 detected: AI transcript mentions evidence for 4 of the 5 signals.

Expected: `result.leadScore.scorePercentage === 80`
Display: `"80/100"`

**Subtest C** — 0 detected: Transcript contains no relevant evidence.

Expected: `result.leadScore.scorePercentage === 0`
Display: `"0/100"`

---

## Scenario 2: Mixed-tier rubric — 5 hot + 2 warm + 1 cold

**Goal**: Verify tier weighting produces correct results for a mixed rubric.

**Setup**: 8 signals across 3 tiers.

```typescript
const signals: SimplifiedSignal[] = [
  { id: 'h1', label: 'Hot 1',  tier: 'hot',  numericWeight: 10 },
  { id: 'h2', label: 'Hot 2',  tier: 'hot',  numericWeight: 10 },
  { id: 'h3', label: 'Hot 3',  tier: 'hot',  numericWeight: 10 },
  { id: 'h4', label: 'Hot 4',  tier: 'hot',  numericWeight: 10 },
  { id: 'h5', label: 'Hot 5',  tier: 'hot',  numericWeight: 10 },
  { id: 'w1', label: 'Warm 1', tier: 'warm', numericWeight: 6  },
  { id: 'w2', label: 'Warm 2', tier: 'warm', numericWeight: 6  },
  { id: 'c1', label: 'Cold 1', tier: 'cold', numericWeight: 2  },
];
```

Total possible = (5 × 10) + (2 × 6) + (1 × 2) = 50 + 12 + 2 = **64 points**.

**Subtest A** — all 8 detected: `scorePercentage === 100`, display `"100/100"`

**Subtest B** — only 5 hot detected (0 warm, 0 cold): detected = 50, score = `round(50/64 × 100)` = `round(78.125)` = **78**
Expected: `result.leadScore.scorePercentage === 78`
Display: `"78/100"`

**Subtest C** — only 2 warm + 1 cold detected: detected = 12 + 2 = 14, score = `round(14/64 × 100)` = `round(21.875)` = **22**
Expected: `result.leadScore.scorePercentage === 22`
Display: `"22/100"`

**Subtest D** — tier asymmetry: detecting 2 hot (20 pts) > detecting 2 warm + 1 cold (14 pts) even though the latter has more signals detected.
Expected: `round(20/64 × 100)` = **31** > **22** ✓

---

## Scenario 3: Empty rubric

**Goal**: Verify graceful handling when no rubric signals are provided.

**Setup**: `signals = []`

Expected: `result.leadScore.scorePercentage === 0`, display `"0/100"`
Band: `'cold'` (existing behavior unchanged)

---

## Scenario 4: `computeScorePercentage` unit verification (no live API needed)

**Goal**: Verify the utility function directly without making an API call.

Import and call directly in a test script or Node REPL:

```typescript
import { computeScorePercentage } from '@/lib/utils/scoring.utils';

// All detected → 100
computeScorePercentage(
  [{ id: 's1', label: 'S1', evidence: '...' }],
  [{ id: 's1', label: 'S1', tier: 'hot', numericWeight: 10 }],
) // → 100

// None detected → 0
computeScorePercentage(
  [],
  [{ id: 's1', label: 'S1', tier: 'hot', numericWeight: 10 }],
) // → 0

// Empty rubric → 0
computeScorePercentage([], []) // → 0

// Rounding: 1 of 3 hot signals (10pts) out of 30 total → round(10/30 × 100) = round(33.33) = 33
computeScorePercentage(
  [{ id: 'h1', label: 'H1', evidence: '...' }],
  [
    { id: 'h1', label: 'H1', tier: 'hot', numericWeight: 10 },
    { id: 'h2', label: 'H2', tier: 'hot', numericWeight: 10 },
    { id: 'h3', label: 'H3', tier: 'hot', numericWeight: 10 },
  ],
) // → 33
```

---

## Scenario 5: OpenRouter structured path — parity with Claude

**Goal**: Verify the OpenRouter `TranscriptSummarizer` produces the same `scorePercentage` and structured result as the Claude path for the same inputs.

**Prerequisites**: `OPENROUTER_API_KEY` in `.env.development`.

**Setup**: Use the same 5-signal uniform-tier rubric from Scenario 1.

```typescript
import { TranscriptSummarizer } from '@/integrations/openrouter/transcript-summarizer';

const summarizer = new TranscriptSummarizer();
const result = await summarizer.summarize(transcript, { signals });
```

**Expected**:
- `result.success === true`
- `result` is `StructuredSummarizationResult` (has `summary` + `leadScore`, NOT just `content`)
- `result.leadScore.scorePercentage` is an integer in [0, 100] — same value as the Claude path for the same transcript + signals
- `result.leadScore.band` is the same value as the Claude path
- `result.leadScore.detectedSignals` contains only IDs from the `signals` rubric (no hallucinated IDs)

**Parity check** (optional, requires both API keys): call both integrations with the same transcript and signals; assert `scorePercentage` and `band` are equal.

---

## Scenario 6: `processStructuredResponse` unit verification (no live API)

**Goal**: Verify the shared utility directly, independent of any LLM API call.

```typescript
import { processStructuredResponse } from '@/lib/utils/structured-analysis.utils';

const signals: SimplifiedSignal[] = [
  { id: 'sig-1', label: 'Signal 1', tier: 'hot', numericWeight: 10 },
  { id: 'sig-2', label: 'Signal 2', tier: 'hot', numericWeight: 10 },
];

// Valid JSON with 1 detected signal
const rawText = JSON.stringify({
  narrative: 'Test narrative',
  whatWeHeard: [],
  whatWasCovered: [],
  whatWasDecided: [],
  actionItems: [],
  attendees: [],
  detectedSignals: [{ id: 'sig-1', label: 'Signal 1', evidence: 'They said it.' }],
  leadScoreBand: 'hot',
  scoreRationale: 'sig-1 detected',
});

const result = processStructuredResponse(rawText, signals);
// result.leadScore.scorePercentage === 50   (1/2 signals = 10/20 pts = 50%)
// result.leadScore.band === 'hot'
```

**Error path** — invalid JSON:
```typescript
const errResult = processStructuredResponse('not valid json', signals);
// errResult.success === false, errResult.category === 'api_error'
```

---

## Validation: `npm run validate`

After implementation, all three gates must pass:

```bash
npm run validate
# type-check → lint → build — all must exit 0
```

See [contracts/lead-score-result.md](./contracts/lead-score-result.md) for the full type contract. See [data-model.md](./data-model.md) for the entity changes.
