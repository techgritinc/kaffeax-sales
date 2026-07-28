# Tasks: Zoho CRM Integration

**Input**: Design documents from `specs/tae-86-zoho-crm-integration/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/zoho-crm-api.md, quickstart.md

**Tests**: Not included — no testing infrastructure set up in this project.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Note that US2 (Token Refresh) and US3 (Lead Lookup) are foundational prerequisites that US1 (Approve & Push) depends on, so they are placed in the Foundational phase rather than as separate story phases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Environment & Types)

**Purpose**: Register Zoho environment variables and create all shared type definitions so subsequent phases can import them.

- [x] T001 Add Zoho server environment variables (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORGANIZATION_ID, ZOHO_TOKEN_URL, ZOHO_CRM_API_BASE_URL) to the `createEnv` schema and `runtimeEnv` map in `env.mjs`

  **Details**: Add six new entries to the `server` object, each as `z.string().min(1)`. Add matching entries to `runtimeEnv` referencing `process.env.ZOHO_*`. Reference the existing pattern used by `CLAUDE_API_KEY` and `OPENROUTER_API_KEY` in the same file.

- [x] T002 [P] Add placeholder Zoho environment variable values to `.env.development`

  **Details**: Append a `# Zoho CRM` section with all six variables. Use descriptive placeholder values (e.g., `ZOHO_CLIENT_ID=your-zoho-client-id-here`, `ZOHO_TOKEN_URL=https://accounts.zoho.com/oauth/v2/token`, `ZOHO_CRM_API_BASE_URL=https://www.zohoapis.com/crm/v7`). The token URL and API base URL can use real default values.

- [x] T003 [P] Create all plain Zoho types in `src/types/zoho.types.ts`

  **Details**: Create the file with the following types (zero Mongoose dependency, frontend-safe per §XI):
  - `ZohoTokenFields` — `{ access_token: string; expires_at: Date }`
  - `ZohoApiResponse<T>` — `{ data: T[]; info?: { per_page: number; count: number; page: number; more_records: boolean } }`
  - `ZohoLeadRecord` — `{ id: string; Email: string; Full_Name?: string; Company?: string }` (partial — only fields we read)
  - `ZohoLeadSearchResponse` — alias for `ZohoApiResponse<ZohoLeadRecord>`
  - `ZohoUpdateResponseDetail` — `{ code: string; details: { id: string }; message: string; status: string }`
  - `ZohoUpdateResponse` — `{ data: ZohoUpdateResponseDetail[] }`
  - `ZohoErrorResponse` — `{ code: string; details: Record<string, unknown>; message: string; status: string }`
  - `CrmMeetingPayload` — Record type with string keys mapped to `string | number | undefined` values. This is the payload shape sent to Zoho with placeholder field API names.

  Use `export interface` for object shapes and `export type` for aliases/unions. No `any` (use `unknown` or `Record<string, unknown>`).

**Checkpoint**: Dev server starts successfully with the new env vars. Types importable from `@/types/zoho.types`.

---

## Phase 2: Foundational (Token Persistence & Auth — US2 + US3 Prerequisites)

**Purpose**: Build the token persistence layer (Mongoose model + repository) and the auth service that all CRM operations depend on. Covers US2 (Automatic Token Refresh) and provides the infrastructure for US3 (Lead Lookup).

**CRITICAL**: No CRM client or server action work can begin until this phase is complete.

### Token Persistence (US2)

- [x] T004 [US2] Create Mongoose model for the `zohocredentials` collection in `src/lib/db/models/zoho-credential.model.ts`

  **Details**: Follow the exact pattern from `src/lib/db/models/transcript.model.ts`:
  - Import `ZohoTokenFields` from `@/types/zoho.types` (type isolation per §XI — plain types separate from Mongoose types)
  - Schema fields: `access_token` (String, required), `expires_at` (Date, required)
  - Enable `timestamps: true`
  - Explicitly set the collection name: pass `'zohocredentials'` as the third arg to `new Schema()` options or via `mongoose.model('ZohoCredential', schema, 'zohocredentials')` to match the existing collection
  - Export `ZohoCredentialDocument` type as `HydratedDocument<ZohoTokenFields>`
  - Export the model with hot-reload guard: `mongoose.models.ZohoCredential || mongoose.model(...)`

