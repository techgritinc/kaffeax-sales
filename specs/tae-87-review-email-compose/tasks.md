# Tasks: Review Email Compose

**Input**: Design documents from `specs/tae-87-review-email-compose/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/email-body-template.md

**Tests**: Not included — no testing infrastructure exists in this project.

**Organization**: Tasks are grouped by user story. US2 (partial data) and US3 (subject line) are inherently delivered by the formatter utility built in the foundational phase — their phases contain only validation checkpoints.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Extract magic numbers/strings into named constants per constitution §XV.

- [X] T001 Create `src/constants/workflow/email.constants.ts` with `MAILTO_MAX_URL_LENGTH = 2000` (number), `EMAIL_SUBJECT_PREFIX = 'Meeting Follow-Up: '` (string), and `EMAIL_GREETING = 'Hi,'` (string) as named exports.

---

## Phase 2: Foundational (Email Formatter Utility)

**Purpose**: Build the pure-function email formatter that generates the structured plain-text body and subject line. This utility is the core of the feature — all three user stories depend on it.

**Reference**: See `specs/tae-87-review-email-compose/contracts/email-body-template.md` (v4) for the exact body structure, section headings (no separator line), numbering conventions, and signal grouping. **No truncation** — see FR-014/SC-002.

- [X] T002 Create `src/lib/utils/workflow/email-formatter.ts` with individual section builder functions, each returning a plain-text string block (or `''` when the section should be omitted): `buildGreeting` (returns `EMAIL_GREETING` from `@/constants/workflow/email.constants`), `buildSummarySection` (returns the narrative text — always included, never omitted), `buildHeardSection` (groups `detectedSignals` by `weight` into Hot/Warm/Cold sub-lists under a `WHAT WE HEARD` uppercase heading with no separator line — omit entire section if `detectedSignals` is empty, omit individual weight sub-groups if no signals match that weight; render each sub-group as `Hot:` / `Warm:` / `Cold:` followed by indented `  * {signal.label}` lines), `buildCoveredSection` (uppercase `WHAT WAS COVERED` heading + numbered list of `topics` — omit entirely if `topics` is empty), `buildDecidedSection` (uppercase `WHAT WAS DECIDED` heading + numbered list of `decisions` — omit entirely if `decisions` is empty), `buildActionItemsSection` (uppercase `ACTION ITEMS` heading + single numbered list merging `nextSteps` then `commitments` — each next step renders as `{owner}: {description} (Due: {dueDate || "TBD"})`, each commitment renders as `{side label}: {description}` where `kaffea_x` → `"Kaffea-X"` and `prospect` → `"Prospect"` — omit entirely if both arrays are empty), `buildSignOff` (closing line `"Looking forward to our next steps."` + `"Best regards,"` + KaffaX-side attendee name from `summary.attendees` where `side === 'kaffea_x'` on its own line — omit the name line if no KaffaX attendee exists). Import `MeetingRecord` from `@/types/meeting.types` and `DetectedSignal` from `@/types/scoring.types`. Do NOT include lead score, band, or scorePercentage in any section (FR-013). Do NOT include a signal's `evidence` field — only `label`. No heading has a dash/separator line beneath it.
- [X] T003 Add `buildEmailContent(draft: MeetingRecord): { subject: string; body: string }` function to `src/lib/utils/workflow/email-formatter.ts` that orchestrates all section builders in order (greeting, summary, heard, covered, decided, action items, sign-off), joining non-empty section outputs with blank-line separators per the contract's body format, and returns `{ subject, body }`. Add `buildEmailSubject(draft: MeetingRecord): string` that returns `EMAIL_SUBJECT_PREFIX + draft.summary.meetingTitle` (import `EMAIL_SUBJECT_PREFIX` from `@/constants/workflow/email.constants`). This is the single exported entry point used by the component.
- [X] ~~T004~~ **REMOVED (2026-08-03)**: The originally planned truncation step was implemented, then reverted after `/speckit-analyze` found it contradicted spec.md's Edge Cases and SC-002 (zero data loss) — a real bug surfaced in testing (10 topics truncated to 5 + a note). Per explicit user decision, there is no truncation of any kind; `buildEmailContent` always assembles the full body regardless of length. `MAILTO_MAX_URL_LENGTH`, `EMAIL_MAX_TRUNCATED_ITEMS`, and `EMAIL_NARRATIVE_TRUNCATE_LENGTH` constants were removed from `email.constants.ts`. See FR-014, `research.md` amendment, and `contracts/email-body-template.md` v4.

**Checkpoint**: Email formatter utility is complete. Verify by importing and calling `buildEmailContent` with a sample `MeetingRecord` — the returned `body` string should contain the expected uppercase headings (no separator lines), numbered lists (topics/decisions/action items), bulleted signal sub-groups, omit empty sections, and never truncate content.

---

## Phase 3: User Story 1 — Rich Email Compose from Review (Priority: P1) 🎯 MVP

**Goal**: Clicking the Email button on the Review screen directly opens the default mail client with subject and body pre-filled. No intermediate steps.

**Independent Test**: Click the Email button on any Review screen with a completed AI analysis. Verify the mail client opens immediately with pre-filled subject and body, and no toast, download, or other intermediate step occurs.

### Implementation for User Story 1

- [X] T005 [US1] Replace the `onEmail` handler in `src/components/review-screen/review-screen.tsx`: import `buildEmailContent` from `@/lib/utils/workflow/email-formatter`, call it with `draft` to get `{ subject, body }`, and set `window.location.href = \`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}\``. Remove the old logic that read from `draft.recapEmail`.

