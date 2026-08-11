# Tasks: Concise, Non-Redundant Call Summary

**Input**: Design documents from `/specs/refine-summary-prompt/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/summary-output-contract.md](./contracts/summary-output-contract.md), [quickstart.md](./quickstart.md)

**Tests**: Not requested. This repo has no automated test suite yet (`CLAUDE.md`); validation is manual, driven by the checklists in `quickstart.md`, and is performed by the user directly — regenerating summaries through the running app is not a tracked implementation task (see Note below).

**Organization**: Tasks are grouped by user story. All three stories edit the same single file — `src/constants/summarization.ts` — because this is a prompt-only change (see `plan.md` / `research.md` for why no schema/type/DB/UI file needs to change). Each phase's "Independent Test" line states how the user validates that story once its edits land; that validation is manual and not itself a numbered task.

> **Note (2026-08-06)**: An earlier version of this file included tasks that regenerated the summary through the running app and captured a "before" baseline. The user does this manually, so those steps were removed — the tasks below cover only the prompt-editing work an implementer actually performs.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Since US1/US2/US3 implementation tasks all edit `src/constants/summarization.ts`, none of them are marked `[P]` against each other — treat them as sequential edits to one file, in the order listed.

## Path Conventions

Single Next.js project — all paths are relative to the repository root (`src/...`), per `plan.md`'s Project Structure.

---

## Phase 1: Setup

No setup tasks apply to this feature. It's a single-file prompt change with no scaffolding to initialize — proceed directly to User Story 1.

---

## Phase 2: Foundational

No separate foundational/blocking phase applies to this feature. There is no shared model, service, or scaffolding to stand up first, since all three stories edit different sections of the one existing prompt-constants file.

---

## Phase 3: User Story 1 - Scannable synthesis instead of a wall of text (Priority: P1) 🎯 MVP

**Goal**: Replace the turn-by-turn narrative retelling with a synthesis that answers three questions — why the meeting happened, what mattered most, and what remains unresolved — as ordinary flowing prose in the existing 1-2 paragraph format, with no headings, labels, or bullet points introduced.

**Independent Test** (performed manually by the user): Regenerate the summary for a sample transcript and validate it against the "Narrative structure" checklist section of [quickstart.md](./quickstart.md) — a reader can identify the answer to each of the three questions within the existing 1-2 paragraph prose, with no added headings/labels, and the text reads as a synthesis, not a play-by-play.

### Implementation for User Story 1

- [X] T001 [US1] In `src/constants/summarization.ts`, rewrite the `"narrative"` line of `OUTPUT_SCHEMA_EXAMPLE` and the `"narrative"` bullet of `FIELD_DEFINITIONS` to require the prose to answer three questions — Purpose (why the meeting happened), Key Outcomes (the most important results), Unresolved (what remains open) — within the **existing 1-2 paragraph format**, with no headings, labels, or bullet points introduced to mark them. Replace the current "2-4 paragraph prose synthesis" wording, which permits (and in practice produces) a longer, chronological dump.
- [X] T002 [US1] In `src/constants/summarization.ts`, add an explicit anti-retelling instruction to the narrative's `FIELD_DEFINITIONS` bullet: forbid turn-by-turn narration of the conversation and require synthesis instead, per `contracts/summary-output-contract.md`.
- [X] T003 [US1] In `src/constants/summarization.ts`, add an explicit statement to the narrative's `FIELD_DEFINITIONS` bullet that the narrative MUST stay within the existing 1-2 paragraph format and MUST NOT grow additional paragraphs or add structure (headings/labels/bullets) to accommodate the three questions — brevity comes from tighter prose, not from more structure. Nothing material may be cut to fit the format.
- [X] T004 [US1] In `src/constants/summarization.ts`, update step 5 ("Compose the output") of `ANALYTICAL_APPROACH` to require covering the three questions — Purpose, Key Outcomes, Unresolved — in that order of ideas within the flowing prose (not as separate paragraphs or labeled sections).

**Checkpoint**: Narrative wording is restructured; user validates independently per `quickstart.md` — this alone is a shippable improvement (MVP).

---

## Phase 4: User Story 2 - No duplicated facts across sections (Priority: P1)

**Goal**: Ensure no fact/commitment is ever repeated across `whatWasCovered`, `whatWasDecided`, and `actionItems`.

**Independent Test** (performed manually by the user): Regenerate the summary for a sample transcript and validate it against the "No cross-section duplication" checklist section of [quickstart.md](./quickstart.md) — in particular, confirm "set up trial access for Grace and Elias" appears only under Action Items, not restated under What Was Discussed.

### Implementation for User Story 2

- [X] T005 [US2] In `src/constants/summarization.ts`, add the classification precedence rule to the `FIELD_DEFINITIONS` bullets for `whatWasCovered`, `whatWasDecided`, and `actionItems`: a forward-looking commitment with an owner → `actionItems` only; a procedural agreement that isn't itself an assignable task → `whatWasDecided` only; everything else discussed → `whatWasCovered` only. See `data-model.md`'s "Section classification precedence" for the exact rule and worked example.
- [X] T006 [US2] In `src/constants/summarization.ts`, add an explicit statement to `FIELD_DEFINITIONS` that no fact may appear — verbatim or in close paraphrase — in more than one of `whatWasCovered` / `whatWasDecided` / `actionItems`.
- [X] T007 [US2] In `src/constants/summarization.ts`, add a final self-check step to `ANALYTICAL_APPROACH` (after step 5) requiring the model to cross-check its drafted `whatWasCovered` / `whatWasDecided` / `actionItems` for the same fact appearing in more than one, and remove it from all but the correct field, using the precedence order from T005, before finalizing the JSON.

**Checkpoint**: Sections are mutually exclusive by prompt rule; user validates independently per `quickstart.md`, on top of User Story 1's restructured narrative.

---

## Phase 5: User Story 3 - No loss of critical detail while becoming concise (Priority: P2)

**Goal**: Confirm the conciseness and de-duplication changes from US1/US2 have not caused any guardrail, figure, or commitment to be dropped, and that unaffected consumers still work.

**Independent Test** (performed manually by the user): Enumerate every guardrail, figure, and commitment in a sample transcript; regenerate the summary; validate it against the "No information loss" checklist section of [quickstart.md](./quickstart.md) — every enumerated item is still traceable, and the narrative's word count is reduced versus the pre-fix output while staying within the 1-2 paragraph format.

### Implementation for User Story 3

- [X] T008 [US3] Re-read `CORE_ACCURACY_MANDATE` in `src/constants/summarization.ts` against the wording added in T001-T004 and T005-T007; confirm none of the new instructions conflict with or soften the transcript-only, zero-information-loss, guardrail-capture, or exact-commitment rules. Adjust any conflicting wording found. **Result**: no conflicts — the narrative bullet explicitly states "brevity must never cause information to be dropped" and every detail can still live in the structured fields even when condensed in prose; the dedup rule relocates facts to a single correct field rather than discarding them, so zero-information-loss is preserved.
- [X] T009 [P] [US3] Verify unaffected consumers still compile and consume the same field shapes without changes needed: `src/components/review-screen/summary-block.tsx`, `src/constants/zoho/zoho-field-map.ts`, and `src/lib/utils/grounding.utils.ts`. Since T001-T007 only change prompt-instruction text (not the JSON schema/types), this should require no edits to these files — confirm that's still true after T001-T007 land. (Marked `[P]` — read-only verification across three independent files.) **Result**: confirmed — none of these files import from `summarization.ts`, and `npm run validate` (T010) passed with zero changes to any consumer file.

**Checkpoint**: All three user stories' prompt edits are in place and internally consistent; the user performs final validation per `quickstart.md`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final repo-wide check that the edited file is well-formed.

- [X] T010 Run `npm run validate` (type-check → lint → build) to confirm the edited `src/constants/summarization.ts` passes all CI gates. **Result**: passed — type-check clean, lint/prettier clean, `next build` compiled successfully.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** / **Foundational (Phase 2)**: N/A for this feature (see notes above) — start directly with User Story 1.
- **User Story 1 (Phase 3)**: No dependencies on US2/US3.
- **User Story 2 (Phase 4)**: Logically independent of US1's changes, but edits the same file — do it after US1 to avoid merge friction within one file, not because of a functional dependency.
- **User Story 3 (Phase 5)**: Benefits from US1+US2 being in place, since it verifies the combined result for completeness/regressions.
- **Polish (Phase 6)**: Depends on US1, US2, and US3 all being complete.

### Parallel Opportunities

- Within each user story, implementation tasks touch the same file (`src/constants/summarization.ts`) and are NOT parallelizable against each other — run them in the listed order.
- T009 (US3) is marked `[P]` — it's a read-only check across three unrelated files with no expected code changes.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001-T004 — narrative restructuring).
2. **STOP and VALIDATE**: you regenerate a summary and confirm the "Narrative structure" checklist passes.
3. This alone already fixes the most visible complaint (the wall-of-text narrative) and can ship as an incremental improvement if needed.

### Incremental Delivery

1. Add User Story 1 → narrative restructured → you validate → optionally ship.
2. Add User Story 2 → de-duplication fixed → you validate → optionally ship.
3. Add User Story 3 → completeness/regression-verified → you validate → ship complete fix.
4. Polish → confirm CI gates pass.

---

## Notes

- No `[P]` markers are used within US1 or US2's implementation tasks — all of them edit the same file (`src/constants/summarization.ts`), so treating them as parallel would risk conflicting edits.
- Regenerating summaries and comparing outputs is the user's manual validation step (see `quickstart.md`), not a task in this list.
- Commit after each user story's checkpoint, not after every individual task, since individual tasks within a story are small, sequential edits to one file.
