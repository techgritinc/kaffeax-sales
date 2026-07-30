---

description: "Task list for the Grounded Chat Assistant (TAE-96)"
---

# Tasks: Grounded Chat Assistant

**Input**: Design documents from `/specs/tae-96-grounded-chat-assistant/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: No automated test tasks. This repository has no test infrastructure (`npm run validate` is the only mechanised gate) and the spec does not request TDD. Correctness is verified by the manual gates in [quickstart.md](./quickstart.md), which appear below as explicit validation tasks — they are the acceptance gate, not optional cleanup.

**Organization**: Grouped by user story so each story is an independently deliverable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: Which user story the task serves (US1–US4)
- Every task names its exact file path

## Path Conventions

Single Next.js project. All source under `src/` at the repository root, per the structure in [plan.md](./plan.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Contracts, types, and the evaluation corpus. No behaviour yet — this phase makes everything downstream compile and makes the acceptance gates runnable when they are reached.

- [X] T001 Create `src/types/chat.types.ts` with `GroundingContext`, `ChatExchangeFields`, `StoredChatExchange`, `ChatErrorCategory`, `ChatAnswerResult`, `ChatRefusalResult`, `ChatFailure`, and the `MeetingChatResponse` discriminated union per [data-model.md](./data-model.md). Zero Mongoose imports — this file must stay frontend-safe (§XI).
- [X] T002 [P] Create `src/schemas/chat-answer.schema.ts` with `ChatAnswerSchema` (`inScope`, `coveredInMeeting`, `answer`, `evidenceSpans`, `unanswerablePart`) per [contracts/ai-response.md](./contracts/ai-response.md). camelCase only (§XVIII).
- [X] T003 [P] Create `src/schemas/chat.schema.ts` with `chatQuestionSchema` (`transcriptId` min 1, `question` trimmed/min 1/max `MAX_QUESTION_CHARS`).
- [X] T004 [P] Create `src/constants/grounded-chat.ts` with the non-prose constants only: `MAX_GROUNDING_CHARS`, `MAX_QUESTION_CHARS`, `MAX_CHAT_ATTEMPTS`, `CHAT_MAX_TOKENS`, `CHAT_EFFORT`, and the delimiter strings. Prompt prose arrives in T017/T018/T030.
- [X] T005 [P] Add optional `kind?: 'answer' | 'refusal' | 'failure'` to `ChatMessage` in `src/types/workflow.types.ts`, leaving existing fields untouched.
- [ ] T006 [P] Prepare the evaluation corpus: run the app, analyse at least three visibly different meetings (bundled sample plus two others, one with a sparse or messy transcript), and record their transcript ids in `specs/tae-96-grounded-chat-assistant/evaluation/corpus.md`.
- [ ] T007 [P] Author the 30 in-scope evaluation questions across the corpus meetings in `specs/tae-96-grounded-chat-assistant/evaluation/in-scope-questions.md`, weighted per Gate 2 of [quickstart.md](./quickstart.md) (figures, dates, owners, multi-part, lead score, absent topics).
- [X] T008 [P] Author the 20 adversarial questions in `specs/tae-96-grounded-chat-assistant/evaluation/adversarial-questions.md`, covering all five refusal categories from Gate 3 of [quickstart.md](./quickstart.md).
- [X] T009 Run `npm run validate` and confirm clean.

**Checkpoint**: Contracts compile and the acceptance sets exist. T006–T008 are deliberately here rather than at the end — SC-001 and SC-002 are the feature's real gate, and an evaluation set written after the implementation tends to be written to pass it.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The provider-shared machinery every story needs — grounding assembly, prompt transport, response parsing, and the two provider clients.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T010 Add `buildGroundingContext(stored)` and `buildGroundingHaystack(context)` to `src/lib/utils/grounded-chat.utils.ts`, mapping a `StoredTranscript` to a `GroundingContext` and concatenating every groundable string field per [data-model.md](./data-model.md).
- [X] T011 Add `buildGroundedChatPrompt(context)` to `src/lib/utils/grounded-chat.utils.ts`: join the constant sections, then the delimited transcript and analysis block per [contracts/prompt.md](./contracts/prompt.md). Render empty analysis sections as `(none)`, never omitted. **No timestamp, question text, request id, or random value may appear anywhere in the returned string** — a single volatile byte permanently disables prompt caching (D3).
- [X] T012 Add `processChatResponse(rawText, context)` to `src/lib/utils/grounded-chat.utils.ts`: strip code fences, `JSON.parse` with a `repairJson` fallback, validate through `ChatAnswerSchema`, and return either a result or a `malformed_response` failure. Evidence verification is added in T019.
- [X] T013 Create `src/integrations/meeting-chat.factory.ts` with the `MeetingChatLike` interface and `getMeetingChat()` selecting OpenRouter when `env.NEXT_PUBLIC_APP_ENV === 'development'` and Claude otherwise, mirroring `transcript-summarizer.factory.ts`. No barrel file (§XVII).
- [X] T014 [P] Create `src/integrations/claude/meeting-chat.ts`: non-streaming `client.messages.create` with `system` as a two-block array carrying `cache_control: { type: 'ephemeral' }` on the **second** block, `thinking: { type: 'adaptive' }`, `output_config: { effort: CHAT_EFFORT }`, `max_tokens: CHAT_MAX_TOKENS`, the question as the sole user message, a `MAX_CHAT_ATTEMPTS` retry loop on `malformed_response`, and error mapping via `handleSdkError`.
- [X] T015 [P] Create `src/integrations/openrouter/meeting-chat.ts`: `chatCompletion` with the prompt sections concatenated into one system message, `temperature: 0`, `response_format: { type: 'json_object' }`, `max_tokens: CHAT_MAX_TOKENS`, the same retry loop, cache token fields recorded as 0, and error mapping via `mapHttpError`.
- [X] T016 Run `npm run validate` and confirm clean.

**Checkpoint**: A grounding context can be built, a prompt assembled, a provider called, and a response parsed. Nothing is wired to the UI yet.

---

## Phase 3: User Story 1 - Ask a real question about the meeting on screen (Priority: P1) 🎯 MVP

**Goal**: A live, grounded answer replaces the canned response — every factual claim traceable to this meeting's transcript or analysis, with fabrication mechanically blocked.

**Independent Test**: Analyse two visibly different meetings, ask each the same question, and confirm the answers differ, each reflects only its own meeting, and every claim is locatable in that meeting's material.

### Implementation for User Story 1

- [X] T017 [P] [US1] Add `CHAT_PERSONA`, `STRICT_CONTEXT_MANDATE`, and `UNTRUSTED_CONTENT_RULE` to `src/constants/grounded-chat.ts` per [contracts/prompt.md](./contracts/prompt.md) sections 1, 2, and 4. The mandate must state that evidence spans are mechanically checked — that is both true and measurably improves span fidelity.
- [X] T018 [US1] Add `CHAT_OUTPUT_CONTRACT` and the answered + not-covered worked examples to `CHAT_OUTPUT_EXAMPLES` in `src/constants/grounded-chat.ts`, requiring verbatim spans and camelCase keys.
- [X] T019 [US1] Add evidence verification to `src/lib/utils/grounded-chat.utils.ts`: normalise (collapse whitespace, trim, lowercase) both haystack and span, require every `evidenceSpans` entry to be a substring of the haystack, and reject the whole answer when any span fails. Skip verification when `inScope` is false.
- [X] T020 [US1] Wire the cross-field rule and retry in `src/lib/utils/grounded-chat.utils.ts`: `inScope && coveredInMeeting` requires at least one span; a verification failure returns `malformed_response` so the provider retry loop from T014/T015 gets one more attempt before failing.
- [X] T021 [US1] Create `src/features/assistant-chat/actions/meeting-chat.actions.ts` with `askAboutMeeting` in the execution order from [contracts/server-action.md](./contracts/server-action.md): parse input, `transcriptRepository.findById`, `no_analysis` short-circuit, size-ceiling short-circuit, provider call, discriminated return. Steps 3 and 4 must reject **before** any AI call.
- [X] T022 [US1] Add structured logging to `src/features/assistant-chat/actions/meeting-chat.actions.ts`: one line per invocation carrying `transcriptId`, outcome, model, provider, token counts, cost, duration, attempts, and verified-span count. Never log question text, answer text, spans, or transcript content (FR-028) — on verification failure log span *count* and lengths, not text.
- [X] T023 [US1] Create `src/features/assistant-chat/hooks/use-meeting-chat.ts` owning `messages`, `pending`, `send`, and a `useRef` generation counter incremented on every send and every meeting change; a resolved response renders only when its generation still matches (FR-017).
- [X] T024 [P] [US1] Create `src/features/assistant-chat/utils/opening-message.ts` building the opening line from `summary.meetingTitle` and `leadScore.detectedSignals` labels. Prospect company is not extracted anywhere in the system (D11) — do not reintroduce a placeholder for it.
- [X] T025 [US1] Rewrite `src/features/assistant-chat/components/chat-panel.tsx` to consume `use-meeting-chat`, accepting `transcriptId` and the opening context, and drop the `cannedResponse` import. Keep the file under 150 lines (§V) and change no class names (FR-024).
- [X] T026 [US1] Update `src/components/common/app-shell/app-shell.tsx` to pass `wf.activeId` and the real opening context to `ChatPanel`, deleting the hardcoded `chatContext` object.
- [X] T027 [US1] Delete `src/features/assistant-chat/hooks/use-canned-response.ts` and remove `DEFAULT_CHAT_COMPANY` and `DEFAULT_CHAT_SIGNALS` from `src/constants/workflow.ts`. Confirm with a repository-wide grep that `cannedResponse`, `DEFAULT_CHAT_COMPANY`, and `DEFAULT_CHAT_SIGNALS` have zero remaining hits — FR-018 is not met while any survive.
- [X] T028 [US1] Run `npm run validate` and confirm clean.
- [ ] T029 [US1] Run Gates 1, 2, 4, and 5 from [quickstart.md](./quickstart.md) using the T007 question set. Include Gate 1's FR-030 regression row — T026 edits `src/components/common/app-shell/app-shell.tsx`, the file that gates panel availability during capture. **Gate 2 has a zero-fabrication bar — a single unlocatable claim fails and must be fixed here, not averaged away.**

**Checkpoint**: User Story 1 is fully functional. The panel answers real questions about the open meeting, and no canned path remains in the tree.

---

## Phase 4: User Story 2 - Get refused, clearly, when the question leaves the meeting (Priority: P2)

**Goal**: Out-of-scope questions are refused rather than answered from pre-trained knowledge, and the refusal reads like a competent answer rather than an error.

**Independent Test**: Run the T008 adversarial set against an analysed meeting and confirm every question is refused, with no outside-knowledge facts leaking through any failure.

### Implementation for User Story 2

- [X] T030 [P] [US2] Add `REFUSAL_RULES` to `src/constants/grounded-chat.ts` per [contracts/prompt.md](./contracts/prompt.md) section 3: the five refusal categories, the plain no-apology-spiral tone, the partly-answerable rule (FR-010), and the instruction-override rule (FR-011).
- [X] T031 [US2] Add the out-of-scope and partly-answerable worked examples to `CHAT_OUTPUT_EXAMPLES` in `src/constants/grounded-chat.ts`, so all four flag combinations are exemplified.
- [X] T032 [US2] Add the refusal branch to `processChatResponse` in `src/lib/utils/grounded-chat.utils.ts`: `inScope: false` returns a `ChatRefusalResult` with `success: true` (FR-009, D6), skipping evidence verification and permitting an empty `evidenceSpans`.
- [X] T033 [US2] Add the dependent-question rule to `STRICT_CONTEXT_MANDATE` or `REFUSAL_RULES` in `src/constants/grounded-chat.ts`: an unresolved pronoun is not a refusal — ask for a self-contained question (FR-016).
- [X] T034 [US2] Verify in `src/features/assistant-chat/components/chat-messages.tsx` that `kind: 'refusal'` renders through the identical `AI_BUBBLE` path as `kind: 'answer'`, with no distinguishing style (FR-009).
- [ ] T035 [US2] Run Gate 3 from [quickstart.md](./quickstart.md) using the T008 set (≥19/20 refused), plus the transcript-injection case: append an AI-directed instruction line to a transcript, re-analyse, and confirm it is treated as content and never followed (FR-012). Budget a prompt-tuning round here — refusal calibration is empirical.

**Checkpoint**: User Stories 1 and 2 both work. The assistant answers what it can and refuses what it cannot, in the same voice.

---

## Phase 5: User Story 3 - Each meeting keeps its own conversation (Priority: P3)

**Goal**: A meeting's conversation is stored and restored on reopen, while remaining invisible to the model.

**Independent Test**: Ask 10+ questions on one meeting, reload, reopen it, and confirm every exchange returns in order; switch to another meeting and confirm none of the first meeting's messages are visible at any point.

### Implementation for User Story 3

- [X] T036 [P] [US3] Create `src/lib/db/models/chat-exchange.model.ts` with the `ChatExchangeFields` schema (`transcriptId` ObjectId required, `question`, `answer`, `kind` enum, `usage` reusing the `AiUsage` sub-schema shape), `{ timestamps: true }`, the `{ transcriptId: 1, createdAt: 1 }` index, `HydratedDocument` type, and model export. Import plain types from `src/types/chat.types.ts` — declare none inline (§XI).
- [X] T037 [US3] Create `src/repositories/chat-exchange.repository.ts` with a `ChatExchangeRepository` class exposing `listByTranscript(transcriptId)` (createdAt ascending), `create(fields)`, and `deleteByTranscript(transcriptId)`, all wrapped in `withDb` and mapping documents to `StoredChatExchange`. One class per collection (§IX).
- [X] T038 [US3] Add `getMeetingConversation(transcriptId)` to `src/features/assistant-chat/actions/meeting-chat.actions.ts` returning `StoredChatExchange[]`, with `[]` for both an empty and a missing meeting, and `logAndThrow` on repository failure per [contracts/server-action.md](./contracts/server-action.md).
- [X] T039 [P] [US3] Create `src/features/assistant-chat/utils/chat-message.mapper.ts` with `toChatMessages(exchanges)` expanding each exchange into a `user` message then an `ai` message, deriving ids as `${id}-q` / `${id}-a` so React keys are stable without a client counter.
- [X] T040 [US3] Add the best-effort persist to `askAboutMeeting` in `src/features/assistant-chat/actions/meeting-chat.actions.ts`: on an answer or refusal, `chatExchangeRepository.create(...)` inside a `try`/`catch` that logs with context and falls through so a storage failure never turns a delivered answer into an error (FR-032). Failures are **not** persisted (D8).
- [X] T041 [US3] Add hydration to `src/features/assistant-chat/hooks/use-meeting-chat.ts`: on `transcriptId` change clear messages **first**, then load via `getMeetingConversation`, then map and set — guarded by the same generation counter so a slow load cannot land under a different meeting. Expose a `restoring` flag.
- [X] T042 [US3] Update `src/features/assistant-chat/components/chat-messages.tsx` to render the `restoring` state as a muted line in the existing `AI_BUBBLE` style (matching the pending row) and to show the opening message and suggested chips only when the conversation is empty — a restored conversation must not be topped by a fresh greeting.
- [X] T043 [US3] Update `deleteTranscript` in `src/features/workflow/actions/transcript.actions.ts` to also call `chatExchangeRepository.deleteByTranscript(id)` so no conversation outlives its meeting (FR-033). Cross-collection coordination belongs at the action layer, not inside a repository.
- [X] T044 [US3] Run `npm run validate` and confirm clean.
- [ ] T045 [US3] Run Gates 6 and 7 from [quickstart.md](./quickstart.md). Gate 7 is the important one: build a conversation of 10 exchanges including misleading ones, re-ask an earlier question, and confirm the grounded facts are identical — and that a dependent follow-up still asks to be restated (FR-016). Any drift means stored exchanges are reaching the model.

**Checkpoint**: User Stories 1, 2, and 3 all work. Conversations persist per meeting and provably do not influence answers.

---

## Phase 6: User Story 4 - Failures say what happened (Priority: P3)

**Goal**: Every operational failure produces a clear, non-technical message and a panel the user can retry from immediately.

**Independent Test**: Force provider failure, rate-limit, timeout, no-analysis, oversized-transcript, and persistence-failure conditions and confirm each yields a distinct safe message with no unresolved pending indicator.

### Implementation for User Story 4

- [X] T046 [P] [US4] Add `CHAT_ERROR_MESSAGES` to `src/constants/grounded-chat.ts` — one user-safe message per category in the [contracts/server-action.md](./contracts/server-action.md) table. No stack traces, provider names, or model ids (FR-027); no inline strings (§XV).
- [X] T047 [US4] Complete failure mapping in `src/features/assistant-chat/actions/meeting-chat.actions.ts` for `no_analysis`, `context_too_large`, and every provider category, ensuring `retryAfterMs` is passed through on rate limits.
- [X] T048 [US4] Update `src/features/assistant-chat/components/chat-messages.tsx` to render `kind: 'failure'` distinctly from answers and refusals using existing muted classes only — a failure must be visibly a failure while a refusal is not (§II, FR-009).
- [X] T049 [US4] Add the submission guards to `src/features/assistant-chat/hooks/use-meeting-chat.ts` and `src/features/assistant-chat/components/chat-panel.tsx`: reject empty and whitespace-only input without appending anything (FR-022), and block a new submission while one is in flight (FR-021).
- [X] T050 [US4] Add restore-failure handling to `src/features/assistant-chat/hooks/use-meeting-chat.ts`: a failed `getMeetingConversation` surfaces a failure message and falls back to the opening state, leaving the panel able to ask new questions.
- [X] T051 [US4] Run `npm run validate` and confirm clean.
- [ ] T052 [US4] Run Gate 9 from [quickstart.md](./quickstart.md), including the three that need specific attention: the mid-flight meeting switch renders nothing but may still store against the original meeting; a persistence failure still shows the answer; and no failure is ever persisted (reload and confirm no error bubble survives).

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: The measurable criteria that span stories, plus a constitution audit.

- [ ] T053 [P] Run Gate 11 from [quickstart.md](./quickstart.md): compare the panel against `Design/POC_Kaffea-X_Prototype.html` at 1440px, 1100px, 900px, and 560px, then check a long answer, a long refusal, and a restored conversation of 20 exchanges at 560px for wrapping and horizontal-scroll containment (SC-010, FR-023).
- [ ] T054 [P] Run Gate 8 from [quickstart.md](./quickstart.md): time 20 questions across a short and a long transcript for p95 ≤10s / p99 ≤20s, and time panel open on a conversation of 20 exchanges (SC-005).
- [ ] T055 Run the cache-effectiveness check from Gate 10 of [quickstart.md](./quickstart.md) under `npm run dev:prod`: three questions on one meeting, expecting `cacheReadTokens > 0` on the second and third. Before treating a zero as a bug, check the transcript against the model's cacheable-prefix floor (512 / 1024 / 4096 tokens by model).
- [ ] T056 Run the log audit from Gate 10 of [quickstart.md](./quickstart.md): capture server output across the full evaluation and confirm zero occurrences of transcript phrases, question text, answer text, or attendee names (SC-008).
- [ ] T057 Verify per-meeting cost with the aggregation query in Gate 10 of [quickstart.md](./quickstart.md), confirming the exchange count matches answers plus refusals (not failures) and `usage.totalCostUsd` sums non-zero (SC-009).
- [X] T058 Constitution audit across every file touched: no file over 150 lines (§V), no `index.ts` barrels (§XVII), no hardcoded hex or inline `style` props (§II), no `any` or non-null assertions (§III), no magic strings outside `src/constants/grounded-chat.ts` (§XV).
- [ ] T059 Run `npm run validate` plus a full pass of [quickstart.md](./quickstart.md) Gates 0–12, and record results in `specs/tae-96-grounded-chat-assistant/evaluation/results.md`.
- [ ] T060 Run Gate 12 from [quickstart.md](./quickstart.md): a reviewer who did not attend the meeting answers five factual questions using the panel alone, scored against the transcript, recorded in `specs/tae-96-grounded-chat-assistant/evaluation/results.md` (SC-007). Requires a person other than the implementer — schedule it rather than skipping it.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup. **Blocks all user stories.**
- **User Story 1 (Phase 3)**: depends on Foundational.
- **User Story 2 (Phase 4)**: depends on User Story 1.
- **User Story 3 (Phase 5)**: depends on User Story 1. Independent of US2 and US4.
- **User Story 4 (Phase 6)**: depends on User Story 1. Independent of US2 and US3.
- **Polish (Phase 7)**: depends on all stories intended for the release.

### User Story Dependencies — read this before parallelising

These stories are **not** fully independent, and the plan does not pretend otherwise:

- **US1 is the vertical slice.** It builds the response processor, the server action, the hook, and the panel wiring. Everything else extends those files.
- **US2 depends on US1** because refusal handling is a branch inside the processor US1 creates, and the spec says so explicitly: it is P2 "only because the grounded-answer path must exist before refusals can be exercised against it."
- **US3 and US4 depend on US1** (both extend `meeting-chat.actions.ts` and `use-meeting-chat.ts`) but are independent of each other and of US2.

The genuine parallel opportunity is **US2, US3, and US4 after US1 lands**, not all four from the Foundational checkpoint.

### Within Each User Story

- Constants before the code that reads them
- Pure utils before the action that calls them
- Action before the hook that calls it
- Hook before the components that consume it
- `npm run validate` before the manual gates

---

## Parallel Opportunities

### Phase 1 (Setup)

```text
T002  src/schemas/chat-answer.schema.ts
T003  src/schemas/chat.schema.ts
T004  src/constants/grounded-chat.ts        (non-prose constants)
T005  src/types/workflow.types.ts           (ChatMessage.kind)
T006  evaluation/corpus.md
T007  evaluation/in-scope-questions.md
T008  evaluation/adversarial-questions.md
```

All seven after T001. T006–T008 need no code at all and can be authored by whoever is not writing TypeScript.

### Phase 2 (Foundational)

```text
T014  src/integrations/claude/meeting-chat.ts
T015  src/integrations/openrouter/meeting-chat.ts
```

Both after T013. T010–T012 all edit `grounded-chat.utils.ts` and must stay sequential.

### After User Story 1 lands

```text
US2 (T030–T035)  prompt refusal rules + processor branch
US3 (T036–T045)  persistence collection, repository, restore
US4 (T046–T052)  error messages, failure rendering, guards
```

Three developers can take one story each. Watch for collisions in `meeting-chat.actions.ts` (T040 vs T047), `use-meeting-chat.ts` (T041 vs T049/T050), and `chat-messages.tsx` (T034 vs T042 vs T048) — small edits to shared files, so coordinate rather than merge blind.

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup — including the evaluation sets, which is the point of putting them first
2. Phase 2: Foundational
3. Phase 3: User Story 1
4. **STOP and VALIDATE**: Gate 2's zero-fabrication bar decides whether this approach works at all. If in-scope answers fabricate, that is not a polish item — it invalidates the design and is far cheaper to discover here than after persistence exists.
5. Demo: the panel answers real questions about real meetings

### Incremental Delivery

1. Setup + Foundational → machinery ready
2. US1 → Gates 1, 2, 4, 5 → **MVP**
3. US2 → Gate 3 → the guardrail is now real, not just the happy path
4. US3 → Gates 6, 7 → conversations persist and provably don't leak into answers
5. US4 → Gate 9 → usable under real failure conditions
6. Polish → Gates 8, 10, 11

US1 + US2 is the smallest genuinely shippable pair: a grounded assistant that answers what it can and refuses what it cannot. US1 alone is demonstrable but not safe to put in front of a customer, because nothing yet stops it answering "who are their competitors?" from general knowledge.

### Sequencing rationale worth preserving

- **Evaluation sets first (T006–T008)** — a question set authored after the implementation is written to pass it.
- **Ask path before persistence (US1 before US3)** — a restore bug is never mistaken for a grounding bug.
- **Deletion of the canned path inside US1 (T027)**, not in Polish — FR-018 is a requirement, and a dormant `cannedResponse` is exactly the kind of thing that survives to production.

---

## Notes

- 60 tasks. No automated tests: this repository has no test infrastructure and the spec does not request TDD, so the [quickstart.md](./quickstart.md) gates are the acceptance criteria and appear as real tasks (T029, T035, T045, T052, T053–T057, T059, T060).
- `[P]` means different files with no incomplete dependency.
- The three `grounded-chat.utils.ts` tasks (T010–T012) plus T019/T020/T032 all touch one file — sequential by necessity.
- Commit after each task or logical group; every phase ends at a state where `npm run validate` passes.
- Two files the previous plan revision touched and this one deliberately does not: `src/lib/db/models/transcript.model.ts` and `src/types/transcript.types.ts`. Storing usage on the exchange document removed the need for transcript-level cost fields.