**Checkpoint**: User Story 1 is fully functional. Clicking Email directly opens the mail client with subject and body pre-filled and recipient fields empty — no toast, no download, no clipboard step.

---

## Phase 4: User Story 2 — Partial Data Handling (Priority: P2)

**Goal**: Empty sections are omitted from the email body — no orphaned headings, no empty list stubs.

**Independent Test**: Click Email on a Review screen where some sections (e.g., Decisions, Action Items) have no data. Verify the body excludes those sections cleanly.

**Implementation note**: This behavior is fully delivered by the section builder functions in T002. Each builder returns `''` when its data array is empty. `buildEmailBody` (T003) only joins non-empty builder outputs. No additional tasks are needed.

**Checkpoint**: Verify by testing with a `MeetingRecord` where `decisions` is empty — the generated body should have no "WHAT WAS DECIDED" heading or list.

---

## Phase 5: User Story 3 — Subject Line Generation (Priority: P3)

**Goal**: Subject line is automatically set to "Meeting Follow-Up: {meetingTitle}" in the mail client compose window.

**Independent Test**: Click Email and verify the compose window subject line matches the format.

**Implementation note**: This behavior is fully delivered by `buildEmailSubject` in T003. No additional tasks are needed.

**Checkpoint**: Verify subject line appears correctly, including with special characters and long titles (no truncation of the title itself).

---

## Phase 6: Polish & Validation

**Purpose**: Ensure the implementation passes all quality gates and works end-to-end.

- [X] T006 [P] Run `npm run type-check` to verify zero type errors across the codebase after all changes
- [X] T007 [P] Run `npm run lint` to verify zero lint warnings (CI runs `--max-warnings=0`) and run `npm run format` to fix any formatting issues
- [X] T008 Run all quickstart.md validation scenarios manually in the browser: (1) Full email compose with all sections populated — verify no intermediate steps occur, (2) Partial data with empty sections, (3) Special characters in title and content, (4) Long content (10+ items) included in full with no truncation, (5) Verify lead score/band are NOT in the email body, (6) Verify no dash separator line beneath any heading and decisions render as a numbered list. See `specs/tae-87-review-email-compose/quickstart.md` for detailed steps and expected results.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (constants) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion (T002–T003)
- **US2 (Phase 4)**: No additional tasks — covered by Phase 2
- **US3 (Phase 5)**: No additional tasks — covered by Phase 2
- **Polish (Phase 6)**: Depends on Phase 3 completion (T005)

### Within Each Phase

```
T001 (constants) → T002 (section builders) → T003 (orchestrator)
                                                          ↓
                                                 T005 (wire up handler)
                                                          ↓
                                        T006 [P] + T007 [P] (quality gates)
                                        T008 (browser validation)
```

### Parallel Opportunities

- **T006 and T007 can run in parallel**: Type-check and lint are independent quality gates.
- All other tasks are sequential — the formatter (T002–T003) must exist before the component can be wired up (T005), and both files are touched by only one task each so there is little file-level parallelism in this compact feature.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T003)
3. Complete Phase 3: User Story 1 (T005)
4. **STOP and VALIDATE**: Test per quickstart.md Scenario 1
5. User Stories 2 and 3 are already working (built into the formatter)

### Incremental Delivery

This feature is compact enough that all three user stories are delivered together. The formatter utility (Phase 2) inherently handles partial data (US2) and subject generation (US3). The only "wiring" work is US1 (Phase 3).

**Recommended approach**: Execute T001 → T002 → T003 → T005 → T006/T007 (parallel) → T008.

---

## Notes

- Total implementation touches **3 files**: 2 new (`email.constants.ts`, `email-formatter.ts`), 1 modified (`review-screen.tsx`)
- The existing `recapEmail` field on `MeetingRecord` is not modified or removed — it's simply bypassed
- The formatter is a pure function with no side effects and no async operations
- No HTML, no Blob, no Clipboard API, no MIME headers — a single `mailto:` URL assignment
- `window.location.href = mailto:...` is a synchronous, single-step action satisfying FR-012 (no intermediate steps)
