# Data Model: Transcript Schema & Database Connection Layer

**Date**: 2026-07-22 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Entity Overview

```
┌─────────────┐         ┌──────────────────┐
│   users      │ 1 ── * │   transcripts     │
│  (existing)  │         │                  │
└─────────────┘         └──────┬───────────┘
                               │ embeds
                    ┌──────────┴──────────┐
                    │  summary            │
                    │  leadScore          │
                    │    └ detectedSignals │──snapshot──┐
                    │  contact            │            │
                    └─────────────────────┘            │
                                                       │
                    ┌──────────────────┐               │
                    │  rubricSignals    │◄──────────────┘
                    │                  │  (signalId + label snapshot)
                    └──────────────────┘
```

**Relationships**:
- `transcripts.userId` → `users._id` (many-to-one, referential)
- `transcripts.leadScore.detectedSignals[].id` → `rubricSignals.signalId` (soft reference via slug; label is snapshotted at detection time, not joined)

---

## Entity: Transcript

**Collection**: `transcripts`

**Description**: One document per call recording / transcript processing job. Stores the raw transcript, AI-cleaned transcript, structured summary, contact signal, lead score, and recap email — all embedded in a single document.

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | auto-generated | Primary key |
| `userId` | ObjectId | yes | — | Reference to `users._id`; owner of this transcript |
| `title` | String | yes | — | Display title (e.g., "Discovery call — Cascade Ember") |
| `status` | String | yes | `"processing"` | Lifecycle state; see State Transitions below |
| `source` | String | yes | — | Ingestion origin; see Enum Values below |
| `externalMeetingId` | String | no | `null` | Vendor meeting ID for webhook-triggered transcripts; `null` for manual uploads |
| `webhookPayload` | Mixed/Object | no | `null` | Raw vendor webhook body; stored for debug/replay |
| `originalTranscript` | String | yes | — | Verbatim transcript text (manual paste or vendor-provided) |
| `cleanedTranscript` | String | no | `""` | AI-cleaned/formatted version; empty until AI processing completes |
| `summary` | Object | no | `{}` | Structured summary; see Embedded: Summary below |
| `contact` | Object | no | `{}` | Extracted contact signal; see Embedded: Contact below |
| `leadScore` | Object | no | `{}` | AI lead scoring result; see Embedded: LeadScore below |
| `recapEmail` | String | no | `null` | AI-generated recap email body |
| `zohoLeadId` | String | no | `null` | Zoho CRM record ID; populated when pushed to CRM |
| `createdAt` | Date | auto | auto (Mongoose timestamps) | Document creation time |
| `updatedAt` | Date | auto | auto (Mongoose timestamps) | Last modification time |

### Embedded: Summary

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `narrative` | String | no | `""` | One-paragraph AI summary of the entire call |
| `whatWeHeard` | String[] | no | `[]` | Key signals/observations from the prospect's side |
| `whatWasCovered` | String[] | no | `[]` | Topics that came up during the call |
| `whatWasDecided` | String[] | no | `[]` | Decisions reached on the call |
| `actionItems` | ActionItem[] | no | `[]` | See Embedded: ActionItem below |
| `attendees` | Attendee[] | no | `[]` | See Embedded: Attendee below |

### Embedded: ActionItem

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | String | yes | What needs to be done |
| `owner` | String | yes | Person responsible (e.g., "Mohan", "prospect", team member name) |
| `dueDate` | String | no | Natural language due date (e.g., "by Monday", "next week") |

### Embedded: Attendee

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | yes | Attendee name |
| `side` | String | yes | Which party they represent: `"kaffea_x"` or `"prospect"` |

### Embedded: Contact

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | String | no | Extracted contact email address |

### Embedded: LeadScore

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `band` | String | no | — | Scoring classification: `"hot"`, `"warm"`, or `"cold"` |
| `detectedSignals` | DetectedSignal[] | no | `[]` | Signals found in the transcript |
| `rationale` | String | no | `""` | Human-readable scoring explanation |

### Embedded: DetectedSignal

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | yes | Stable slug matching `rubricSignals.signalId` |
| `label` | String | yes | Snapshot of signal label at detection time (decoupled from future edits) |
| `evidence` | String | yes | Transcript excerpt that triggered this signal |

