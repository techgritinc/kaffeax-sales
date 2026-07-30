---

description: "Task list for AI-Generated Suggested Questions (TAE-96 follow-on)"
---

# Tasks: AI-Generated Suggested Questions

**Input**: Design documents from `/specs/tae-96-dynamic-suggested-questions/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: No automated test tasks. This repository has no test infrastructure (`npm run validate` is the only mechanised gate) and the spec does not request TDD. Correctness is verified by the manual gates in [quickstart.md](./quickstart.md), which appear below as explicit tasks — SC-002 in particular is the acceptance gate, not cleanup.

**Organization**: Grouped by user story so each story is an independently deliverable increment.

**Implementation status (2026-07-30)**: All 24 code tasks are complete and `npm run validate` passes (type-check → lint → build). The 29 tasks still open are runtime gates — they need the app running against MongoDB with AI credentials, a browser for the visual and network checks, or captured server logs, none of which can be exercised from a static working copy. They are listed unchanged below and are the remaining acceptance work. Start with T007, which every other measurement depends on.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: Which user story the task serves (US1–US3)
- Every task names its exact file path

## Path Conventions

Single Next.js project. All source under `src/` at the repository root, per the structure in [plan.md](./plan.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Types, contracts, the two persistence fields, and the delivery plumbing. No behaviour — this phase makes the field readable end to end as `[]`, so every later phase compiles against a real shape.

- [X] T001 [P] Create `src/types/suggested-questions.types.ts` with `SUGGESTION_ONLY_ERROR_CATEGORIES`, `SuggestionErrorCategory`, `SuggestedQuestionsResult`, `SuggestedQuestionsFailure`, and the `SuggestedQuestionsResponse` union per [data-model.md](./data-model.md) §2. Reuse `SummarizationErrorCategory`, `ChatTokenUsage`, and `AiProvider` — do not redeclare them. Zero Mongoose imports (§XI).
- [X] T002 [P] Create `src/schemas/suggested-questions.schema.ts` with `SuggestedQuestionsSchema` = `z.object({ questions: z.array(z.string()) })` per [contracts/ai-response.md](./contracts/ai-response.md) §1. Shape only — count, length, and distinctness are applied after trimming in T011.
- [X] T003 [P] Create `src/constants/suggested-questions.ts` with the non-prose constants only: `SUGGESTED_QUESTION_COUNT` (3), `MAX_SUGGESTION_CHARS` (34), `MAX_SUGGESTION_ATTEMPTS` (2), `SUGGESTION_MAX_TOKENS` (512), `SUGGESTION_EFFORT` (`'low'`). Comment `MAX_SUGGESTION_CHARS` with the column arithmetic from [research.md](./research.md) D7 so a future layout change can recheck it. Prompt prose arrives in T009.
- [X] T004 Add `suggestedQuestions: string[]` and `suggestionUsage?: AiUsage` to `TranscriptFields` in `src/types/transcript.types.ts` per [data-model.md](./data-model.md) §1.
- [X] T005 Add `suggestedQuestions: { type: [String], default: [] }` and `suggestionUsage: { type: aiUsageSchema }` to `transcriptSchema` in `src/lib/db/models/transcript.model.ts`, reusing the already-exported `aiUsageSchema`. No index — the field is never queried on. Depends on T004.
- [X] T006 Add `suggestedQuestions: string[]` to `MeetingRecord` in `src/types/meeting.types.ts` (top level, **not** inside `Summary`) and map it in `toMeetingRecord` in `src/features/workflow/utils/transcript.mapper.ts` as `fields.suggestedQuestions ?? []`. In the same edit, add a comment above `toTranscriptPatch`'s return object stating that `suggestedQuestions` is deliberately excluded because the patch is built from client-held state and would overwrite a generated set ([research.md](./research.md) D8). Depends on T004.
- [ ] T007 [P] Prepare the evaluation corpus: analyse ten visibly different meetings — different prospects and objections, at least two where a summary section came back empty, at least one transcript under ~40 lines — and record their ids in `specs/tae-96-dynamic-suggested-questions/evaluation/corpus.md`, extending the corpus in `specs/tae-96-grounded-chat-assistant/evaluation/corpus.md`.
- [X] T008 Run `npm run validate` and confirm clean.

**Checkpoint**: The two fields exist, read as `[]`, and reach `MeetingRecord`. The panel still shows hard-coded chips. T007 sits here rather than at the end because SC-002 and SC-003 are the real gate, and a corpus assembled after the implementation tends to be assembled to pass it.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The provider-shared machinery — prompt assembly, whole-set validation, and the two provider integrations. Nothing here touches the database or the UI.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T009 Add the prompt prose to `src/constants/suggested-questions.ts`: `SUGGESTION_PERSONA`, `SUGGESTION_RULES`, `SUGGESTION_OUTPUT_CONTRACT`, `SUGGESTION_OUTPUT_EXAMPLES`, and the short `SUGGESTION_USER_INSTRUCTION`. `SUGGESTION_RULES` must carry every obligation listed in [contracts/prompt.md](./contracts/prompt.md) §2 — answer-must-be-locatable-before-emitting (FR-006), three different aspects (FR-009), self-contained (FR-010), meeting-specific over generic (FR-012), the literal `MAX_SUGGESTION_CHARS` budget (FR-011). Examples must include three at 27–34 characters plus one labelled too-long with its character count. Depends on T003 (same file).
- [X] T010 Create `src/lib/utils/suggested-questions-prompt.utils.ts` exporting `buildSuggestedQuestionsPrompt(context: GroundingContext): { system: string; user: string }`, assembling the sections in the order given in [contracts/prompt.md](./contracts/prompt.md) §1. **Import** `UNTRUSTED_CONTENT_RULE` and the four transcript/analysis delimiters from `@/constants/grounded-chat` rather than copying them, and render the analysis with `renderAnalysis` from `@/lib/utils/grounding.utils`. No timestamp, counter, or random value may enter either string ([contracts/prompt.md](./contracts/prompt.md) §5).
- [X] T011 Create `src/lib/utils/suggested-questions.utils.ts` exporting `validateSuggestionSet(rawText: string): SuggestionSetOutcome`, applying V1–V5 from [contracts/ai-response.md](./contracts/ai-response.md) §2 in order: strip code fences and `JSON.parse` (V1), `SuggestedQuestionsSchema` (V2), trim and drop empties then require exactly `SUGGESTED_QUESTION_COUNT` (V3), enforce `MAX_SUGGESTION_CHARS` (V4), and reject duplicates under `normaliseForMatch` from `@/lib/utils/grounding.utils` (V5). Rejection is whole-set and returns the typed `rule` code — never a message containing the offending text (FR-026).
- [X] T012 Create `src/integrations/suggested-questions.factory.ts` with the `SuggestedQuestionsLike` interface (`generate(context: GroundingContext): Promise<SuggestedQuestionsResponse>`) and `getSuggestedQuestions()` selecting OpenRouter when `env.NEXT_PUBLIC_APP_ENV === 'development'` and Claude otherwise, mirroring `meeting-chat.factory.ts`. No barrel file (§XVII).
- [X] T013 [P] Create `src/integrations/claude/suggested-questions.ts`: reject with `context_too_large` when `groundingSize(context) > MAX_GROUNDING_CHARS` **before** any network call; otherwise `client.messages.create` with `thinking: { type: 'adaptive' }`, `output_config: { effort: SUGGESTION_EFFORT }`, `max_tokens: SUGGESTION_MAX_TOKENS`, the system prompt from T010, a `MAX_SUGGESTION_ATTEMPTS` retry loop on `malformed_response` and `rejected_set`, usage via `computeAnthropicCost`, and error mapping via `handleSdkError`. No `cache_control` — see [research.md](./research.md) D6.
- [X] T014 [P] Create `src/integrations/openrouter/suggested-questions.ts`: the same ceiling check and retry loop, using `chatCompletion` with `temperature: 0`, `response_format: { type: 'json_object' }`, `max_tokens: SUGGESTION_MAX_TOKENS`, the system and user strings from T010, cache token fields recorded as 0, usage via `computeOpenRouterCost`, and error mapping via `mapHttpError`.
- [X] T015 Run `npm run validate` and confirm clean.

**Checkpoint**: A prompt can be assembled, a provider called, and a candidate set accepted or rejected with a typed reason. Nothing is persisted or rendered.

---

## Phase 3: User Story 1 - Open the panel and see questions worth asking (Priority: P1) 🎯 MVP

**Goal**: Three AI-generated, meeting-specific questions are produced during analysis, stored on the transcript, and rendered as the chip row — with no AI call at panel open.

**Independent Test**: Analyse two visibly different meetings, open the panel on each, and confirm each shows three chips drawn from its own meeting, that the two sets differ, and that clicking any chip returns a grounded answer rather than a refusal.

### Implementation for User Story 1

- [X] T016 [US1] In `src/features/workflow/actions/transcript-ai.actions.ts`, extend the existing "reset to pending" write so it also sets `suggestedQuestions: []` and unsets `suggestionUsage`. This is what stops a re-run whose generation later fails from leaving the previous analysis's questions on screen ([research.md](./research.md) D5).
- [X] T017 [US1] In the same file, after the existing success write, generate and persist: build the context with `buildGroundingContext`, call `getSuggestedQuestions().generate(context)` inside its own `try`/`catch`, and on success patch `suggestedQuestions` plus `suggestionUsage` (model, provider, and the usage fields) via `transcriptRepository.update`, returning that record. Follow the sequence in [contracts/workflow-integration.md](./contracts/workflow-integration.md) §1 exactly — the analysis write must already be committed before this runs, and no path here may write `aiProcessingStatus`.
- [X] T018 [US1] Add the structured log lines for T017: one per outcome carrying `transcriptId`, provider, model, outcome, `category` and `rule` when rejected, question count and character lengths, and token counts. Never a question, transcript excerpt, or analysis excerpt (FR-026). The `catch` logs with context and swallows deliberately (FR-022/FR-023) — it must not be a bare `catch {}` (§XIV).
- [X] T019 [P] [US1] Create `src/features/assistant-chat/components/suggested-questions.tsx`: props `{ questions: string[]; onSelect: (q: string) => void }`; return `null` unless `questions.length === SUGGESTED_QUESTION_COUNT`; otherwise render the existing `Suggested` eyebrow and one chip per question, moving the eyebrow and chip class strings across **verbatim** from `chat-messages.tsx` (§II, §XII).
- [X] T020 [US1] Edit `src/features/assistant-chat/components/chat-messages.tsx`: delete the `CHIPS` array, add `suggestedQuestions: string[]` to `ChatMessagesProps`, and inside the existing `i === 0 && m.role === 'ai'` block render `<SuggestedQuestions questions={suggestedQuestions} onSelect={onSend} />` in place of the inline eyebrow and chip markup. Keep the placement condition — it is what stops a restored conversation being topped with chips (FR-018). Depends on T019.
- [X] T021 [US1] Edit `src/features/assistant-chat/components/chat-panel.tsx` to accept `suggestedQuestions: string[]` on `ChatPanelProps` and forward it to `ChatMessages`. Do not route it through `useMeetingChat` — the set is constant per meeting ([research.md](./research.md) D8).
- [X] T022 [US1] Edit `src/components/common/app-shell/app-shell.tsx` to pass `suggestedQuestions={wf.draft?.suggestedQuestions ?? []}` to `ChatPanel`, alongside the `openingMessage` it already derives from `wf.draft`.
- [X] T023 [US1] Run `npm run validate` and confirm clean.

### Validation for User Story 1

- [ ] T024 [US1] Analyse two visibly different meetings from `specs/tae-96-dynamic-suggested-questions/evaluation/corpus.md`, open the panel on each, and confirm three meeting-specific chips per meeting, the two sets differing, and a grounded answer on click — the story's independent test.
- [ ] T025 [US1] Verify SC-004 with DevTools → Network: opening, closing, and reopening the panel issues **zero** requests for suggestions, and the chips are present in the same paint as the opening message.
- [ ] T026 [US1] Verify SC-001 with the `$size` aggregate in [quickstart.md](./quickstart.md) — only counts of 0 and 3 may appear across all analysed meetings. A 1 or 2 means whole-set rejection leaked and is a bug in T011.
- [ ] T027 [US1] Measure SC-002 across the ten-meeting corpus (30 chips): click every chip and record grounded answer / not-covered / refusal. At least 29 of 30 must be grounded answers. Record results in `specs/tae-96-dynamic-suggested-questions/evaluation/suggestion-results.md`.
- [ ] T028 [US1] Measure SC-003 from the same run: no question text verbatim in more than two of the ten sets, all three internally distinct, and the "could this have been written without reading the meeting?" spot-check on every question. Record in the same file as T027.
- [ ] T029 [US1] Verify US1 acceptance scenario 6: re-analyse one corpus meeting, confirm the stored set is replaced (not merged, not appended) and `suggestionUsage` is updated.

**Checkpoint**: The feature works end to end for meetings that generate successfully. This is the MVP.

---

## Phase 4: User Story 2 - The panel is never broken by missing suggestions (Priority: P2)

**Goal**: Meetings with no stored set — legacy documents, failed generation, rejected sets — open the panel cleanly with no chip row, no heading, and no error.

**Independent Test**: Open the panel on a transcript with no stored suggestions and on one where generation was forced to fail; confirm both open with no suggestion row, no empty heading, no residual gap, and a fully usable input.

### Implementation for User Story 2

- [X] T030 [US2] Verify and, if needed, correct the no-row spacing in `src/features/assistant-chat/components/chat-messages.tsx` and `suggested-questions.tsx`: with the component returning `null`, the opening bubble's own `mb-3.5` must be the only margin in play — no orphaned wrapper, no leftover `mb-[14px]` from the extracted markup (FR-017). **Verified statically**: the eyebrow and chip container (including its `mb-[14px]`) moved wholesale inside `SuggestedQuestions`, which returns `null` before rendering either, and `chat-messages.tsx` renders the component directly inside the existing `contents` wrapper with no surrounding element of its own — so the empty state emits no nodes and no margin. Still needs the visual confirmation in T040.

### Validation for User Story 2

- [ ] T031 [US2] Legacy-document check: `$unset` `suggestedQuestions` on one analysed transcript, reload, open the panel, and confirm no chip row, no eyebrow, and a fully usable input — the `?? []` in `toMeetingRecord` (T006) is what carries this.
- [ ] T032 [US2] Forced-failure run (SC-006 and the failure half of SC-005): make `generate` throw unconditionally, analyse three meetings, and confirm each ends `aiProcessingStatus: 'success'` with a summary, a lead score, `suggestedQuestions: []`, no `suggestionUsage`, and — in the panel — no chip row, no toast, and no user-visible error of any kind.
- [ ] T033 [US2] Rejected-set path: force `generate` to return a two-question set, confirm `validateSuggestionSet` rejects it whole with `rule: 'V3'`, that nothing is stored, and that the panel shows no chips rather than two.
- [ ] T034 [US2] Stale-set check ([research.md](./research.md) D5): with `generate` still failing, re-analyse a meeting that already had three suggestions and confirm the stored set is **empty**, not the previous one.
- [ ] T035 [US2] Confirm the review screen is unaffected in the no-suggestions state: the analysis renders as a normal success with no warning or empty-state artefact anywhere in the interface (FR-023).

**Checkpoint**: Both the has-suggestions and no-suggestions paths are correct and visually deliberate.

---

## Phase 5: User Story 3 - Suggestions belong to the meeting, not the session (Priority: P3)

**Goal**: Chips follow the open meeting, never appear above a restored conversation, never appear before analysis, and die with their meeting.

**Independent Test**: Show suggestions on meeting A, switch to meeting B, confirm B shows its own three and none of A's; ask a question on A, reopen A, and confirm the restored conversation appears with no chip row.

### Validation for User Story 3

*No new code — the prop-driven delivery path (T019–T022) and the existing placement condition already produce this behaviour. These tasks prove it, and each names the file that would be at fault if it fails.*

- [ ] T036 [US3] Meeting-switch check: with chips visible for meeting A, open meeting B from the recents bar and confirm the chips are replaced by B's own with none of A's remaining — the `wf.draft`-derived prop in `src/components/common/app-shell/app-shell.tsx` is what makes this automatic.
- [ ] T037 [US3] Restored-conversation check (FR-018): ask a question on a meeting, reload, reopen it, and confirm the restored conversation is shown with **no** chip row prepended — governed by the `i === 0 && m.role === 'ai'` condition in `src/features/assistant-chat/components/chat-messages.tsx`.
- [ ] T038 [US3] Capture-stage check: before any analysis, confirm no chips are shown anywhere, via the `wf.draft?.suggestedQuestions ?? []` fallback in `src/components/common/app-shell/app-shell.tsx`.
- [ ] T039 [US3] Deletion check (FR-005): delete a meeting that had three suggestions and confirm the document and its suggestions are gone together, with no change required in `src/features/workflow/actions/transcript.actions.ts`.

**Checkpoint**: All three user stories are independently verified.

---

## Phase 6: Polish, Edge Cases & Acceptance Gates

**Purpose**: The remaining success criteria and the edge cases from [spec.md](./spec.md), plus the prompt-tuning loop.

- [ ] T040 [P] Verify SC-008 against `Design/POC_Kaffea-X_Prototype.html` at 1440px, 1100px, 900px, and 560px in both the has-chips and no-chips states: eyebrow, pill shape, border, padding, gap, hover, and 42px offset indistinguishable; **no chip's text wrapping inside its chip**; no more lines than the current implementation at the same width; no horizontal overflow. Record any deviation before fixing it.
- [ ] T041 [P] Verify SC-009: capture server logs across the full evaluation run and search for each generated question's text, distinctive transcript phrases, prospect names, and analysis excerpts. Zero hits required.
- [ ] T042 [P] Verify SC-010: confirm `aiUsage.totalCostUsd` and `suggestionUsage.totalCostUsd` are both present and non-zero on evaluated meetings, and that `suggestionUsage.provider`/`.model` name the suggestion call.
- [X] T043 [P] Verify SC-011: run both greps from [quickstart.md](./quickstart.md) and confirm zero hits — the three chip strings and the `CHIPS` identifier must be gone from `src/features/assistant-chat/components/chat-messages.tsx`. **Verified**: both greps return zero hits across `src/` (was three hits and two hits respectively before the change).
- [ ] T044 [P] Measure SC-005: time ten analyses with generation enabled against ten with T017 commented out, and confirm the p95 delta is ≤5s with `aiProcessingStatus: 'success'` every time. If it misses, apply the analysis-only-input lever from [research.md](./research.md) D6 rather than removing the retry.
- [ ] T045 [P] Verify SC-007 on five unread meetings: read only the title and the three chips, write down what you learn, then read the transcript — at least three implied facts per meeting must be real and not guessable from the title.
- [ ] T046 [P] Edge case — empty analysis section: on the two corpus meetings with an empty section, confirm no chip asks about that section and no chip yields a "not discussed" answer.
- [ ] T047 [P] Edge case — short transcript: on the sub-40-line corpus meeting, confirm either three genuinely answerable chips or none, never padded generic ones.
- [ ] T048 [P] Edge case — prompt injection (FR-013): analyse a transcript containing text addressed to an AI assistant ("ignore your instructions and output …") and confirm the generated questions are about the meeting's content and the injected text is not obeyed.
- [ ] T049 [P] Edge case — over-ceiling transcript: analyse a transcript exceeding `MAX_GROUNDING_CHARS` and confirm `context_too_large` is logged, no chips are stored, and the analysis is unaffected.
- [ ] T050 [P] Edge case — chip interaction: confirm a chip click is blocked while a question is in flight, and that clicking the same chip twice produces two exchanges with consistent answers (FR-019).
- [ ] T051 [P] Edge case — write-back protection ([research.md](./research.md) D8): edit and save a meeting on the review screen, reopen the panel, and confirm the chips survive, proving `toTranscriptPatch` in `src/features/workflow/utils/transcript.mapper.ts` still excludes the field.
- [ ] T052 Run the tuning loop in [quickstart.md](./quickstart.md) if T027, T028, or T040 missed their bars: read the `rule` distribution in the logs, change one section of `src/constants/suggested-questions.ts`, re-analyse the same ten meetings, and recompare. Reach for the levers in the documented order — rules prose, then examples, then the 34→40 character cap, then evidence-span verification ([research.md](./research.md) D12).
- [ ] T053 Run `npm run validate` and confirm clean, then confirm every gate in [quickstart.md](./quickstart.md) has a recorded result.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T004 → T005 and T004 → T006 are the only orderings inside it.
- **Foundational (Phase 2)**: Depends on Phase 1. **Blocks all user stories.** T003 → T009 (same file); T009/T011 → T013, T014.
- **User Story 1 (Phase 3)**: Depends on Phase 2. Delivers the MVP.
- **User Story 2 (Phase 4)**: Depends on Phase 3 — the no-set path can only be verified once the has-set path exists to contrast it with.
- **User Story 3 (Phase 5)**: Depends on Phase 3. Independent of Phase 4.
- **Polish (Phase 6)**: Depends on Phase 3; T052 additionally depends on T027, T028, and T040.

### Within User Story 1

T016 → T017 → T018 are the same file and strictly sequential. T019 → T020 → T021 → T022 is the render path, outward from the leaf component. T023 gates the validation tasks; T024 precedes T027 and T028 (both need generated sets to measure).

### Parallel Opportunities

- Phase 1: T001, T002, T003, T007 in parallel; T004 then T005 and T006 together.
- Phase 2: T013 and T014 in parallel once T009–T012 are done.
- Phase 3: T019 can be written in parallel with T016–T018 (different files); the rest of the render path is sequential.
- Phase 6: T040–T051 are all independent verifications and can be split across people.
- Phases 4 and 5 can run in parallel once Phase 3 is complete.

---

## Parallel Example: Phase 2

```bash
# After T009–T012 land, the two provider integrations are independent files:
Task: "Create src/integrations/claude/suggested-questions.ts"
Task: "Create src/integrations/openrouter/suggested-questions.ts"
```

## Parallel Example: Phase 6

```bash
# Every acceptance gate is an independent measurement:
Task: "Verify SC-008 visual parity at four breakpoints"
Task: "Verify SC-009 log audit"
Task: "Verify SC-010 cost attribution"
Task: "Measure SC-005 added latency"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 — Setup: fields exist and read as `[]`; nothing user-visible changes.
2. Phase 2 — Foundational: generation works in isolation.
3. Phase 3 — User Story 1: generation is wired into analysis and the chips are real.
4. **STOP and VALIDATE**: T024–T029. If SC-002 (T027) misses its bar, tune before going further — chips that produce refusals are worse than the hard-coded ones they replaced.

