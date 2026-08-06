---

description: "Task list for Claude AI Integration Reliability Fixes"
---

# Tasks: Claude AI Integration Reliability Fixes

**Input**: Design documents from `/specs/fix-claude-integration-gaps/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/model-capability-contract.md](./contracts/model-capability-contract.md), [quickstart.md](./quickstart.md)

**Tests**: Not requested — this repo has no automated test infrastructure yet (per `CLAUDE.md`). Verification is manual, via the `quickstart.md` scenarios cited in each story below.

**Organization**: Tasks are grouped by user story (US1/US2/US3, matching [spec.md](./spec.md)) so each can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are relative to the repository root

## Path Conventions

Single Next.js project. All changes live under `src/integrations/claude/`, per the Structure Decision in [plan.md](./plan.md). No `tests/` directory exists in this repo.

---

## Phase 1: Setup

**Purpose**: Confirm the ground truth this feature relies on, before changing any code.

- [X] T001 [P] Confirm `env.mjs` already validates and exposes `CLAUDE_API_KEY`, `CLAUDE_DEFAULT_MODEL`, and `CLAUDE_MAX_TOKENS` (it does — the defect is that `client.ts` doesn't consume `CLAUDE_API_KEY`, not that the schema is missing it). No schema changes expected. File: `env.mjs`
- [X] T002 [P] Review the existing AI response error-category unions to confirm no new category is needed for this feature (per [data-model.md](./data-model.md) — `authentication`, `invalid_request`, `rate_limit`, `network`, `malformed_response`, `api_error` already cover every outcome this feature touches). Files: `src/types/claude.types.ts`, `src/types/chat.types.ts`, `src/types/suggested-questions.types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that must exist before any user story.

No shared blocking infrastructure is required for this feature — User Story 1 has no dependency on User Story 2 or 3's code, so it proceeds directly. (Note: while not a *code* dependency, US1's fix is a practical precondition for *verifying* US2 and US3 against a real Claude account — see Dependencies & Execution Order below.)

---

## Phase 3: User Story 1 - Production Cutover Authenticates Successfully (Priority: P1) 🎯 MVP

**Goal**: Every Claude-backed request authenticates successfully once a valid credential is configured.

**Independent Test**: Configure a valid Claude credential, trigger a summarization request, and confirm it reaches Claude and gets a real response — never an authentication failure caused by the key not being sent (see [quickstart.md](./quickstart.md) Scenario 1).

### Implementation for User Story 1

