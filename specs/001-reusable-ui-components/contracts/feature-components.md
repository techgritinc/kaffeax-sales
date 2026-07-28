# Contract: Composed & Feature Components

Composed components (in `components/common/`) and feature components (in `features/<feature>/components/`) are built from the atomic primitives and consume shared state via `useWorkflow()` (see `workflow-context.md`). They never import another feature's internals.

## Common / shell (`components/common/`)

### AppShell (`common/app-shell/`) — `'use client'`
- `<AppShell />` — CSS-grid shell: `[sidebar | main | chat]`. Applies `no-chat` / `no-sidebar` modifiers from `chatVisible`/`sidebarOpen`. Responsive: ≤1100px narrower columns; ≤900px sidebar → drawer + backdrop, chat → full-screen takeover. Composes `AppHeader`, `Stepper`, the active step's feature view, `Sidebar`, and `ChatPanel`. Renders `Toast`, `ProcessingModal`, and the rubric `Modal` at overlay level.

### AppHeader (`common/app-header/`)
- `<AppHeader />` — fixed 56px bar: full logo (`next/image`) + divider + app label "Meeting Summary to CRM" (mini favicon under 900px); right = user block "Mohan Verma / mohan.verma@kaffeax.com" + green "MR" avatar.

### Stepper (`common/stepper/`)
- `<Stepper step: Step; canReview: boolean; canCommit: boolean; onGoTo: (s: Step) => void />` — composes `Breadcrumb`; items Capture › Review › CRM with reachability gating (matches `goTo`).

## Meeting Capture (`features/meeting-capture/`)

- `<CaptureScreen />` — hero (eyebrow/title/subtitle), floating **Scoring rubric** pill, `TranscriptCard`.
- `<TranscriptCard />` — drag-and-drop zone (`.txt/.md/.vtt/.srt`), **Attach file** + **Load sample** buttons, `Textarea mono`, live word count, error banner (when `status==='error'`), **Clear** + **Summarise** (disabled when empty).
- `<ProcessingModal open: boolean />` — 4-step animated overlay (Reading transcript → Extracting entities → Scoring intent → Drafting recap) using `Spinner`/`Shimmer`; advances on the 380ms tick.
- **hooks**: `useTranscriptDrop` (FileReader + drag state, explicit error handling), `useWordCount`.

## Meeting Review (`features/meeting-review/`)

- `<ReviewScreen />` — orchestrates the dossier from `activeRecord`.
- `<ReviewHero />` — meeting title + `Badge` band + numeric score `/100`; actions: **Email** (mailto) and (draft) **Approve**+**Reject** or (committed) **Update CRM**. Approve disabled while `emailMissing`.
- `<MetaStrip />` — attendees (avatars + names), meeting date ("June 24, 2026", reproduced as hardcoded), required prospect-email `Input warn` with rust asterisk.
- `<SummaryBlock />` — narrative prose.
- `<HeardGrid />` — three columns `▲ Hot / ● Warm / ○ Cold` of `SignalChip`s; each signal row shows a `Tooltip` with evidence; rationale line beneath.
- `<CoveredDecided />` — side-by-side "What was covered" / "What was decided" cards (`✓` bullets).
- `<ActionItems />` — unified list of `next_steps` + `commitments` (owner tag, due tag).

## CRM Commit (`features/crm-commit/`)

- `<CommitScreen />` — hero ("Written to CRM" / "This meeting is now in Zoho"), **Capture another** button, one `CommitCard` per committed record.
- `<CommitCard record: CrmRecord />` — company, `Badge` band, "Written to Zoho" status `Tag`, contact line, rationale blockquote, write-time, monospace activity id, **Open in Review** action.

## Meeting Library / Sidebar (`features/meeting-library/`)

- `<Sidebar />` — header ("Recent" + New + collapse), `SearchInput` (filters by company name), **Drafts** and **Saved to CRM** groups with counts, empty states, `SidebarItem` rows. Collapses to a 56px rail (`SidebarRail`); on ≤900px renders as a drawer with backdrop.
- `<SidebarItem record: MeetingRecord; active: boolean; onSelect />` — `BandDot`, title, `BAND · when` meta, status `Tag` (saved/draft).

## Scoring Rubric (`features/scoring-rubric/`)

- `<RubricModal open; onClose />` — two columns: left = banding-rule pills + "how scoring works" help; right = `SignalCard` list + composer.
- `<SignalCard signal: RubricSignal; onLabelChange; onWeightChange; onDelete />` — `InlineInput` label + `WeightSegmentedControl` + delete (revealed on hover).
- `<SignalComposer onAdd; onCancel />` — inline add-signal card (mints `custom_<timestamp>`).

## Assistant Chat (`features/assistant-chat/`)

- `<ChatPanel />` — context greeting, suggested `Chip`s, message bubbles (`ChatMessage`), "Thinking…" pending state, input bar (Enter-to-send), auto-scroll; collapse control.
- `<ChatFab onClick />` — floating reopen button when panel collapsed.
- **hooks**: `useAutoScroll`, `useCannedResponse` (keyword match: `pric*`/`next`/`competitor`/`budget`/`timeline`).

## Contract acceptance

- Every feature view renders identically to the corresponding prototype screen/state (SC-001, SC-002).
- Feature components import only `components/ui/*`, `components/common/*`, `providers/workflow`, `types/*`, `constants/*` — never another feature (SC-006, Principle: no cross-feature imports).
- All interactive behaviours (drag/drop, modal open/close, filtering, inline edit, approve/reject/update, chat, toasts, responsive reflow) reproduce the prototype outcomes (SC-002).
