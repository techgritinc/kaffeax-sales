# Implementation Plan: Zoho CRM Integration

**Branch**: `feat/tae-86-zoho-crm-api-client-setup` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/tae-86-zoho-crm-integration/spec.md`

## Summary

Build a self-contained Zoho CRM integration layer under `src/integrations/zoho/` that handles OAuth2 token refresh, lead lookup by email, and lead record updates. A server action in `src/features/crm-commit/` will orchestrate the flow: when a user clicks "Approve" on the Review screen, it collects all meeting data from the transcript record, maps it to Zoho CRM field API names, and writes it to the matching lead via email lookup. The integration follows the same architectural pattern as the reference KX project — singleton auth service, token persistence in the existing `zohocredentials` MongoDB collection, and typed API client classes — adapted to this project's constitution (no barrels, type isolation, repository layer).

## Technical Context

**Language/Version**: TypeScript 5 on Next.js 16 (App Router)

**Primary Dependencies**: mongoose (DB), `@t3-oss/env-nextjs` + zod (env validation). Native `fetch` for Zoho HTTP calls (no axios — project has no axios dependency).

**Storage**: MongoDB via Mongoose — existing `zohocredentials` collection for token persistence, existing `transcripts` collection for meeting data

**Testing**: No testing infrastructure set up yet (per constitution)

**Target Platform**: Node.js server-side (server actions only — no client-side Zoho calls)

**Project Type**: Web application (Next.js App Router)

**Performance Goals**: CRM write completes in under 5 seconds excluding Zoho network latency

**Constraints**: Zoho access tokens expire after ~10 minutes; must refresh before every API call. Field API names are placeholders until user creates custom fields.

**Scale/Scope**: Single-user approval flow; one lead lookup + one lead update per approval action

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| --- | --- | --- |
| §IX Repository Layer | PASS | Zoho credential persistence goes through repository functions; transcript data accessed via repository |
| §X Server Actions & API Layer | PASS | CRM write triggered by a server action; no `/app/api/` routes |
| §XI Type Isolation | PASS | Plain types in `src/types/zoho.types.ts`; Mongoose model in `src/lib/db/models/`; no inline type declarations in model files |
| §XVII No Barrel Imports | PASS | Each file imported directly — no `index.ts` barrels in `integrations/zoho/` |
| §III TypeScript Strictness | PASS | No `any`, no non-null assertions; all types explicit |
| §V Code Modularity | PASS | Auth service, API client, repository, server action each in separate files; 150-line limit respected |
| §XIV Error Handling | PASS | Structured error handling; no bare catches; user-safe messages; sensitive data excluded from logs |
| §I Tech Stack | PASS | Uses native fetch (not axios); no new unvetted dependencies |

## Project Structure

### Documentation (this feature)

```text
specs/tae-86-zoho-crm-integration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── zoho-crm-api.md
└── tasks.md             # Phase 2 output (via /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── types/
│   └── zoho.types.ts                    # Plain Zoho types (token, lead, API response, CRM payload)
├── lib/
│   └── db/
│       └── models/
│           └── zoho-credential.model.ts # Mongoose model for zohocredentials collection
├── integrations/
│   └── zoho/
│       ├── zoho-auth.ts                 # Singleton auth service (token refresh, auth headers)
│       └── zoho-crm-client.ts           # CRM API client (searchLeadByEmail, updateLead)
├── repositories/
│   └── zoho-credential.repository.ts    # getZohoToken, saveZohoToken functions
├── constants/
│   └── zoho-field-map.ts                # CRM field API name mapping (placeholder names)
└── features/
    └── crm-commit/
        └── actions/
            └── commit-to-crm.ts         # Server action: orchestrates approve → CRM write