- [x] T005 [US2] Create repository functions in `src/repositories/zoho-credential.repository.ts`

  **Details**: This is the first file in `src/repositories/` — create the directory.
  - Import `withDb` from `@/lib/db/withDb`
  - Import the `ZohoCredential` model from `@/lib/db/models/zoho-credential.model`
  - Import `ZohoTokenFields` type from `@/types/zoho.types`
  - `getZohoToken(): Promise<ZohoTokenFields | null>` — wraps `withDb(() => ZohoCredential.findOne().lean<ZohoTokenFields | null>())`
  - `saveZohoToken(token: ZohoTokenFields): Promise<ZohoTokenFields | null>` — wraps `withDb(() => ZohoCredential.findOneAndUpdate({}, { access_token: token.access_token, expires_at: token.expires_at }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean<ZohoTokenFields | null>())`
  - Singleton upsert pattern: empty filter `{}` ensures only one document ever exists

### Auth Service (US2)

- [x] T006 [US2] Implement Zoho auth service in `src/integrations/zoho/zoho-auth.ts`

  **Details**: Create the `src/integrations/zoho/` directory. Build the `ZohoAuthService` class:
  - **Singleton**: `private static instance`, `static getInstance()`, private constructor
  - **Constructor**: Load credentials from `env` (imported from `@env`): `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ORGANIZATION_ID`, `ZOHO_TOKEN_URL`. Store in a private `credentials` object. Call `validateCredentials()`.
  - **`validateCredentials()`**: Check clientId, clientSecret, refreshToken are non-empty. Throw `Error('Missing required Zoho credentials: ...')` listing missing ones.
  - **`getAccessToken(): Promise<string>`**:
    1. Call `getZohoToken()` from `@/repositories/zoho-credential.repository`
    2. If token exists and `new Date(token.expires_at) > new Date(Date.now() + 60_000)` → return `token.access_token`
    3. Otherwise: POST to `this.credentials.tokenUrl` using native `fetch` with body `new URLSearchParams({ grant_type: 'refresh_token', client_id, client_secret, refresh_token })` and header `'Content-Type': 'application/x-www-form-urlencoded'`
    4. Parse response JSON, extract `access_token` and `expires_in`
    5. Compute `expires_at = new Date(Date.now() + expires_in * 1000)`
    6. Call `saveZohoToken({ access_token, expires_at })`
    7. Return `access_token`
    8. On error: log error context (NO tokens/credentials in logs), throw `Error('Failed to authenticate with Zoho API')`
  - **`getAuthHeaders(): Promise<Record<string, string>>`**: Call `getAccessToken()`, return `{ Authorization: 'Zoho-oauthtoken ${token}' }`
  - **`makeAuthenticatedRequest(url: string, options?: { method?: string; body?: unknown; headers?: Record<string, string> }): Promise<Response>`**:
    1. Get auth headers via `getAuthHeaders()`
    2. Merge with any caller-provided headers
    3. Call `fetch(url, { method: options?.method ?? 'GET', headers: mergedHeaders, body: options?.body ? JSON.stringify(options.body) : undefined })`
    4. If `Content-Type` not already set, add `'Content-Type': 'application/json'`
    5. Return the raw `Response`
  - **Export**: `export const zohoAuth = ZohoAuthService.getInstance()`

**Checkpoint**: Auth service instantiates successfully. Token refresh can be tested by calling `zohoAuth.getAccessToken()` — it should POST to Zoho, store the token, and return it. Subsequent calls within 60s should return the cached token.

---

## Phase 3: User Story 1 - Approve Meeting and Push to CRM (Priority: P1) — MVP

**Goal**: When a user clicks "Approve" on the Review screen, the system finds the matching lead in Zoho CRM by email and writes all meeting data to that lead record.

