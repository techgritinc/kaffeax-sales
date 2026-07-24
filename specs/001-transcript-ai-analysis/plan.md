# Implementation Plan: Transcript AI Analysis & Scoring

**Branch**: `feat/tae-82-summary-scoring-prompt-engineering` | **Date**: 2026-07-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-transcript-ai-analysis/spec.md`

## Summary

Build a single-pass Claude API integration that accepts a raw meeting transcript plus the currently active rubric signals, returns a structured JSON analysis (summary dossier, detected signals with evidence, prospect email), validates the response against a strict Zod schema before any DB write, then applies deterministic application logic to calculate the numeric score (sum of detected signal `pointValue` fields, capped at 100) and assign the final lead score band (HOT/WARM/COLD). A formatted mailto URL opens Outlook with the email body pre-filled from the summary — no recap email is stored.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode, `tsc --noEmit` enforced by CI)

**Primary Dependencies**:
- `@anthropic-ai/sdk` — official Anthropic TypeScript SDK (new addition; justified: external AI service boundary via `src/integrations/`)
- `zod` — already in use; extended to validate the AI JSON response schema
- `mongoose` + `src/lib/db` — existing MongoDB connection layer
- `next` Server Actions — existing mutation pattern

**Storage**: MongoDB via Mongoose; two collections touched: `transcripts` (write analysis result) and `rubric-signals` (read active signals fresh per analysis run — FR-016)

**Testing**: No test infrastructure yet (CLAUDE.md: "No tests yet") — validation scenarios documented in `quickstart.md` as manual end-to-end checks

**Target Platform**: Next.js 16 server runtime (Node.js); AI call is server-side only — `ANTHROPIC_API_KEY` never reaches the client bundle

**Project Type**: Web application (Next.js 16 App Router, single project)

**Performance Goals**: SC-002 — populated review screen within 60 seconds of triggering analysis. Streaming required for large transcripts (can be 50,000+ words); SDK `.stream().finalMessage()` pattern used

**Constraints**:
- 150-line file limit per §V — `prompt.ts` holds a large string constant (data, not logic); single-responsibility is maintained
- No `any`, no `!` non-null assertions (§III) — all AI response types derived from Zod schema inference
- `@/` alias for all `src/` imports (§XI)
- Repository layer mandatory for all DB access — new `rubric-signal.repository.ts` and `transcript.repository.ts` created (§IX)
- Server Actions only for mutations; no `/app/api/` route handlers (§X)
- Zod exclusive for schema validation (§VIII)
- `ANTHROPIC_API_KEY` validated at startup via `env.mjs` (§I)

**Scale/Scope**: One transcript analysis per request; rubric expected to have 10–30 active signals; transcript max ~50,000 words handled via streaming

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | §Ref | Status | Notes |
|------|------|--------|-------|
| No unvetted dependency | §I | PASS | `@anthropic-ai/sdk` is the official Anthropic SDK — external AI integration |
| TypeScript strict, no `any` or `!` | §III | PASS | All AI response types from `z.infer<typeof analysisResponseSchema>` |
| Files ≤150 lines | §V | PASS | `prompt.ts` holds a string constant (data); utility files split by single responsibility |
| Utility functions extracted | §VII | PASS | Score calc, band resolution, and mailto formatting each in their own utility file |
| Zod for all validation | §VIII | PASS | AI response validated by Zod before any DB write; reject on mismatch |
| No direct DB calls outside repositories | §IX | PASS | New `RubricSignalRepository.getActiveSignals()` and `TranscriptRepository.saveAnalysis()` |
| Mutations via Server Actions | §X | PASS | `analyzeTranscript` is the Server Action entry point; no `/app/api/` routes |
| Types isolated by domain | §XI | PASS | Shared types in `src/types/`; integration types in `src/integrations/claude/`; feature types in `src/features/transcript-analysis/types/` |
| Explicit error handling | §XIV | PASS | API failures → structured error + `failed` status; validation rejection does not expose AI internals |
| Design fidelity | §XII | N/A | No new UI components added by this feature (review screen wiring is a separate task) |

Post-design re-check: No violations introduced. `recapEmail` field removed from `TranscriptFields` — this is a breaking change to the existing type and Mongoose schema, addressed in `data-model.md`.

## Project Structure

### Documentation (this feature)

```text
specs/001-transcript-ai-analysis/
├── plan.md              # This file
├── research.md          # Phase 0 — Claude API integration patterns
├── data-model.md        # Phase 1 — entity changes and type extensions
├── quickstart.md        # Phase 1 — manual validation scenarios
└── contracts/
    ├── ai-analysis-response.json   # JSON Schema for Claude output_config
    └── mailto-url.md               # Outlook mailto URL format
```

### Source Code (repository root)

```text
src/
├── integrations/
│   └── claude/
│       ├── client.ts           # Anthropic SDK singleton (reads ANTHROPIC_API_KEY from env)
│       ├── prompt.ts           # Versioned prompt template constant + Zod response schema
│       └── types.ts            # Claude-specific intermediate types (pre-validation shapes)
│
├── features/
│   └── transcript-analysis/
│       ├── actions/
│       │   └── analyze-transcript.action.ts  # Server Action — orchestrates the full pipeline
│       ├── utils/
│       │   ├── build-prompt.ts               # Assembles rubric context block + transcript block
│       │   ├── score-calculator.ts           # Sums detected signal pointValues, caps at 100
│       │   ├── band-resolver.ts              # Deterministic HOT/WARM/COLD rules (FR-020, FR-025)
│       │   └── email-formatter.ts            # Builds mailto URL body string from summary data
│       └── types/
│           └── analysis.types.ts             # Intermediate pipeline types (enriched signal shape)
│
├── repositories/                             # NEW — none existed before this feature
│   ├── rubric-signal.repository.ts           # RubricSignalRepository.getActiveSignals()
│   └── transcript.repository.ts             # TranscriptRepository.saveAnalysis()
│
└── types/
    ├── transcript.types.ts                   # EXTENDED — see data-model.md
    └── rubric-signal.types.ts                # EXTENDED — add pointValue: number
```

**Structure Decision**: Single Next.js project (existing). New code is organized across three layers per the constitution directory architecture: `src/integrations/claude/` encapsulates the external service boundary; `src/features/transcript-analysis/` contains all feature business logic; `src/repositories/` and `src/types/` extend shared infrastructure already prescribed by the constitution.

## Complexity Tracking

No constitution violations. All gates pass. No exceptions required.
