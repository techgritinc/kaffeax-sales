# Tasks: OpenRouter API Service Wrapper

**Input**: Design documents from `specs/003-openrouter-api-wrapper/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/openrouter-integration.md, quickstart.md

**Tests**: No testing infrastructure exists. Manual validation via quickstart.md scenarios.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Register OpenRouter environment variables so the app validates them at startup (fail-fast per §I).

- [x] T001 Add `OPENROUTER_API_KEY` (required), `OPENROUTER_DEFAULT_MODEL` (optional, default `google/gemma-4-31b-it:free`), and `OPENROUTER_MAX_TOKENS` (optional, default `16384`) to the server schema in `env.mjs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the HTTP client that all summarizer logic depends on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Create OpenRouter HTTP client with `chatCompletion()` function in `src/integrations/openrouter/client.ts`
  - Import `env` from `@env`
  - Export `chatCompletion(body: { model: string; messages: Array<{ role: string; content: string }>; max_tokens: number }): Promise<Response>`
  - Set `Authorization: Bearer ${env.OPENROUTER_API_KEY}` header
  - Set `Content-Type: application/json` header
  - Set `HTTP-Referer` from `env.NEXT_PUBLIC_APP_URL` for OpenRouter dashboard attribution
  - Set `X-Title` to `Kaffea-X Sales`
  - POST to `https://openrouter.ai/api/v1/chat/completions`
  - Return the raw `Response` object (summarizer handles parsing)
  - Target: ~20 lines per plan.md

**Checkpoint**: HTTP client ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Send Transcript for Summarization via OpenRouter (Priority: P1) MVP

**Goal**: Developers can send a transcript to a free AI model via OpenRouter and receive a structured `SummarizationResult` response matching the Claude integration's shape.

**Independent Test**: Call `summarizer.summarize("Meeting transcript text")` and verify the response has `success: true` with `content`, `model`, and `usage` fields.

### Implementation for User Story 1

- [x] T003 [US1] Create `TranscriptSummarizer` class with Zod validation and success path in `src/integrations/openrouter/transcript-summarizer.ts`
  - Import `env` from `@env`, `z` from `zod`, types from `@/types/claude.types`, `chatCompletion` from `./client`
  - Create `transcriptSchema = z.string().min(1)` for input validation
  - Create `TranscriptSummarizer` class with `async summarize(transcript: string, options?: SummarizationOptions): Promise<SummarizationResponse>`
  - On validation failure: return `SummarizationError` with `category: 'invalid_request'`
  - Call `chatCompletion()` with `{ model: options?.model ?? env.OPENROUTER_DEFAULT_MODEL, messages: [{ role: 'user', content: transcript }], max_tokens: options?.maxTokens ?? env.OPENROUTER_MAX_TOKENS }`
  - On `response.ok`: parse JSON, extract `choices[0].message.content` → `content`, `response.model` → `model`, `usage.prompt_tokens` → `inputTokens`, `usage.completion_tokens` → `outputTokens`
  - Return `SummarizationResult` with mapped fields
  - Placeholder catch: return generic `api_error` (refined in Phase 4)
  - Target: ~120 lines total (including Phase 4 additions) per plan.md

**Checkpoint**: Success path works end-to-end with a valid API key and transcript.

---

## Phase 4: User Story 2 - Handle OpenRouter API Failures Gracefully (Priority: P1)

**Goal**: All OpenRouter API errors are caught and returned as structured `SummarizationError` objects using the same five categories as the Claude integration. No unhandled exceptions propagate.

**Independent Test**: Set an invalid API key and call `summarizer.summarize("test")` — verify response has `success: false` with `category: 'authentication'` and a user-safe message.

### Implementation for User Story 2

- [x] T004 [US2] Implement comprehensive HTTP error mapping in `src/integrations/openrouter/transcript-summarizer.ts`
  - Replace the placeholder catch from T003 with full error handling:
  - **Non-ok response handling** (inside try, after `chatCompletion()` call):
    - `401, 403` → `{ category: 'authentication', message: 'API authentication failed. Contact your administrator.' }`
    - `429` → `{ category: 'rate_limit', message: 'Service is temporarily busy. Please try again shortly.' }` with `Retry-After` header extraction: parse header value as integer seconds, convert to milliseconds for `retryAfterMs`
    - `400` → `{ category: 'invalid_request', message: 'The request could not be processed. The transcript may be too long.' }`
    - `408, 504` → `{ category: 'network', message: 'Unable to reach the summarization service. Check your connection.' }`
    - `402, 500, 502, 503, other` → `{ category: 'api_error', message: 'An unexpected error occurred. Please try again.' }`
  - **Catch block** (fetch throws):
    - `TypeError` (fetch network failure) → `{ category: 'network', message: 'Unable to reach the summarization service. Check your connection.' }`
    - All other errors → `{ category: 'api_error', message: 'An unexpected error occurred. Please try again.' }`
  - Add `console.error('[TranscriptSummarizer] ...')` logging with context for all error paths (no sensitive data per §XIV)
  - All `retryAfterMs` fields: `null` except for `rate_limit` with valid `Retry-After` header

