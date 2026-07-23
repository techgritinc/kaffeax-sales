# Implementation Plan: Transcript Schema & Database Connection Layer

**Branch**: `chore/mongoose-setup` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-transcript-schema-db-layer/spec.md`

## Summary

Establish the MongoDB data layer for the Kaffea-X Sales application: Mongoose schemas for the `transcripts` and `rubricSignals` collections, a singleton connection manager with fail-fast semantics and promise deduplication, a `withDb` higher-order wrapper that eliminates connection boilerplate at call sites, and the `@env` path alias for importing the validated environment object. The application shares a live MongoDB database with the existing Kaffea-X platform; the `users` collection is untouched.

## Technical Context

**Language/Version**: TypeScript 5.8 on Node.js (Next.js 16 App Router)

**Primary Dependencies**: Mongoose 8.x (to be installed), `@t3-oss/env-nextjs` (existing), Zod 4.x (existing)

**Storage**: MongoDB (shared instance with existing Kaffea-X web app; new `transcripts` and `rubricSignals` collections)

**Testing**: No testing infrastructure set up yet — validation is manual via quickstart scenarios

**Target Platform**: Server-side only (Next.js server actions, repository classes, background jobs)

**Project Type**: Web application (Next.js App Router)

**Performance Goals**: Database connection established within 3 seconds or fail; queries for user transcript lists return within interactive response times

**Constraints**: Must coexist with existing `users` collection without modification; fail-fast connection (no buffered commands); server-side only (no client bundle leakage)

**Scale/Scope**: Single-user MVP; data model designed for multi-user scale but no concurrent load optimization required at this stage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Tech Stack | Next.js 16, TypeScript 5, env validated via `env.mjs` | PASS |
| III. TypeScript Strictness | No `any`, no `!` — Mongoose schemas use explicit types, `unknown` + narrowing for errors | PASS |
| IV. Linting & Formatting | All new files must pass `eslint --max-warnings=0` + `prettier --check` | PASS |
| V. Code Modularity | Each file < 150 lines; `mongoose.ts`, `withDb.ts`, and each schema are separate files | PASS |
| VII. Utility Functions | Connection logic is infrastructure in `src/lib/db/`, not a component | PASS |
| IX. Repository Layer | Schemas and connection live in `src/lib/db/`; repositories (future) call models — no direct DB calls in components/actions | PASS |
| X. Server Actions | This feature creates no server actions or API routes; it provides the data layer that future actions will use | PASS |
| XI. Type Isolation | Schema types exported from `src/lib/db/` models; shared types in `src/types/` if cross-feature | PASS |
| XIV. Error Handling | Connection errors fail fast with context; no bare `catch {}`; connection wrapper surfaces errors explicitly | PASS |
| XV. Quality & Performance | No magic strings (status values as constants); single responsibility per file | PASS |
| XVI. Git & Deployment | Branch `chore/mongoose-setup` follows `type/short-description`; conventional commits enforced | PASS |

**Gate result**: All principles satisfied. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-transcript-schema-db-layer/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: technical decisions
├── data-model.md        # Phase 1: entity schemas and relationships
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/           # Phase 1: repository interface contracts
│   ├── transcript-repository.md
│   └── rubric-signal-repository.md
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
src/
├── app/                    # Existing App Router scaffolding (untouched)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
└── lib/
    └── db/
        ├── mongoose.ts     # Singleton connection manager
        ├── withDb.ts       # Higher-order connection wrapper
        └── models/
            ├── transcript.model.ts    # Mongoose schema + model for transcripts
            └── rubric-signal.model.ts # Mongoose schema + model for rubricSignals
```

**Structure Decision**: Files live under `src/lib/db/` per the constitution's directory architecture (lib/ for shared infrastructure, db/ for database client and helpers). Models are co-located under `src/lib/db/models/` since they are tightly coupled to the Mongoose connection layer. Future repository classes will live in `src/repositories/` and import directly from `@/lib/db/mongoose`, `@/lib/db/withDb`, or `@/lib/db/models/*`.

## Complexity Tracking

> No constitution violations. This section is intentionally empty.
