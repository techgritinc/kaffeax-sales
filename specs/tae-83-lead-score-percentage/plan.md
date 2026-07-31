# Implementation Plan: Lead Score Percentage

**Branch**: `feat/tae-83-lead-score-percentage` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/tae-83-lead-score-percentage/spec.md`

## Summary

Add a `scorePercentage` field (integer 0–100) to `TranscriptLeadScore`. Point values are stored as `numericWeight: number` on each rubric signal in MongoDB — hardcoded tier-weight constants are prohibited. The entire shared structured analysis pipeline (prompt building, JSON parsing, schema validation, hallucination filtering, band + score computation, result assembly) is extracted into a new provider-agnostic utility `processStructuredResponse()` in `src/lib/utils/structured-analysis.utils.ts`. `buildSummarizationPrompt()` moves there from `src/integrations/claude/prompt.ts` (which is deleted). Both the Claude and OpenRouter integrations become thin wrappers: each calls its own LLM, then delegates to the shared utility. The OpenRouter summarizer gains a full structured analysis path. Display as `X/100` is a UI concern — the field is stored as a plain integer.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js (Next.js 16 App Router)

**Primary Dependencies**: No new dependencies. Uses existing `@/types/transcript.types`, `@/types/rubric-signal.types`, `@/lib/utils/scoring.utils`.

**Storage**: MongoDB via Mongoose (existing). `scorePercentage` added as optional field on the `leadScore` sub-document to remain compatible with existing stored transcripts.

**Testing**: No automated test infrastructure yet (per constitution). Manual validation via quickstart.md.

**Target Platform**: Next.js server-side (scoring utility is pure TS, runs in server actions).

**Performance Goals**: Pure in-memory computation — negligible overhead, no async required.

**Constraints**: Field MUST be optional (`scorePercentage?: number`) on `TranscriptLeadScore` to avoid breaking existing MongoDB documents that pre-date this feature. New analyses always set it; legacy documents will lack it.

**Scale/Scope**: Two type amendments + one Mongoose schema field + one utility update (`scoring.utils.ts`) + one new shared utility file (`structured-analysis.utils.ts`) + one deleted file (`claude/prompt.ts`) + two summarizer updates (Claude refactor + OpenRouter new structured path). No constants file — weights come from DB.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| §III TypeScript strict — no `any`, no `!` | ✅ PASS | Utility function uses concrete types; no assertions needed |
| §VII Pure utility functions in `src/lib/utils/` | ✅ PASS | `computeScorePercentage()` is pure, lives in `scoring.utils.ts` |
| §IX Repository layer | ✅ PASS | No DB calls in this feature |
| §XI Type isolation — plain types separate from Mongoose | ✅ PASS | `TranscriptLeadScore` already in `src/types/transcript.types.ts` |
| §XV Constants in `src/constants/` | ✅ N/A | No new magic constants — weights come from DB as `numericWeight` |
| §XVII No barrel imports | ✅ PASS | All imports reference source files directly |
| §XVIII camelCase everywhere | ✅ PASS | `scorePercentage`, `numericWeight`, `processStructuredResponse` — all camelCase |

**No violations. Gate passes.**

## Project Structure

### Documentation (this feature)

```text
specs/tae-83-lead-score-percentage/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── lead-score-result.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (affected files)

```text
src/
├── types/
│   ├── rubric-signal.types.ts              # MODIFY — add numericWeight: number to RubricSignalFields and SimplifiedSignal
│   └── transcript.types.ts                 # MODIFY — add scorePercentage?: number to TranscriptLeadScore
├── lib/
│   ├── db/
│   │   └── models/
│   │       └── rubric-signal.model.ts      # MODIFY — add numericWeight field to Mongoose schema
│   └── utils/
│       ├── scoring.utils.ts                # MODIFY — update simplifySignals() + add computeScorePercentage()
│       └── structured-analysis.utils.ts   # CREATE — buildSummarizationPrompt() + processStructuredResponse()
└── integrations/
    ├── claude/
    │   ├── prompt.ts                       # DELETE — moved into structured-analysis.utils.ts
    │   └── transcript-summarizer.ts        # MODIFY — import from shared utility; delegate structured path
    └── openrouter/
        └── transcript-summarizer.ts        # MODIFY — add structured path; delegates to processStructuredResponse()
```

**Structure Decision**: One new file created (`structured-analysis.utils.ts`), one deleted (`claude/prompt.ts`), four modified. No constants file — `numericWeight` is sourced from MongoDB and flows through `SimplifiedSignal`.

## Complexity Tracking

No constitution violations — complexity tracking not required.