```

**Structure Decision**: Follows the constitution's directory architecture exactly. Integration layer under `integrations/zoho/` (self-contained, own types/error handling). Repository layer for DB access. Server action under `features/crm-commit/actions/`. Shared types in `src/types/`. Constants in `src/constants/`.

## Complexity Tracking

No constitution violations. No complexity justifications needed.

## Phases

### Phase 1: Environment & Types Foundation

**Files created/modified**:
- `env.mjs` — add Zoho env variables (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORGANIZATION_ID, ZOHO_TOKEN_URL, ZOHO_CRM_API_BASE_URL)
- `.env.development` — add placeholder Zoho env values
- `src/types/zoho.types.ts` — all plain Zoho types

**Details**:
1. Add six new server env variables to the `createEnv` schema in `env.mjs` with Zod validation. All required strings (min length 1). Add to `runtimeEnv` map.
2. Add corresponding placeholder values to `.env.development`.
3. Create `src/types/zoho.types.ts` containing:
   - `ZohoTokenFields` — `{ access_token: string; expires_at: Date }`
   - `ZohoApiResponse<T>` — generic wrapper for Zoho API responses `{ data: T[] }`
   - `ZohoLeadSearchResponse` — typed response from Leads search endpoint
   - `ZohoLeadRecord` — the lead object shape returned by Zoho (id, email, Full_Name, etc.)
   - `ZohoUpdateResponse` — response from record update calls
   - `ZohoErrorResponse` — structured Zoho API error shape
   - `CrmMeetingPayload` — the mapped payload sent to Zoho (using placeholder field API names)

### Phase 2: Token Persistence Layer

**Files created**:
- `src/lib/db/models/zoho-credential.model.ts` — Mongoose model
- `src/repositories/zoho-credential.repository.ts` — repository functions

**Details**:
1. Mongoose model for the existing `zohocredentials` collection. Schema: `access_token` (String, required), `expires_at` (Date, required). Timestamps enabled. Collection name explicitly set to `'zohocredentials'` to match the existing collection.
2. Repository exposes two functions:
   - `getZohoToken(): Promise<ZohoTokenFields | null>` — `findOne().lean()`
   - `saveZohoToken(token: ZohoTokenFields): Promise<ZohoTokenFields | null>` — `findOneAndUpdate({}, token, { upsert: true, new: true }).lean()`
3. Both functions use `withDb()` wrapper from `src/lib/db/withDb.ts` to ensure DB connection.
4. Types imported from `src/types/zoho.types.ts` (type isolation per §XI).

### Phase 3: Auth Service

**Files created**:
- `src/integrations/zoho/zoho-auth.ts` — singleton auth service

**Details**:
1. `ZohoAuthService` class with singleton pattern (`getInstance()`).
2. Constructor loads credentials from `env` (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORGANIZATION_ID, ZOHO_TOKEN_URL).
3. `validateCredentials()` — throws if any required credential is missing.
4. `getAccessToken(): Promise<string>`:
   - Calls `getZohoToken()` from repository
   - If token exists and `expires_at > Date.now() + 60_000` (60-second safety buffer), return cached token
   - Otherwise, POST to ZOHO_TOKEN_URL with `grant_type=refresh_token` + credentials (using native `fetch`, not axios)
   - Compute `expires_at = new Date(Date.now() + expires_in * 1000)`
   - Call `saveZohoToken()` to persist
   - Return fresh access_token
5. `getAuthHeaders(): Promise<Record<string, string>>` — returns `{ Authorization: 'Zoho-oauthtoken <token>' }`
6. `makeAuthenticatedRequest(url, options)` — wraps `fetch` with auth headers injected. Handles JSON responses and error normalization.
7. Exported singleton: `export const zohoAuth = ZohoAuthService.getInstance()`
8. Error handling: catch token refresh failures, log with context (no tokens in logs), throw user-safe error.

### Phase 4: CRM API Client

**Files created**:
- `src/integrations/zoho/zoho-crm-client.ts` — CRM API methods
- `src/constants/zoho-field-map.ts` — field name mapping constants

**Details**:
1. `ZohoCrmClient` class:
   - Constructor takes `baseUrl` (from env ZOHO_CRM_API_BASE_URL, e.g., `https://www.zohoapis.com/crm/v7`)
   - Uses `zohoAuth.makeAuthenticatedRequest()` for all calls
2. Methods:
   - `searchLeadByEmail(email: string): Promise<ZohoLeadRecord | null>`
     - Validates email is non-empty
     - GET `{baseUrl}/Leads/search?email={email}`
     - Returns first match or null on 204/no-data
     - Catches 404 → returns null
   - `updateLead(recordId: string, payload: CrmMeetingPayload): Promise<ZohoUpdateResponse>`
     - Validates recordId is non-empty
     - PUT `{baseUrl}/Leads/{recordId}`
     - Body: `{ data: [payload], trigger: ['workflow'] }`
3. `zoho-field-map.ts`:
   - `ZOHO_CRM_FIELD_MAP` constant object mapping internal field names to Zoho API names
   - All API names are clearly marked as placeholders (e.g., `'Meeting_Summary_Placeholder'`)
   - `mapMeetingToZohoPayload(transcript: TranscriptFields): CrmMeetingPayload` — pure function that transforms transcript data into the CRM payload shape using the field map
4. Exported singleton: `export const zohoCrmClient = new ZohoCrmClient(env.ZOHO_CRM_API_BASE_URL)`

### Phase 5: Server Action (Orchestration)

**Files created**:
- `src/features/crm-commit/actions/commit-to-crm.ts` — server action

**Details**:
1. `'use server'` directive at top.
2. `commitToCrm(transcriptId: string): Promise<{ success: boolean; error?: string }>`:
   - Connect to DB via `withDb`
   - Fetch the transcript record by ID from the Transcript model
   - Validate the transcript has a contact email
   - Call `zohoCrmClient.searchLeadByEmail(contact.email)`
   - If no lead found → return `{ success: false, error: 'No matching lead found in CRM for this email.' }`
   - Call `mapMeetingToZohoPayload(transcript)` to build the CRM payload
   - Call `zohoCrmClient.updateLead(lead.id, payload)`
   - On success: update transcript's `zohoLeadId` field → return `{ success: true }`
   - On failure: catch, log with context, return `{ success: false, error: 'Failed to write meeting data to CRM. Please try again.' }`
3. No raw DB calls (uses repository pattern via Transcript model and Zoho credential repository).
4. All errors caught and returned as structured objects — never thrown to the client.

### Phase 6: Wiring & Validation

**Details**:
1. Verify `npm run type-check` passes (zero type errors).
2. Verify `npm run lint` passes (zero warnings).
3. Verify `npm run build:dev` succeeds.
4. Manual validation: confirm env variables load correctly, token refresh logic works against dev Zoho instance.
