---
description: "Task list for Reusable UI Components — Kaffea-X Prototype Reproduction"
---

# Tasks: Reusable UI Components — Kaffea-X Prototype Reproduction

**Input**: Design documents from `/specs/001-reusable-ui-components/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: None requested in the spec — no test tasks are generated. The pure engine is written to be independently testable; validation is via `quickstart.md` + `npm run validate`.

**Organization**: Tasks are grouped by user story. Because the reusable design system and the shared state machine are needed by every surface, they sit in Setup/Foundational; each user story then builds its own feature folder and plugs into the shell.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5 for user-story tasks; Setup/Foundational/Polish tasks have no story label
- All paths are repository-relative; `@/` alias maps to `src/`

## Constitution guardrails (apply to EVERY task)

- Token-driven Tailwind utilities only — **no** hardcoded hex/rgb/hsl, **no** inline `style` objects (colours/shadows/gradients/animations live only in `globals.css`).
- No `any`, no non-null assertions; explicit prop interfaces.
- One component per file, ≤150 LOC — split into sub-components/hooks when larger.
- Features never import another feature's internals — cross-feature state flows through `@/providers/workflow` (`useWorkflow()`), `@/types`, `@/constants`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Styling foundation, shared types, constants, and font wiring the whole app depends on.

- [X] T001 Wire `next/font` in `src/app/fonts.ts` (Figtree variable `--font-figtree` weights 300–800; Playfair Display variable `--font-playfair` weights 700/900 + italic) and apply both `.variable` classes on `<html>` in `src/app/layout.tsx`
- [X] T002 [P] Extend design tokens in `src/app/globals.css`: add `@theme` radii (`--radius-*`), shadows (`--shadow-*` midnight-tinted), custom breakpoints (`--breakpoint-*` for 1100/900/720/640/560/400), `@keyframes` + `--animate-*` (spin, shimmer-slide, toast-in, fade-in, chat-slide-up), and wire `--font-sans: var(--font-figtree)` / `--font-display: var(--font-playfair)`
- [X] T003 [P] Create shared domain types in `src/types/meeting.types.ts`, `src/types/rubric.types.ts`, `src/types/scoring.types.ts`, `src/types/workflow.types.ts` per `data-model.md`
- [X] T004 [P] Create constants in `src/constants/bands.ts` (BAND colour map, BAND_DOT, SCORE_BY_BAND 93/68/34), `src/constants/workflow.ts` (PROC_STEPS labels, timings, id prefixes DRF/ZOHO/REJ, model id `claude-sonnet-4-6`, reviewer, rubric version), `src/constants/breakpoints.ts`

**Checkpoint**: Tokens, fonts, types, and constants ready — primitives can now be styled and typed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The reusable design-system primitives, the shared workflow state machine + engine + seed, and the app shell. **No user story can be built until this phase is complete.**

**⚠️ CRITICAL**: This is the largest phase by design — it delivers the primary reusable-component objective and the single mocked state machine all six surfaces consume.

### Shared state machine (`src/providers/workflow/`)

- [X] T005 [P] Create seed data in `src/providers/workflow/seed.ts` (SEED_LIBRARY 3 records, SAMPLE transcript, DEFAULT_RUBRIC 7 signals, CURATED extraction) — verbatim from the prototype
- [X] T006 [P] Create the pure engine in `src/providers/workflow/engine.ts` (`detectSignals`, `detectNextStep`, `applyBanding`, `buildRationale`, `buildNarrative`, `buildRecap`, `normalize`, `runProcessing`) — no side effects, per `contracts/workflow-context.md`
- [X] T007 Create context + `useWorkflow()` hook + state/action types in `src/providers/workflow/workflow-context.ts` (depends on T003)
- [X] T008 Implement `WorkflowProvider` (`'use client'`) in `src/providers/workflow/workflow-provider.tsx` with a reducer exposing ALL actions (setTranscript, loadSample, handleFile, process, patch, approve, reject, goTo, openFromLibrary, newCapture, resetDemo, notify w/ 3200ms auto-dismiss, setSidebarOpen/setChatVisible/setRubricOpen, addSignal/updateSignal/removeSignal, sendChat) and derived selectors (activeRecord, score, emailMissing, wordCount, groups, canReview/canCommit); split reducer cases into `src/providers/workflow/reducer/*.ts` to honour the ≤150-LOC rule (depends on T005, T006, T007)

### Atomic UI primitives (`src/components/ui/`) — reusable design system

- [X] T009 [P] `Icon` wrapper + 30 inline-SVG icons in `src/components/ui/icon/` (24×24, stroke-2, currentColor) per `contracts/ui-primitives.md`
- [X] T010 [P] `Button` (variants primary|approve|reject|send|ghost|link|mini; size md|sm; wide; disabled opacities) in `src/components/ui/button/`
- [X] T011 [P] `Badge` + `BandDot` (hot|warm|cold) in `src/components/ui/badge/`
- [X] T012 [P] `Chip`, `SignalChip`, `MetricChip`, `Tag` (kaffea|prospect|saved|draft|due|owner|confirm) in `src/components/ui/chip/`
- [X] T013 [P] `Input`, `InlineInput` (dashed), `SearchInput` (all with warn state) in `src/components/ui/input/`
- [X] T014 [P] `Textarea` (mono variant) in `src/components/ui/textarea/`
- [X] T015 [P] `Card` (+navy) and section primitives `SectionTitle`/`Eyebrow`/`Heading`/`Divider`/`AccentBar` in `src/components/ui/card/`
- [X] T016 [P] `Avatar` (initials|image; tone green|midnight|green-deep) in `src/components/ui/avatar/`
- [X] T017 [P] `WeightSegmentedControl` (HOT/WARM/COLD radiogroup) in `src/components/ui/segmented-control/`
- [X] T018 [P] `Breadcrumb` (active/disabled crumbs, `›` separator) in `src/components/ui/breadcrumb/`
- [X] T019 [P] `Tooltip` (hover popover, Playfair italic, arrow) in `src/components/ui/tooltip/`
- [X] T020 [P] `Modal` (backdrop + centered panel, backdrop-close + stopPropagation + Escape) in `src/components/ui/modal/`
- [X] T021 [P] `Toast` (tone success|reject|info, entrance animation) in `src/components/ui/toast/`
- [X] T022 [P] `Spinner` + `Shimmer` in `src/components/ui/spinner/` and `src/components/ui/shimmer/`
- [X] T023 [P] `Conf` + `ConfDot` (high|medium|low) in `src/components/ui/confidence-dot/`

### App shell (`src/components/common/`) + route

- [X] T024 [P] `AppHeader` in `src/components/common/app-header/` (56px bar; logo + mini favicon via `next/image`; app label; user block; "MR" avatar) — depends on T009, T016
- [X] T025 [P] `Stepper` in `src/components/common/stepper/` (composes `Breadcrumb`; Capture › Review › CRM with gating from `canReview`/`canCommit`) — depends on T018, T007
- [X] T026 `AppShell` (`'use client'`) in `src/components/common/app-shell/` — CSS-grid `[sidebar|main|chat]`, `no-chat`/`no-sidebar` modifiers, responsive columns + ≤900px drawer/backdrop + full-screen chat, a `step`→view switch skeleton, and overlay mounts for `Toast`/`ProcessingModal`/rubric `Modal`; composes `AppHeader` + `Stepper` (depends on T024, T025, T008)
- [X] T027 Replace `src/app/page.tsx` with a thin route rendering `<WorkflowProvider><AppShell/></WorkflowProvider>` (depends on T008, T026)

**Checkpoint**: Design system, state machine, and shell are live — user stories can now be built in parallel by plugging feature views into the shell.

---

## Phase 3: User Story 1 - Capture a transcript and get a scored dossier (Priority: P1) 🎯 MVP

**Goal**: Paste/drag/load a transcript, run the animated processing, and view the extracted dossier (title, band badge, score/100, attendees, meta, narrative, "What we heard" signal grid with evidence, topics/decisions, action items).

**Independent Test**: Load the sample transcript, click Summarise, watch the 4-step overlay, and confirm the Review dossier renders band Hot / score 93 with matching signals + hover evidence.

### Meeting Capture (`src/features/meeting-capture/`)

- [X] T028 [P] [US1] `useWordCount` hook in `src/features/meeting-capture/hooks/use-word-count.ts`
- [X] T029 [P] [US1] `useTranscriptDrop` hook in `src/features/meeting-capture/hooks/use-transcript-drop.ts` (`FileReader.readAsText` for `.txt/.md/.vtt/.srt`, drag state, explicit error handling → error banner)
- [X] T030 [US1] `TranscriptCard` in `src/features/meeting-capture/components/transcript-card.tsx` (drop zone, Attach file, Load sample, mono `Textarea`, live word count, error banner, Clear + Summarise disabled-when-empty) — depends on T028, T029
- [X] T031 [US1] `CaptureScreen` in `src/features/meeting-capture/components/capture-screen.tsx` (hero eyebrow/title/subtitle, floating Scoring-rubric pill, `TranscriptCard`) — depends on T030
- [X] T032 [US1] `ProcessingModal` in `src/features/meeting-capture/components/processing-modal.tsx` (4-step animated overlay using `Spinner`/`Shimmer`, 380ms tick)

### Meeting Review — dossier display (`src/features/meeting-review/`)

- [X] T033 [P] [US1] `ReviewHero` in `src/features/meeting-review/components/review-hero.tsx` (title + `Badge` band + score/100; Email + action buttons rendered presentational, wired in US2)
- [X] T034 [P] [US1] `MetaStrip` in `src/features/meeting-review/components/meta-strip.tsx` (attendee avatars + names, hardcoded "June 24, 2026", required prospect-email `Input warn` + rust asterisk)
- [X] T035 [P] [US1] `SummaryBlock` in `src/features/meeting-review/components/summary-block.tsx`
- [X] T036 [P] [US1] `HeardGrid` in `src/features/meeting-review/components/heard-grid.tsx` (▲Hot/●Warm/○Cold columns of `SignalChip`, per-signal evidence `Tooltip`, rationale line)
- [X] T037 [P] [US1] `CoveredDecided` in `src/features/meeting-review/components/covered-decided.tsx` (side-by-side cards, `✓` bullets)
- [X] T038 [P] [US1] `ActionItems` in `src/features/meeting-review/components/action-items.tsx` (unified next_steps + commitments with owner/due tags)
- [X] T039 [US1] `ReviewScreen` in `src/features/meeting-review/components/review-screen.tsx` composing T033–T038 from `activeRecord` via `useWorkflow()` — depends on T033–T038
- [X] T040 [US1] Integrate `CaptureScreen`, `ReviewScreen`, and `ProcessingModal` into the `AppShell` step switch in `src/components/common/app-shell/` — depends on T031, T032, T039

**Checkpoint**: US1 fully functional — capture → processing → dossier is demoable as the MVP.

---

## Phase 4: User Story 2 - Review, edit, and commit to CRM (Priority: P2)

**Goal**: Fill the required prospect email, Approve (mint CRM id → Commit screen) / Reject (→ Capture) a draft, or Update CRM for a committed record, each with a toast.

**Independent Test**: Open a draft in Review, enter an email, Approve → a ZOHO id is minted, the Commit screen shows a matching card, and a success toast appears.

- [X] T041 [US2] Wire Approve/Reject/Update-CRM + Email(`mailto:`) actions into `ReviewHero` in `src/features/meeting-review/components/review-hero.tsx` (Approve disabled while `emailMissing`; Update-CRM shown for committed records) using `useWorkflow()` — depends on T033
- [X] T042 [P] [US2] `CommitCard` in `src/features/crm-commit/components/commit-card.tsx` (company, `Badge` band, "Written to Zoho" `Tag`, contact, rationale blockquote, write-time, monospace activity id, Open-in-Review)
- [X] T043 [US2] `CommitScreen` in `src/features/crm-commit/components/commit-screen.tsx` (hero "Written to CRM / This meeting is now in Zoho", Capture-another, list of `CommitCard`) — depends on T042
- [X] T044 [US2] Integrate `CommitScreen` into the `AppShell` step switch and verify approve→commit transition, audit/crm state, and toasts end-to-end — depends on T043, T041

**Checkpoint**: US1 + US2 both work — full Capture→Review→Commit loop with reject/update.

---

## Phase 5: User Story 3 - Browse and reopen recent meetings (Priority: P3)

**Goal**: Sidebar lists Drafts and Saved-to-CRM with counts, company-name search, band dots, status chips, empty states, collapse-to-rail, and ≤900px drawer; selecting an item opens it in Review.

**Independent Test**: Type a company name → list filters; click a saved record → it opens in Review; collapse → 56px rail.

- [X] T045 [P] [US3] `SidebarItem` in `src/features/meeting-library/components/sidebar-item.tsx` (`BandDot`, title, `BAND · when` meta, status `Tag`)
- [X] T046 [P] [US3] `SidebarRail` (collapsed 56px rail + expand control) in `src/features/meeting-library/components/sidebar-rail.tsx`
- [X] T047 [P] [US3] `useLibrarySearch` hook in `src/features/meeting-library/hooks/use-library-search.ts` (filter by company name → draft/saved groups)
- [X] T048 [US3] `Sidebar` in `src/features/meeting-library/components/sidebar.tsx` (header + New + collapse, `SearchInput`, Drafts/Saved groups with counts, empty states) — depends on T045, T046, T047
- [X] T049 [US3] Integrate `Sidebar` into the `AppShell` sidebar region with collapse/expand + ≤900px drawer/backdrop behaviour and `openFromLibrary` selection — depends on T048

**Checkpoint**: Sidebar navigation works alongside US1/US2.

---

## Phase 6: User Story 4 - Refine the scoring rubric (Priority: P4)

**Goal**: Rubric modal with banding-rule pills + help, editable signals (inline label, HOT/WARM/COLD segment, delete), and an add-signal composer; edits affect subsequent processing.

**Independent Test**: Open the modal, add/edit/delete a signal, close, re-run Summarise → output reflects the edited rubric.

- [X] T050 [P] [US4] `SignalCard` in `src/features/scoring-rubric/components/signal-card.tsx` (`InlineInput` label + `WeightSegmentedControl` + hover-revealed delete)
- [X] T051 [P] [US4] `SignalComposer` in `src/features/scoring-rubric/components/signal-composer.tsx` (inline add-signal card, mints `custom_<timestamp>`)
- [X] T052 [US4] `RubricModal` in `src/features/scoring-rubric/components/rubric-modal.tsx` (uses `Modal`; left banding-rule pills + "how scoring works", right `SignalCard` list + `SignalComposer`) wired to `addSignal`/`updateSignal`/`removeSignal` — depends on T050, T051
- [X] T053 [US4] Wire the Capture Scoring-rubric pill to open the modal via the `AppShell` overlay and confirm re-score after edits — depends on T052

**Checkpoint**: Rubric editing works and influences scoring.

---

## Phase 7: User Story 5 - Converse with the assistant panel (Priority: P5)

**Goal**: Chat rail on Review/Commit with context greeting, suggested chips, bubbles, "Thinking…" pending state, keyword canned responses, Enter-to-send, auto-scroll, collapse + reopen FAB.

**Independent Test**: Send "pricing" (or click a chip) → pending state then matching canned response; collapse → FAB reopens.

- [X] T054 [P] [US5] `useAutoScroll` hook in `src/features/assistant-chat/hooks/use-auto-scroll.ts`
- [X] T055 [P] [US5] `useCannedResponse` hook in `src/features/assistant-chat/hooks/use-canned-response.ts` (keyword match: pric*/next/competitor/budget/timeline)
- [X] T056 [US5] `ChatPanel` in `src/features/assistant-chat/components/chat-panel.tsx` (greeting, suggested `Chip`s, user/ai bubbles, pending, input bar Enter-to-send, auto-scroll, collapse) — depends on T054, T055
- [X] T057 [P] [US5] `ChatFab` in `src/features/assistant-chat/components/chat-fab.tsx` (floating reopen button)
- [X] T058 [US5] Integrate `ChatPanel` + `ChatFab` into the `AppShell` chat region (gradient rail, ≤900px full-screen takeover) using `sendChat`/`chatVisible` — depends on T056, T057

