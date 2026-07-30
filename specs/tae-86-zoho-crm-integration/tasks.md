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

- [x] T001 Add Zoho server environment variables (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_TOKEN_URL, ZOHO_CRM_API_BASE_URL) to the `createEnv` schema and `runtimeEnv` map in `env.mjs`

  **Details**: Add five entries to the `server` object, each as `z.string().min(1)` (URL fields use `z.string().url()`). Add matching entries to `runtimeEnv` referencing `process.env.ZOHO_*`. Reference the existing pattern used by `CLAUDE_API_KEY` and `OPENROUTER_API_KEY` in the same file. (`ZOHO_ORGANIZATION_ID` was originally included as a sixth variable but removed 2026-07-30 — confirmed unused by any Zoho CRM v7 call this integration makes.)

- [x] T002 [P] Add real Zoho environment variable values to `.env.development`

  **Details**: Append a `# Zoho CRM` section with all five variables. Real dev-org credentials are now populated (client ID/secret, refresh token) alongside the standard `ZOHO_TOKEN_URL=https://accounts.zoho.com/oauth/v2/token` and `ZOHO_CRM_API_BASE_URL=https://www.zohoapis.com/crm/v7` defaults.

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
  - **Constructor**: Load credentials from `env` (imported from `@env`): `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_TOKEN_URL`. Store in a private `credentials` object. Call `validateCredentials()`.
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
    3. Call `fetch(url, { method: options?.method ?? 'GET', headers: mergedHeaders, body: options?.body !== undefined ? JSON.stringify(options.body) : undefined })`
    4. Only add `'Content-Type': 'application/json'` when `options?.body !== undefined` (corrected 2026-07-30 — previously always added, even on bodyless GET requests like `searchLeadByEmail`)
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

  **Updated 2026-07-30** with the real Zoho Leads module field API names (superseding the original placeholders) and a corrected `Detected_Signals` mapping. Only 9 fields are sent — the earlier `meetingScoreRationale`/`meetingAttendees` fields are dropped since they were not in the user-supplied field list.

  - Define `ZOHO_CRM_FIELD_MAP` as a `const` object mapping semantic names to the real Zoho API field names:
    ```
    meetingTitle → 'Meeting_Title'
    meetingBand → 'Meeting_Band'
    meetingScore → 'Meeting_Score'
    meetingSummary → 'Meeting_Summary'
    meetingWhatWeHeard → 'What_We_Heard'
    meetingDetectedSignals → 'Detected_Signals'
    meetingWhatWasCovered → 'What_Was_Covered'
    meetingWhatWasDecided → 'What_Was_Decided'
    meetingActionItems → 'Action_Items'
    ```
  - Define `mapMeetingToZohoPayload(transcript: TranscriptFields, signalWeights: Record<string, LeadScoreBand>): CrmMeetingPayload`:
    - Import `TranscriptFields`, `LeadScoreBand` from `@/types/transcript.types`
    - Import `CrmMeetingPayload` from `@/types/zoho.types`
    - Pure function (no side effects)
    - Map `transcript.title` → `meetingTitle` field, **verbatim, no reformatting**
    - Map `transcript.summary.narrative` → `meetingSummary` field, **verbatim, no reformatting**
    - Map `transcript.leadScore.band` → `meetingBand` field
    - Map `transcript.leadScore.scorePercentage` → `meetingScore` field
    - Map `transcript.summary.whatWeHeard` → joined newline string → `meetingWhatWeHeard` field
    - Map `transcript.summary.whatWasCovered` → joined newline string → `meetingWhatWasCovered` field
    - Map `transcript.summary.whatWasDecided` → joined newline string → `meetingWhatWasDecided` field
    - Map `transcript.summary.actionItems` → formatted string (each as `"- {description} (Owner: {owner}, Due: {dueDate})"`) → `meetingActionItems` field
    - Map `transcript.leadScore.detectedSignals` → **grouped by band**: for each of `hot`/`warm`/`cold` (in that order) that has ≥1 signal, emit an uppercase heading (`HOT`/`WARM`/`COLD`) followed by that band's signals as `"- {label}: {evidence}"` lines, separated by a blank line between bands; a signal's band comes from `signalWeights[signal.id]`, falling back to `transcript.leadScore.band` if the signal id isn't in the map. Bands with zero signals are omitted entirely. → `meetingDetectedSignals` field
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
    3. If response not ok: parse error body, log context, throw with safe message
    4. Parse response as `ZohoUpdateResponse`
    5. **(Fixed 2026-07-30)** Check `result.data[0]?.status !== 'success'` — Zoho returns HTTP 200 even for logical rejections (invalid picklist value, workflow rule, etc.), so the HTTP-ok check alone is not sufficient. If the per-record status isn't `'success'`, log the Zoho `code`/`message` and throw the same safe error as an HTTP-level failure.
    6. Return the parsed response
  - **Export**: `export const zohoCrmClient = new ZohoCrmClient(env.ZOHO_CRM_API_BASE_URL)` — import `env` from `@env`

