# Data Model: Zoho CRM Integration

**Feature**: TAE-86 | **Date**: 2026-07-28

## Entities

### ZohoTokenFields (plain type — `src/types/zoho.types.ts`)

Represents the stored Zoho OAuth2 access token. One singleton document in the `zohocredentials` MongoDB collection.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| access_token | string | Yes | The current Zoho OAuth2 access token |
| expires_at | Date | Yes | When the token expires (computed at refresh time) |

**Relationships**: Read/written by `zoho-credential.repository.ts`; consumed by `ZohoAuthService.getAccessToken()`.

### ZohoCredential (Mongoose model — `src/lib/db/models/zoho-credential.model.ts`)

Mongoose schema wrapping `ZohoTokenFields`. Maps to the existing `zohocredentials` collection.

| Field | Schema Type | Required | Notes |
| --- | --- | --- | --- |
| access_token | String | Yes | Zoho-issued bearer token |
| expires_at | Date | Yes | Absolute expiry timestamp |
| createdAt | Date | Auto | Mongoose timestamps |
| updatedAt | Date | Auto | Mongoose timestamps |

**Collection name**: `zohocredentials` (explicit, matching existing collection)
**Document count**: Always exactly 1 (singleton via upsert pattern)

### ZohoLeadRecord (plain type — `src/types/zoho.types.ts`)

Represents a lead record as returned by the Zoho CRM Leads search endpoint. Partial type — only the fields we read.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | string | Yes | Zoho record ID |
| Email | string | Yes | Lead's email (the search key) |
| Full_Name | string | No | Lead's display name |
| Company | string | No | Lead's company |

### CrmMeetingPayload (plain type — `src/types/zoho.types.ts`)

The mapped payload sent to Zoho CRM to update a lead record with meeting data. Field keys are the real Zoho CRM Leads module API names (updated 2026-07-30, superseding the original placeholders).

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| Meeting_Title | string | Yes | Title of the meeting — sent verbatim from `transcript.title` |
| Meeting_Band | string | Yes | Lead score band (hot/warm/cold) |
| Meeting_Score | number | No | Numeric score percentage |
| Meeting_Summary | string | Yes | Narrative summary — sent verbatim from `transcript.summary.narrative` |
| What_We_Heard | string | Yes | Signals heard (joined string) |
| Detected_Signals | string | Yes | Detected signals grouped under a HOT/WARM/COLD heading per each signal's rubric band |
| What_Was_Covered | string | Yes | Topics covered (joined string) |
| What_Was_Decided | string | Yes | Decisions made (joined string) |
| Action_Items | string | Yes | Action items (formatted string) |

**Note**: Only these 9 fields are sent to Zoho. The originally-planned `Meeting_Score_Rationale` and `Meeting_Attendees` fields were dropped 2026-07-30 — they were not in the user-supplied list of real fields to write. The `ZOHO_CRM_FIELD_MAP` constant in `src/constants/zoho-field-map.ts` remains the single place to update if the underlying Zoho custom fields are ever renamed.

### ZohoApiResponse<T> (plain type — `src/types/zoho.types.ts`)

Generic wrapper for Zoho CRM API responses.

| Field | Type | Description |
| --- | --- | --- |
| data | T[] | Array of records returned |
| info | object (optional) | Pagination/metadata |

### ZohoUpdateResponse (plain type — `src/types/zoho.types.ts`)

Response from a Zoho CRM record update call.

| Field | Type | Description |
| --- | --- | --- |
| data | Array<{ code: string; details: { id: string }; message: string; status: string }> | Per-record result |

### ZohoErrorResponse (plain type — `src/types/zoho.types.ts`)

Structured error returned by Zoho API.

| Field | Type | Description |
| --- | --- | --- |
| code | string | Zoho error code (e.g., INVALID_TOKEN, NO_PERMISSION) |
| details | object | Additional error context |
| message | string | Human-readable error message |
| status | string | "error" |

## State Transitions

### Token Lifecycle

```
[No token in DB] → getAccessToken() → POST refresh_token → [Token stored]
[Token stored, not expired] → getAccessToken() → return cached token
[Token stored, expired] → getAccessToken() → POST refresh_token → [Token updated]
[Refresh fails] → throw Error("Failed to authenticate with Zoho API")
```

### CRM Commit Flow

```
[User clicks Approve] → commitToCrm(transcriptId)
  → [Fetch transcript from DB]
  → [Validate contact email exists]
  → [searchLeadByEmail(email)]
    → [Lead found] → [mapMeetingToZohoPayload(transcript)]
      → [updateLead(leadId, payload)]
        → [Success] → [Update transcript.zohoLeadId] → return { success: true }
        → [Failure] → return { success: false, error: "..." }
    → [Lead not found] → return { success: false, error: "No matching lead..." }
  → [Email missing] → return { success: false, error: "No prospect email..." }
```

## Validation Rules

| Rule | Where Applied |
| --- | --- |
| Email must be non-empty string | `searchLeadByEmail()` — throws before API call |
| Record ID must be non-empty string | `updateLead()` — throws before API call |
| Transcript must exist | `commitToCrm()` — returns error if not found |
| Transcript must have contact.email | `commitToCrm()` — returns error if missing |
| All env variables must be present | `env.mjs` — crashes at startup if missing |
| Credentials must be valid | `ZohoAuthService` constructor — throws if missing |

## User Story 4 (UI Polish) — No New Persisted Entities

The Phase 7 UI fixes (toast positioning, Approve loading overlay, CRM confirmation screen content, email-field lock) introduce one new piece of **transient, client-only** state — `isCommitting: boolean` on `WorkflowContextValue` — which is never persisted and exists only for the duration of a single Approve click. No MongoDB schema, Zoho payload, or plain type changes are needed for this story.