**Checkpoint**: All five user stories independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Fidelity, responsiveness, constitution, and gate verification across all stories.

- [X] T059 [P] Verify responsive reflow at every breakpoint (1100/900/720/640/560/400px) across all views — sidebar drawer + full-screen chat at ≤900px, no horizontal overflow
- [X] T060 [P] Pixel-fidelity spot-check: side-by-side `Design/POC_Kaffea-X_Prototype.html` vs the app for every view/state (SC-001); reconcile any drift
- [X] T061 [P] Constitution guard: run `grep -rEn "#[0-9a-fA-F]{3,6}|rgb\(|hsl\(|style=\{\{" src/components src/features src/providers` → expect no matches (SC-008)
- [X] T062 [P] Verify no cross-feature imports and single-source primitive reuse (no duplicated one-off copies) (SC-005, SC-006)
- [X] T063 Run all `quickstart.md` validation scenarios (US1–US5 + responsive)
- [X] T064 Run `npm run validate` (type-check → lint `--max-warnings=0` → build) and resolve any failures

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**.
- **User Stories (Phases 3–7)**: all depend on Foundational. After it completes, US1–US5 can proceed in parallel (different feature folders). The only shared touch-point is the `AppShell` step/region integration task at the end of each story (T040, T044, T049, T053, T058) — these edit `app-shell` and should be serialized relative to each other.
- **Polish (Phase 8)**: depends on all desired stories.

