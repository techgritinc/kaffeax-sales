# Implementation Plan: Mock Data Layer with Server Actions

**Branch**: `005-mock-data-layer` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-mock-data-layer/spec.md`

## Summary

Move the application's mock data out of the client-side `WorkflowProvider`/`seed.ts` and behind a database-shaped data-access boundary: a single centralized mock data source (persistence-model shaped) → repository classes (CRUD) → Next.js Server Actions → a bidirectional mapper → the existing UI view-models. The provider is hydrated from the server on first paint (no loading flash, no behavior change), and live mutations (process/approve/patch/reject and rubric-signal edits) route through the CRUD server actions backed by an in-memory mock store, with the client keeping optimistic state so timing and UX are identical. Only the two modeled collections (Transcript, RubricSignal) live in the layer; CRM is a derived projection of committed Transcripts; audit and chat remain ephemeral client state. When a real MongoDB arrives, only the repositories' internal data source swaps from the mock store to Mongoose models — server-action signatures, mappers, and UI are untouched.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, Next.js 16 (App Router)

**Primary Dependencies**: Next.js Server Actions, Mongoose (models already present; no connection used this feature), Zod (available; not required here). No new dependencies.

**Storage**: In-memory mock store (module-level singleton, server-side), seeded from centralized fixtures. No MongoDB connection is opened by this feature.

**Testing**: No test framework in the repo yet. Verification is the `npm run validate` pipeline (type-check → lint → build) plus the manual parity checks in `quickstart.md`.

**Target Platform**: Server-rendered web app (Node server + browser client).

**Project Type**: Web application (Next.js single project, `src/` tree).

**Performance Goals**: No user-perceptible change vs. current behavior — initial render fully hydrated (no data-loading flash); mutation UX identical (optimistic client state).

**Constraints**: Zero UI/styling/layout/routing/workflow/business-logic changes (SC-006). No `any`, no non-null assertions. No `/app/api` route handlers. Files ≤150 LOC. Mock data reachable only through Server Actions (no direct mock imports in UI/provider).

**Scale/Scope**: Single-user demo. 3 seeded transcripts + 7 rubric signals + 1 sample transcript. ~5 feature areas consuming the shared data via one provider.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|---|---|---|
| I. Tech Stack | No new frameworks/deps; Server Actions are native Next.js | PASS |
| III. TypeScript Strictness | Mappers/actions/repos fully typed; no `any`, no `!`; view↔persistence types explicit | PASS (gate to hold) |
| V. Code Modularity | New files kept single-responsibility, ≤150 LOC; per-collection split | PASS (gate to hold) |
| IX. Repository Layer | Introduces `repositories/` classes; all data access flows through them | PASS |
| X. Server Actions & API Layer | Mutations via Server Actions; no `/app/api`; reads via server component → repository | PASS |
| XI. Type Isolation | Persistence types stay in `src/types/*.types.ts` (Mongoose-free); view-models retained in `src/types/`; no single global types dump | PASS |
| XII/XIII. Design Fidelity | No UI changes; prototype untouched | PASS |
| XIV. Error Handling | Server actions return structured, user-safe results; no bare `catch`; async always handled | PASS (gate to hold) |
| XV. Quality (dead code, YAGNI) | Remove genuinely redundant types; do not over-abstract | PASS (see Complexity Tracking) |

Two design choices require justification (see **Complexity Tracking**): the presentation-supplement fields and the mutable in-memory store. Both are forced by the clarified requirements (no UI change + stateful CRUD), not speculative.

**Post-design re-check (after Phase 1)**: PASS. The Phase 1 artifacts (repositories return persistence types only; mappers are pure/typed; actions carry `'use server'` and return user-safe results; view-models stay in `src/types`; no new global types file; no `any`) introduce no new violations. The two justified items above are unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/005-mock-data-layer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── transcript-actions.md
│   ├── rubric-signal-actions.md
│   └── mapping-contract.md
└── tasks.md             # /speckit-tasks output (NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── page.tsx                     # CHANGED: async server component; fetches seed via actions, passes as props
├── lib/
│   └── db/
│       ├── models/                  # UNCHANGED: transcript.model.ts, rubric-signal.model.ts (source of truth)
│       └── mock/                    # NEW: the single centralized mock-data location (persistence-shaped)
│           ├── store.ts             # In-memory singleton store + seed/reset
│           ├── transcripts.fixture.ts   # Seed transcripts in TranscriptFields shape (+ presentation supplement)
│           └── rubric-signals.fixture.ts# Seed rubric signals in RubricSignalFields shape
├── repositories/                    # NEW: DB abstraction (swap point for real Mongo)
│   ├── transcript.repository.ts     # CRUD over the mock store; returns persistence-model types
│   └── rubric-signal.repository.ts  # CRUD over the mock store; returns persistence-model types
├── features/
│   └── workflow/                    # NEW: shared data-access feature for the cross-feature workflow
│       ├── actions/
│       │   ├── transcript.actions.ts    # 'use server' CRUD; maps persistence↔view-model
│       │   └── rubric.actions.ts        # 'use server' CRUD; maps persistence↔view-model
│       └── utils/
│           ├── transcript.mapper.ts     # TranscriptFields(+supplement) ↔ MeetingRecord
│           └── rubric.mapper.ts         # RubricSignalFields[] ↔ Rubric
├── providers/
│   └── workflow/
│       ├── workflow-provider.tsx    # CHANGED: init state from props (not seed import); mutations call actions
│       ├── use-workflow-actions.ts  # CHANGED: route mutations through server actions (optimistic)
│       ├── engine.ts                # UNCHANGED logic; CURATED reference data relocated here (see research)
│       ├── seed.ts                  # REMOVED (contents relocated: fixtures → mock/, CURATED → engine domain)
│       └── workflow-context.ts      # UNCHANGED public shape (view-models preserved)
└── types/
    ├── transcript.types.ts          # Persistence types (authoritative) — supplement type added here if needed
    ├── rubric-signal.types.ts       # Persistence types (authoritative)
    ├── meeting.types.ts             # View-models RETAINED (Q1)
    ├── rubric.types.ts              # View-models RETAINED
    ├── scoring.types.ts             # View-models RETAINED
    └── workflow.types.ts            # CRM/Audit/Chat session types RETAINED
```

**Structure Decision**: Single Next.js project. The swap seam for the future DB is the **repository classes** (`src/repositories/`): today they read/write `src/lib/db/mock/store.ts`; later they call the Mongoose models in `src/lib/db/models/`. Server Actions (`src/features/workflow/actions/`) are the UI-facing boundary and never change on migration. Mappers isolate the persistence↔view-model impedance mismatch. `src/features/workflow/` is introduced as the home for the cross-feature shared data-access actions/utils, mirroring the existing `src/providers/workflow/` state container.

## Complexity Tracking

| Violation / Added complexity | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Presentation-supplement fields alongside persisted Transcript fields in the mock fixtures | The current UI displays fields the `Transcript` schema does not model (contact name/company/title + confidences, summary topics/open_questions/commitments, recap subject line). Preserving them is required by SC-006 (no UI change). | Dropping them → visible UI/behavior change (prohibited). Extending the schema → schema change (out of scope per brief). Carrying them in an isolated, clearly-labeled supplement is the only option consistent with all constraints. Documented as a migration follow-up in research.md. |
| Mutable in-memory mock store + mutation routing through actions | Clarification Q3 selected full stateful mock CRUD; mutations must persist and be reflected in subsequent reads. | Read-only actions were explicitly rejected in Q3. |
| New `src/features/workflow/` module | The workflow data is consumed across 5 feature areas via one provider; the server actions/mappers need a shared home. | Placing actions inside one feature (e.g. meeting-review) would force cross-feature imports of another feature's internals (constitution forbids). `/app/api` is prohibited (§X). |
