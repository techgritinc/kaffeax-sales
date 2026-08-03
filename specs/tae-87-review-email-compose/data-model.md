# Data Model: Review Email Compose

**Feature**: [spec.md](spec.md) | **Date**: 2026-08-03 (v3 — revised for mailto plain-text approach)

## Overview

This feature does not introduce new entities, types, or database changes. The email content is generated on-the-fly from the existing `MeetingRecord` data structure at button-click time. The formatter utility returns a simple `{ subject: string, body: string }` object literal — no new type file is needed.

## Existing Entities Used (Read-Only)

### MeetingRecord

Source: `src/types/meeting.types.ts`

The top-level object passed to the Review screen as the `draft` prop. The email formatter reads from its nested fields.

| Field | Type | Used By Email Formatter |
|-------|------|------------------------|
| `summary.meetingTitle` | `string` | Subject line |
| `summary.narrative` | `string` | Summary section body |
| `summary.attendees` | `Attendee[]` | Sign-off (KaffaX-side rep name) |
| `summary.topics` | `string[]` | "WHAT WAS COVERED" section |
| `summary.decisions` | `string[]` | "WHAT WAS DECIDED" section |
| `summary.nextSteps` | `NextStep[]` | Action Items section |
| `summary.commitments` | `Commitment[]` | Action Items section |
| `leadScore.detectedSignals` | `DetectedSignal[]` | "WHAT WE HEARD" section |

### Excluded Fields (per FR-013)

| Field | Type | Reason for Exclusion |
|-------|------|---------------------|
| `leadScore.band` | `Band` | Internal sales metric |
| `leadScore.scorePercentage` | `number` | Internal sales metric |
| `leadScore.rationale` | `string` | Internal AI reasoning |

### Supporting Types

| Type | Key Fields | Purpose in Email |
|------|------------|-----------------|
| `Attendee` | `name: string`, `side: Side` | Extract KaffaX rep name for sign-off |
| `NextStep` | `description: string`, `owner: string`, `dueDate: string` | Render action item rows |
| `Commitment` | `side: Side`, `description: string` | Render commitment rows |
| `DetectedSignal` | `label: string`, `weight: Weight` | Group signals by Hot/Warm/Cold |
| `Weight` | `'hot' \| 'warm' \| 'cold'` | Signal categorization label |

### RecapEmail (Existing — Not Modified)

Source: `src/types/meeting.types.ts`

```
interface RecapEmail {
  subject: string;
  body: string;
}
```

This field exists on `MeetingRecord` but is **not used** by the new implementation. The stored `recapEmail` in the database (`TranscriptFields.recapEmail: string | null`) is always `null` in the current codebase. The new email formatter generates content directly from the other `MeetingRecord` fields, bypassing `recapEmail` entirely.

## New Types

None. The formatter returns a plain `{ subject: string, body: string }` object. Creating a dedicated type file for a two-field return value would be over-engineering — the return type is inlined in the function signature.

## Data Flow

```
MeetingRecord (existing, in-memory)
  → email-formatter.ts (pure function)
    → { subject: string, body: string }
      → window.location.href = `mailto:?subject=${encoded}&body=${encoded}`
        → Mail client opens compose window
          → User adds recipients, sends
```

No database reads, writes, or API calls are involved. The entire flow is client-side and synchronous.
