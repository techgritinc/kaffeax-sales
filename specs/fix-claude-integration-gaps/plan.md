# Implementation Plan: Claude AI Integration Reliability Fixes

**Branch**: `fix/claude-integration-gaps` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/fix-claude-integration-gaps/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

The Claude (Anthropic) integration at `src/integrations/claude/` never wires the validated `CLAUDE_API_KEY` into the SDK client, and two call sites (`meeting-chat.ts`, `suggested-questions.ts`) hardcode `thinking: { type: 'adaptive' }` + `output_config.effort`, which only certain Claude models support — switching to an unsupported model (e.g. `claude-haiku-4-5`) causes every request to fail with a 400. Separately, Claude-side structured JSON responses are parsed with a best-effort text-cleanup-and-retry loop, while the OpenRouter path forces `response_format: json_object`, producing a measurably worse malformed-response rate on Claude for the same prompt.

Technical approach: (1) pass `apiKey: env.CLAUDE_API_KEY` into the `Anthropic` client constructor; (2) introduce a small, explicit per-model capability map (checked against the SDK's own error type, not the Models API, to avoid a network round trip on every request) that gates whether `thinking`/`output_config.effort` are included in a request, so any configured model succeeds; (3) replace the current JSON-repair-and-retry parsing path with the Anthropic Messages API's native structured-output enforcement (`output_config.format` with a JSON schema), bringing Claude's structured-response reliability to parity with OpenRouter's `response_format: json_object`; (4) apply both fixes uniformly across all three Claude call sites (`transcript-summarizer.ts`, `meeting-chat.ts`, `suggested-questions.ts`).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js runtime under Next.js 16

**Primary Dependencies**: `@anthropic-ai/sdk` ^0.113.0, `zod` ^4.4.3, `next` 16.2.10, `react` 19.2.4, `@t3-oss/env-nextjs` (via `env.mjs`)

**Storage**: N/A — this feature touches only the AI integration layer; no MongoDB schema or repository changes

**Testing**: No automated test infrastructure exists yet in this repo (per `CLAUDE.md`); verification is manual per `quickstart.md`

**Target Platform**: Server-side only — Next.js Server Actions / `src/integrations/claude/` and `src/integrations/openrouter/`, Node runtime

**Project Type**: Single Next.js web application (existing structure, no new project)

**Performance Goals**: No added latency versus the current implementation — capability gating is a pure, in-process lookup with no extra network round trip; no regression to existing summarization/chat/suggestion response times

**Constraints**: Must not alter the OpenRouter (development) code path or its behavior; must preserve the existing environment-driven provider selection (`getTranscriptSummarizer()` in `transcript-summarizer.factory.ts`); must not introduce a new AI SDK dependency

**Scale/Scope**: Three Claude integration call sites (`transcript-summarizer.ts`, `meeting-chat.ts`, `suggested-questions.ts`) plus their shared `client.ts` and `sdk-error.utils.ts`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|---|---|
| §I Tech Stack & Framework | Pass — no new framework/dependency; `env.mjs` remains the sole source of the API key (§I already requires this; the defect is that `client.ts` doesn't consume it). |
| §III TypeScript Strictness | Pass — capability map and structured-output schema are explicitly typed; no `any`, no non-null assertions. |
| §VII Utility Functions | Pass — model-capability resolution is a pure function, colocated with the Claude integration (integration-scoped, not cross-domain, so it stays under `src/integrations/claude/` per the Directory Architecture rather than `src/lib/utils/`). |
| §IX/§X Repository & Server Action layering | Pass — unaffected; this feature is entirely inside `src/integrations/`, no DB or Server Action changes. |
| §XIV Error Handling & Observability | Pass — extends the existing operational-error categorization (`SummarizationError`/`SummarizationResponse` categories) rather than replacing it; no bare `catch {}`. |
| §XVII No Barrel Imports | Pass — no `index.ts` introduced; the new capability module is imported directly by file. |
| §XVIII camelCase Naming | Pass — capability map keys and the structured-output JSON schema stay camelCase, consistent with `AiSummaryResponseSchema`. |
| §XIX Spec Directory Naming Convention | **Deviation, acknowledged** — see Complexity Tracking below. |

No other violations identified. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/fix-claude-integration-gaps/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── integrations/
│   └── claude/
│       ├── client.ts                    # MODIFY — pass apiKey explicitly
│       ├── model-capabilities.ts        # NEW — per-model capability resolution
│       ├── sdk-error.utils.ts           # RE-VERIFY — categories stay exhaustive; no functional change expected
│       ├── transcript-summarizer.ts     # MODIFY — gate thinking/effort; adopt structured outputs for the structured path
│       ├── meeting-chat.ts              # MODIFY — gate thinking/effort
│       └── suggested-questions.ts       # MODIFY — gate thinking/effort
├── schemas/
│   └── ai-summary-response.schema.ts    # REUSE — becomes the source for the output_config.format JSON schema (no shape change)
└── constants/
    └── (no change — CHAT_EFFORT / SUGGESTION_EFFORT constants stay; capability gating wraps their usage)
```

**Structure Decision**: All changes live inside the existing `src/integrations/claude/` directory, consistent with the Directory Architecture's rule that each integration is self-contained with its own client, types, and error handling. No new top-level directory, no changes to `src/integrations/openrouter/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| §XIX Spec Directory Naming Convention — no ticket-ID prefix on `specs/fix-claude-integration-gaps/` | No ticket exists yet for this investigation; the user explicitly chose (during `/speckit-plan` setup, after being asked) a descriptive slug over a placeholder ID, to be renamed once a real ticket exists | Inventing a placeholder ticket ID (e.g. `tae-000-`) would create a fake traceability record that doesn't correspond to any real tracked ticket, which is worse than an honestly-named, ticket-free directory pending assignment |