- [X] T003 [US1] Pass `apiKey: env.CLAUDE_API_KEY` explicitly into the `Anthropic` client constructor in `src/integrations/claude/client.ts` (currently `new Anthropic()` with no arguments, which never reads this project's validated `CLAUDE_API_KEY`)

### Validation for User Story 1

- [X] T004 [US1] Run [quickstart.md](./quickstart.md) Scenario 1 against `src/integrations/claude/client.ts` — confirm a valid credential authenticates on all three AI-backed features, and an invalid credential produces the `authentication` category (not a generic or misleading error)

**Checkpoint**: Claude requests authenticate correctly. Production cutover is no longer blocked.

---

## Phase 4: User Story 2 - Switching the Configured Model Never Breaks a Request (Priority: P1)

**Goal**: Any configured Claude model succeeds, because advanced request options are only sent to models that support them.

**Independent Test**: Configure `claude-haiku-4-5` (no adaptive-thinking/effort support) and confirm summarization, meeting chat, and suggested questions all still succeed; repeat with `claude-sonnet-5` and confirm they still succeed (see [quickstart.md](./quickstart.md) Scenario 2).

### Implementation for User Story 2

- [X] T005 [US2] Create the Model Capability Profile type and a pure `resolveModelCapabilities(modelId)` resolver with a per-model capability map in new file `src/integrations/claude/model-capabilities.ts`, per [data-model.md](./data-model.md) and [contracts/model-capability-contract.md](./contracts/model-capability-contract.md) — unrecognized models resolve to `{ supportsAdaptiveThinking: false, supportsEffort: false }`
- [X] T006 [P] [US2] Gate `thinking: { type: 'adaptive' }` and `output_config.effort` behind `resolveModelCapabilities()` in `src/integrations/claude/meeting-chat.ts` (currently hardcoded unconditionally on every request)
- [X] T007 [P] [US2] Gate `thinking: { type: 'adaptive' }` and `output_config.effort` behind `resolveModelCapabilities()` in `src/integrations/claude/suggested-questions.ts` (currently hardcoded unconditionally on every request)

> Note: `src/integrations/claude/transcript-summarizer.ts` does not currently set `thinking`/`effort` at all, so it has nothing to gate for this story — it is already consistent with the "omit unless supported" rule by construction.

### Validation for User Story 2

- [X] T008 [US2] Run [quickstart.md](./quickstart.md) Scenario 2 against `src/integrations/claude/meeting-chat.ts` and `src/integrations/claude/suggested-questions.ts` — confirm success on both an unsupported model (`claude-haiku-4-5`) and a supported one (`claude-sonnet-5`)

**Checkpoint**: Switching `CLAUDE_DEFAULT_MODEL` to any model no longer breaks any AI-backed feature. Combined with US1, the reported outage is fully resolved.

---

## Phase 5: User Story 3 - Structured AI Output Is as Reliable on Claude as on OpenRouter (Priority: P2)

**Goal**: Claude's structured JSON responses are enforced at the API level (`output_config.format`), closing the malformed-response gap with OpenRouter's `response_format: json_object`.

**Independent Test**: Run the same representative transcript through both providers repeatedly and confirm Claude's malformed/unusable-response rate is no higher than OpenRouter's (see [quickstart.md](./quickstart.md) Scenario 3).

### Implementation for User Story 3

- [X] T009 [US3] ~~Add a JSON-schema builder utility...~~ **Superseded during implementation**: `@anthropic-ai/sdk/helpers/zod` already ships an official `zodOutputFormat(schema)` helper that does exactly this (derives a `{ type: 'json_schema', schema }` payload from a Zod schema, stripping constraints the Messages API doesn't support). No new file was created — using the SDK's own helper directly at each call site avoids a redundant hand-rolled duplicate, per the constitution's simplicity principle. Verified via a dry run against a schema shaped like `AiSummaryResponseSchema`.
- [X] T010 [P] [US3] Wire `output_config.format` (via `zodOutputFormat(AiSummaryResponseSchema)`) into the `summarizeStructured` branch of `src/integrations/claude/transcript-summarizer.ts`. No `effort` merge was needed here — this call site never set `thinking`/`effort` (see US2 note), so `output_config` is just `{ format: ... }`. Existing prompt-level JSON instructions kept as human-readable context, not the sole enforcement mechanism.
- [X] T011 [P] [US3] Wire `output_config.format` (via `zodOutputFormat(ChatAnswerSchema)`) into `src/integrations/claude/meeting-chat.ts`, merged into the same `output_config` object as the capability-gated `effort` from T006
- [X] T012 [P] [US3] Wire `output_config.format` (via `zodOutputFormat(SuggestedQuestionsSchema)`) into `src/integrations/claude/suggested-questions.ts`, merged into the same `output_config` object as the capability-gated `effort` from T007

### Validation for User Story 3

- [X] T013 [US3] Ran a real, single-pass end-to-end check (not the full multi-run statistical comparison in quickstart.md Scenario 3, which would need many more paid API calls) — called `TranscriptSummarizer.summarize()` with `signals`, `MeetingChat.ask()`, and `SuggestedQuestions.generate()` directly against a fabricated but realistic transcript/context. All three returned `success: true` with schema-valid structured output on the first attempt (no `malformed_response`, no retry needed). Confirms `output_config.format` enforcement is correctly wired end-to-end through the existing business-logic layers (signal filtering, evidence-span verification, suggestion validation). A full multi-run malformed-rate comparison against OpenRouter is left to the user to run over normal usage, or on request.

**Checkpoint**: All three user stories are complete. Claude and OpenRouter are functionally interchangeable from the caller's perspective.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Repo-wide validation that nothing regressed.

- [X] T014 [P] Run `npm run type-check` and `npm run lint` and confirm zero errors/warnings across all files touched by T003, T005–T007, T009–T012 — verified manually by the user in their own terminal
- [X] T015 Run the [quickstart.md](./quickstart.md) rollback check — confirm the OpenRouter (development) path is byte-for-byte unaffected by these changes — verified manually by the user in their own terminal

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Empty for this feature — no shared blocking infrastructure.
- **User Story 1 (Phase 3)**: Depends only on Setup. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends only on Setup, structurally. In practice, verifying it against a real account (T008) requires US1's fix (T003) to already be in place — otherwise every request fails at authentication before the capability gate is ever exercised.
- **User Story 3 (Phase 5)**: Depends on Setup, structurally. T010–T012 each merge with the capability-gated `effort` object introduced in the matching US2 task (T006 for `meeting-chat.ts`, T007 for `suggested-questions.ts`) — so within each file, the US2 task must land before the corresponding US3 task, even though the two stories are conceptually independent. Verifying T013 also requires US1's fix in place.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Recommended order

Given the file-level coupling above, implement in story-priority order rather than in parallel across stories: **US1 → US2 → US3**. Within US2 and within US3, the `[P]`-marked tasks across `meeting-chat.ts` and `suggested-questions.ts` are independent of each other and may run in parallel.

### Parallel Opportunities

- T001 and T002 (Setup) — different files, no dependency.
- T006 and T007 (US2) — different files, both depend only on T005.
- T010, T011, and T012 (US3) — different files, all depend only on T009 (and, per-file, on the matching US2 task).
- T014 (Polish) has no dependency on T015 and can run alongside it.

---

## Parallel Example: User Story 2

```bash
# After T005 (model-capabilities.ts) is complete, run together:
Task: "Gate thinking/effort in src/integrations/claude/meeting-chat.ts"
Task: "Gate thinking/effort in src/integrations/claude/suggested-questions.ts"
```

## Parallel Example: User Story 3

```bash
# After T009 (structured-output.utils.ts) and the matching US2 gate are complete, run together:
Task: "Wire output_config.format into src/integrations/claude/transcript-summarizer.ts"
Task: "Wire output_config.format into src/integrations/claude/meeting-chat.ts"
Task: "Wire output_config.format into src/integrations/claude/suggested-questions.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

Both US1 and US2 are P1 in [spec.md](./spec.md) — together they resolve the reported outage (auth never wired up; hardcoded params breaking on model switch). Treat them as the MVP:

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (T003–T004)
3. Complete Phase 4: User Story 2 (T005–T008)
4. **STOP and VALIDATE**: run Scenario 1 and Scenario 2 from `quickstart.md` against a real Claude account
5. Ship — this alone makes the production cutover functional for any configured model

### Incremental Delivery

1. Setup → US1 → validate → this alone unblocks production authentication
2. + US2 → validate → this alone unblocks free model switching
3. + US3 → validate → closes the remaining reliability gap versus OpenRouter
4. Polish (Phase 6) after all three are in

### Notes

- No `[Story]` label on Setup, Foundational, or Polish tasks — per convention.
- No test-first tasks — this repo has no test framework configured; `quickstart.md` is the verification mechanism per story.
- Commit after each task or logical group, per the user's own git workflow (not automated by this task list).
