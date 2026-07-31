# Implementation Plan: Backend Integration with Frontend

**Branch**: `tae-82-backend-frontend-integration` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/tae-82-backend-frontend-integration/spec.md`

## Summary

The UI currently runs entirely on a mock in-memory store (`src/lib/db/mock/*`) via a single monolithic `WorkflowProvider`. This feature wires the real backend — MongoDB via Mongoose, the existing Claude `TranscriptSummarizer` integration, and the existing repository layer — into that UI, and deletes the mock layer entirely.

Concretely: `transcriptRepository`/`rubricSignalRepository` are rewritten to query the real `Transcript`/`RubricSignal` Mongoose models instead of the mock store. The Summarize flow becomes a two-phase Server Action sequence (create a `draft` record with only the raw + cleaned transcript, then run AI summarization and patch the same record), tracked with a new `aiProcessingStatus` field so a refresh or failure mid-processing is recoverable and correctly gates navigation. The monolithic workflow provider is split into three: a slimmed capture-session provider (UI/step state, unchanged), and two new Context API providers — `RubricSignalsProvider` and `RecentsProvider` — seeded server-side in `page.tsx`, satisfying the explicit request to introduce proper Context API state for rubric signals and recents-bar metadata. The literal "GET endpoint" ask from the source request is satisfied via the existing `getTranscriptById` Server Action reading through the repository layer, per constitution §X (no `/app/api/` route handlers) — already flagged as a deliberate reinterpretation in `checklists/requirements.md`.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode, per constitution §III)

**Primary Dependencies**: Next.js 16 (App Router), React 19, Mongoose 8 (models already defined: `Transcript`, `RubricSignal`), Zod (validation), Anthropic Claude SDK via existing `TranscriptSummarizer` integration

**Storage**: MongoDB, accessed exclusively through the repository layer (`src/repositories/*.repository.ts`) using the existing `connectDB()`/`withDb()` helpers in `src/lib/db/`

**Testing**: N/A — no test infrastructure exists in this repo yet (per CLAUDE.md); validated via `npm run validate` (type-check → lint → build) and manual quickstart walkthrough

**Target Platform**: Web (Next.js server + browser), single deployable app

**Project Type**: Web application — single Next.js project (App Router), not a frontend/backend split repo

**Performance Goals**: No new perceptible latency beyond the existing AI summarization call itself; recents bar and summary fetch must not block on anything beyond a single repository round-trip (no N+1 queries across transcripts)

**Constraints**: No `/app/api/` route handlers (constitution §X) — all data access via Server Actions/repository layer; mutations exclusively via Server Actions; zero `any`/non-null-assertions (§III); Zod-exclusive validation at Server Action boundaries (§VIII); camelCase only, no snake_case in any data structure (§XVIII)

**Scale/Scope**: Single-tenant demo scale — one placeholder user (`DEFAULT_USER_ID`), rubric signal sets in the tens, recents bar entries in the low hundreds (no pagination required by the spec)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **§III TypeScript Strictness** — PASS. All new/rewritten code (repositories, new Server Actions, `cleanTranscript` utility, new providers) uses explicit types, `unknown` + narrowing, `?.`/`??`. No new `any`/`!`.
- **§VIII Zod-Exclusive Validation** — PASS, with a new schema needed. A new `createDraftTranscriptSchema` (raw transcript non-empty string) validates the Summarize-click boundary; the DRAFT-status schema relaxation (FR: all fields except raw/cleaned transcript optional while `status: 'draft'`) is implemented as a Mongoose-level default relaxation (already partially true: `summary`/`contact`/`leadScore` default to `{}`) plus a Zod schema for the create-draft Server Action input that only requires the raw transcript. No validation logic outside Zod schemas.
- **§IX Repository Layer** — PASS, requires rewrite. `transcriptRepository` and `rubricSignalRepository` currently delegate to the mock store (`getStore()`), not MongoDB. This feature rewrites both classes' internals to use the `Transcript`/`RubricSignal` Mongoose models via `withDb()`, preserving their existing method signatures where the spec allows (`findById`, `create`, `update`, `delete`) and removing the mock-only `reset()`. Server Actions continue to call only repository methods — no direct model/DB access introduced in actions or components.
- **§X Server Actions & API Layer** — PASS. All mutations (`createDraftTranscript`, `runAiSummarization`, rubric CRUD) are Server Actions. The spec's literal "add a GET `/summaries/:id` endpoint" requirement is satisfied by the existing `getTranscriptById` Server Action (reads through `transcriptRepository.findById`) rather than an `/app/api/` route — consistent with the Assumptions already recorded in spec.md and the checklist note.
- **§XI Type Isolation** — PASS. `transcript.model.ts`/`rubric-signal.model.ts` already import their field types from `src/types/*.types.ts` and stay Schema/Model-only; the new `AiProcessingStatus`/`AI_PROCESSING_STATUSES` are added to `src/types/transcript.types.ts`, not inlined in the model file.
- **§XIV Error Handling & Observability** — PASS. New Server Actions follow the existing `logAndThrow(op, error, message)` pattern (operational DB/AI errors → user-safe message + structured `console.error`; no raw transcript content or stack traces surfaced to the client). `runAiSummarization` distinguishes a `SummarizationError` (expected, sets `aiProcessingStatus: 'failed'` and returns cleanly) from an unexpected repository/DB failure (thrown, logged, user-safe message).
- **§XV Quality & Performance** — PASS. New status/enum values are named constants (`AI_PROCESSING_STATUSES`), not magic strings. Recents bar and summary-by-id views get explicit loading/empty/error states per the spec's edge cases. No speculative abstraction — the two-phase draft/AI-update flow implements exactly what FR requires, nothing more (e.g., no retry/backoff scaffolding beyond what's specified).
- **§XVII No Barrel Imports** — PASS. New provider/mapper/utility modules are imported by direct path.
- **§XVIII camelCase Naming** — PASS, with in-scope remediation. `MeetingRecord`/`Summary`/`NextStep`/`LeadScore` (`src/types/meeting.types.ts`, `src/types/scoring.types.ts`) currently use snake_case keys (`lead_score`, `recap_email`, `meeting_title`, `open_questions`, `next_steps`, `due_date`, `detected_signals`). Because this feature already substantially rewrites the exact functions that produce and consume `MeetingRecord` (`transcript.mapper.ts`, the draft-creation flow, the recents-bar projection), these keys are renamed to camelCase (`leadScore`, `recapEmail`, `meetingTitle`, `openQuestions`, `nextSteps`, `dueDate`, `detectedSignals`) as part of this feature rather than left as a widening, separate refactor. Blast radius is exactly the two already-identified extra consumers: `src/features/meeting-review/components/review-screen.tsx` and `src/features/meeting-review/components/action-items.tsx`, plus the mock files already being deleted. No other files reference these fields.
- **§XIX Spec Directory Naming** — PASS (already compliant: `tae-82-backend-frontend-integration`).

No unresolved violations. See Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/tae-82-backend-frontend-integration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/            # Phase 1 output
│   ├── transcript-actions.md
│   ├── rubric-signals-context.md
│   └── recents-context.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── app/
│   └── page.tsx                              # [MODIFIED] seeds all three providers server-side
├── components/common/app-shell/
│   └── app-shell.tsx                         # [MODIFIED] consumes useWorkflow() + useRubricSignals() + useRecents()
├── constants/
│   ├── workflow.ts                           # [UNCHANGED]
│   └── user.ts                               # [NEW] DEFAULT_USER_ID constant (replaces mock DEMO_USER_ID)
├── features/
│   ├── workflow/
│   │   ├── actions/
│   │   │   ├── transcript.actions.ts         # [MODIFIED] createDraftTranscript, runAiSummarization added;
│   │   │   │                                 #            DEMO_USER_ID import replaced
│   │   │   └── rubric.actions.ts             # [UNCHANGED]
│   │   ├── constants/action.constants.ts     # [MODIFIED] new user-safe error strings for AI step
│   │   └── utils/
│   │       ├── transcript.mapper.ts          # [MODIFIED] camelCase fields, aiProcessingStatus mapping,
│   │       │                                 #            new toRecentItem() projection
│   │       └── rubric.mapper.ts              # [UNCHANGED] (simplifySignals already lives in scoring.utils.ts)
│   └── meeting-review/components/
│       ├── review-screen.tsx                 # [MODIFIED] camelCase field references
│       └── action-items.tsx                  # [MODIFIED] camelCase field references
├── lib/
│   ├── db/
│   │   ├── mongoose.ts                       # [UNCHANGED]
│   │   ├── withDb.ts                         # [UNCHANGED]
│   │   ├── models/
│   │   │   ├── transcript.model.ts           # [MODIFIED] add aiProcessingStatus field, relax required fields
│   │   │   └── rubric-signal.model.ts        # [UNCHANGED]
│   │   └── mock/                             # [DELETED] store.ts, transcripts.fixture.ts,
│   │                                         #           rubric-signals.fixture.ts, seed-builder.ts
│   └── utils/
│       ├── scoring.utils.ts                  # [UNCHANGED] (simplifySignals, computeScorePercentage, determineBand)
│       ├── structured-analysis.utils.ts      # [UNCHANGED]
│       └── transcript-cleaner.utils.ts       # [NEW] cleanTranscript(raw: string): string
├── providers/
│   ├── workflow/                             # [MODIFIED — slimmed] capture-session concerns only
│   │   ├── workflow-provider.tsx
│   │   ├── workflow-context.ts
│   │   ├── use-workflow-actions.ts
│   │   ├── engine.ts                         # [DELETED]
│   │   └── curated.ts                        # [DELETED]
│   ├── rubric-signals/                       # [NEW]
│   │   ├── rubric-signals-provider.tsx
│   │   └── rubric-signals-context.ts
│   └── recents/                              # [NEW]
│       ├── recents-provider.tsx
│       └── recents-context.ts
├── repositories/
│   ├── transcript.repository.ts              # [MODIFIED] Mongoose-backed, replaces mock store
│   └── rubric-signal.repository.ts           # [MODIFIED] Mongoose-backed, replaces mock store
└── types/
    ├── transcript.types.ts                   # [MODIFIED] AiProcessingStatus, narrowed TRANSCRIPT_STATUSES
    ├── meeting.types.ts                      # [MODIFIED] camelCase field rename
    ├── scoring.types.ts                       # [MODIFIED] camelCase field rename
    └── workflow.types.ts                      # [UNCHANGED]
```

**Structure Decision**: Single Next.js App Router project (constitution's canonical layout) — no frontend/backend split. All new work slots into the existing `src/features/workflow`, `src/repositories`, `src/providers`, `src/lib`, `src/types` structure; no new top-level directories.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 (data-model.md, contracts/, quickstart.md).*

- §VIII/§IX/§X/§XI/§XIV/§XV/§XVII/§XVIII — all still PASS against the finalized design. The contracts confirm: no direct Mongoose access outside `transcriptRepository`/`rubricSignalRepository` (§IX); `createDraftTranscript`/`runAiSummarization` are Server Actions with Zod boundaries (§VIII/§X); `getTranscriptById` (unchanged) satisfies the GET requirement without an `/app/api/` route (§X); the two new Context providers keep rubric-signal and recents-bar state fully isolated from each other and from capture-session state, avoiding a new monolith (§XV); the camelCase remediation's blast radius is confirmed exactly as scoped — no additional consumers of the renamed fields were found (§XVIII).
- No new violations introduced by the Phase 1 design. Gate: **PASS**.

## Complexity Tracking

> No constitution violations require justification. One pre-existing §XVIII violation (`MeetingRecord`/`Summary`/`NextStep`/`LeadScore` snake_case fields) is being remediated as an in-scope side effect of rewriting `transcript.mapper.ts` for this feature — see Constitution Check above and research.md's "Snake_case remediation scope" decision. This is not a new violation being introduced, so no table entry is needed.
