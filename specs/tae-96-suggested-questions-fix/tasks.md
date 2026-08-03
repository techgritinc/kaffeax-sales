---

description: "Task list for TAE-96 suggested questions remediation"
---

# Tasks: Suggested Questions Reach the Panel

**Ticket**: TAE-96 | **Input**: Design documents from `specs/tae-96-suggested-questions-fix/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: No automated test tasks. This repository has no test infrastructure (`CLAUDE.md`) and the spec does not request TDD. Verification is `npm run validate` plus the manual scenarios in [quickstart.md](./quickstart.md), which is why verification tasks are first-class here rather than optional.

**Organization**: Tasks are grouped by user story. Note the dependency inversion between the two P1 stories — see the Phase 3 preamble.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Single Next.js project. All source under `src/` at repository root, per plan.md Structure Decision. No `tests/` directory exists.

---

## Phase 1: Setup

**Purpose**: Establish the baseline the fix will be measured against, and assemble the corpus without which the primary success criteria cannot be evaluated.

- [X] T001 Run `npm run validate` on the current working tree and record the result. The tree has 26 uncommitted modified files from prior work; confirm it type-checks, lints, and builds before changing anything, so any later failure is attributable to this work.
- [ ] T002 [P] Record the pre-fix baseline in `specs/tae-96-suggested-questions-fix/baseline.md`: analyse 3 transcripts on the **current** code, and for each capture (a) `suggestedQuestions` array length from the MongoDB document and (b) the `V*` rule from the `[suggested-questions] unusable set` server log. SC-001 asserts this baseline is near zero — if these 3 meetings store three questions each, the diagnosis in spec.md is wrong and that must be raised before any code changes.
- [ ] T003 [P] Assemble at least 10 varied, real-length transcripts as a reusable corpus and note where they live in `specs/tae-96-suggested-questions-fix/baseline.md`. Include quantified content — figures, dates, volumes, named products — since that is what forces questions into the 35–46 character range that currently destroys every set. Synthetic short fixtures will show a false pass.

**Checkpoint**: Baseline recorded, corpus ready. The defect is confirmed reproducible before anything is changed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type surface and shared pure utility that both US2 (retry) and US4 (diagnosability) depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Extend `SuggestedQuestionsFailure` in `src/types/suggested-questions.types.ts` with three optional fields: `rule?: SuggestionValidationRule`, `attempts?: number`, and `usage?: ChatTokenUsage`. All three are optional because `context_too_large` and network failures genuinely have no rule and spend no tokens; a required field would force meaningless zeroes. `rule` promotes the validation rule out of the prose `message` string so FR-026 can read it as data.
- [X] T005 [P] Add `SUGGESTION_RETRY_NOTES` (a `Record<SuggestionValidationRule, string>` holding the five corrective notes from `contracts/attempts.md` §2) and `SUGGESTION_RETRY_TEMPERATURE = 0.7` to `src/constants/suggested-questions.ts`. The notes must name the violated constraint only — never echo the rejected questions, per `contracts/attempts.md` §2.
- [X] T006 Create `src/lib/utils/suggestion-attempts.utils.ts` exporting two pure functions: `buildCorrectiveNote(rule)` returning the base user turn plus the note for that rule, and `accumulateUsage(running, next)` summing all nine `ChatTokenUsage` token and cost fields. No side effects, no I/O, no barrel file (§XVII). Depends on T004 and T005.

**Checkpoint**: Shared surface ready. Both provider integrations can now be changed identically.

---

## Phase 3: User Story 2 - Good questions are not thrown away (Priority: P1) 🎯 MVP part 1

**Goal**: Stop the pipeline discarding sets it correctly generated. Re-derive the length ceiling from the chip row's real width budget and make the retry capable of a different outcome.

**Why this phase precedes User Story 1 despite US1 being listed first**: both are P1, and the spec states Story 1 cannot be delivered without Story 2. US1's outcome — three chips on screen — is produced by the changes in this phase. Implementing US1 first would mean verifying an outcome whose cause has not been fixed.

**Independent Test**: Analyse the 10-transcript corpus and confirm the proportion of meetings ending with three stored suggestions meets SC-001, with every chip respecting the layout bar in SC-007.

### Implementation for User Story 2

- [X] T007 [US2] Change `MAX_SUGGESTION_CHARS` from `34` to `48` in `src/constants/suggested-questions.ts`. Keep the derivation in a comment: 300px panel − 36px padding − 42px indent = 222px row; − 24px chip padding − 2px border = 196px text; ≈34 chars per line at Figtree 11.5px/600, so 48 sits inside a two-line chip. See `contracts/validation.md` §V4.
- [X] T008 [US2] Rewrite Rule 5 of `SUGGESTION_RULES` in `src/constants/suggested-questions.ts` to interpolate `${MAX_SUGGESTION_CHARS}` rather than restate a literal, and change "Roughly six words" to "roughly eight words". Same file as T007 — sequential.
- [X] T009 [US2] In `src/constants/suggested-questions.ts`, replace `EXAMPLE_TOO_LONG` with a specimen genuinely **over 48 characters** and correct its explanatory text. The current example rejects a 45-character question, which is legal at 48 — left in place it teaches the model to suppress valid output, re-creating the defect at a lower rate. Also correct `EXAMPLE_GOOD`'s "(32, 30, and 29 characters)" annotation if its specimens change. Leave `EXAMPLE_TOO_GENERIC` alone; it demonstrates Rule 4, not length.
- [X] T010 [US2] Verify no stale ceiling remains: `grep -n "34" src/constants/suggested-questions.ts` must return no character-limit reference, and every statement of the limit must interpolate the constant. All four sites listed in `contracts/ai-response.md` §"Prompt-side contract changes" must agree.
- [X] T011 [US2] Add the V4 derivation as a comment above the length check in `src/lib/utils/suggested-questions.utils.ts` explaining that the bound comes from the chip row's two-line budget, not from a content preference. **No logic change** — the rule body and the whole-set rejection stay exactly as they are (FR-007).
- [X] T012 [US2] Rework the attempt loop in `src/integrations/openrouter/suggested-questions.ts`: build the user turn per attempt instead of once outside the loop, append `buildCorrectiveNote(outcome.rule)` when `attempt > 1`, pass `temperature: SUGGESTION_RETRY_TEMPERATURE` on retries while keeping `0` on attempt 1, accumulate usage across all attempts via `accumulateUsage`, and populate `rule`, `attempts`, and `usage` on the exhausted-attempts failure. The returned success `usage` becomes the sum over attempts, not the winning attempt's (FR-025).
- [X] T013 [P] [US2] Apply the same rework to `src/integrations/claude/suggested-questions.ts`: per-attempt user turn with corrective note, usage accumulation, and `rule`/`attempts`/`usage` on the failure. No temperature change — this path sets none and its default sampling is already non-deterministic. Different file from T012, so parallelisable.
- [X] T014 [US2] Confirm §V compliance after T012 and T013: `wc -l` on `src/constants/suggested-questions.ts`, `src/lib/utils/suggested-questions.utils.ts`, `src/lib/utils/suggestion-attempts.utils.ts`, `src/integrations/openrouter/suggested-questions.ts`, and `src/integrations/claude/suggested-questions.ts` — every file must be under 150 lines. If the constants file breaches the cap from the prompt rewrites, extract the worked examples to a sibling module rather than trimming the guidance.

### Verification for User Story 2

- [ ] T015 [US2] Run quickstart Scenario 6 (SC-010, FR-008): temporarily set `MAX_SUGGESTION_CHARS` to `12` to force a V4 rejection, then confirm from server logs that attempt 2 carries the corrective note, uses `temperature: 0.7` on OpenRouter, is not byte-identical to attempt 1, and that attempts stop at 2 with the analysis still succeeding. Restore the constant afterwards. This scenario fails on the current build, which is what makes it a real test.
- [ ] T016 [US2] Run quickstart Scenario 5 (SC-007, §XII) — the design-fidelity gate. Compare the running app against `Design/POC_Kaffea-X_Prototype.html` side by side at **1440px, 1100px, 900px, and 560px** in both the has-suggestions and no-suggestions states. Confirm chip row parity, that no individual chip exceeds two lines of text, and no horizontal overflow. **1100px is the binding case** — the chat column narrows to 300px there. If any chip runs to three lines, lower `MAX_SUGGESTION_CHARS` to the measured two-line value and re-run T015 and T016. This is the expected correction path: the 48 figure rests on an estimated 5.8px average glyph advance, and this task replaces the estimate with a measurement.
- [ ] T017 [US2] Run quickstart Scenario 4 (SC-005): time analysis with and without generation across at least 5 transcripts including the largest in the corpus. Generation must add ≤5s at p95 including retries, and must never hang or fail the analysis step.

**Checkpoint**: Sets that pass the quality bar are no longer discarded, and the retry can produce a different outcome. US1 is now achievable.

---

## Phase 4: User Story 1 - Summarize and see three questions (Priority: P1) 🎯 MVP part 2

**Goal**: The reported defect is gone. After Summarize, the panel shows three chips specific to that meeting, and clicking one returns a grounded answer.

**Independent Test**: Analyse a transcript with clearly quantified content, open the panel, confirm three chips each naming something specific to that transcript, and confirm each returns a grounded answer rather than a refusal.

**Depends on**: Phase 3. The chips appear because of T007–T013.

### Implementation for User Story 1

- [X] T018 [US1] Make the `suggestedQuestions: []` reset unconditional in `runAiSummarization` (`src/features/workflow/actions/transcript-ai.actions.ts`). It is currently gated on `aiProcessingStatus !== 'pending'`; if a prior run died after the status flip but before completion, re-analysis skips the reset and a stale set can survive to sit under a newer summary — a genuine FR-016 violation documented in `data-model.md` §"One edge case worth recording". Resetting an already-empty array costs nothing, so the guard buys nothing and hides a bug.
- [X] T019 [US1] Inspection task, **no edits**: walk the 7-step read path in `data-model.md` §"Read path" and confirm each step still carries `suggestedQuestions` — repository → `transcript.mapper.ts:78` → `setDraft` → `getTranscriptById` → `app-shell.tsx:113` → `chat-panel.tsx` → `chat-messages.tsx:63` → `suggested-questions.tsx:12`. Confirm `toTranscriptPatch` still omits the field so the approve round-trip cannot clobber a stored set. If any step has drifted, stop and raise it rather than patching around it.

### Verification for User Story 1

- [ ] T020 [US1] Run quickstart Scenario 1 (SC-001, SC-002) across the full 10-transcript corpus: at least 9 of 10 meetings show exactly three chips, and every meeting stores either 3 or 0 — never 1 or 2. Compare directly against the T002 baseline; the delta is the fix.
- [ ] T021 [US1] Run quickstart Scenario 2 (SC-003, SC-004, SC-013): click all 30 chips and confirm at least 29 return a grounded answer rather than a refusal; confirm no question text appears verbatim in more than two of the ten sets and every set is internally distinct; confirm on at least 5 meetings that the chips convey three facts not guessable from the title. A **rise** in refusals versus baseline would mean the longer budget let the model drift off-grounding — a Rule 1 regression, fixed prompt-side, not by reverting the ceiling.
- [ ] T022 [US1] Run quickstart Scenario 9 (FR-004, FR-016, FR-018, FR-020): re-analysis replaces the set wholesale; switching meetings replaces the chips; a restored conversation is not prepended with a chip row; the approve round-trip preserves the set; deletion removes it. Include Scenario 9 step 6, which exercises the T018 fix directly.

**Checkpoint**: The reported defect is fixed and measured. This plus Phase 3 is the MVP.

---

## Phase 5: User Story 3 - The panel is honest when suggestions are unavailable (Priority: P2)

**Goal**: Meetings with no usable set — every pre-existing meeting, plus any genuine failure — open cleanly with no chip row, no heading, no partial row, and no generic fallback.

**Independent Test**: Open the panel on a meeting with no stored suggestions and on one where generation was forced to fail; confirm both open cleanly with a fully usable input and no error.

**Note**: This story is expected to require **no production code change**. Investigation confirmed `suggested-questions.tsx:12` already implements the three-or-nothing rule in one line and no fallback list exists. The tasks are verification, and T023 exists to catch a fallback being introduced by accident during Phase 3.

- [X] T023 [US3] Confirm `src/features/assistant-chat/components/suggested-questions.tsx` is unmodified by this work and its `questions.length !== SUGGESTED_QUESTION_COUNT` guard still returns `null`. Then confirm no fixed question list has been introduced anywhere on the executing path: `grep -rn "competitor references\|pricing did they mention\|Summarize next steps" src/` must return nothing. Hits in `Design/POC_Kaffea-X_Prototype.html` are expected and correct — it is the reference artefact and must not be edited.
- [ ] T024 [US3] Run quickstart Scenario 3 (SC-005, SC-006, FR-022, FR-023): force generation to fail by invalidating `OPENROUTER_API_KEY`, then confirm the analysis still completes successfully with summary, lead score, and `aiProcessingStatus: 'success'` recorded; that no error, warning, toast, or empty state appears anywhere; and that the panel opens cleanly with no chip row. Restore the environment afterwards.
- [ ] T025 [US3] Run quickstart Scenario 10 (SC-012, SC-014) against at least 3 meetings analysed **before** this change: 100% show no chip row and no "Suggested" heading, 0% show a partial row, and 0% show generic or fallback questions. This is the Option A decision recorded in spec.md Assumptions.

**Checkpoint**: The no-suggestions path is verified deliberate, which matters because it is the common path on day one.

---

## Phase 6: User Story 4 - A missing chip row is diagnosable (Priority: P3)

**Goal**: From the operational record alone, determine whether generation ran, what it returned, and which rule discarded a set — without re-running the meeting and without any meeting content reaching the logs.

**Independent Test**: Force a rejection, then determine from the logs alone which rule rejected it and that the analysis still succeeded, confirming no transcript, analysis, or question text was recorded.

**Depends on**: T012 and T013, which populate the `rule` and `attempts` fields this phase logs.

- [X] T026 [US4] Replace the current single warning in `storeSuggestedQuestions` (`src/features/workflow/actions/transcript-ai.actions.ts`) with the four-way outcome logging from `contracts/attempts.md` §4: `not_attempted`, `no_response`, `rejected`, `stored`. Each logs exactly once per meeting per run. `rejected` must carry `rule` and `attempts` as structured fields, not embedded in a prose message. Keep the existing `count` and `lengths` fields on `stored` — `lengths` is the signal that would have exposed the V4 ceiling months ago.
- [X] T027 [US4] Review every log call added in T026 against the permitted/prohibited lists in `contracts/attempts.md` §4. Permitted: transcript id, rule, attempt number, category, provider, model, question count, question character lengths, token counts, cost. Prohibited: question text, transcript content, analysis content, prompt text, personal data, credentials. Character lengths are metadata, not content.
- [ ] T028 [US4] Run quickstart Scenario 7 (SC-008): trigger all four outcomes — `not_attempted` via `MAX_GROUNDING_CHARS = 1`, `no_response` via an invalid API key, `rejected` via `MAX_SUGGESTION_CHARS = 1`, `stored` via a normal run — and confirm each is distinguishable from the logs alone, with `rejected` naming its specific rule. Restore all constants and environment afterwards.
- [ ] T029 [US4] Run quickstart Scenario 8 (SC-009, FR-027): scan the full session output from Scenarios 1–7 for prohibited content. Spot-check by taking a distinctive phrase from one transcript and one generated question and grepping the captured output for both — both must be absent. Any occurrence is a failure.

**Checkpoint**: The next investigation of a missing chip row starts from evidence rather than from a guess.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T030 Verify SC-011: inspect `suggestionUsage` on a document from T015 (which succeeded on attempt 2) and confirm it reflects the cost of **both** attempts, not just the winning one. Confirm a document from an exhausted-attempts run also carries usage via the optional failure field.
- [X] T031 Run `npm run validate` (type-check → lint `--max-warnings=0` → build). Must pass with zero warnings before the work is considered complete.
- [X] T032 [P] Reconcile `.specify/init-options.json` with constitution §XIX, or record an explicit override. `feature_numbering: "sequential"` makes `/speckit-specify` generate `NNN-` prefixed directories, which §XIX categorically prohibits — this feature's directory had to be renamed from `006-fix-suggested-questions-display` during planning, and the next feature will hit the same trap.
- [ ] T033 Commit with a Conventional Commits message per §XVI, e.g. `fix(api): stop discarding valid suggested question sets`. Permitted scopes: `app`, `auth`, `api`, `ui`, `db`, `infra`, `config`, `deps`, `release`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies. T002 must run on **unmodified** code — once Phase 3 lands, the baseline is unrecoverable.
- **Phase 2 (Foundational)**: Depends on Phase 1. Blocks all user stories.
- **Phase 3 (US2, P1)**: Depends on Phase 2.
- **Phase 4 (US1, P1)**: Depends on Phase 3. This is the one genuine cross-story dependency — US1's outcome is produced by US2's changes.
- **Phase 5 (US3, P2)**: Depends on Phase 2. Independent of US1 and US2 in principle, but T023 is most valuable *after* Phase 3, since its purpose is catching a fallback introduced during it.
- **Phase 6 (US4, P3)**: Depends on T012 and T013 for the `rule`/`attempts` fields it logs.
- **Phase 7 (Polish)**: Depends on all desired stories.

### Within Phase 2

```
T004 (types) ──┬──> T006 (util)
T005 (constants) ──┘
```

T004 and T005 touch different files. T005 is marked [P] because it does not import from T004. T006 imports from both.

### Within Phase 3

```
T007 → T008 → T009 → T010   (all in src/constants/suggested-questions.ts — strictly sequential)
T011                        (suggested-questions.utils.ts — independent of the constants chain)
T012 ─┐
T013 ─┴─> T014 → T015 → T016 → T017
```

T012 and T013 are different provider files and parallelisable. T016 can force a change to T007's constant, which is why it precedes T017 and why T015 is re-run on any adjustment.

### Parallel Opportunities

- **Phase 1**: T002 and T003 together.
- **Phase 2**: T005 alongside T004.
- **Phase 3**: T012 and T013 together; T011 alongside the T007–T010 chain.
- **Phase 5**: T023, T024, and T025 are independent of each other.
- **Phase 7**: T032 alongside T030 and T031.
- **Across stories**: US3 (Phase 5) can be worked by a second person in parallel with Phase 4, since it shares no files with it.

---

## Parallel Example: Phase 3

```bash
# The two provider integrations receive the same rework in different files:
Task: "Rework attempt loop in src/integrations/openrouter/suggested-questions.ts"   # T012
Task: "Rework attempt loop in src/integrations/claude/suggested-questions.ts"       # T013

