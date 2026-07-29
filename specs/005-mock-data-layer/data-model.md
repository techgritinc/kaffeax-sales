# Phase 1 Data Model: Mock Data Layer with Server Actions

This feature adds **no new persisted entities**. It reorganizes existing data around the two authoritative MongoDB models and defines the mapping between the persisted shape and the retained UI view-models.

## Authoritative persisted entities (source of truth = `src/lib/db/models`)

### Transcript (`TranscriptFields` — `src/types/transcript.types.ts`)

| Field | Type | Notes |
|---|---|---|
| `userId` | `string` | Mock uses a fixed demo owner id. |
| `title` | `string` | ← view `summary.meeting_title`. |
| `status` | `'processing' \| 'draft' \| 'saved' \| 'failed'` | `saved` == committed to CRM. |
| `source` | `'manual' \| 'zoom' \| 'ms_teams' \| 'google_meet'` | Seed uses `zoom`/`manual`. |
| `externalMeetingId` | `string \| null` | |
| `webhookPayload` | `unknown` | `null` in mock. |
| `originalTranscript` | `string` | The raw transcript text (e.g. `SAMPLE`). |
| `cleanedTranscript` | `string` | |
| `summary` | `TranscriptSummary` | `narrative`, `whatWeHeard[]`, `whatWasCovered[]`, `whatWasDecided[]`, `actionItems[]`, `attendees[]`. |
| `contact` | `{ email?: string }` | **Only email is modeled.** |
| `leadScore` | `{ band?, detectedSignals[], rationale }` | `detectedSignals` = `{id,label,evidence}` (no weight). |
| `recapEmail` | `string \| null` | Single string (no subject/body split). |
| `zohoLeadId` | `string \| null` | Set when committed. |
| timestamps | `createdAt`, `updatedAt` | From Mongoose `timestamps: true`. |

Enums: `TRANSCRIPT_STATUSES`, `TRANSCRIPT_SOURCES`, `ATTENDEE_SIDES = ['kaffeax','prospect']`, `LEAD_SCORE_BANDS`.

### RubricSignal (`RubricSignalFields` — `src/types/rubric-signal.types.ts`)

| Field | Type | Notes |
|---|---|---|
| `signalId` | `string` | ← view `RubricSignal.id`. |
| `label` | `string` | |
| `weight` | `'hot' \| 'warm' \| 'cold'` | |
| `source` | `'client' \| 'proposed'` | |
| `hints` | `string[]` | |
| `isActive` | `boolean` | Mock seeds `true`. |
| timestamps | `createdAt`, `updatedAt` | |

## Retained view-models (Q1 — consumed by UI, unchanged)

`MeetingRecord`, `Contact`/`ConfidentField`, `Summary`, `NextStep`, `Commitment`, `RecapEmail` (`meeting.types.ts`); `Rubric`, `RubricSignal`, `Weight` (`rubric.types.ts`); `DetectedSignal`, `LeadScore` (`scoring.types.ts`); `CrmRecord`, `AuditEntry`, `ChatMessage`, `Step`, `Toast`, `WorkflowStatus` (`workflow.types.ts`).

## Presentation supplement (view-only fields not in the schema)

Carried in the mock transcript fixtures, isolated from the persisted fields; Mongoose-free type declared beside the persistence type. Reconstructs the view-model on read.

| Supplement field | Feeds view-model | Why not persisted |
|---|---|---|
| `contact.name / company / title` (+ `confidence` per contact field) | `MeetingRecord.contact.*` | Schema models `contact.email` only. |
| `summary.topics`, `summary.openQuestions`, `summary.commitments` | `Summary.topics / open_questions / commitments` | Not in `TranscriptSummary`. |
| `recapSubject` | `RecapEmail.subject` | `recapEmail` is a single string. |
| `when` (display timestamp string, e.g. "Yesterday · 4:22 PM") | `MeetingRecord.when` | Display-only; schema uses real timestamps. |

`detected_signals[].weight` is **not** supplemented — the mapper re-derives it from the active rubric by `signalId` (already the pattern in `seed.ts`).

## Mapping contract (persistence ↔ view-model)

`transcript.mapper.ts` — `toMeetingRecord(t: TranscriptFields + supplement, rubric): MeetingRecord` and `toTranscript(r: MeetingRecord): TranscriptFields + supplement`:

| view-model (`MeetingRecord`) | persistence (`TranscriptFields`) / supplement |
|---|---|
| `id` | store key / `_id` |
| `when` | supplement `when` |
| `committed` | `status === 'saved'` |
| `band` | `leadScore.band` |
| `contact.email.value` | `contact.email`; other contact fields ← supplement |
| `summary.meeting_title` | `title` |
| `summary.narrative` | `summary.narrative` |
| `summary.attendees[].side` | `summary.attendees[].side` with `kaffea_x ↔ kaffeax` normalization |
| `summary.next_steps[]` (`description`,`owner`,`due_date`) | `summary.actionItems[]` (`description`,`owner`,`dueDate`) |
| `summary.decisions` | `summary.whatWasDecided` |
| `summary.topics` / `open_questions` / `commitments` | supplement |
| `lead_score.detected_signals[]` | `leadScore.detectedSignals[]` (+ weight re-derived from rubric) |
| `lead_score.rationale` | `leadScore.rationale` |
| `recap_email.body` | `recapEmail` |
| `recap_email.subject` | supplement `recapSubject` |

`rubric.mapper.ts` — `toRubric(signals: RubricSignalFields[]): Rubric` (`signalId→id`, drop `isActive`/timestamps, attach the constant banding string) and `toRubricSignals(r: Rubric): RubricSignalFields[]` (`id→signalId`, `isActive: true`).

## Derived projection: CRM record (no model)

`CrmRecord` is produced from a committed `Transcript` (`status === 'saved'`): `{ id, contact, band, rationale, recap, nextSteps, at }` are read off the mapped `MeetingRecord`. Committing = `updateTranscript(id, { status:'saved', zohoLeadId })`; the commit view lists the projection. Not stored separately.

## Session-only concepts (no model, unchanged)

`AuditEntry`, `ChatMessage` remain ephemeral client state. `cannedResponse()` remains mock business logic.

## State transitions (Transcript.status)

```
(new capture) --process--> processing --engine done--> draft
draft --approve/commit--> saved   (sets zohoLeadId; appears in CRM projection)
draft --reject--> (deleted from store)
saved --approve(update)--> saved  (re-write)
```

## Validation rules

- Enum values constrained to the model enums; `band`/`weight`/`side`/`status`/`source` validated on write in the mapper/action.
- Read-by-unknown-id returns `null` (never throws) — DB-consistent (FR-010, Edge Cases).
- No `any`; all mapper inputs/outputs concretely typed.
