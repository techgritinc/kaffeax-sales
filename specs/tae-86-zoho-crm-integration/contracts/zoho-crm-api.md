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
- **Throws**: `Error("Record ID is required...")` if empty; re-throws Zoho API errors
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
  1. Fetch transcript by ID
  2. Extract contact email
  3. Search lead by email via `zohoCrmClient`
  4. Map transcript to CRM payload via `mapMeetingToZohoPayload()`
  5. Update lead via `zohoCrmClient`
  6. Store `zohoLeadId` on the transcript record
  7. Return success/failure

## 4. Repository Functions

**Module**: `src/repositories/zoho-credential.repository.ts`

### getZohoToken()

- **Returns**: `Promise<ZohoTokenFields | null>`
- **DB**: `zohocredentials.findOne()`

### saveZohoToken(token)

- **Params**: `token: { access_token: string; expires_at: Date }`
- **Returns**: `Promise<ZohoTokenFields | null>`
- **DB**: `zohocredentials.findOneAndUpdate({}, token, { upsert: true, new: true })`

## 5. Mapping Function

**Module**: `src/constants/zoho-field-map.ts`

### mapMeetingToZohoPayload(transcript)

Pure function — transforms a `TranscriptFields` record into a `CrmMeetingPayload`.

- **Params**: `transcript: TranscriptFields` — the full transcript record
- **Returns**: `CrmMeetingPayload` — the Zoho-ready payload with placeholder API names
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
