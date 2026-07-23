# Tasks: Claude API Service Wrapper

**Input**: Design documents from `specs/002-claude-api-wrapper/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/claude-integration.md, quickstart.md

**Tests**: No testing infrastructure exists yet. Test tasks are not included. Validation is manual via quickstart.md scenarios.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install the Anthropic SDK and create the integration directory structure

- [x] T001 Install `@anthropic-ai/sdk` package as a production dependency
- [x] T002 Create directory structure: `src/integrations/claude/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Environment validation, shared types, and SDK client — MUST be complete before any user story work

- [x] T003 Add `ANTHROPIC_API_KEY` to the server schema in `env.mjs` as a required non-empty string with Zod validation, and add the corresponding `runtimeEnv` entry
- [x] T004 [P] Create plain data types (`SummarizationErrorCategory`, `SummarizationError`, `SummarizationResult`, `SummarizationResponse`, `SummarizationOptions`) in `src/types/claude.types.ts` per data-model.md — zero `@anthropic-ai/sdk` dependency
- [x] T005 [P] Create Anthropic SDK client singleton in `src/integrations/claude/client.ts` — import `Anthropic` from `@anthropic-ai/sdk`, instantiate with default constructor (reads `ANTHROPIC_API_KEY` from env), and export the client instance

**Checkpoint**: Foundation ready — types defined, client initialized, env validated at startup

---

## Phase 3: User Story 1 — Send Transcript for Summarization (Priority: P1) MVP

**Goal**: Accept a transcript string, send it to Claude via streaming, and return a typed `SummarizationResult` with content, model, and usage metadata.

**Independent Test**: Call `summarizer.summarize()` with a sample transcript string. Verify `response.success === true` with non-empty `content`, correct `model`, and positive `inputTokens`/`outputTokens`.

### Implementation for User Story 1

- [x] T006 [US1] Create `TranscriptSummarizer` class in `src/integrations/claude/transcript-summarizer.ts` with a `summarize(transcript: string, options?: SummarizationOptions): Promise<SummarizationResponse>` method signature. Import types from `@/types/claude.types` and the client from `./client`
- [x] T007 [US1] Implement Zod input validation inside `summarize()` in `src/integrations/claude/transcript-summarizer.ts` — validate transcript is a non-empty string; return `SummarizationError` with category `invalid_request` if validation fails (no API call made)
- [x] T008 [US1] Implement the streaming API call in `summarize()` in `src/integrations/claude/transcript-summarizer.ts` — use `client.messages.stream()` with model defaulting to `claude-opus-4-8`, `thinking: { type: "adaptive" }`, `max_tokens` from options (default `16384`), and `await stream.finalMessage()` to get the complete response
- [x] T009 [US1] Map the successful Claude response to `SummarizationResult` in `src/integrations/claude/transcript-summarizer.ts` — extract text content from `response.content`, set `model` from `response.model`, set `usage.inputTokens` and `usage.outputTokens` from `response.usage`

**Checkpoint**: Summarization works end-to-end for valid transcripts. Errors are not yet categorized (basic catch-all only).

---

## Phase 4: User Story 2 — Handle API Failures Gracefully (Priority: P1)

**Goal**: Catch all Anthropic SDK exceptions and map them to typed `SummarizationError` objects with user-safe messages. No unhandled exceptions propagate to callers.

**Independent Test**: Simulate API errors (invalid key, rate limit, network timeout) and verify each returns `response.success === false` with the correct `category` and a user-safe `message` — no stack traces or SDK internals exposed.

### Implementation for User Story 2