**Checkpoint**: Summarizer never throws. All five error categories produce structured responses.

---

## Phase 5: User Story 3 - Server Action Integration (Priority: P2)

**Goal**: Verify that a server action can use the OpenRouter integration identically to the Claude integration — same types, same response shape, change only the import path.

**Independent Test**: Run `npm run type-check` and verify both providers' `TranscriptSummarizer` classes satisfy the same `SummarizationResponse` return type.

### Implementation for User Story 3

- [x] T005 [US3] Verify type compatibility and integration isolation
  - Run `npm run type-check` — zero errors
  - Verify `src/integrations/openrouter/` contains exactly 2 files: `client.ts` and `transcript-summarizer.ts`
  - Verify neither file imports from `src/integrations/claude/`
  - Verify no `index.ts` barrel file exists in `src/integrations/openrouter/` (§XVII)
  - Verify both providers' `summarize()` return `Promise<SummarizationResponse>` from `@/types/claude.types`
  - Verify no OpenRouter-specific types leak outside the integration directory

**Checkpoint**: Provider swap requires only changing the import path.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full validation pipeline and quickstart scenario execution.

- [x] T006 Run full validation pipeline (`npm run validate` with `SKIP_ENV_VALIDATION=true`) — type-check, lint, build must all pass with zero errors and zero warnings
- [x] T007 Execute quickstart.md validation scenarios VS-1 through VS-7 and document results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (client reads env vars added in T001)
- **US1 (Phase 3)**: Depends on Phase 2 (summarizer calls `chatCompletion` from client)
- **US2 (Phase 4)**: Depends on Phase 3 (error handling is added to the summarizer created in T003)
- **US3 (Phase 5)**: Depends on Phase 4 (type verification requires complete implementation)
- **Polish (Phase 6)**: Depends on Phase 5 (validate pipeline runs against complete code)

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (Phase 2) — builds the success path
- **US2 (P1)**: Depends on US1 — adds error handling to the class created in US1
- **US3 (P2)**: Depends on US1 + US2 — verification requires complete implementation

### Within Each User Story

- US1: Zod schema → chatCompletion call → response parsing → result mapping
- US2: Non-ok status mapping → catch block → console.error logging
- US3: Type-check → isolation audit → barrel file check

### Parallel Opportunities

- T001 is the only Setup task — no parallelism needed
- T002 is the only Foundational task — no parallelism needed
- Within US1 + US2: Tasks are sequential (same file, same method)
- T006 and T007 in Polish could run in parallel (different validation types)

---

## Parallel Example: Polish Phase

```bash
# These can run in parallel (different validation types):
Task T006: "Run npm run validate with SKIP_ENV_VALIDATION=true"
Task T007: "Execute quickstart.md validation scenarios VS-1 through VS-7"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (env vars)
2. Complete Phase 2: Foundational (HTTP client)
3. Complete Phase 3: User Story 1 (success path)
4. **STOP and VALIDATE**: Test with a valid API key and sample transcript
5. Verify response shape matches Claude integration

### Incremental Delivery

1. Phase 1 + 2 → Infrastructure ready
2. Add US1 (Phase 3) → Success path works → Can summarize transcripts for free
3. Add US2 (Phase 4) → Error handling complete → Production-quality error responses
4. Add US3 (Phase 5) → Provider interchangeability verified
5. Polish (Phase 6) → Full validation pipeline passes

### File Impact Summary

| File | Tasks | Action |
|------|-------|--------|
| `env.mjs` | T001 | MODIFY — add 3 server env vars |
| `src/integrations/openrouter/client.ts` | T002 | CREATE — ~20 lines |
| `src/integrations/openrouter/transcript-summarizer.ts` | T003, T004 | CREATE — ~120 lines |

---

## Notes

- Zero new npm dependencies — uses native `fetch`
- Zero modifications to the Claude integration
- Types reused from `src/types/claude.types.ts` — no new type files
- No barrel `index.ts` per §XVII
- All files under 150 lines per §V
- `summarize()` never throws per §XIV — errors returned as values
- Manual validation only — no test infrastructure exists yet
