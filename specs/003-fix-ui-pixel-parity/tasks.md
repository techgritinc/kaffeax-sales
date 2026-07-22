---

description: "Task list for Pixel-Perfect UI Parity with HTML Prototype"
---

# Tasks: Pixel-Perfect UI Parity with HTML Prototype

**Input**: Design documents from `/specs/003-fix-ui-pixel-parity/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/visual-parity-contract.md, quickstart.md (all present)

**Tests**: Not included. No automated test infrastructure exists in this project (`CLAUDE.md`), and neither the spec nor the user requested a TDD approach. Validation is the manual side-by-side procedure in `quickstart.md`, referenced from each story below.

**Organization**: Tasks are grouped by user story (US1–US4, in the priority order from `spec.md`) so each can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Every task includes the exact file path(s) it touches

## Path Conventions

Single Next.js project — all paths are relative to `src/` and `specs/` at the repository root, per `plan.md`'s Project Structure. No new directories are introduced.

---

## Phase 1: Setup

**Purpose**: Establish the verified baseline before making any change.

- [X] T001 Run `npm run dev` and open `Design/POC_Kaffea-X_Prototype.html` side by side per `quickstart.md` §1; reproduce and confirm each of the four discrepancies documented in `research.md` (Findings 1–4) still exists exactly as described before touching any code.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Design tokens shared by both the sidebar fix (US1) and the status-chip consistency story (US2). No color-token work may start in either story until this completes.

**⚠️ CRITICAL**: T003 (US1) and T008 (US2) depend on this phase.

- [X] T002 Add `--sidebar-status-draft-text: #E6C778;` and `--sidebar-status-saved-text: #A6E6CA;` to the `:root` block in `src/app/globals.css`, and register `--color-sidebar-status-draft-text` / `--color-sidebar-status-saved-text` in the `@theme inline` block, per `data-model.md`'s "New tokens required" table (Principle II — no hardcoded hex in component files).

**Checkpoint**: New text-color tokens exist and are usable as Tailwind utilities (`text-sidebar-status-draft-text`, `text-sidebar-status-saved-text`).

---

## Phase 3: User Story 1 - Sidebar matches the prototype exactly (Priority: P1) 🎯 MVP

**Goal**: The meeting-library sidebar — structure, spacing, and per-row status indicator — is visually identical to the prototype's `.kx-sidebar`/`.kx-side-*` rules.

**Independent Test**: `quickstart.md` §2 — load the library with a mix of draft/committed meetings and compare the sidebar against the prototype at each supported breakpoint.

### Implementation for User Story 1

- [X] T003 [US1] Create a new `StatusChip` primitive in `src/components/ui/chip/status-chip.tsx` (`tone: 'draft' | 'saved'`, `children`, `className`) reproducing `.kx-side-status` exactly: `text-[8.5px] font-extrabold tracking-[0.06em] uppercase rounded-[3px] px-1.5 py-0.5 shrink-0`, with `saved` using `bg-green/[0.18] border border-green/[0.35] text-sidebar-status-saved-text` and `draft` using `bg-mustard/[0.18] border border-mustard/40 text-sidebar-status-draft-text` (depends on T002). Export it from `src/components/ui/chip/index.ts`. Note: this is deliberately a new primitive, not an extension of the existing `Tag` component in the same directory — `Tag`'s shared base (`rounded-pill`, `px-[10px] py-[3px]`) is a different pill shape used for a different set of prototype elements (`.kx-owner-pill`, `.kx-due-tag`, `.kx-side-tag`) and does not fit `.kx-side-status`'s distinct small-badge shape.
- [X] T004 [US1] In `src/features/meeting-library/components/sidebar-item.tsx`, replace the inline `STATUS_SAVED`/`STATUS_DRAFT` constants and hand-rolled `<span>` with `<StatusChip tone={record.committed ? 'saved' : 'draft'}>{record.committed ? 'CRM' : 'Draft'}</StatusChip>` from `@/components/ui/chip` (depends on T003).
- [X] T005 [US1] In `src/features/meeting-library/components/sidebar-item.tsx`, add the missing `2px` vertical margin to the item row's className (alongside the existing `mx-2`), matching `.kx-side-item { margin: 2px 8px }` (`research.md` Finding 2).
- [X] T006 [P] [US1] Audit `src/features/meeting-library/components/sidebar.tsx` header, search box, and group-row spacing against `.kx-sidebar`, `.kx-side-header`, `.kx-side-search-wrap`, and `.kx-side-group-row`; correct any drift found (`contracts/visual-parity-contract.md` Sidebar section).
- [X] T007 [US1] Verify the sidebar's responsive drawer/overlay behavior below the mobile breakpoint still matches the prototype after T003–T006, per `quickstart.md` §2 step 4 (`src/features/meeting-library/components/sidebar.tsx`).