### Server Action (US1 Orchestration)

- [x] T009 [US1] Implement the CRM commit server action in `src/features/crm-commit/actions/commit-to-crm.ts`

  **Details**: Create `src/features/crm-commit/actions/` directory tree.
  - `'use server'` directive at the top of the file
  - Import `transcriptRepository` from `@/repositories/transcript.repository` — **do not** import the `Transcript` Mongoose model or call it directly (corrects a §IX Repository Layer conflict found in `/speckit-analyze`: this task previously instructed direct `Transcript.findById`/`findByIdAndUpdate` calls, which contradicts the repository-layer principle and this feature's own Constitution Check)
  - Import `zohoCrmClient` from `@/integrations/zoho/zoho-crm-client`
  - Import `mapMeetingToZohoPayload` from `@/constants/zoho-field-map`
  - Import `rubricSignalRepository` from `@/repositories/rubric-signal.repository` (added 2026-07-30, for FR-015's per-signal band lookup)
  - Define the return type: `type CommitResult = { success: boolean; error?: string }` (exported as `CommitResult` interface)
  - **`commitToCrm(transcriptId: string): Promise<CommitResult>`**:
    1. Wrap entire body in try/catch
    2. `const stored = await transcriptRepository.findById(transcriptId)` — if null → return `{ success: false, error: 'Meeting record not found.' }`
    3. `const email = stored.fields.contact?.email` — if falsy → return `{ success: false, error: 'No prospect email found on this meeting record.' }`
    4. `const lead = await zohoCrmClient.searchLeadByEmail(email)` — if null → return `{ success: false, error: 'No matching lead found in CRM for this email.' }`
    5. `const rubricSignals = await rubricSignalRepository.findActive()` — build `signalWeights: Record<string, LeadScoreBand>` by mapping each signal's `signalId` → `weight`
    6. `const payload = mapMeetingToZohoPayload(stored.fields, signalWeights)` — map transcript data to CRM fields
    7. `await zohoCrmClient.updateLead(lead.id, payload)` — send to Zoho (throws if Zoho's per-record status isn't `success`, per the T008 fix)
    8. `await transcriptRepository.update(transcriptId, { status: 'saved', zohoLeadId: lead.id })` — flip status to `saved` and store the Zoho lead ID **only after** the CRM write succeeds (FR-012)
    9. Return `{ success: true }`
    10. Catch block: log error with context (transcriptId, email — NO tokens), return `{ success: false, error: 'Failed to write meeting data to CRM. Please try again.' }` — **do not** call `transcriptRepository.update` in this path; the transcript's status remains whatever it already was (`draft`), enabling retry
  - No raw DB calls outside `transcriptRepository`/`rubricSignalRepository` (credential DB calls go through the Zoho credential repository via the auth service)

**Checkpoint**: The full approve → CRM write flow is functional. Can be validated by calling `commitToCrm(transcriptId)` with a real transcript that has a contact email matching a lead in the dev CRM, and by confirming a failed call leaves the transcript's status untouched.

### Review Screen & Approve Wiring (US1)

- [x] T014 [US1] Remove the Review screen's inline-edit capability

  **Details**: Per clarification (2026-07-29), the Review screen is read-only after AI summary generation — the only prior edit path is the prospect-email correction field. Remove it entirely:
  - `src/features/workflow/hooks/use-workflow-actions.ts` — delete the `patch()` function and its `patch` entry in the returned actions object
  - `src/providers/workflow/workflow-context.ts` — remove `patch` from the context type (confirm no other consumers via grep for `\bpatch\b` and `onPatch` first)
  - `src/components/common/app-shell/app-shell.tsx` — remove the `onPatch={wf.patch}` prop passed to `<ReviewScreen>`
  - `src/features/meeting-review/components/review-screen.tsx` — remove `onPatch` from `ReviewScreenProps` and its pass-through to `MetaStrip`
  - `src/features/meeting-review/components/meta-strip.tsx` — remove the `onEmailChange` prop and the editable email input; render the prospect email as static read-only text
  - Verify no other component still references `wf.patch`, `onPatch`, or `onEmailChange` before removing (grep first, then delete)

- [x] T015 [US1] Wire `runApprove` to call `commitToCrm` instead of the generic transcript update

  **Details**: In `src/features/workflow/hooks/workflow-actions.utils.ts`, replace `runApprove`'s current body (`await updateTranscript({ ...draft, committed: true })`, which unconditionally marks the transcript `saved` with zero CRM interaction — the root defect found by `/speckit-analyze`) with:
  1. Import `commitToCrm` from `@/features/crm-commit/actions/commit-to-crm`
  2. Guard: if `!draft`, return (unchanged)
  3. `const result = await commitToCrm(draft.id)`
  4. If `result.success`: call `updateRecent(draft.id, { status: 'CRM' })`, refresh/re-fetch the draft so `committed`/`isCommitted` reflects the persisted `status === 'saved'` (e.g., via `getTranscriptById(draft.id)` and `setDraft(...)`), then `notify(isCommitted ? 'CRM record updated.' : 'Approved and written to CRM.', 'success')`
  5. If `!result.success`: do **not** call `updateRecent` (the sidebar/status stays as a draft), and `notify(result.error ?? 'Unable to save changes. Please try again.', 'reject')`
  6. Remove the now-unused `updateTranscript` import from this file if nothing else in it still uses it

**Checkpoint**: Clicking "Approve" on a live transcript triggers the full token-check → lead-search → lead-update chain; a successful CRM write flips the transcript to `saved` and updates the recents sidebar; a failed CRM write leaves the transcript as `draft`, shows the specific error via toast, and allows an immediate retry. The Review screen renders with no editable fields.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validation, cleanup, and documentation.

- [x] T010 [P] Run `npm run type-check` and fix any TypeScript errors across all new files
- [x] T011 [P] Run `npm run lint` and fix any ESLint/Prettier warnings across all new files
- [ ] T012 Run `npm run build:dev` and verify the build succeeds with the new Zoho integration
- [ ] T013 Run quickstart.md validation scenarios V1 (env validation) and V2 (token refresh) against the dev environment

**Note**: T010–T011 re-run after T009/T014/T015 landed — `tsc --noEmit`, `eslint --max-warnings=0`, and `prettier -c` all pass with zero errors/warnings across the full repo. T012 (`build:dev`) still fails, but only at the `/_not-found` prerender step with a pre-existing `TypeError: Cannot read properties of null (reading 'useContext')` — confirmed unrelated to this feature (fails identically before and after these changes; the "Compiled successfully" step passes cleanly). T013 remains deferred pending real Zoho dev credentials.

**Checkpoint**: All quality gates pass. Integration is structurally complete and ready for real Zoho CRM field API names.

---

## Phase 5: User Story 4 - Reliable Approve Feedback & CRM Confirmation Screen (Priority: P2)

**Goal**: Fix four UI issues found during real-world Approve testing: a toast that visibly shifts after appearing, no in-progress feedback during the CRM write, fabricated/redundant data on the CRM confirmation screen, and a prospect-email field that stays editable after the meeting is already saved.

**Independent Test**: Click Approve on both a matching and a non-matching email and observe: toast stability, the loading overlay's appearance/blocking/dismissal, auto-navigation only on success, the confirmation screen's content, and the email field's disabled state on a reopened saved meeting vs. an editable state on a fresh draft.

**Dependencies**: Requires Phase 3 complete (`commitToCrm`, `runApprove` wiring). Independent of Phase 4 (Polish) — can run in parallel with it, though re-running T010/T011 afterward is still required.

### Toast Fix (US4)

- [x] T016 [P] [US4] Fix the toast position flicker in `src/app/globals.css`

  **Details**: Per research.md R8, the flicker is caused by `toast.tsx` combining the Tailwind utility `-translate-x-1/2` (which Tailwind v4 compiles to the CSS `translate` property) with the `animate-toast-in` animation, whose `@keyframes kx-toast-in` still sets the legacy `transform` property. The two properties compose during the animation (double offset), then diverge when the animation ends (snap). Fix:
  - Rewrite `@keyframes kx-toast-in` to animate `translate` instead of `transform`, with the same `-50%` X value on both frames:
    ```css
    @keyframes kx-toast-in {
      from { opacity: 0; translate: -50% -8px; }
      to   { opacity: 1; translate: -50% 0; }
    }
    ```
  - No changes needed to `src/components/ui/toast/toast.tsx` itself — it keeps its existing `-translate-x-1/2` class.

### Loading Overlay (US4)

- [x] T017 [P] [US4] Create the loading overlay component in `src/components/ui/overlay/loading-overlay.tsx`

  **Details**: New file, no props needed.
  - `fixed inset-0 z-[70]` with a backdrop matching `ProcessingModal`'s convention: `bg-midnight/[0.35] backdrop-blur-[4px]`, `flex items-center justify-center`
  - Centered content: reused the existing `<Spinner>` component (`src/components/ui/spinner/spinner.tsx`, already wraps `Icon name="Loader2"` + `animate-spin`) via `<Spinner size={40} className="text-green-deep" />` instead of hand-rolling the icon+animation combo — no text, no card, no other content
  - No `onClick` handler — the opaque `fixed inset-0` div with a high z-index already blocks all interaction with the page underneath by default

- [x] T018 [P] [US4] Add `isCommitting` state to the workflow context/provider

  **Details**:
  - `src/providers/workflow/workflow-context.ts` — add `isCommitting: boolean` to `WorkflowContextValue`
  - `src/providers/workflow/workflow-provider.tsx` — add `const [isCommitting, setIsCommitting] = useState(false)`; pass `setIsCommitting` into the `useWorkflowActions` deps object; include `isCommitting` in the context `value`
  - `src/features/workflow/types/workflow-action-deps.types.ts` — add `setIsCommitting: Dispatch<SetStateAction<boolean>>` to `WorkflowActionDeps`

- [x] T019 [US4] Wire `runApprove` to toggle `isCommitting` and auto-navigate on success

  **Details**: In `src/features/workflow/hooks/workflow-actions.utils.ts`, update `runApprove`:
  1. Destructure `setIsCommitting` from `deps`
  2. Call `setIsCommitting(true)` immediately after the `if (!draft) return;` guard, before the `try` block
  3. Wrap the existing try body unchanged; on the success path, after `notify('Approved and written to CRM.', 'success')`, call `deps.setStep('commit')` to auto-navigate (failure paths already `return` earlier, so they never reach this line — no navigation on failure)
  4. Add a `finally` block that calls `setIsCommitting(false)` — guarantees the overlay clears on every exit path (success, handled failure, or thrown error)

- [x] T020 [US4] Render the loading overlay in the app shell

  **Details**: In `src/components/common/app-shell/app-shell.tsx`, import `LoadingOverlay` from `@/components/ui/overlay/loading-overlay` and render `{wf.isCommitting && <LoadingOverlay />}` at the top level (sibling to the existing `{wf.status === 'processing' && <ProcessingModal .../>}` conditional), so it covers the whole viewport regardless of the current step.

### CRM Confirmation Screen (US4)

- [x] T021 [P] [US4] Update the CRM confirmation card content in `src/features/crm-commit/components/commit-card.tsx`

  **Details**:
  1. Replace the heading `{contact.company.value || 'Unnamed company'}` with `{record.summary.meetingTitle || 'Untitled meeting'}` (same fallback text used in `review-screen.tsx`)
  2. Remove the `<span>...Saved to CRM</span>` pill entirely (including its `Icon name="CheckCircle2"` and wrapper) — keep only `<Badge band={leadScore.band} />`
  3. Change the contact line from `{contact.name.value || '—'} · {contact.title.value || '—'}{contact.email.value && ...}` to `{contact.name.value || '—'}{contact.email.value && \` · ${contact.email.value}\`}` — drop the title segment entirely, no placeholder in its place

### Email Field Lock on Saved Meetings (US4)

- [x] T022 [P] [US4] Disable the prospect email field when a meeting is already saved to CRM

  **Details**:
  - `src/components/ui/input/inline-input.tsx` — add `disabled:opacity-60 disabled:cursor-not-allowed` to the base class string (no prop changes needed — `InlineInputProps` already extends `InputHTMLAttributes<HTMLInputElement>`, which includes `disabled`)
  - `src/features/meeting-review/components/meta-strip.tsx` — add `disabled?: boolean` to `MetaStripProps`; pass it to the `InlineInput`
  - `src/features/meeting-review/components/review-screen.tsx` — pass `disabled={committed}` to `<MetaStrip>` (the `committed` prop is already available in this component)

**Checkpoint**: Approve shows a stable toast with no shift; a full-viewport green spinner overlay blocks interaction during the CRM write and clears on both success and failure; a successful Approve auto-navigates to the confirmation screen (a failed one does not); the confirmation screen shows the meeting title, band-only badge, and name+email with no title segment; the email field is disabled on saved meetings and editable on drafts.

---

## Phase 6: Polish (User Story 4)

- [x] T023 [P] Run `npm run type-check` and fix any TypeScript errors introduced by Phase 5
- [x] T024 [P] Run `npm run lint` and fix any ESLint/Prettier warnings introduced by Phase 5
- [ ] T025 Run quickstart.md validation scenarios V8–V11 (toast stability, loading overlay + navigation, confirmation screen content, email lock) against the dev environment

**Note**: T023–T024 pass — `tsc --noEmit`, `eslint --max-warnings=0`, and `prettier -c` all clean across the full repo. T025 requires manually clicking through the running app in a browser and is deferred to you, same as T013.

**Checkpoint**: All quality gates pass for the full feature, including User Story 4.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on T001 (env vars) and T003 (types) from Phase 1
- **Phase 3 (US1 MVP)**: Depends on Phase 2 completion (auth service must exist)
- **Phase 4 (Polish, US1-3)**: Depends on Phase 3 completion
- **Phase 5 (US4 UI Polish)**: Depends on Phase 3 completion (`commitToCrm`/`runApprove` must exist); independent of Phase 4, can run in parallel with it
- **Phase 6 (Polish, US4)**: Depends on Phase 5 completion

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
                                    T008 (CRM client) ─┘         │
                                                                  ▼
                                                        T014 (remove edit UI)
                                                                  │
                                                                  ▼
                                                        T015 (wire runApprove)
                                                                  │
                                                                  ▼
                                              T010, T011 (lint/types) [P] — re-run
                                                              │
                                                              ▼
                                                    T012 (build)
                                                              │
                                                              ▼
                                                    T013 (validation)

(from T009, in parallel with T010-T013)
T009 ──┬──────────────────────────────────────────────────────────┐
       │                                                          ▼
T016 (toast CSS) [P] ─┐                                  T018 (isCommitting state) [P]
T017 (LoadingOverlay) [P] ─┤                                       │
T021 (CommitCard content) [P] ─┤                                   ▼
T022 (email disabled) [P] ─┘                              T019 (wire runApprove)
                                                                    │
                                                                    ▼
                                                  T020 (render overlay, needs T017+T018)
                                                                    │
                                                                    ▼
                                                    T023, T024 (lint/types) [P] — re-run
                                                                    │
                                                                    ▼
                                                          T025 (quickstart V8-V11)
```

### User Story Mapping

| Task | US1 (Approve & Push) | US2 (Token Refresh) | US3 (Lead Lookup) | US4 (Approve UI Polish) |
| --- | --- | --- | --- | --- |
| T001 | Setup | Setup | Setup | |
| T002 | Setup | Setup | Setup | |
| T003 | Setup | Setup | Setup | |
| T004 | | Delivers | | |
| T005 | | Delivers | | |
| T006 | | Delivers | | |
| T007 | Delivers | | | |
| T008 | Delivers | | Delivers | |
| T009 | Delivers | | | |
| T014 | Delivers | | | |
| T015 | Delivers | | | |
| T010-T013 | Polish | Polish | Polish | |
| T016 | | | | Delivers |
| T017 | | | | Delivers |
| T018 | | | | Delivers |
| T019 | | | | Delivers |
| T020 | | | | Delivers |
| T021 | | | | Delivers |
| T022 | | | | Delivers |
| T023-T025 | | | | Polish |

### Within Each Phase

- T001, T002, T003 are parallel (different files)
- T004 → T005 → T006 are sequential (each depends on the previous)
- T007 and T008 are parallel-start (different files), but T008 depends on T006
- T009 depends on T007 + T008
- T014 has no dependency on T009 (different files) but is sequenced before T015 since T015's `runApprove` rewrite assumes the edit path is already gone
- T015 depends on T009 (needs `commitToCrm` to exist) and T014
- T010, T011 are parallel and must be re-run after T009/T014/T015
- T012 depends on T010 + T011
- T013 depends on T012
- T016, T017, T021, T022 are fully independent (different files, no cross-dependencies) and can all run in parallel with each other and with Phase 4
- T018 has no blocking prerequisite and can also run in parallel with T016/T017/T021/T022
- T019 depends on T018 (needs `setIsCommitting` in `WorkflowActionDeps`)
- T020 depends on T017 (the `LoadingOverlay` component must exist) and T018 (needs `wf.isCommitting` from context)
- T023, T024 are parallel and must run after T016-T022 are all complete
- T025 depends on T023 + T024

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

### Phase 5 (four independent tracks, then converge)

```
Agent A: T016 — src/app/globals.css (toast keyframe fix)
Agent B: T017 — src/components/ui/overlay/loading-overlay.tsx (new component)
Agent C: T018 — isCommitting state (workflow-context.ts, workflow-provider.tsx, workflow-action-deps.types.ts)
Agent D: T021 — src/features/crm-commit/components/commit-card.tsx (confirmation screen content)
Agent E: T022 — inline-input.tsx, meta-strip.tsx, review-screen.tsx (email disable)
→ T018 complete → T019 (wire runApprove)
→ T017 + T018 complete → T020 (render overlay in app-shell)
```

### Phase 6 (lint + types parallel)

```
Agent A: T023 — type-check
Agent B: T024 — lint
→ Both pass → T025 (quickstart V8-V11)
```

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1: Setup (T001-T003) — ~10 min
2. Complete Phase 2: Foundational (T004-T006) — ~20 min
3. Complete Phase 3: US1 MVP (T007-T009, then T014-T015) — ~30 min
4. **STOP and VALIDATE**: Run quickstart scenarios V1-V5 and V7
5. Complete Phase 4: Polish (T010-T013, re-run after T014/T015) — ~10 min
6. Complete Phase 5: US4 UI Polish (T016-T022) — ~30 min
7. **STOP and VALIDATE**: Run quickstart scenarios V8-V11
8. Complete Phase 6: Polish (T023-T025) — ~10 min

### Key Notes

- All three core user stories (US1, US2, US3) are delivered by the MVP since US2 and US3 are prerequisites that US1 depends on
- US4 is additive UI polish on top of an already-working Approve flow — it changes no data written to Zoho, only the experience around triggering and confirming that write
- The `ZOHO_CRM_FIELD_MAP` in `src/constants/zoho-field-map.ts` uses real field API names as of 2026-07-30 (no longer placeholders)
- No new dependencies are introduced anywhere in this feature — uses native `fetch`, existing mongoose, existing `@t3-oss/env-nextjs`, and (for US4) only existing UI primitives (`Icon`, existing Tailwind tokens)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