### Enum Values

**`status`**: `"processing"` | `"draft"` | `"saved"` | `"failed"`

**`source`**: `"manual"` | `"zoom"` | `"ms_teams"` | `"google_meet"`

**`attendees[].side`**: `"kaffea_x"` | `"prospect"`

**`leadScore.band`**: `"hot"` | `"warm"` | `"cold"`

### State Transitions

```
manual upload ─────→ "processing" ──→ "draft" ──→ "saved"
                                   ↘ "failed"

webhook trigger ───→ "processing" ──→ "draft" ──→ "saved"
                                   ↘ "failed"
```

- `processing` → `draft`: AI pipeline completes successfully
- `processing` → `failed`: AI pipeline errors; `originalTranscript` is preserved
- `draft` → `saved`: User reviews and commits; `zohoLeadId` is populated

### Indexes

| Index | Fields | Properties | Purpose |
|-------|--------|------------|---------|
| Status list | `{ userId: 1, status: 1, createdAt: -1 }` | compound | Primary list query: user's transcripts filtered by status, newest first |
| Chronological | `{ userId: 1, createdAt: -1 }` | compound | All transcripts for a user, chronological |
| Webhook dedup | `{ externalMeetingId: 1 }` | sparse, unique | Idempotent webhook processing; null values excluded by sparse |
| CRM lookup | `{ zohoLeadId: 1 }` | sparse | Look up transcript by Zoho CRM record ID |

### Validation Rules

- `userId` must be a valid ObjectId (referential integrity to `users` collection)
- `title` must be non-empty
- `status` must be one of the defined enum values
- `source` must be one of the defined enum values
- `originalTranscript` must be non-empty (every transcript must have raw text)
- `externalMeetingId` uniqueness is enforced by the sparse unique index (duplicates rejected at DB level)

---

## Entity: RubricSignal

**Collection**: `rubricSignals`

**Description**: Stores lead-scoring rubric signals that the AI uses to classify calls. Signals are fetched from the database so the rubric can be modified without code changes.

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | auto-generated | Primary key |
| `signalId` | String | yes | — | Stable slug identifier (e.g., `"distribution_pipeline_challenge"`) |
| `label` | String | yes | — | Human-readable label shown in the UI |
| `weight` | String | yes | — | Scoring band: `"hot"`, `"warm"`, or `"cold"` |
| `source` | String | yes | — | Origin: `"client"` (provided by client) or `"proposed"` (suggested by team) |
| `hints` | String[] | no | `[]` | Keyword/phrase hints for signal detection in transcripts |
| `isActive` | Boolean | yes | `true` | `false` = soft-deleted / temporarily disabled |
| `createdAt` | Date | auto | auto (Mongoose timestamps) | Document creation time |
| `updatedAt` | Date | auto | auto (Mongoose timestamps) | Last modification time |

### Enum Values

**`weight`**: `"hot"` | `"warm"` | `"cold"`

**`source`**: `"client"` | `"proposed"`

### Indexes

| Index | Fields | Properties | Purpose |
|-------|--------|------------|---------|
| Signal ID | `{ signalId: 1 }` | unique | Upsert key; prevents duplicate signal slugs |
| Weight filter | `{ weight: 1 }` | — | Filter signals by scoring band |
| Active filter | `{ isActive: 1 }` | — | Filter to active signals only |

### Validation Rules

- `signalId` must be non-empty and unique (enforced by unique index)
- `label` must be non-empty
- `weight` must be one of the defined enum values
- `source` must be one of the defined enum values

---

## Entity: User (existing — read-only reference)

**Collection**: `users`

**Description**: Already exists in the shared MongoDB database, owned by the Kaffea-X web application. This feature does NOT create, modify, or migrate this collection. Transcripts reference users by `_id`.

### Referenced Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key; referenced by `transcripts.userId` |

**Note**: No Mongoose model is created for `users` in this feature. The `userId` field on transcripts stores a raw ObjectId reference. If a `User` model is introduced by a future feature, the `ref` option on `userId` can be added to enable Mongoose population.