**Checkpoint**: Sidebar structure, spacing, and status indicator match the prototype exactly — MVP deliverable, independently testable and demoable.

---

## Phase 4: User Story 2 - Draft and Saved to CRM chips match the prototype exactly (Priority: P2)

**Goal**: The draft/saved status chip has exactly one visual definition, reused everywhere it appears — no per-location styling copies.

**Independent Test**: `quickstart.md` §3 — locate every occurrence of the chip and confirm each renders the same padding/margin/alignment/spacing.

### Implementation for User Story 2

- [X] T008 [US2] Search `src/` for any draft/saved status-indicator markup other than the `StatusChip` usage introduced in T004 (depends on T002, T004). `research.md`'s Scope Confirmation found none as of this spec's writing — this task re-confirms that against the current tree before sign-off.
- [X] T009 [US2] If T008 finds any additional occurrence, replace it with `<StatusChip>` from `src/components/ui/chip/status-chip.tsx` (same import path as T004) so every occurrence shares one definition; if none is found, no code change is required beyond the confirmation recorded in T008.

**Checkpoint**: Exactly one status-chip definition exists and is reused everywhere it appears — US1 and US2 both satisfied.

---

## Phase 5: User Story 3 - Accent bar matches the prototype exactly (Priority: P3)

**Goal**: Every accent bar in the app matches the prototype's color, size, and margin for its specific context (generic `h1`, `h2`, and the capture-screen hero).

**Independent Test**: `quickstart.md` §4 — check the capture screen, commit screen, processing modal, and chat panel accent bars against the prototype.

### Implementation for User Story 3

- [X] T010 [P] [US3] In `src/components/ui/typography/accent-bar.tsx`, encode margin per variant so callers no longer need ad-hoc `className` overrides: `h1` → `margin: 12px 0 16px`, `h2` → `margin: 8px 0 16px` (`research.md` Finding 4, `data-model.md` Accent Bar Variant Contract).
- [X] T011 [US3] In `src/components/ui/typography/accent-bar.tsx`, add a capture-hero context (e.g. a `context?: 'default' | 'captureHero'` prop) that reproduces `.kx-capture-hero .kx-accent-bar`: midnight background, `112×10` at desktop, `96×8` at the tablet breakpoint, `72×6` at the mobile breakpoint (color unchanged across all sizes), margin `10px 0 10px` base / `8px 0` at the mobile breakpoint (depends on T010).
- [X] T012 [US3] In `src/features/meeting-capture/components/capture-screen.tsx`, replace `<AccentBar variant="h2" className="my-[10px]" />` with the corrected capture-hero `AccentBar` from T011 (`research.md` Finding 3).
- [X] T013 [P] [US3] Remove the now-redundant/incorrect margin overrides on `<AccentBar />` in `src/features/crm-commit/components/commit-screen.tsx` and on `<AccentBar variant="h2" />` in `src/features/meeting-capture/components/processing-modal.tsx`, relying on the margins encoded in T010; verify each still renders `12px 0 16px` / `8px 0 16px` respectively.
- [X] T014 [US3] In `src/features/assistant-chat/components/chat-panel.tsx`, fix the inline `h2`-equivalent bar (`rounded-tight bg-bright-blue mb-4 h-1.5 w-[72px]`) to include the missing `8px` top margin, matching `.kx-bar-h2`'s `margin: 8px 0 16px` — either by switching to the shared `<AccentBar variant="h2" />` (preferred, for consistency) or adding the equivalent top-margin utility.

**Checkpoint**: All three accent-bar contexts (generic `h1`, `h2`, capture-hero) match the prototype exactly.

---

## Phase 6: User Story 4 - Full application visual audit (Priority: P4)

**Goal**: Every screen matches the prototype in layout, spacing, typography, color, component sizing, icons, responsiveness, and interactive states, with no known discrepancy left unresolved.

**Independent Test**: `quickstart.md` §5 — walk every screen at every supported breakpoint and exercise every interactive state.

### Implementation for User Story 4