- [x] T010 [US2] Implement SDK exception mapping in the `catch` block of `summarize()` in `src/integrations/claude/transcript-summarizer.ts` — map `Anthropic.AuthenticationError` → `authentication`, `Anthropic.RateLimitError` → `rate_limit`, `Anthropic.BadRequestError` → `invalid_request`, `Anthropic.APIConnectionError` → `network`, and `Anthropic.APIError` (base) → `api_error`. Each maps to a user-safe message per contracts/claude-integration.md
- [x] T011 [US2] Extract `retryAfterMs` from rate-limit error headers in `src/integrations/claude/transcript-summarizer.ts` — when catching `RateLimitError`, read the retry-after header value and convert to milliseconds for `SummarizationError.retryAfterMs`; set `null` for all other error categories

**Checkpoint**: All five error categories handled. `summarize()` never throws — every failure returns a structured `SummarizationError`.

---

## Phase 5: User Story 3 — Server Action Integration (Priority: P2)

**Goal**: Ensure the integration has a clean public API that server actions can consume without importing `@anthropic-ai/sdk` or knowing any SDK internals.

**Independent Test**: A server action file imports only from `@/integrations/claude/transcript-summarizer` and `@/types/claude.types`. Run `npm run type-check` — no errors, no SDK type leakage.

### Implementation for User Story 3

- [x] T012 [US3] SKIPPED — Barrel exports are prohibited per constitution §XVII. Consumers MUST import directly from `@/integrations/claude/transcript-summarizer` and `@/types/claude.types`. No `index.ts` barrel is created.
- [x] T013 [US3] Verify type isolation by running `npm run type-check` — confirm that only `src/integrations/claude/client.ts` imports from `@anthropic-ai/sdk`; no SDK types appear in the public signature of `transcript-summarizer.ts`

**Checkpoint**: Integration is fully encapsulated. Server actions can call `summarizer.summarize(transcript)` with zero SDK knowledge.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, code quality, and documentation

- [x] T014 Run `npm run validate` (type-check → lint → build) and fix any issues
- [x] T015 Run quickstart.md validation scenarios (VS-1 through VS-6) manually and verify all pass — VS-1/VS-3/VS-5/VS-6 verified; VS-2 (live API call) and VS-4 (auth error) require manual verification with a real ANTHROPIC_API_KEY in .env.development

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (Phase 2) — needs types and client
- **US2 (Phase 4)**: Depends on US1 (Phase 3) — error handling wraps the existing `summarize()` method
- **US3 (Phase 5)**: Depends on US1 and US2 — barrel export covers the complete public API
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 — the error handling is applied to the `summarize()` method built in US1
- **User Story 3 (P2)**: Can start after US1 + US2 — needs the complete public API to export

### Within Each User Story

- Types and client (foundational) before service implementation
- Input validation before API call logic
- API call before response mapping
- Response mapping before error handling
- Core implementation before barrel exports

### Parallel Opportunities

- T004 and T005 (types and client) can run in parallel — different files, no dependency
- T006–T009 are sequential within US1 (same file, building on each other)
- T010–T011 are sequential within US2 (same catch block)
- T012–T013 are sequential within US3 (export then verify)

---

## Parallel Example: Phase 2 (Foundational)

```text
# These two tasks can run in parallel — different files, no dependency:
T004: Create types in src/types/claude.types.ts
T005: Create client singleton in src/integrations/claude/client.ts

# T003 (env.mjs) can also run in parallel with T004/T005
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install SDK, create dirs)
2. Complete Phase 2: Foundational (env, types, client)
3. Complete Phase 3: User Story 1 (core summarize method)
4. **STOP and VALIDATE**: Send a real transcript to Claude and verify response
5. Feature is usable (with basic error handling) at this point

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test with real transcript → Functional MVP
3. Add User Story 2 → Test error scenarios → Production-ready error handling
4. Add User Story 3 → Verify clean exports → Integration-ready for server actions
5. Polish → Full validation pipeline passes

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 modify the same file (`transcript-summarizer.ts`) — they are sequential, not parallel
- US3 creates a new file (`index.ts`) and runs verification — can only start after US1+US2
- No test tasks included — testing infrastructure does not exist yet
- Server action implementation is out of scope — the UI team handles that
- Stop at any checkpoint to validate the story independently
