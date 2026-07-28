# Phase 1 Data Model: Reusable UI Components — Kaffea-X Prototype Reproduction

All entities are **client-side mock data** reproduced 1:1 from the prototype. No database, no persistence. Types live in `src/types/*.types.ts` (shared) per Principle XI. Values below match the prototype's seed data exactly.

## Enumerations & primitives

- **Band**: `'hot' | 'warm' | 'cold'`
  - Colour map (`constants/bands.ts`): hot → `green`, warm → `mustard`, cold → `dark-teal`.
  - `SCORE_BY_BAND`: hot `93`, warm `68`, cold `34`.
- **Weight**: `'hot' | 'warm' | 'cold'` (a rubric signal's segmented weight).
- **Confidence**: `'high' | 'medium' | 'low'`.
- **Side**: `'kaffea_x' | 'prospect'` (attendee / commitment ownership).
- **Step**: `'capture' | 'review' | 'commit'`.
- **ToastTone**: `'success' | 'reject' | 'info'`.
- **Outcome**: `'written' | 'updated' | 'rejected'` (audit).
- **ConfidentField<T>**: `{ value: T; confidence: Confidence }` — used for each contact field.

## Entities

### MeetingRecord (`meeting.types.ts`)

The central record; exists as a draft or a committed record.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | `DRF-######` (draft) or `ZOHO-######` (committed). |
| `when` | `string` | Human label, e.g. "Today · just now", "Yesterday · 4:22 PM". |
| `committed` | `boolean` | Drives Review actions (Approve/Reject vs. Update CRM) and sidebar grouping. |
| `band` | `Band` | Overall lead band. |
| `contact` | `Contact` | See below. |
| `summary` | `Summary` | See below. |
| `lead_score` | `LeadScore` | See below. |
| `recap_email` | `RecapEmail` | See below. |

**Relationships**: owns exactly one `Contact`, `Summary`, `LeadScore`, `RecapEmail`. Referenced by the `library` list, the active `draft`, and (when committed) a `CrmRecord`.

### Contact (`meeting.types.ts`)

| Field | Type |
|-------|------|
| `name` | `ConfidentField<string>` |
| `company` | `ConfidentField<string>` |
| `title` | `ConfidentField<string>` |
| `email` | `ConfidentField<string>` |

Empty `value` with `confidence: 'low'` is valid (e.g. missing name/email in seed records).

### Summary (`meeting.types.ts`)

| Field | Type | Notes |
|-------|------|-------|
| `meeting_title` | `string` | Reproduce quirks (Cascade Ember's duplicated phrase). |
| `narrative` | `string` | Band-keyed generated prose. |
| `attendees` | `Attendee[]` | `{ name: string; side: Side }`. |
| `topics` | `string[]` | "What was covered". |
| `decisions` | `string[]` | "What was decided". |
| `open_questions` | `string[]` | |
| `next_steps` | `NextStep[]` | `{ description: string; owner: string; due_date: string }`. |
| `commitments` | `Commitment[]` | `{ side: Side; description: string }`. |

Action-items list = `next_steps` + `commitments` unified.

### LeadScore (`scoring.types.ts`)

| Field | Type | Notes |
|-------|------|-------|
| `band` | `Band` | From `applyBanding`. |
| `detected_signals` | `DetectedSignal[]` | `{ id: string; label: string; weight: Weight; evidence: string }`. |
| `rationale` | `string` | Band-keyed generated text. |

### Rubric & RubricSignal (`rubric.types.ts`)

**RubricSignal**: `{ id: string; label: string; weight: Weight; source: 'client' | 'proposed'; hints: string[] }`.

**Rubric**: `{ signals: RubricSignal[]; banding: string }`.

- `DEFAULT_RUBRIC` has 7 signals: `distribution_pipeline_challenge`, `listing_frustration`, `price_transparency_pain`, `logistics_issue` (hot/client); `budget_confirmed`, `timeline_named` (warm/proposed); `just_browsing` (cold/proposed).
- New signals minted with id `custom_<timestamp>`; detection falls back to label-word hints when `hints` is empty.
- **Validation/state**: editable label (inline), weight via HOT/WARM/COLD segmented control, deletable. Editing the rubric affects subsequent `runProcessing` output.

### RecapEmail (`meeting.types.ts`)

`{ subject: string; body: string }` — band-keyed generated recap.

### CrmRecord (`workflow.types.ts`)

Created on Approve of an uncommitted draft.

| Field | Type |
|-------|------|
| `id` | `string` (`ZOHO-######`) |
| `contact` | `Contact` |
| `band` | `Band` |
| `rationale` | `string` |
| `recap` | `RecapEmail` |
| `nextSteps` | `NextStep[]` |
| `at` | `Date` (write time) |

### AuditEntry (`workflow.types.ts`)

Appended on every approve/update/reject.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Reject entries `REJ-######`. |
| `model` | `string` | `'claude-sonnet-4-6'`. |
| `reviewer` | `string` | `'You (demo reviewer)'`. |
| `rubric` | `string` | `'2026-06'`. |
| `outcome` | `Outcome` | |
| `target` | `string` | `'Zoho sandbox'` or `'—'`. |
| `at` | `Date` | |

### ChatMessage (`assistant-chat` feature type)

`{ id: string; role: 'user' | 'ai'; text: string; pending?: boolean }`. Canned responses matched on keywords (`pric*`, `next`, `competitor`, `budget`, `timeline`).

## Aggregate workflow state (`workflow.types.ts`)

Owned by `WorkflowProvider` (see `contracts/workflow-context.md`):

```
WorkflowState {
  step: Step
  library: MeetingRecord[]        // seeded from SEED_LIBRARY, newest first
  draftId: string | null          // active record id shown in Review/Commit
  rubric: Rubric
  crm: CrmRecord[]
  audit: AuditEntry[]
  toast: { message: string; tone: ToastTone } | null
  chat: ChatMessage[]
  sidebarOpen: boolean            // default: window.innerWidth > 900
  chatVisible: boolean
  rubricOpen: boolean
  status: 'idle' | 'processing' | 'error'
  transcript: string
  newSignalDraft: RubricSignal | null   // rubric composer
}
```

**Derived values** (not stored): `activeRecord` (lookup by `draftId`), `lead_score.band → score`, `emailMissing` (empty prospect email gates Approve), live transcript word count, sidebar groups (drafts vs. saved).

## Seed data (reproduce verbatim — `providers/workflow/seed.ts`)

- **SEED_LIBRARY** (3 records): Cascade Ember (`ZOHO-421089`, hot, committed), Blue Ridge Roasters (`ZOHO-338502`, warm, committed, Jesse Hart), Portland Pour Coffee (`DRF-portland-pour`, warm, draft, Kai Ferreira).
- **SAMPLE**: full mock Zoom transcript ("June 24, 2026 · 28 min").
- **DEFAULT_RUBRIC**: 7 signals + banding rule (above).
- **CURATED**: hand-authored extraction for the sample (contact + summary with 4 topics, 2 decisions, 1 open question, 2 next steps, 2 commitments).

## State transitions

```
capture --Summarise--> (status: processing) --done--> review        [mints DRF-######, prepends draft]
review  --Approve(new draft)--> commit                               [mints ZOHO-######, committed=true, +CrmRecord, +audit(written)]
review  --Update CRM(committed)--> review                            [updates crm/library, +audit(updated), toast]
review  --Reject--> capture                                          [+audit(rejected REJ-######), removes draft from library]
commit  --Capture another--> capture                                 [newCapture]
sidebar --select record--> review                                    [openFromLibrary(id); gated]
any     --goTo(step)--> step                                         [gated: review needs draftReady||committed; commit needs committed]
```

**Gating invariants**: Review reachable only when a draft is ready or the active record is committed; Commit only when the active record is committed — enforced identically in `goTo` and the `Stepper`.