- [X] T015 [US4] Walk the capture screen (`src/features/meeting-capture/components/capture-screen.tsx` and its children) at desktop/tablet/mobile widths against the prototype per `contracts/visual-parity-contract.md`'s Full Application Audit checklist; log and fix any discrepancy beyond the accent-bar fix already covered in US3.
- [X] T016 [US4] Walk the processing modal (`src/features/meeting-capture/components/processing-modal.tsx`) at all breakpoints against the prototype; log and fix any discrepancy found.
- [X] T017 [US4] Walk the review screen (`src/features/meeting-review/components/`) at all breakpoints against the prototype; log and fix any discrepancy found — this feature area is untouched by US1–US3 and has not yet been audited.
- [X] T018 [US4] Walk the commit screen (`src/features/crm-commit/components/commit-screen.tsx` and `commit-card.tsx`) at all breakpoints against the prototype; log and fix any discrepancy beyond the accent-bar fix already covered in US3.
- [X] T019 [US4] Exercise hover/active/focus/disabled states on buttons, chips, and sidebar rows across all screens touched above and confirm each matches the prototype's equivalent state; log and fix any drift found.

**Checkpoint**: No known visual or interactive-behavior discrepancy remains anywhere in the application (spec FR-008 / SC-004).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final correctness gate and sign-off across all stories.

- [X] T020 [P] Run `npm run validate` (type-check → lint → build) and resolve any failures introduced by T002–T019.
- [X] T021 Re-run the full `quickstart.md` validation guide end to end, check off every item in `specs/003-fix-ui-pixel-parity/contracts/visual-parity-contract.md`, and mark completed items in `specs/003-fix-ui-pixel-parity/checklists/ui-fidelity.md` / `checklists/requirements.md` as resolved.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — blocks T003 (US1) and T008 (US2).
- **User Story 1 (Phase 3)**: Depends on Foundational (T002). No dependency on other stories. **MVP.**
- **User Story 2 (Phase 4)**: Depends on Foundational (T002) and on US1's T004 (the `StatusChip` usage it verifies/consolidates must exist first).
- **User Story 3 (Phase 5)**: Depends only on Foundational completion — independent of US1/US2 (different component, `AccentBar`).
- **User Story 4 (Phase 6)**: Depends on US1, US2, and US3 being complete — it audits the whole app including the areas they just fixed, plus everything else.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Parallel Opportunities

- T006 (US1, sidebar container audit) can run in parallel with T003–T005 (different concerns within the same file set, but T006 touches `sidebar.tsx` while T003–T005 touch `status-chip.tsx`/`sidebar-item.tsx`).
- T010 and T013 (US3) touch different files and can run in parallel; T011/T012/T014 depend on T010.
- US3 (Phase 5) can be worked in parallel with US1/US2 (Phases 3–4) by a second developer, since it touches entirely different files (`accent-bar.tsx` and its call sites vs. the sidebar).
- T020 (validate) can run in parallel with T021 (manual re-verification) since neither depends on the other's output, though both must follow T002–T019.

---

## Parallel Example: User Story 1

```bash
Task: "Audit sidebar.tsx header/search/group spacing against .kx-sidebar rules"   # T006
# ...while, sequentially in the same story:
Task: "Create StatusChip primitive in src/components/ui/chip/status-chip.tsx"     # T003
Task: "Wire StatusChip into sidebar-item.tsx"                                      # T004 (after T003)
Task: "Add missing 2px vertical margin to sidebar-item.tsx rows"                   # T005
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational — design tokens).
2. Complete Phase 3 (User Story 1 — sidebar parity).
3. **STOP and VALIDATE**: run `quickstart.md` §2 independently.
4. This alone resolves the ticket's most visible complaint (the sidebar) and is demoable on its own.

### Incremental Delivery

1. Setup + Foundational → tokens ready.
2. US1 (sidebar) → validate → demo (MVP).
3. US2 (chip consistency confirmation) → validate → demo.
4. US3 (accent bar, independent of US1/US2) → validate → demo.
5. US4 (full audit) → validate → demo — final sign-off, closes the spec's acceptance criteria in full.

### Parallel Team Strategy

With two developers: Developer A takes US1 → US2 (sidebar/chip, sequential due to the T004 dependency); Developer B takes US3 (accent bar) independently, since it touches an entirely disjoint file set. Both converge for US4, splitting the five screen-audit tasks (T015–T019) between them.

---

## Notes

- [P] tasks touch different files with no unmet dependency and may be done in any order relative to each other.
- [Story] labels map every implementation task back to its spec.md user story for traceability.
- No tests are generated (no test infrastructure exists; not requested). `npm run validate` (T020) is the automated correctness gate; the manual `quickstart.md` walkthroughs are the visual-fidelity gate.
- Commit after each task or logical group, following the repository's Conventional Commit + branch-naming rules (`CLAUDE.md`).
- Stop at any checkpoint to validate a story independently before proceeding to the next.
