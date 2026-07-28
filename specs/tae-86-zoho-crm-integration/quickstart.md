# Quickstart Validation Guide: Zoho CRM Integration

**Feature**: TAE-86 | **Date**: 2026-07-28

## Prerequisites

1. **Zoho CRM dev environment** — active organization with Leads module
2. **OAuth2 credentials** — client ID, client secret, and refresh token for the dev Zoho app
3. **At least one lead** in the dev CRM with a known email address
4. **MongoDB** — running instance with the `zohocredentials` collection accessible
5. **Environment variables** — all Zoho env vars populated in `.env.development`

## Setup

1. Add Zoho environment variables to `.env.development`:

```
ZOHO_CLIENT_ID=<your-client-id>
ZOHO_CLIENT_SECRET=<your-client-secret>
ZOHO_REFRESH_TOKEN=<your-refresh-token>
ZOHO_ORGANIZATION_ID=<your-org-id>
ZOHO_TOKEN_URL=https://accounts.zoho.com/oauth/v2/token
ZOHO_CRM_API_BASE_URL=https://www.zohoapis.com/crm/v7
```

2. Start the dev server:

```bash
npm run dev
```

3. Verify startup succeeds — if any Zoho env var is missing, the server will crash immediately with a validation error (this is expected — fail-fast per `env.mjs`).

## Validation Scenarios

### V1: Environment Validation (Fail-Fast)

**Goal**: Confirm `env.mjs` rejects missing Zoho variables.

1. Remove `ZOHO_CLIENT_ID` from `.env.development`
2. Run `npm run dev`
3. **Expected**: Server crashes with a Zod validation error listing `ZOHO_CLIENT_ID` as invalid
4. Restore the variable

### V2: Token Refresh

**Goal**: Confirm the auth service obtains and caches a valid access token.

1. Ensure `zohocredentials` collection is empty (or has an expired token)
2. Trigger any action that calls `zohoAuth.getAccessToken()` (e.g., the CRM commit server action)
3. **Expected**: A new document appears in `zohocredentials` with `access_token` (non-empty string) and `expires_at` (future Date)
4. Trigger the same action again within 60 seconds
5. **Expected**: The token is reused (no new refresh POST to Zoho)

### V3: Lead Search by Email

**Goal**: Confirm the CRM client finds a lead by email.

1. Pick a lead email that exists in the dev Zoho CRM
2. Call the server action `commitToCrm` with a transcript whose `contact.email` matches that lead
3. **Expected**: The lead is found, the server action proceeds to the update step

### V4: Lead Not Found

**Goal**: Confirm graceful handling when no lead matches.

1. Create or use a transcript with `contact.email` set to `nonexistent@example.com`
2. Call `commitToCrm` with that transcript ID
3. **Expected**: Returns `{ success: false, error: "No matching lead found in CRM for this email." }`

### V5: Full Approve Flow (End-to-End)

**Goal**: Confirm the complete flow from approve to CRM write.

1. Have a transcript in `draft` status with:
   - `contact.email` matching a real lead in dev CRM
   - Populated `summary`, `leadScore`, and other fields
2. Call `commitToCrm(transcriptId)`
3. **Expected**:
   - Lead found by email
   - Meeting data mapped and sent to Zoho
   - If CRM fields exist: lead record updated (verify in Zoho UI)
   - If CRM fields are still placeholders: Zoho may reject with "invalid field" — this is expected until real API names are configured
   - Transcript's `zohoLeadId` field is updated with the Zoho record ID
   - Returns `{ success: true }`

### V6: Validation Pipeline

**Goal**: Confirm all code passes the project's quality gates.

```bash
npm run validate
```

**Expected**: Zero type errors, zero lint warnings, build succeeds.

## Placeholder Field Names

The CRM update will use placeholder field API names (e.g., `Meeting_Summary_Placeholder`). These will cause a Zoho rejection until the real custom fields are created on the Leads module and the `ZOHO_CRM_FIELD_MAP` in `src/constants/zoho-field-map.ts` is updated. This is documented and expected — the integration is structurally complete; only the field name constants need swapping.