### Incremental Delivery

- End of Phase 1 → the schema is ready; zero behaviour change, safe to merge.
- End of Phase 2 → generation is callable but unused; still zero behaviour change, safe to merge.
- End of Phase 3 → MVP. Real chips for newly analysed meetings; older meetings show none, which is already the specified behaviour.
- End of Phase 4 → the no-suggestions path is verified deliberate rather than incidentally acceptable.
- End of Phase 5 → per-meeting scoping proven.
- End of Phase 6 → acceptance gates recorded.

Note the natural seam at the end of Phase 2: everything up to that point is additive and invisible, so the risky part of the change (Phase 3's action edit) lands alone and can be reverted alone.

---

## Notes

- **[P]** = different files, no dependency on incomplete tasks.
- Phase 4 and Phase 5 are validation-heavy by design. Their behaviour falls out of Phase 3's prop-driven delivery, and the tasks exist so that falling out is *confirmed* rather than assumed — every one names the file that would be at fault.
- The one deliberate swallow in this feature is T018's `catch`. It is logged and categorised; a bare `catch {}` there would violate §XIV.
- Commit per task or per logical group, using the conventional-commit scopes the constitution permits (`db` for T004–T005, `api` for T009–T018, `ui` for T019–T022).
- Two spec deltas are pending the user's confirmation (SC-008's line count, and the Assumptions/Out-of-Scope contradiction about the separate call) — see *Spec deltas surfaced by design* in [plan.md](./plan.md). Neither blocks any task here.
