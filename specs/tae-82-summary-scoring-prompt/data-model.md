# Data Model: Summary Scoring & Prompt Engineering

**Feature**: tae-82-summary-scoring-prompt | **Date**: 2026-07-27

## Existing Entities (no schema changes)

### RubricSignal (collection: `rubric-signals`)

Already defined in `src/types/rubric-signal.types.ts` and `src/lib/db/models/rubric-signal.model.ts`.

| Field | Type | Description |
|-------|------|-------------|
| signalId | string | Unique identifier (e.g., "hot-distribution-challenge") |
| label | string | Human-readable signal text (e.g., "Prospect expressed challenges distributing") |
| weight | "hot" \| "warm" \| "cold" | Signal tier |
| source | "client" \| "proposed" | Origin — client-defined or TechGrit-proposed |
| hints | string[] | Optional context phrases to help detection |
| isActive | boolean | Whether this signal is used in scoring |

**Read pattern**: Fetch all where `isActive: true`, project only `signalId`, `label`, `weight`. This is handled by the caller (server action / teammate scope), not by this feature.

### Transcript (collection: `transcripts`)

Already defined in `src/types/transcript.types.ts` and `src/lib/db/models/transcript.model.ts`.

Relevant sub-documents for this feature:

#### TranscriptSummary (embedded)

| Field | Type | Description |
|-------|------|-------------|
| narrative | string | Prose overview of the meeting |
| whatWeHeard | string[] | Prospect pain points, needs, and sentiments |
| whatWasCovered | string[] | Topics discussed |
| whatWasDecided | string[] | Decisions made |
| actionItems | ActionItem[] | Next steps with owner and optional due date |
| attendees | Attendee[] | People present with their side |

#### TranscriptLeadScore (embedded)

| Field | Type | Description |
|-------|------|-------------|
| band | "hot" \| "warm" \| "cold" \| undefined | Highest-tier-wins classification |
| detectedSignals | DetectedSignal[] | Signals found with evidence |
| rationale | string | Explanation of the classification |

#### DetectedSignal (embedded in TranscriptLeadScore)

| Field | Type | Description |
|-------|------|-------------|
| id | string | References `signalId` from the rubric |
| label | string | Signal label text (denormalized for display) |
| evidence | string | Transcript excerpt or paraphrase that triggered the signal |

## New Types (no new collections)

### SimplifiedSignal (in-memory only, for prompt construction)

Defined in `src/types/rubric-signal.types.ts` as an addition.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Maps to `signalId` |
| label | string | Signal text for AI matching |
| tier | "hot" \| "warm" \| "cold" | Maps to `weight` |
| hints | string[] (optional) | Only included when the signal has a non-empty hints array |

Used only to reduce the rubric payload sent to the AI. Not persisted. Received as a parameter by the summarizer.

### AISummaryResponse (in-memory only, for response validation)

The shape the AI is instructed to return. All fields use camelCase per §XVIII of the constitution. Validated by the Zod schema in `src/schemas/ai-summary-response.schema.ts`.

| Field | Type | Description |
|-------|------|-------------|
| narrative | string | Meeting overview |
| whatWeHeard | string[] | Prospect signals/needs |
| whatWasCovered | string[] | Topics |
| whatWasDecided | string[] | Decisions |
| actionItems | Array<{ description, owner, dueDate? }> | Next steps |
| attendees | Array<{ name, side }> | People present |
| detectedSignals | Array<{ id, label, evidence }> | Matched rubric signals |
| leadScoreBand | "hot" \| "warm" \| "cold" | AI's suggested band (advisory, code recomputes) |
| scoreRationale | string | AI's explanation |

**Note**: The AI response uses camelCase field names that map directly to existing TypeScript types. No mapping layer is needed.

## Entity Relationships

```
SimplifiedSignal[] (received as parameter)
    │
    │ passed to summarizer by caller
    ▼
Prompt Builder ──→ AI Model ──→ AISummaryResponse (camelCase)
                                      │
                                      │ validated by Zod, band recomputed
                                      ▼
                               Transcript (collection)
                                 ├── summary: TranscriptSummary
                                 └── leadScore: TranscriptLeadScore
```

## Validation Rules

- `AISummaryResponse.narrative` must be a non-empty string
- `AISummaryResponse.detectedSignals[].id` must be one of the IDs from the input signal list (no hallucinated signals)
- `AISummaryResponse.leadScoreBand` must be one of "hot", "warm", "cold"
- `AISummaryResponse.attendees[].side` must be one of "kaffeax", "prospect"
- All array fields default to empty arrays if the AI omits them (defensive defaults in the Zod schema)
