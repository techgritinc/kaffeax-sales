---
description: "Task list for Layout & Spacing Pixel Parity (Header, Review Screen, Chat/FAQ)"
---

# Tasks: Layout & Spacing Pixel Parity (Header, Review Screen, Chat/FAQ)

**Input**: Design documents from `/specs/004-layout-spacing-parity/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/visual-parity-contract.md, quickstart.md (all present)

**Tests**: Not included. No automated test infrastructure exists in this project (`CLAUDE.md`), and neither the spec nor the user requested a TDD approach. Validation is the manual side-by-side procedure in `quickstart.md`, referenced from each story below, plus `npm run validate`.

**Organization**: Tasks are grouped by user story (US1–US5, in the priority order from `spec.md`) so each can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Every task includes the exact file path(s) it touches

## Path Conventions

Single Next.js project — all paths are relative to `src/` and `specs/` at the repository root, per `plan.md`'s Project Structure. No new directories or files are introduced. Every fix to an element rendered via a shared UI primitive (`Avatar`, `InlineInput`, `AccentBar`) is applied as a **per-instance className override at the call site** — the shared primitives are NOT modified.

---

## Phase 1: Setup

**Purpose**: Establish the verified baseline before making any change.

- [ ] T001 Run `npm run dev` and open `Design/POC_Kaffea-X_Prototype.html` side by side per `quickstart.md` §1; reproduce and confirm the discrepancies documented in `research.md` (Findings 1–8) still exist as described before touching any code. Note that US1 header box/placement (except the avatar) and US2 Meeting Summary were confirmed already-matching — verify they still match (regression baseline).

---

## Phase 2: User Story 1 - Header matches the prototype exactly (Priority: P1) 🎯 MVP

**Goal**: The header matches the prototype at every breakpoint and shell state, including the mobile avatar size.

**Independent Test**: `quickstart.md` §2 — compare the header at desktop and at ≤560px against the prototype.

### Implementation for User Story 1

- [X] T002 [US1] In `src/components/common/app-header/app-header.tsx` (the header initials `<Avatar tone="green" size={36}>`, line ~40), add `max-bp560:h-8 max-bp560:w-8 max-bp560:text-[12px]` to the Avatar's `className` so it shrinks to 32×32px / 12px text at ≤560px, matching `.kx-header-avatar` (prototype lines 78–85, 100; `research.md` Finding 1). Do NOT modify the shared `Avatar` component — the attendee/chat avatars must stay unchanged.
- [ ] T003 [US1] Verify per `quickstart.md` §2: at ≤560px the header avatar is 32×32/12px; at desktop it is 36×36/13px; and the header box (height, padding, border, shadow) and placement show no gap in any shell state (regression check on the already-matching header).

**Checkpoint**: Header matches the prototype at all breakpoints — MVP deliverable, independently testable.

---

## Phase 3: User Story 2 - Meeting Summary matches the prototype exactly (Priority: P1)

**Goal**: Confirm the Meeting Summary section and its Chat/FAQ layout match the prototype (research confirmed no code change is required) and guard against regression.

**Independent Test**: `quickstart.md` §3 — compare the Meeting Summary against the prototype with the Chat/FAQ panel visible and collapsed.

### Implementation for User Story 2

- [ ] T004 [US2] Verify per `quickstart.md` §3 that the Meeting Summary section already matches the prototype — review root width, main-body padding, the 8px "Summary" heading margin, the `.kx-narrative` block, and Chat/FAQ reflow behavior (all confirmed matching in `research.md`). Files to inspect (read-only unless a real difference surfaces): `src/features/meeting-review/components/summary-block.tsx`, `src/features/meeting-review/components/review-screen.tsx`, `src/components/common/app-shell/app-shell.tsx`. **No code change is expected**; if a genuine difference is found, root-cause it against the exact prototype rule and log it before fixing.

**Checkpoint**: Meeting Summary confirmed at parity in both chat states, with no regression from feature 003.

---

## Phase 4: User Story 3 - Review content sections match the prototype exactly (Priority: P2)

**Goal**: The "What Was Covered," "What Was Decided," and "Actions" sections match the prototype's heading indent and card radius.

**Independent Test**: `quickstart.md` §4 — compare the four review sections against the prototype.

### Implementation for User Story 3

- [X] T005 [US3] In `src/features/meeting-review/components/covered-decided.tsx`: add `ml-[3px]` to both `<Heading level={2} smallLabel>` instances ("What was covered" line ~21, "What was decided" line ~43) per `.kx-section-head { margin-left: 3px }` (`research.md` Finding 2); and change the shared `CARD` constant (line ~8) from `rounded-card` (12px) to `rounded-card-sm` (10px) per `.kx-b-card` (`research.md` Finding 3).
- [X] T006 [P] [US3] In `src/features/meeting-review/components/action-items.tsx`: add `ml-[3px]` to the "Action items" `<Heading level={2} smallLabel>` (line ~35) (Finding 2); and change the content card (line ~43) from `rounded-card` to `rounded-card-sm` (Finding 3).
- [ ] T007 [US3] Verify per `quickstart.md` §4: the three headings are indented 3px (but "What we heard" and "Summary" are NOT), the Covered/Decided/Actions cards have a 10px radius, and section/grid/item spacing is unregressed.

**Checkpoint**: The Review content sections match the prototype — independently testable.

---

## Phase 5: User Story 4 - Review email-capture field matches the prototype exactly (Priority: P2)

**Goal**: The prospect-email field's icon-to-input spacing, padding, and width match the prototype.

**Independent Test**: `quickstart.md` §5 — compare the email field against the prototype.

### Implementation for User Story 4

- [X] T008 [US4] In `src/features/meeting-review/components/meta-strip.tsx`, apply the four email-field corrections (all per-instance; do NOT change the shared `InlineInput`): (a) email wrapper span (line ~33) `gap-1.5` → `gap-[5px]` (Finding 4); (b) the `*` star span (line ~37) add `ml-[-1px] mr-[1px]` (Finding 5); (c) the `<InlineInput>` (line ~45) add `px-[2px]!` to override the base 4px (Finding 6); (d) the same `<InlineInput>` add `min-w-[200px]!` so the intended 200px wins over the base `min-w-[120px]` without adding a dependency (Finding 7). Values per prototype lines 1314, 1319–1324, 1333–1334. *(Implementation note: `px-[2px]` required the `!` modifier too — it collides with the base `px-[4px]` at the same level, same as `min-w`.)*
- [ ] T009 [US4] Verify per `quickstart.md` §5: icon→star gap is 4px, star→input gap is 6px, input left padding is 2px, and the input's computed `min-width` is 200px (inspect devtools — Finding 7 is class-ordering sensitive).

**Checkpoint**: The email-capture field matches the prototype — independently testable.

---

## Phase 6: User Story 5 - Follow-up card accent-bar spacing matches the prototype exactly (Priority: P3)

**Goal**: The "Ask about this lead" accent bar sits directly under the title (no extra top margin), matching the prototype.

**Independent Test**: `quickstart.md` §6 — compare the Follow-up card accent-bar spacing against the prototype.

### Implementation for User Story 5

- [X] T010 [US5] In `src/features/assistant-chat/components/chat-panel.tsx` (line ~60), change `<AccentBar variant="h2" />` to `<AccentBar variant="h2" className="mt-0!" />` so the chat accent bar has no top margin (final margin `0 0 16px`), matching the prototype's inline chat bar (`marginBottom:16` only, prototype line 2687; `research.md` Finding 8). Do NOT change the shared `AccentBar` h2 variant — the processing modal relies on its `mt-2` (`.kx-bar-h2`). Note: this **corrects** feature-003's over-fix (T014 added the top margin), aligning to the prototype. *(Implementation note: used `mt-0!` — `mt-0` collides with the variant's base `mt-2` at the same level, so the important modifier makes the override deterministic.)*
- [ ] T011 [US5] Verify per `quickstart.md` §6: the title→bar gap is 6px (not 14px), the bar→content gap stays 16px, and the processing-modal accent bar is unchanged (regression check on the shared `AccentBar`).

**Checkpoint**: The Follow-up card accent-bar spacing matches the prototype — independently testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final correctness gate and sign-off across all stories.

- [X] T012 [P] Run `npm run validate` (type-check → lint → build) and resolve any failures introduced by T002–T011. Run `npm run format` first if Prettier reports Tailwind class-ordering drift. *(Passed: type-check ✓, ESLint ✓, Prettier ✓ after `npm run format`, production build ✓.)*
- [ ] T013 Re-run `quickstart.md` §2–§7 end to end; check off every item in `specs/004-layout-spacing-parity/contracts/visual-parity-contract.md`; confirm no element brought to parity under `003-fix-ui-pixel-parity` regressed (spec FR-007 / SC-006); and confirm the deferred Actions-badge color item remains explicitly out of scope (no token exists).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **User Story 1 (Phase 2)**: No dependency on other stories. **MVP.**
- **User Story 2 (Phase 3)**: Independent — verification only (no code change expected).
- **User Story 3 (Phase 4)**: Independent — different files (`covered-decided.tsx`, `action-items.tsx`).
- **User Story 4 (Phase 5)**: Independent — single file (`meta-strip.tsx`).
- **User Story 5 (Phase 6)**: Independent — single file (`chat-panel.tsx`).
- **Polish (Phase 7)**: Depends on all five user stories being complete.

All five user stories touch **disjoint files** and have no cross-story dependency and no shared foundational prerequisite (each fix is a per-instance override), so they may be implemented in any order or fully in parallel by multiple developers.

### Parallel Opportunities

- Across stories: T002 (US1, `app-header.tsx`), T005 (US3, `covered-decided.tsx`), T006 (US3, `action-items.tsx`), T008 (US4, `meta-strip.tsx`), and T010 (US5, `chat-panel.tsx`) all touch different files and can run in parallel.
- Within US3, T006 is `[P]` relative to T005 (different file); the per-file edits in each (indent + radius) are done together.
- T012 (validate) and T013 (manual re-verification) both follow T002–T011; run T012 first (it is the automated gate), then T013.

---

## Parallel Example: cross-story fan-out

```bash
Task: "Header avatar responsive size in src/components/common/app-header/app-header.tsx"          # T002 (US1)
Task: "3px heading indent + 10px card radius in src/features/meeting-review/components/covered-decided.tsx"  # T005 (US3)
Task: "3px heading indent + 10px card radius in src/features/meeting-review/components/action-items.tsx"     # T006 (US3)
Task: "Email-field gap/star/padding/min-w in src/features/meeting-review/components/meta-strip.tsx"          # T008 (US4)
Task: "Remove chat accent-bar top margin in src/features/assistant-chat/components/chat-panel.tsx"           # T010 (US5)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup baseline).
2. Complete Phase 2 (US1 — header avatar responsive size).
3. **STOP and VALIDATE**: run `quickstart.md` §2 independently.
4. This resolves the most globally-visible reported area (the header) and is demoable on its own.

