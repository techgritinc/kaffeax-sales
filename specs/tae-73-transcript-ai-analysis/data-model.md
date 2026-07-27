# Data Model: Transcript AI Analysis & Scoring

**Phase**: 1 | **Feature**: [Transcript AI Analysis & Scoring](spec.md) | **Date**: 2026-07-24

All entity changes required before implementation. Files to modify or create are listed with before/after shapes.

---

## 1. `src/types/rubric-signal.types.ts` — Extend

Add `pointValue: number` to `RubricSignalFields`.

**Before**:
```typescript
export interface RubricSignalFields {
  signalId: string;
  label: string;
  weight: SignalWeight;
  source: SignalSource;
  hints: string[];
  isActive: boolean;
}
```

**After**:
```typescript
export interface RubricSignalFields {
  signalId: string;
  label: string;
  weight: SignalWeight;
  source: SignalSource;
  hints: string[];
  isActive: boolean;
  pointValue: number; // Points this signal contributes to the 0-100 score
}
```

**DB impact**: Existing `rubric-signals` documents without `pointValue` will return `undefined` — the Mongoose schema must set `default: 0` to guard against this during the migration window.

---

## 2. `src/types/transcript.types.ts` — Extend

Multiple changes. All existing `const` arrays, type aliases, and interfaces preserved; new items added.

### 2a. New: `ConfidenceLevel`

```typescript
export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
```

### 2b. New: `Commitment`

```typescript
export interface Commitment {
  description: string;
  side: AttendeeSide; // 'kaffeax' | 'prospect'
}
```

### 2c. Extend: `DetectedSignal`

Add `weight` and `pointValue` — enriched by application code after Zod validation, not from AI response directly.

**Before**:
```typescript
export interface DetectedSignal {
  id: string;
  label: string;
  evidence: string;
}
```

**After**:
```typescript
export interface DetectedSignal {
  signalId: string;   // renamed from id — matches RubricSignalFields.signalId
  label: string;
  evidence: string;
  weight: SignalWeight;    // from rubric cross-reference, not AI response
  pointValue: number;     // from rubric cross-reference, not AI response
}
```

> **Note on rename**: `id` → `signalId` aligns with `RubricSignalFields.signalId` and the AI response contract. The Mongoose sub-schema field name must also be updated accordingly.

### 2d. Extend: `TranscriptSummary`

Add `commitments` and `openQuestions`.

**Before**:
```typescript
export interface TranscriptSummary {
  narrative: string;
  whatWeHeard: string[];
  whatWasCovered: string[];
  whatWasDecided: string[];
  actionItems: ActionItem[];
  attendees: Attendee[];
}
```

**After**:
```typescript
export interface TranscriptSummary {
  narrative: string;
  whatWeHeard: string[];
  whatWasCovered: string[];
  whatWasDecided: string[];
  actionItems: ActionItem[];
  attendees: Attendee[];
  commitments: Commitment[];    // NEW — per-side commitments made during the meeting
  openQuestions: string[];      // NEW — questions raised but not resolved
}
```

### 2e. Extend: `TranscriptContact`

Add `confidence` — always present alongside `email`.

**Before**:
```typescript
export interface TranscriptContact {
  email?: string;
}
```

**After**:
```typescript
export interface TranscriptContact {
  email?: string;
  confidence: ConfidenceLevel; // Always present; 'low' signals manual entry needed
}
```

### 2f. Extend: `TranscriptLeadScore`

Add `score: number` — the calculated 0-100 numeric score.

**Before**:
```typescript
export interface TranscriptLeadScore {
  band?: LeadScoreBand;
  detectedSignals: DetectedSignal[];
  rationale: string;
}
```

**After**:
```typescript
export interface TranscriptLeadScore {
  band?: LeadScoreBand;
  score: number;                // 0-100, sum of detected signal pointValues capped at 100
  detectedSignals: DetectedSignal[];
  rationale: string;
}
```

### 2g. Remove: `recapEmail` from `TranscriptFields`

`recapEmail` is no longer generated or stored (Assumptions — spec). The Outlook email body is assembled at display time; no recap email content is stored in the database.

**Before**:
```typescript
export interface TranscriptFields {
  // ...
  recapEmail: string | null;
  // ...
}
```

**After**: `recapEmail` field removed entirely.

> **Breaking change**: The corresponding Mongoose schema field in `src/lib/db/models/transcript.model.ts` must also be removed. Any existing documents in MongoDB retain the field harmlessly (MongoDB tolerates extra fields not in schema), but new documents will not write it.

---

## 3. `src/integrations/claude/prompt.ts` — New

Defines the versioned prompt template and the co-located Zod response schema. These two artifacts are owned together and must be updated in sync — the prompt defines what the AI returns; the schema validates it.

