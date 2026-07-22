---

description: "Task list for Pixel-Perfect UI Parity with HTML Prototype"
---

# Tasks: Pixel-Perfect UI Parity with HTML Prototype

**Input**: Design documents from `/specs/003-fix-ui-pixel-parity/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/visual-parity-contract.md, quickstart.md (all present)

**Tests**: Not included. No automated test infrastructure exists in this project (`CLAUDE.md`), and neither the spec nor the user requested a TDD approach. Validation is the manual side-by-side procedure in `quickstart.md`, referenced from each story below.

**Organization**: Tasks are grouped by user story (US1–US8, in the priority order from `spec.md`) so each can be implemented and verified independently. Phases 1–7 (T001–T021, US1–US4) were completed in the original pass; Phases 8–13 (T022+, US5–US8) were added in the 2026-07-22 expansion after the deeper audit surfaced `research.md` Findings 5–16.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US8)
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

# Expansion (2026-07-22): US5–US8

The phases below were added after the deeper audit. They resolve `research.md` Findings 5–16. **`src/components/common/app-shell/app-shell.tsx` is explicitly out of scope** — the grid shell is confirmed faithful to the prototype and the Chat/FAQ panel introduces no layout shift beyond the prototype's own reflow (`research.md` cross-cutting confirmation); no task touches it.

## Phase 8: Foundational (Expansion — Blocking Prerequisite)

**Purpose**: The shared `Button` icon-size override needed by the US5, US7, and US8 icon fixes. No icon-size task in those stories may start until this completes.

**⚠️ CRITICAL**: T023 (US5), T032 (US7), and T038 (US8) depend on this phase.

- [X] T022 In `src/components/ui/button/button.tsx`, add an optional `iconSize?: number` to `ButtonProps` and, when provided, pass it to the `iconStart`/`iconEnd` `<Icon>` renders (lines 94, 96) instead of the size-derived `iconSize` from `resolve()` (line 77). Keep the derived value as the fallback when the prop is absent (backward-compatible, no `any`). Per `research.md` Finding 5 and `data-model.md` "Button Icon Size".

**Checkpoint**: `Button` can express any per-instance icon size via `iconSize`, matching the prototype's mixed 11/12/13/14px usage; existing call sites are unaffected.

---

## Phase 9: User Story 5 - Capture transcript section matches the prototype exactly (Priority: P2)

**Goal**: The transcript section — especially the ghost-button icons that render oversized — matches the prototype exactly.

**Independent Test**: `quickstart.md` §5 — compare the transcript ghost-button icons (13px), the `Clear` button geometry, and the section layout against the prototype.

### Implementation for User Story 5

- [X] T023 [US5] In `src/features/meeting-capture/components/transcript-card.tsx`, add `iconSize={13}` to the *Attach file* (`UploadCloud`, line ~67) and *Load sample* (`FileText`, line ~72) ghost `<Button>`s so their icons render at 13px, not 14px, matching prototype lines 3645/3648 (depends on T022; `research.md` Finding 5 — the reported "icons look larger" defect).
- [X] T024 [US5] In `src/features/meeting-capture/components/transcript-card.tsx` (lines ~100–107), fix the *Clear* button so its padding (`10px 18px`) and font-weight (`600`) render deterministically — eliminate the duplicate-utility collision with the ghost-base geometry (`px-[14px] py-[8px] font-medium`) rather than relying on class ordering, and WITHOUT adding a `tailwind-merge`/`clsx` dependency (`research.md` Finding 6; Principle I). Verify via computed style that the rendered padding/weight is `10px 18px` / `600`.
- [ ] T025 [US5] Confirm no regression in the transcript textarea, foot/actions row, card padding, error banner, and word-count label (all verified-matching in `research.md`) after T023–T024, per `quickstart.md` §5 step 4 (`src/features/meeting-capture/components/transcript-card.tsx`).

**Checkpoint**: Transcript ghost-button icons are 13px, the `Clear` button is deterministically correct, and the rest of the section is unregressed — independently testable.

---

## Phase 10: User Story 6 - Scoring Rubric modal matches the prototype exactly (Priority: P3)

**Goal**: The Scoring Rubric modal matches the prototype's overlay padding, add-signal control, header, and compose input.

**Independent Test**: `quickstart.md` §6 — compare overlay gutter, add-signal radius/hover, header behavior, and compose-input padding against the prototype.

### Implementation for User Story 6

- [X] T026 [P] [US6] In `src/components/ui/modal/modal.tsx` (line ~33), add `padding: 32px` to the overlay so the modal keeps a 32px gutter below its `max-width` (prototype line 862; `research.md` Finding 8). **Gate**: first confirm no other modal that uses this shared overlay depends on it being padding-less; if any does, scope the 32px to the rubric only (via a wrapper/prop) instead of the shared overlay.
- [X] T027 [US6] In `src/features/scoring-rubric/components/rubric-modal.tsx` (line ~129), change the Add-signal button radius from `rounded-input-sm` (4px) to `rounded-input`/`rounded-btn-sm` (6px), and add `hover:brightness-[0.94]` alongside the existing `hover:shadow-add-signal-hover` (prototype lines 1074, 1083–1086; `research.md` Findings 7, 10).
- [X] T028 [US6] In `src/features/scoring-rubric/components/rubric-modal.tsx` (line ~71), add `shrink-0` to the rubric header container (prototype line 1003; `research.md` Finding 9). *(Same file as T027 — sequence after it.)*
- [X] T029 [P] [US6] In `src/features/scoring-rubric/components/signal-composer.tsx` (line ~16), replace the invalid `py-[2px_0_4px]` (which emits an invalid 3-value `padding-block` and collapses to 0) with `pt-0.5 pb-1` (2px top / 4px bottom), matching `.kx-signal-card-input`'s `padding: 2px 0 4px` (prototype line 1113; `research.md` Finding 11).
- [ ] T030 [US6] Verify the rubric modal end to end against the prototype per `quickstart.md` §6 (overlay gutter at <1080px, add-signal radius/hover, header non-compression on short viewports, compose-input padding); confirm panel/columns/typography are unregressed.

**Checkpoint**: The Scoring Rubric modal matches the prototype exactly — independently testable.

---

## Phase 11: User Story 7 - Review Meeting Summary section matches the prototype exactly (Priority: P2)

**Goal**: The Meeting Summary heading spacing, review-hero details, and chat-panel mobile takeover match the prototype; the Chat/FAQ panel causes no width/layout regression.

**Independent Test**: `quickstart.md` §7 — compare the summary heading gap, sm-button icons, hero spacing, and mobile chat takeover; toggle the Chat/FAQ panel and confirm no extra layout shift.

### Implementation for User Story 7

- [X] T031 [US7] In `src/components/ui/typography/heading.tsx` (smallLabel branch, lines ~41–43), add `mb-2` (8px) so the `kx-h2-sm` treatment carries `margin-bottom: 8px`, producing the prototype's 8px gap above the narrative block in `src/features/meeting-review/components/summary-block.tsx` (lines ~11–14). Prototype lines 1476–1483; `research.md` Finding 12. Note this treatment is reused by other review section headings — all want the 8px, so verify each after the change.
- [X] T032 [US7] In `src/features/meeting-review/components/review-hero.tsx` (lines ~65–66, 75–76), add `iconSize={11}` to the *Email* (`Mail`) and *Update CRM* (`RefreshCw`) `sm` `<Button>`s so their icons render at 11px, not 12px, matching prototype lines 2958/2967 (depends on T022; `research.md` Finding 16).
- [X] T033 [US7] In `src/features/meeting-review/components/review-hero.tsx`, add the three narrow-width corrections: hero-wrap `max-bp640:gap-[12px]` (line ~35), review-actions `mt-[2px]` (line ~62), and hero eyebrow `leading-none` (line ~37). Prototype lines 1522–1526, 1508, 1498–1501; `research.md` Finding 14. *(Same file as T032 — sequence after it.)*
- [X] T034 [US7] In `src/features/assistant-chat/components/chat-panel.tsx`, add the `max-bp900` mobile-takeover internal sizing to the existing overlay: padding `16px 16px 14px` (line ~51), title `text-[18px]` + `mb-1` (line ~57), eyebrow `mb-1` (line ~54), input-bar `mt-2.5 pt-2.5` (line ~75), text input `px-3.5 py-3 text-[14px]` (line ~78), send button `h-11 w-11` (line ~88). Prototype lines 191–214; `research.md` Finding 13. (Shared component — also satisfies US8's chat concern.)
- [X] T035 [P] [US7] In `src/features/assistant-chat/components/chat-messages.tsx`, add `max-bp900:max-w-[82%]` to the user chat bubble, matching prototype line 219 (`research.md` Finding 13).
- [ ] T036 [US7] Verify per `quickstart.md` §7: summary heading gap is 8px; sm-button icons are 11px; toggling the Chat/FAQ panel reflows the Meeting Summary with no extra layout shift/overlap/width jump in either chat state; and the mobile takeover uses the prototype's tighter sizing.

**Checkpoint**: The Review Meeting Summary and its chat/hero context match the prototype in every chat state and breakpoint — independently testable.

---

## Phase 12: User Story 8 - CRM Write to CRM section matches the prototype exactly (Priority: P3)

**Goal**: The Write to CRM section spacing and ghost-button icons match the prototype; the Chat/FAQ panel causes no width/layout regression.

**Independent Test**: `quickstart.md` §8 — compare the hero sub-paragraph gap and ghost-button icons; toggle the Chat/FAQ panel and confirm no extra layout shift.

### Implementation for User Story 8

- [X] T037 [US8] In `src/features/crm-commit/components/commit-screen.tsx` (line ~32), add `mb-6` (24px) to the hero sub-paragraph so the gap before the "Capture another meeting" row is 24px, matching `.kx-sub`'s `margin-bottom: 24px` (prototype lines 511–515; `research.md` Finding 15). *(Same file as T038 — sequence with it.)*
- [X] T038 [US8] Add `iconSize={13}` to the *Capture another meeting* ghost `<Button>` in `src/features/crm-commit/components/commit-screen.tsx` (line ~38) and the *Open in Review* ghost `<Button>` in `src/features/crm-commit/components/commit-card.tsx` (line ~33), matching prototype lines 3862/3887 (depends on T022; `research.md` Finding 15/Finding 5 mechanism).
- [ ] T039 [US8] Verify per `quickstart.md` §8: the hero sub-paragraph gap is 24px; ghost-button icons are 13px; toggling the Chat/FAQ panel changes the Write-to-CRM section width only by the chat-column width with no extra shift; and the commit card geometry is unregressed. (The chat mobile takeover is already fixed by T034/T035.)

**Checkpoint**: The CRM Write to CRM section matches the prototype in every chat state and breakpoint — independently testable.

---

## Phase 13: Polish & Cross-Cutting Concerns (Expansion)

**Purpose**: Final correctness gate and sign-off across the US5–US8 work (the original Phase 7 gate covered US1–US4 only).

- [X] T040 [P] Run `npm run validate` (type-check → lint → build) and resolve any failures introduced by T022–T039. *(Passed: type-check ✓, ESLint ✓, Prettier ✓, production build ✓.)*
- [ ] T041 Re-run `quickstart.md` §5–§9 end to end; check off the US5–US8 items in `specs/003-fix-ui-pixel-parity/contracts/visual-parity-contract.md`; re-run the full-application audit (§9) to confirm Findings 5–16 are resolved and no further drift remains; and update `specs/003-fix-ui-pixel-parity/checklists/ui-fidelity.md` accordingly (spec FR-008 / SC-004, SC-006–SC-008).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — blocks T003 (US1) and T008 (US2).
- **User Story 1 (Phase 3)**: Depends on Foundational (T002). No dependency on other stories. **MVP.**
- **User Story 2 (Phase 4)**: Depends on Foundational (T002) and on US1's T004 (the `StatusChip` usage it verifies/consolidates must exist first).
- **User Story 3 (Phase 5)**: Depends only on Foundational completion — independent of US1/US2 (different component, `AccentBar`).
- **User Story 4 (Phase 6)**: Depends on US1, US2, and US3 being complete — it audits the whole app including the areas they just fixed, plus everything else.
- **Polish (Phase 7)**: Depends on all four original user stories being complete. *(Covers US1–US4 only.)*
- **Foundational — Expansion (Phase 8)**: `Button.iconSize` (T022) — blocks T023 (US5), T032 (US7), T038 (US8). No dependency on Phases 1–7.
- **User Story 5 (Phase 9)**: T023 depends on T022; T024/T025 have no cross-story dependency.
- **User Story 6 (Phase 10)**: Fully independent — no dependency on T022 or any other story (different files).
- **User Story 7 (Phase 11)**: T032 depends on T022; T031/T033/T034/T035 are independent. T034/T035 (shared chat panel) also satisfy US8's chat concern.
- **User Story 8 (Phase 12)**: T038 depends on T022; T037 is independent. The chat mobile takeover it relies on is delivered by US7's T034/T035.
- **Polish — Expansion (Phase 13)**: Depends on US5–US8 (Phases 9–12) being complete.

### Parallel Opportunities

- T006 (US1, sidebar container audit) can run in parallel with T003–T005 (different concerns within the same file set, but T006 touches `sidebar.tsx` while T003–T005 touch `status-chip.tsx`/`sidebar-item.tsx`).
- T010 and T013 (US3) touch different files and can run in parallel; T011/T012/T014 depend on T010.
- US3 (Phase 5) can be worked in parallel with US1/US2 (Phases 3–4) by a second developer, since it touches entirely different files (`accent-bar.tsx` and its call sites vs. the sidebar).
- T020 (validate) can run in parallel with T021 (manual re-verification) since neither depends on the other's output, though both must follow T002–T019.

**Expansion (US5–US8):**

- **US6 (Phase 10)** is fully independent of `Button.iconSize` (T022) and of US5/US7/US8. T026 (`modal.tsx`) and T029 (`signal-composer.tsx`) are `[P]` (unique files); T027 and T028 both edit `rubric-modal.tsx`, so run them sequentially (T027 → T028) while T026/T029 proceed in parallel.
- Across stories, once T022 lands, the icon-size tasks T023 (US5), T032 (US7), and T038 (US8) can proceed in parallel (different files).
- T024 (US5 `Clear` button) is independent of T022 and can run at any time.
- T035 (US7 chat bubble, `chat-messages.tsx`) is `[P]`. T032/T033 share `review-hero.tsx` (run sequentially); T037/T038 share `commit-screen.tsx` (run together).
- US5, US6, US7, US8 are mutually independent except that US8's chat-toggle verification (T039) assumes US7's shared chat-panel takeover (T034/T035) is done; sequence US7 before US8's final verify, or verify US8's chat behavior after T034/T035.

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

### Expansion Delivery (US5–US8)

1. Land the foundational `Button.iconSize` prop (T022) first — it unblocks the three icon-size fixes.
2. US5 (transcript) resolves the explicitly-reported "icons look larger" defect → validate → demo (recommended expansion MVP).
3. US6 (rubric modal) is fully independent and can be done in parallel with US5 by a second developer.
4. US7 (review summary + shared chat takeover) → then US8 (write-to-CRM), which reuses US7's chat-panel fixes.
5. Phase 13 (validate + full re-audit) closes SC-006–SC-008 and re-confirms SC-004 (no discrepancy remains).

With two developers: Developer A does T022 → US5 → US7 → US8 (US7/US8 share the chat panel); Developer B does US6 (T026–T030) entirely in parallel. Converge at Phase 13.

---

## Notes

- [P] tasks touch different files with no unmet dependency and may be done in any order relative to each other.
- [Story] labels map every implementation task back to its spec.md user story for traceability.
- No tests are generated (no test infrastructure exists; not requested). `npm run validate` (T020) is the automated correctness gate; the manual `quickstart.md` walkthroughs are the visual-fidelity gate.
- Commit after each task or logical group, following the repository's Conventional Commit + branch-naming rules (`CLAUDE.md`).
- Stop at any checkpoint to validate a story independently before proceeding to the next.
- **Expansion (US5–US8)**: `src/components/common/app-shell/app-shell.tsx` is deliberately untouched — the grid shell matches the prototype and the Chat/FAQ panel causes no layout shift beyond the prototype's own reflow (`research.md` cross-cutting confirmation). The only shared-component API change is the optional, backward-compatible `Button.iconSize` prop (T022). T040 (`npm run validate`) is the automated gate for the expansion; T041 is the manual visual-fidelity + full re-audit gate.