**Independent Test**: Approve a meeting with a known prospect email → verify the data appears on the lead record in Zoho CRM (or verify a clean error if the lead doesn't exist).

**Dependencies**: Requires Phase 2 complete (auth service + token persistence). Also delivers US3 (Lead Lookup) as part of the CRM client.

### CRM Client (US3 + US1)

- [x] T007 [P] [US1] Create CRM field mapping constants and payload mapper in `src/constants/zoho-field-map.ts`

  **Details**: This is the first file in `src/constants/` — create the directory if needed.
  - Define `ZOHO_CRM_FIELD_MAP` as a `const` object mapping semantic names to Zoho API field names:
    ```
    meetingTitle → 'Meeting_Title_Placeholder'
    meetingSummary → 'Meeting_Summary_Placeholder'
    meetingScoreBand → 'Meeting_Score_Band_Placeholder'
    meetingScorePercentage → 'Meeting_Score_Percentage_Placeholder'
    meetingScoreRationale → 'Meeting_Score_Rationale_Placeholder'
    meetingWhatWeHeard → 'Meeting_What_We_Heard_Placeholder'
    meetingWhatWasCovered → 'Meeting_What_Was_Covered_Placeholder'
    meetingWhatWasDecided → 'Meeting_What_Was_Decided_Placeholder'
    meetingActionItems → 'Meeting_Action_Items_Placeholder'
    meetingAttendees → 'Meeting_Attendees_Placeholder'
    meetingDetectedSignals → 'Meeting_Detected_Signals_Placeholder'
    ```
  - Define `mapMeetingToZohoPayload(transcript: TranscriptFields): CrmMeetingPayload`:
    - Import `TranscriptFields` from `@/types/transcript.types`
    - Import `CrmMeetingPayload` from `@/types/zoho.types`
    - Pure function (no side effects)
    - Map `transcript.title` → `meetingTitle` field
    - Map `transcript.summary.narrative` → `meetingSummary` field
    - Map `transcript.leadScore.band` → `meetingScoreBand` field
    - Map `transcript.leadScore.scorePercentage` → `meetingScorePercentage` field
    - Map `transcript.leadScore.rationale` → `meetingScoreRationale` field
    - Map `transcript.summary.whatWeHeard` → joined newline string → `meetingWhatWeHeard` field
    - Map `transcript.summary.whatWasCovered` → joined newline string → `meetingWhatWasCovered` field
    - Map `transcript.summary.whatWasDecided` → joined newline string → `meetingWhatWasDecided` field
    - Map `transcript.summary.actionItems` → formatted string (each as `"- {description} (Owner: {owner}, Due: {dueDate})"`) → `meetingActionItems` field
    - Map `transcript.summary.attendees` → formatted string (each as `"{name} ({side})"`) → `meetingAttendees` field
    - Map `transcript.leadScore.detectedSignals` → formatted string (each as `"- {label}: {evidence}"`) → `meetingDetectedSignals` field
    - Use the `ZOHO_CRM_FIELD_MAP` keys to build the returned object

- [x] T008 [US1] Implement Zoho CRM client in `src/integrations/zoho/zoho-crm-client.ts`

  **Details**: Build the `ZohoCrmClient` class:
  - **Constructor**: Takes `baseUrl: string` (the Zoho CRM API base URL from env)
  - **`searchLeadByEmail(email: string): Promise<ZohoLeadRecord | null>`** (delivers US3):
    1. If `!email?.trim()` → throw `Error('Email is required to search for a lead')`
    2. Call `zohoAuth.makeAuthenticatedRequest(\`${this.baseUrl}/Leads/search?email=${encodeURIComponent(email)}\`)`
    3. If response status is 204 (no content) → return `null`
    4. If response status is 200: parse JSON as `ZohoLeadSearchResponse`, return `data[0] ?? null`
    5. If response not ok: parse error body, log it (no tokens), throw with safe message
    6. Catch block: if error status is 404 or "no data" → return `null`. Otherwise log and re-throw.
  - **`updateLead(recordId: string, payload: CrmMeetingPayload): Promise<ZohoUpdateResponse>`**:
    1. If `!recordId?.trim()` → throw `Error('Record ID is required to update a lead')`
    2. Call `zohoAuth.makeAuthenticatedRequest(\`${this.baseUrl}/Leads/${recordId}\`, { method: 'PUT', body: { data: [payload], trigger: ['workflow'] } })`
    3. Parse response as `ZohoUpdateResponse`
    4. If response not ok: parse error body, log context, throw with safe message
    5. Return the parsed response
  - **Export**: `export const zohoCrmClient = new ZohoCrmClient(env.ZOHO_CRM_API_BASE_URL)` — import `env` from `@env`

### Server Action (US1 Orchestration)

- [ ] T009 [US1] Implement the CRM commit server action in `src/features/crm-commit/actions/commit-to-crm.ts`

  **Details**: Create `src/features/crm-commit/actions/` directory tree.
  - `'use server'` directive at the top of the file
  - Import `connectDB` from `@/lib/db/mongoose` (or use `withDb`)
  - Import `Transcript` model from `@/lib/db/models/transcript.model`
  - Import `zohoCrmClient` from `@/integrations/zoho/zoho-crm-client`
  - Import `mapMeetingToZohoPayload` from `@/constants/zoho-field-map`
  - Define the return type: `type CommitResult = { success: boolean; error?: string }`
  - **`commitToCrm(transcriptId: string): Promise<CommitResult>`**:
    1. Wrap entire body in try/catch
    2. `await connectDB()`
    3. `const transcript = await Transcript.findById(transcriptId).lean()` — if null → return `{ success: false, error: 'Meeting record not found.' }`
    4. `const email = transcript.contact?.email` — if falsy → return `{ success: false, error: 'No prospect email found on this meeting record.' }`
    5. `const lead = await zohoCrmClient.searchLeadByEmail(email)` — if null → return `{ success: false, error: 'No matching lead found in CRM for this email.' }`
    6. `const payload = mapMeetingToZohoPayload(transcript)` — map transcript data to CRM fields
    7. `await zohoCrmClient.updateLead(lead.id, payload)` — send to Zoho
    8. `await Transcript.findByIdAndUpdate(transcriptId, { zohoLeadId: lead.id })` — store Zoho lead ID on the transcript
    9. Return `{ success: true }`
    10. Catch block: log error with context (transcriptId, email — NO tokens), return `{ success: false, error: 'Failed to write meeting data to CRM. Please try again.' }`
  - No raw DB calls outside the Transcript model (credential DB calls go through the repository via the auth service)

**Checkpoint**: The full approve → CRM write flow is functional. Can be validated by calling `commitToCrm(transcriptId)` with a real transcript that has a contact email matching a lead in the dev CRM.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validation, cleanup, and documentation.

- [x] T010 [P] Run `npm run type-check` and fix any TypeScript errors across all new files
- [x] T011 [P] Run `npm run lint` and fix any ESLint/Prettier warnings across all new files
- [ ] T012 Run `npm run build:dev` and verify the build succeeds with the new Zoho integration
- [ ] T013 Run quickstart.md validation scenarios V1 (env validation) and V2 (token refresh) against the dev environment

**Checkpoint**: All quality gates pass. Integration is structurally complete and ready for real Zoho CRM field API names.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on T001 (env vars) and T003 (types) from Phase 1
- **Phase 3 (US1 MVP)**: Depends on Phase 2 completion (auth service must exist)
- **Phase 4 (Polish)**: Depends on Phase 3 completion

### Task Dependencies (Detail)

```
T001 (env.mjs) ──┐
T002 (.env.dev) ──┤  Phase 1: all parallel except T001 blocks T006
T003 (types)   ──┘
                  │
                  ▼
T004 (model) ─────→ T005 (repository) ─────→ T006 (auth service)
                                                    │
                                                    ▼
                                    T007 (field map) ──┐
                                                       ├──→ T009 (server action)
                                    T008 (CRM client) ─┘
                                                              │
                                                              ▼
                                              T010, T011 (lint/types) [P]
                                                              │
                                                              ▼
                                                    T012 (build)
                                                              │
                                                              ▼
                                                    T013 (validation)
```

### User Story Mapping

| Task | US1 (Approve & Push) | US2 (Token Refresh) | US3 (Lead Lookup) |
| --- | --- | --- | --- |
| T001 | Setup | Setup | Setup |
| T002 | Setup | Setup | Setup |
| T003 | Setup | Setup | Setup |
| T004 | | Delivers | |
| T005 | | Delivers | |
| T006 | | Delivers | |
| T007 | Delivers | | |
| T008 | Delivers | | Delivers |
| T009 | Delivers | | |
| T010-T013 | Polish | Polish | Polish |

### Within Each Phase

- T001, T002, T003 are parallel (different files)
- T004 → T005 → T006 are sequential (each depends on the previous)
- T007 and T008 are parallel-start (different files), but T008 depends on T006
- T009 depends on T007 + T008
- T010, T011 are parallel
- T012 depends on T010 + T011
- T013 depends on T012

---

## Parallel Opportunities

### Phase 1 (all three parallel)

```
Agent A: T001 — env.mjs (Zoho env vars)
Agent B: T002 — .env.development (placeholder values)
Agent C: T003 — src/types/zoho.types.ts (all type definitions)
```

### Phase 3 (after T006 completes)

```
Agent A: T007 — src/constants/zoho-field-map.ts (field map + mapper function)
Agent B: T008 — src/integrations/zoho/zoho-crm-client.ts (CRM client class)
→ Both complete → T009 (server action)
```

### Phase 4 (lint + types parallel)

```
Agent A: T010 — type-check
Agent B: T011 — lint
→ Both pass → T012 (build) → T013 (validation)
```

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1: Setup (T001-T003) — ~10 min
2. Complete Phase 2: Foundational (T004-T006) — ~20 min
3. Complete Phase 3: US1 MVP (T007-T009) — ~20 min
4. **STOP and VALIDATE**: Run quickstart scenarios V1-V5
5. Complete Phase 4: Polish (T010-T013) — ~10 min

### Key Notes

- All three user stories (US1, US2, US3) are delivered by the MVP since US2 and US3 are prerequisites that US1 depends on
- The field API names are placeholders — Zoho will reject updates until real custom fields are created on the Leads module, but the integration is structurally complete
- The `ZOHO_CRM_FIELD_MAP` in `src/constants/zoho-field-map.ts` is the single file to update when real API names are provided
- No new dependencies are introduced — uses native `fetch`, existing mongoose, existing `@t3-oss/env-nextjs`

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