# Independent of the constants chain, can run alongside T007–T010:
Task: "Add V4 derivation comment in src/lib/utils/suggested-questions.utils.ts"     # T011
```

---

## Implementation Strategy

### MVP (Phases 1–4)

The MVP is **two** stories, not one. US1 is the deliverable the user asked for; US2 is the change that makes it possible. Shipping US2 alone leaves the ceiling fixed but unverified; shipping US1 alone is impossible.

1. Phase 1 — baseline and corpus. **Do not skip T002**; without it there is no evidence the fix changed anything.
2. Phase 2 — foundational types and shared util.
3. Phase 3 — the ceiling, the prompt, the retry. Verify at T015–T017.
4. Phase 4 — the reset fix and the outcome measurement at T020–T022.
5. **STOP and VALIDATE**: T020 versus T002 is the whole argument that the defect is fixed.

### Incremental Delivery

1. Phases 1–2 → foundation ready, nothing user-visible.
2. Phase 3 → sets stop being discarded (internally observable via logs and the database).
3. Phase 4 → chips appear. **This is the demo.**
4. Phase 5 → the unavailable path verified honest.
5. Phase 6 → the next investigation is cheap.

### Parallel Team Strategy

1. One person completes Phases 1–2.
2. Then: Developer A takes Phase 3 → Phase 4 (the critical path). Developer B takes Phase 5, then Phase 6 once T012/T013 land.

---

## Notes

- No automated test tasks: no test infrastructure exists and none was requested. The quickstart scenarios are the acceptance mechanism, which is why they are numbered tasks rather than a closing suggestion.
- Several tasks temporarily modify constants (`MAX_SUGGESTION_CHARS`, `MAX_GROUNDING_CHARS`) or environment variables to force failure paths. Every such task states its restore step — an unrestored constant would silently reintroduce the defect.
- `Design/POC_Kaffea-X_Prototype.html` is never edited. The three hard-coded questions inside it are the design's illustration, not application code, and under §XII it is the arbiter the implementation is measured against.
- T016 is the only task permitted to change the value chosen in T007, and only on the basis of a measurement.
- Commit after each task or logical group. Any checkpoint is a safe stopping point.

---

## Execution Status — 2026-08-03

**19 of 33 complete.** All code is written and `npm run validate` passes clean (type-check → eslint `--max-warnings=0` → prettier → build).

### Complete (19)

T001, T004–T014, T018, T019, T023, T026, T027, T031, T032 — every implementation, static-verification, and inspection task.

### Blocked on a running environment (13)

T002, T003, T015, T016, T017, T020, T021, T022, T024, T025, T028, T029, T030.

These need one or more of: `npm run dev` serving, a live MongoDB, a valid `OPENROUTER_API_KEY`, a browser at four viewport widths, and **a corpus of ≥10 real transcripts**. None can be satisfied from a static working tree, and none should be reported as passing without being run.

The two that matter most:

- **T002 (baseline) is now unrecoverable in its intended form.** It was specified to run on unmodified code; the code has changed. What survives is the static evidence: the ceiling was 34, and `EXAMPLE_TOO_LONG` in the old prompt held up a 45-character question as a rejection — so any question of 35–48 characters destroyed its whole set. A `git stash` of this branch would still permit a true before/after if the corpus exists.
- **T016 can still overrule T007.** `MAX_SUGGESTION_CHARS = 48` rests on an *estimated* 5.8px average glyph advance for Figtree 11.5px/600, not a measurement. T016 measures the rendered chip at 1100px (the binding width — the chat column is 300px there, giving a 222px row). If any chip runs past two lines of text, lower the constant to the measured value and re-run T015 and T016. A small downward adjustment is the expected outcome, not a failure.

### Deliberately not done (1)

**T033 (commit).** The working tree carries 26 modified files staged from prior work, unrelated to this change. Committing now would sweep them into one commit. Left for whoever can separate the two sets.

### Deviations from the task list as written

- **T009** described `EXAMPLE_GOOD` as annotated "(32, 30, and 29 characters)" and `EXAMPLE_TOO_LONG` as rejecting a 45-character question. Neither matched the file on disk — the working tree had been reverted between planning and implementation, leaving an older version whose `EXAMPLE_GOOD` contained `<angle-bracket placeholders>`. That is worse than described (a model can echo a placeholder), so both examples were replaced with real specimens plus an explicit instruction never to reuse their nouns.
- **T014 required two extractions the plan did not anticipate.** Adding the retry and usage work pushed `integrations/openrouter/suggested-questions.ts` to 162 lines and `features/workflow/actions/transcript-ai.actions.ts` to 192 — both over §V's 150-line cap. Two files were added rather than trimming the work: `features/workflow/utils/suggestion-outcome.utils.ts` (outcome classification and logging) and `integrations/openrouter/suggestion-usage.utils.ts` (token→usage mapping). All touched files are now within the cap.
- **T004 gained two fields beyond the three specified.** `provider?` and `model?` were added to `SuggestedQuestionsFailure`. Without them, recording the spend of exhausted attempts required inventing a provider and model to satisfy the `suggestionUsage` shape — fabricated data in the cost record. The action now writes failure-path usage only when both are genuinely known.
- **T027 found a live leak and it was fixed.** The OpenRouter path logged `parsed.error.message` from Zod, whose message can embed received values — i.e. API response content, which FR-027 and SC-009 prohibit. It now logs failing field paths only.