### Story dependencies

- **US1 (P1)**: needs Foundational only. MVP.
- **US2 (P2)**: needs Foundational; extends `ReviewHero` from US1 (T041 depends on T033). Otherwise independent.
- **US3 (P3)**: needs Foundational only. Independent.
- **US4 (P4)**: needs Foundational only. Independent.
- **US5 (P5)**: needs Foundational only. Independent.

### Within each story

- Hooks/leaf components (marked [P]) before the composing screen; the composing screen before the `AppShell` integration task.

---

## Parallel Execution Examples

**Foundational primitives (after T003/T002)** — launch together:

```text
T009 Icon set · T010 Button · T011 Badge · T012 Chip/Tags · T013 Input family ·
T014 Textarea · T015 Card/section · T016 Avatar · T017 SegmentedControl ·
T018 Breadcrumb · T019 Tooltip · T020 Modal · T021 Toast · T022 Spinner/Shimmer · T023 Conf
```

**Foundational state (independent of primitives)** — in parallel with the above:

```text
T005 seed.ts · T006 engine.ts   (then T007 → T008)
```

**US1 review-display leaves** — launch together:

```text
T033 ReviewHero · T034 MetaStrip · T035 SummaryBlock · T036 HeardGrid · T037 CoveredDecided · T038 ActionItems
```

**Cross-story parallelism**: once Foundational is done, one developer can take each of US1–US5 concurrently (distinct feature folders), coordinating only on the AppShell integration tasks.

---

## Implementation Strategy

### MVP first (recommended)

1. Phase 1 Setup → 2. Phase 2 Foundational (design system + state machine + shell) → 3. Phase 3 US1.
4. **STOP & VALIDATE**: capture → processing → dossier matches the prototype. Demoable MVP.

### Incremental delivery

Add US2 (commit loop) → US3 (sidebar) → US4 (rubric) → US5 (chat), validating each against `quickstart.md` before moving on. Each story adds a surface without breaking earlier ones.

### Notes

- [P] = different files, no incomplete dependency.
- The heavy Foundational phase is intentional: it is the reusable-component deliverable and the single mocked state machine every surface shares.
- Preserve prototype quirks (hardcoded date, duplicated title) per spec Assumptions — do not "fix" them.
- Commit after each task or logical group using Conventional Commits (`feat(ui): …`, `feat(app): …`).