### Incremental Delivery

1. Setup → baseline confirmed.
2. US1 (header) → validate → demo (MVP).
3. US2 (meeting summary) → verification/regression only (no code change expected).
4. US3 (review sections) → validate → demo.
5. US4 (email field) → validate → demo.
6. US5 (follow-up accent bar) → validate → demo.
7. Polish (validate + full re-verification + no-003-regression) → final sign-off, closes SC-001–SC-006.

### Parallel Team Strategy

All five stories touch disjoint files, so up to five developers (or a single developer batching the five call-site edits) can work simultaneously. Converge at Phase 7 for `npm run validate` and the manual re-verification.

---

## Notes

- [P] tasks touch different files with no unmet dependency and may be done in any order relative to each other.
- [Story] labels map every implementation task back to its spec.md user story for traceability.
- No tests are generated (no test infrastructure exists; not requested). `npm run validate` (T012) is the automated correctness gate; the manual `quickstart.md` walkthroughs are the visual-fidelity gate.
- **No shared UI primitive is modified.** Every correction to an element rendered via `Avatar`, `InlineInput`, or `AccentBar` is a per-instance className override at the call site, so other consumers (attendee/chat avatars, contact input, processing-modal bar) are unaffected (Principle VI).
- **No new dependency.** The `min-w-[200px]!` fix (T008) uses Tailwind's important modifier rather than adding `tailwind-merge`/`clsx` (Principle I), consistent with the feature-003 precedent.
- **Out of scope**: the Actions number-badge color hue (`#d6a836` vs `--mustard`) — a color mismatch with no existing token; deferred (see `research.md`).
- Commit after each task or logical group, following the repository's Conventional Commit + branch-naming rules (`CLAUDE.md`).
- Stop at any checkpoint to validate a story independently before proceeding to the next.
