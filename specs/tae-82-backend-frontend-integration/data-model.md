# Data Model: Backend Integration with Frontend

**Feature**: `tae-82-backend-frontend-integration` | **Date**: 2026-07-28

## Entity: Transcript (persistence — `src/types/transcript.types.ts` + `src/lib/db/models/transcript.model.ts`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | `ObjectId` | yes | `DEFAULT_USER_ID` placeholder (no auth yet) |
| `title` | `string` | yes | Generated default at draft creation (`Meeting on <date/time>`) |
| `status` | `'draft' \| 'saved'` | yes | **[MODIFIED]** narrowed from 4 values — see research.md |
| `aiProcessingStatus` | `'pending' \| 'success' \| 'failed'` | yes | **[NEW]** — defaults `'pending'` at creation |
| `source` | `'manual' \| 'zoom' \| 'ms_teams' \| 'google_meet'` | yes | Defaults `'manual'` for the pasted/uploaded-file flow |
| `externalMeetingId` | `string` | no | Unrelated to this feature; unchanged |
| `webhookPayload` | `unknown` | no | Unrelated to this feature; unchanged |
| `originalTranscript` | `string` | yes | Raw pasted/extracted transcript, written at draft creation |
| `cleanedTranscript` | `string` | no* | Written at draft creation alongside `originalTranscript`; *optional in schema, always populated in practice via `cleanTranscript()` |
| `summary` | `TranscriptSummary` | no | Written after AI success |
| `contact` | `TranscriptContact` | no | Written when the user enters an email pre-approve |
| `leadScore` | `TranscriptLeadScore` | no | Written after AI success |
| `recapEmail` | `RecapEmail` | no | Out of scope (Zoho) — untouched |
| `zohoLeadId` | `string` | no | Out of scope (Zoho) — untouched |

**State transitions**:

```
[create draft]  → status: draft,  aiProcessingStatus: pending
[AI succeeds]   → status: draft,  aiProcessingStatus: success   (summary/leadScore populated)
[AI fails]      → status: draft,  aiProcessingStatus: failed
[user approves] → status: saved,  aiProcessingStatus: success   (only reachable from success)
```

A record can never move to `status: 'saved'` while `aiProcessingStatus !== 'success'` — enforced in the capture-session provider's `approve()`/navigation-gating logic, not the schema (business rule, not a storage constraint).

## Entity: RubricSignal (persistence — unchanged)

`RubricSignalFields{signalId, label, weight: 'hot'|'warm'|'cold', source: 'client'|'proposed', hints: string[], numericWeight: number, isActive: boolean}` — no field changes. Only the repository's storage backend changes (mock store → real Mongoose), per research.md.

## Entity: MeetingRecord (view-model — `src/types/meeting.types.ts`, camelCase remediation)

| Field (before) | Field (after) | Notes |
|---|---|---|
| `lead_score` | `leadScore` | §XVIII remediation |
| `recap_email` | `recapEmail` | §XVIII remediation |
| `summary.meeting_title` | `summary.meetingTitle` | §XVIII remediation |
| `summary.open_questions` | `summary.openQuestions` | §XVIII remediation |
| `summary.next_steps` | `summary.nextSteps` | §XVIII remediation |
| `nextStep.due_date` | `nextStep.dueDate` | §XVIII remediation |
| `leadScore.detected_signals` | `leadScore.detectedSignals` | §XVIII remediation (`src/types/scoring.types.ts`) |
| *(new)* | `aiProcessingStatus` | mirrors the persistence field, used for navigation gating |

`Side` enum values (`'kaffea_x' | 'prospect'`) are left unchanged — string literal values, not object keys.

## Entity: RecentItem (new view-model — recents bar projection)

```ts
interface RecentItem {
  id: string;
  title: string;
  status: 'DRAFT' | 'CRM';
  badge?: 'HOT' | 'WARM' | 'COLD';
  when: string; // display-formatted date/time
}
```

- `status`: `'CRM'` if the source record's `status === 'saved'`, else `'DRAFT'`.
- `badge`: uppercased `leadScore.band` when `aiProcessingStatus === 'success'` and a band exists; omitted otherwise (e.g., still pending, or failed).
- Produced by `toRecentItem()` in `transcript.mapper.ts` from a `StoredTranscript`.

## Context API state: `RubricSignalsProvider`

```ts
interface RubricSignalsContextValue {
  signals: RubricSignal[];          // live rubric signal list (Rubric['signals'] shape)
  banding: BandConfig;              // seeded once from getRubric(), read-only in this context
  addSignal(input: NewSignalInput): Promise<void>;
  updateSignal(id: string, patch: Partial<RubricSignal>): Promise<void>;
  removeSignal(id: string): Promise<void>;
}
```

- Seeded server-side: `<RubricSignalsProvider initialRubric={await getRubric()}>`.
- `addSignal`/`updateSignal`/`removeSignal` are moved verbatim (behaviorally) from the current `workflow-provider.tsx`, calling the existing `createRubricSignal`/`updateRubricSignal`/`deleteRubricSignal` Server Actions and updating local state optimistically.
- Consumed by the capture-session provider's Summarize handler via `useRubricSignals().signals`, mapped through `simplifySignals()` immediately before calling `runAiSummarization`, guaranteeing freshness (research.md).

## Context API state: `RecentsProvider`

```ts
interface RecentsContextValue {
  recents: RecentItem[];
  prependRecent(item: RecentItem): void;
  updateRecent(id: string, patch: Partial<RecentItem>): void;
  refreshRecents(): Promise<void>;
}
```

- Seeded server-side: `<RecentsProvider initialRecents={(await getTranscripts()).map(toRecentItem)}>`.
- `prependRecent` is called immediately after `createDraftTranscript` returns `{id}` (so the new DRAFT item appears in the bar right away, badge omitted).
- `updateRecent` is called after `runAiSummarization` resolves (success → badge appears; failure → item stays DRAFT with no badge) and after `approve()` (status flips to `CRM`).
- `refreshRecents()` is a manual escape hatch (e.g., pull-to-refresh) calling `getTranscripts()` + `toRecentItem` again; not required by any FR but trivial to expose given `getTranscripts()` already exists.

## Validation rules (Zod, Server Action boundaries)

- `createDraftTranscriptSchema`: `{ rawTranscript: z.string().min(1) }`.
- `runAiSummarizationSchema`: `{ id: z.string().min(1), signals: SimplifiedSignalSchema.array() }` (reuses whatever Zod schema already backs `SimplifiedSignal`, or a new minimal one mirroring its shape if none exists yet at the boundary).
- Existing schemas for rubric CRUD and full-record `updateTranscript` are unchanged.
