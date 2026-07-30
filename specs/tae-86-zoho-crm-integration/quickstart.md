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
ZOHO_TOKEN_URL=https://accounts.zoho.com/oauth/v2/token
ZOHO_CRM_API_BASE_URL=https://www.zohoapis.com/crm/v7
```

(`ZOHO_ORGANIZATION_ID` was removed 2026-07-30 — unused by any Zoho CRM v7 call this integration makes.)

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
   - Meeting data mapped (using the real field API names in `ZOHO_CRM_FIELD_MAP`) and sent to Zoho
   - Lead record updated (verify in Zoho UI) — `Meeting_Title`, `Meeting_Band`, `Meeting_Score`, `Meeting_Summary`, `What_We_Heard`, `Detected_Signals`, `What_Was_Covered`, `What_Was_Decided`, `Action_Items`
   - If Zoho rejects any field (e.g., a picklist type mismatch on a custom field), this is now surfaced correctly as a failure (2026-07-30 fix) — `commitToCrm` inspects the per-record `status` even on an HTTP 200 response, so a rejection is never mistaken for success
   - Transcript's `zohoLeadId` field is updated with the Zoho record ID
   - Returns `{ success: true }`

### V7: Approve Wiring End-to-End (Read-Only Review + Status Gating)

**Goal**: Confirm the Review screen is read-only and that Approve only marks a transcript `saved` when the CRM write actually succeeds.

1. Open a **draft** transcript on the Review screen — confirm only the prospect email field is editable; every other field (summary, score, signals, action items) is read-only, and Approve/Reject are the only actions.
2. With a transcript whose email matches a real dev-CRM lead, click Approve → confirm the transcript's status becomes `saved` in the DB and it moves to the "Saved to CRM" group in the sidebar.
3. With a transcript whose email does **not** match any lead, click Approve → confirm a "No matching lead found" error toast appears, the transcript's status remains `draft`, and it stays in the "Drafts" group.
4. Click Approve again on the same failed transcript → confirm the full flow (token check → search → update) re-runs without needing a page reload or special retry action.

### V8: Toast Positioning Stability

**Goal**: Confirm toasts no longer visibly shift after appearing.

1. Trigger a failure toast (Approve with a non-matching email) and a success toast (Approve with a matching lead) in separate runs.
2. **Expected**: In both cases, the toast appears already centered in its final position — no visible leftward-then-rightward jump immediately after it renders.

### V9: Approve Loading Overlay & Auto-Navigation

**Goal**: Confirm the full-viewport spinner overlay appears during the CRM write and gates navigation correctly on success vs. failure.

1. Click Approve on a transcript with a valid, matching email.
2. **Expected**: A full-viewport overlay with a green rotating spinner (no text) appears immediately; clicking anywhere on the page (including outside the spinner) has no effect while it's showing.
3. **Expected**: Once the write completes, the overlay disappears and the app automatically lands on the CRM confirmation ("commit") screen.
4. Repeat with a transcript whose email doesn't match any lead.
5. **Expected**: The overlay appears and disappears the same way, but the app stays on the Review screen and shows the failure toast — no navigation to the confirmation screen.

### V10: CRM Confirmation Screen Content

**Goal**: Confirm the confirmation screen shows only real, captured data.

1. Open the CRM confirmation screen for a just-approved meeting.
2. **Expected**: The heading shows the meeting's title (not "Unnamed company"); only the band badge is shown (no "Saved to CRM" pill); the contact line shows `{name} · {email}` with no job-title text.

### V11: Email Field Lock on Saved Meetings

**Goal**: Confirm the prospect email field is only editable before a meeting is saved to CRM.

1. Open an already-saved (`status: 'saved'`) meeting via "Open in Review" from the confirmation screen.
2. **Expected**: The prospect email field is disabled and cannot be typed into.
3. Start a new capture and reach the Review screen for a fresh draft.
4. **Expected**: The prospect email field is fully editable, unaffected by Scenario 1.

### V6: Validation Pipeline

**Goal**: Confirm all code passes the project's quality gates.

```bash
npm run validate
```

**Expected**: Zero type errors, zero lint warnings, build succeeds.

## CRM Field API Names (real, as of 2026-07-30)

`ZOHO_CRM_FIELD_MAP` in `src/constants/zoho-field-map.ts` now uses the real Zoho Leads module field API names supplied by the user, superseding the earlier placeholders: `Meeting_Title`, `Meeting_Band`, `Meeting_Score`, `Meeting_Summary`, `What_We_Heard`, `Detected_Signals`, `What_Was_Covered`, `What_Was_Decided`, `Action_Items`. Only these 9 fields are sent — no rationale or attendees field is written. If the Leads module's custom fields are ever renamed, this is still the single file to update.
