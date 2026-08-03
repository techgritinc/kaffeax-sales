# Contract: Zoho CRM API Interface

**Feature**: TAE-86 | **Date**: 2026-07-28

## Overview

This contract defines the interfaces exposed by the Zoho CRM integration layer. All Zoho communication flows through these interfaces — no direct Zoho HTTP calls exist outside `src/integrations/zoho/`.

## 1. ZohoAuthService (Singleton)

**Module**: `src/integrations/zoho/zoho-auth.ts`
**Export**: `zohoAuth` (singleton instance)

### getAccessToken()

Returns a valid Zoho access token, refreshing if expired.

- **Returns**: `Promise<string>` — a valid access token
- **Throws**: `Error("Failed to authenticate with Zoho API")` when refresh fails
- **Side effect**: Persists new token to MongoDB on refresh

### getAuthHeaders()

Returns headers ready to inject into a Zoho API request.

- **Returns**: `Promise<Record<string, string>>` — `{ Authorization: 'Zoho-oauthtoken <token>' }`

### makeAuthenticatedRequest(url, options)

Wraps `fetch` with automatic auth header injection.

- **Params**:
  - `url: string` — full Zoho API URL
  - `options?: { method?: string; body?: unknown; headers?: Record<string, string> }`
- **Returns**: `Promise<Response>` — the raw fetch Response
- **Throws**: On network failure or auth failure

## 2. ZohoCrmClient (Singleton)

**Module**: `src/integrations/zoho/zoho-crm-client.ts`
**Export**: `zohoCrmClient` (singleton instance)

### searchLeadByEmail(email)

Finds a lead in Zoho CRM by email address.

- **Params**: `email: string` — prospect email (must be non-empty)
- **Returns**: `Promise<ZohoLeadRecord | null>` — the matching lead, or null if not found
- **Throws**: `Error("Email is required...")` if email is empty; re-throws non-404 Zoho errors
- **Zoho endpoint**: `GET /crm/v7/Leads/search?email={email}`

### updateLead(recordId, payload)

Updates a lead record with meeting data.

- **Params**:
  - `recordId: string` — Zoho lead record ID (must be non-empty)
  - `payload: CrmMeetingPayload` — mapped meeting data
- **Returns**: `Promise<ZohoUpdateResponse>`
- **Throws**:
  - `Error("Record ID is required...")` if empty
  - `Error("Failed to update lead in CRM")` if the HTTP response is not `ok`
  - `Error("Failed to update lead in CRM")` if the HTTP response **is** `ok` but the per-record `data[0].status !== 'success'` (fixed 2026-07-30 — Zoho returns HTTP 200 even for logical rejections like an invalid picklist value or a workflow rule block; this must not be mistaken for success)
- **Zoho endpoint**: `PUT /crm/v7/Leads/{recordId}`
- **Request body**: `{ data: [payload], trigger: ['workflow'] }`

## 3. Server Action

**Module**: `src/features/crm-commit/actions/commit-to-crm.ts`

### commitToCrm(transcriptId)

Orchestrates the full CRM write flow from the Review screen's Approve button.

- **Params**: `transcriptId: string` — MongoDB ObjectId of the transcript
- **Returns**: `Promise<{ success: boolean; error?: string }>`
- **Never throws** — all errors returned in the response object
- **Flow**:
  1. Fetch transcript via `transcriptRepository.findById(transcriptId)` (repository layer only — no direct Mongoose model calls, per §IX)
  2. Extract contact email
  3. Search lead by email via `zohoCrmClient`
  4. Fetch active rubric signals via `rubricSignalRepository.findActive()` and build a `signalWeights` map (signal id → band)
  5. Map transcript to CRM payload via `mapMeetingToZohoPayload(transcript, signalWeights)`
  6. Update lead via `zohoCrmClient` (throws on a Zoho-level rejection, not just an HTTP-level one — see `updateLead`)
  7. On success only: `transcriptRepository.update(transcriptId, { status: 'saved', zohoLeadId })`
  8. Return success/failure — on any failure, the transcript's status is left untouched (remains `draft`)
- **Caller**: `runApprove` in `src/features/workflow/hooks/workflow-actions.utils.ts` — the Review screen is read-only (no client-side edits), so this action always operates on the transcript's current persisted state, never a client-supplied payload.

## 4. Repository Functions

**Module**: `src/repositories/zoho-credential.repository.ts`

(This feature also depends on two pre-existing, non-Zoho-specific repositories it does not own: `transcriptRepository` — `findById`/`update` — and `rubricSignalRepository.findActive()`, used by `commitToCrm` to read the transcript and build the per-signal band lookup for `Detected_Signals`.)

### getZohoToken()

- **Returns**: `Promise<ZohoTokenFields | null>`
- **DB**: `zohocredentials.findOne()`

### saveZohoToken(token)

- **Params**: `token: { access_token: string; expires_at: Date }`
- **Returns**: `Promise<ZohoTokenFields | null>`
- **DB**: `zohocredentials.findOneAndUpdate({}, token, { upsert: true, new: true })`

## 5. Mapping Function

**Module**: `src/constants/zoho-field-map.ts`

### mapMeetingToZohoPayload(transcript, signalWeights)

Pure function — transforms a `TranscriptFields` record + per-signal band lookup into a `CrmMeetingPayload`.

- **Params**:
  - `transcript: TranscriptFields` — the full transcript record
  - `signalWeights: Record<string, LeadScoreBand>` — signal id → current rubric band; the transcript's own `detectedSignals` carry no per-signal band, so the caller must supply this from the active rubric
- **Returns**: `CrmMeetingPayload` — the Zoho-ready payload, keyed by the real field API names in `ZOHO_CRM_FIELD_MAP` (as of 2026-07-30):

  | Semantic key | Zoho API name | Source |
  |---|---|---|
  | `meetingTitle` | `Meeting_Title` | `transcript.title`, verbatim |
  | `meetingBand` | `Meeting_Band` | `transcript.leadScore.band` |
  | `meetingScore` | `Meeting_Score` | `transcript.leadScore.scorePercentage` |
  | `meetingSummary` | `Meeting_Summary` | `transcript.summary.narrative`, verbatim |
  | `meetingWhatWeHeard` | `What_We_Heard` | `transcript.summary.whatWeHeard`, newline-joined |
  | `meetingDetectedSignals` | `Detected_Signals` | Grouped by band under a `HOT`/`WARM`/`COLD` heading, using `signalWeights` |
  | `meetingWhatWasCovered` | `What_Was_Covered` | `transcript.summary.whatWasCovered`, newline-joined |
  | `meetingWhatWasDecided` | `What_Was_Decided` | `transcript.summary.whatWasDecided`, newline-joined |
  | `meetingActionItems` | `Action_Items` | `transcript.summary.actionItems`, formatted list |

  No other fields are sent (the earlier placeholder-era `meetingScoreRationale` and `meetingAttendees` fields were dropped 2026-07-30).
- **Side effects**: None
- **Deterministic**: Yes

## Error Response Shapes

### Server Action Error (returned to client)

```typescript
{ success: false, error: "No matching lead found in CRM for this email." }
{ success: false, error: "No prospect email found on this meeting record." }
{ success: false, error: "Failed to write meeting data to CRM. Please try again." }
{ success: false, error: "Meeting record not found." }
```

### Internal Zoho Error (logged server-side only)

```typescript
{
  code: "INVALID_DATA",
  details: { expected_data_type: "jsonobject" },
  message: "the id given seems to be invalid",
  status: "error"
}
```