**Shape**:
```typescript
import { z } from 'zod';
import { ATTENDEE_SIDES, CONFIDENCE_LEVELS, LEAD_SCORE_BANDS, SIGNAL_WEIGHTS } from '@/types/...';

export const PROMPT_VERSION = 'v1';

// SYSTEM_INSTRUCTIONS: static string defining the AI's role and output contract
export const SYSTEM_INSTRUCTIONS = `...`;

// RUBRIC_BLOCK_TEMPLATE: helper to assemble the rubric context block at runtime
// (see build-prompt.ts — this file exports the template; build-prompt.ts calls it)

// analysisResponseSchema: Zod validator matching contracts/ai-analysis-response.json
export const analysisResponseSchema = z.object({
  title: z.string().min(1),
  summary: z.object({
    narrative: z.string().min(1),
    whatWeHeard: z.array(z.string()),
    whatWasCovered: z.array(z.string()),
    whatWasDecided: z.array(z.string()),
    actionItems: z.array(z.object({
      description: z.string(),
      owner: z.string(),
      dueDate: z.string().optional(),
    })),
    attendees: z.array(z.object({
      name: z.string(),
      side: z.enum(ATTENDEE_SIDES),
    })),
    commitments: z.array(z.object({
      description: z.string(),
      side: z.enum(ATTENDEE_SIDES),
    })),
    openQuestions: z.array(z.string()),
  }),
  leadScore: z.object({
    bandSuggestion: z.enum(LEAD_SCORE_BANDS),
    detectedSignals: z.array(z.object({
      signalId: z.string(),
      label: z.string(),
      evidence: z.string(),
    })),
    rationale: z.string(),
    hasAgreedNextStep: z.boolean(),
  }),
  contact: z.object({
    email: z.string().email().optional(),
    confidence: z.enum(CONFIDENCE_LEVELS),
  }),
});

export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
```

> **Key design**: `leadScore.detectedSignals` in the AI response contains only `signalId`, `label`, and `evidence`. The application code enriches each with `weight` and `pointValue` from the rubric array (already fetched from DB) before storing — this prevents hallucinated weights and pointValues.

---

## 4. `src/integrations/claude/types.ts` — New

Intermediate types that are Claude-integration-specific and not shared outside `src/integrations/claude/`.

```typescript
export interface RubricSignalContext {
  signalId: string;
  label: string;
  weight: string;
  pointValue: number;
  hints: string[];
}

export interface AnalysisInput {
  transcript: string;
  rubricSignals: RubricSignalContext[];
  promptVersion: string;
}
```

---

## 5. `src/features/transcript-analysis/types/analysis.types.ts` — New

Intermediate pipeline types used inside the feature — not stored in DB, not exported to other features.

```typescript
import type { SignalWeight } from '@/types/rubric-signal.types';

// Enriched detected signal — produced by cross-referencing AI response with rubric
export interface EnrichedDetectedSignal {
  signalId: string;
  label: string;
  evidence: string;
  weight: SignalWeight;
  pointValue: number;
}

// Resolved scoring result after deterministic band resolution
export interface ScoringResult {
  band: 'hot' | 'warm' | 'cold';
  score: number; // 0-100
  detectedSignals: EnrichedDetectedSignal[];
  rationale: string;
}
```

---

## 6. Repository Contracts — New

Both repository files are new (no `src/repositories/` directory exists yet).

### `src/repositories/rubric-signal.repository.ts`

```typescript
class RubricSignalRepository {
  async getActiveSignals(): Promise<RubricSignalFields[]>
}
```

Returns only signals where `isActive === true`. Called fresh for each analysis run (FR-016).

### `src/repositories/transcript.repository.ts`

```typescript
class TranscriptRepository {
  async saveAnalysis(transcriptId: string, data: TranscriptAnalysisData): Promise<void>
}
```

`TranscriptAnalysisData` encapsulates the title, summary, leadScore, contact, and final status written after a successful analysis.

---

## 7. Mongoose Schema Updates (Derivatives)

The Mongoose models in `src/lib/db/models/` derive from the types above. Required schema changes (implementation detail for tasks phase):

| Model file | Change |
|---|---|
| `rubric-signal.model.ts` | Add `pointValue: { type: Number, required: true, default: 0 }` |
| `transcript.model.ts` | Add `commitments`, `openQuestions` to summary sub-schema; add `confidence` to contact sub-schema; add `score` to leadScore sub-schema; rename `id` → `signalId` in detectedSignals sub-schema; remove `recapEmail` field |

These changes are additive except for `recapEmail` removal and the `id`→`signalId` rename — both are safe for existing documents (old documents simply retain unused fields).
