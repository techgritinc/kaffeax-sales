# Implementation Plan: Claude API Service Wrapper

**Branch**: `002-claude-api-wrapper` | **Date**: 2026-07-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-claude-api-wrapper/spec.md`

## Summary

Create a service wrapper in `src/integrations/claude/` that encapsulates all communication with the Anthropic Claude API using the `@anthropic-ai/sdk` TypeScript SDK. The wrapper accepts a transcript string, sends it to Claude via streaming, and returns a typed response or a structured error. Server actions call this integration layer directly — no Claude API logic leaks outside the integration boundary.

## Technical Context

**Language/Version**: TypeScript 5 on Next.js 16 (App Router)

**Primary Dependencies**: `@anthropic-ai/sdk` (to be installed), `zod` ^4.4.3 (input validation), `@t3-oss/env-nextjs` (env validation)

**Storage**: N/A — this feature makes outbound API calls only. Transcript persistence is handled by the existing `src/lib/db/` layer (spec 001).

**Testing**: No testing infrastructure in place yet (per CLAUDE.md). Manual validation via quickstart guide.

**Target Platform**: Node.js server-side (Next.js Server Actions / server components only)

**Project Type**: Web application (Next.js App Router)

**Performance Goals**: Streaming responses to avoid HTTP timeouts on long transcripts. No hard latency target — Claude API response time varies by input length and model load.

**Constraints**: Server-side only (API key must never reach the client). Files ≤ 150 lines per constitution §V.

**Scale/Scope**: Single integration point. One service class, one client module, one types file. Estimated 3–4 source files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| §I Environment Validation | PASS | `ANTHROPIC_API_KEY` will be added to `env.mjs` Zod schema. Fail-fast at startup if missing. |
| §III TypeScript Strictness | PASS | No `any`, no `!` assertions. All types explicitly declared. |
| §V Code Modularity | PASS | Each file has single responsibility. All files under 150 lines. |
| §VIII Schema Validation | PASS | Zod used for input validation (transcript non-empty check). |
| §IX Repository Layer | PASS | External API calls encapsulated in `src/integrations/claude/`. Constitution's directory architecture maps external services to `integrations/`, not `repositories/` (which is for DB abstraction). |
| §X Server Actions | PASS | No `/app/api/` route handlers created. Server actions call the integration layer. |
| §XI Type Isolation | PASS | Plain data types in `src/types/claude.types.ts` — zero SDK dependency, frontend-safe. |
| §XIV Error Handling | PASS | All errors caught and categorized. No bare `catch {}`. Structured error objects returned. No internal details exposed. |
| §XVI Git Standards | PASS | Branch follows `feat/` convention. Commits will follow conventional format. |

**Gate result**: All principles pass. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-claude-api-wrapper/
├── plan.md              # This file
├── research.md          # Phase 0 output — SDK patterns, error taxonomy
├── data-model.md        # Phase 1 output — types and entities
├── quickstart.md        # Phase 1 output — validation guide
├── contracts/
│   └── claude-integration.md  # Phase 1 output — integration contract
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── integrations/
│   └── claude/
│       ├── client.ts                  # Anthropic SDK client (singleton factory)
│       └── transcript-summarizer.ts   # Summarization service class
├── types/
│   └── claude.types.ts                # Request/Response/Error types (plain, no SDK deps)
└── ...existing files unchanged...

env.mjs                                # Add ANTHROPIC_API_KEY to server schema
```

**Structure Decision**: The Claude API client lives in `src/integrations/claude/` per the constitution's directory architecture which designates `integrations/` for "external service integrations and API clients." The `repositories/` directory is reserved for database abstraction. The user's intent of a "repository layer" maps to the integration pattern — a service class that abstracts all SDK details behind a clean interface callable by server actions.

## Complexity Tracking

No constitution violations to justify. The design follows all principles directly.
