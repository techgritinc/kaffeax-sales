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
| §IX Repository Layer | PASS | Zoho credential persistence goes through repository functions; transcript data accessed via `transcriptRepository` (corrected 2026-07-29 — the server action must not call the Mongoose `Transcript` model directly) |
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
│   └── zoho-field-map.ts                # CRM field API name mapping (real field names)
├── components/
│   └── ui/
│       └── overlay/
│           └── loading-overlay.tsx      # Phase 7b — full-viewport blocking spinner overlay
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
- `env.mjs` — add Zoho env variables (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_TOKEN_URL, ZOHO_CRM_API_BASE_URL) — `ZOHO_ORGANIZATION_ID` was removed 2026-07-30 (unused dead configuration; no Zoho CRM v7 call in this feature needs it)
- `.env.development` — add placeholder Zoho env values
- `src/types/zoho.types.ts` — all plain Zoho types

**Details**:
1. Add five new server env variables to the `createEnv` schema in `env.mjs` with Zod validation. All required strings (min length 1). Add to `runtimeEnv` map.
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
2. Constructor loads credentials from `env` (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_TOKEN_URL).
3. `validateCredentials()` — throws if any required credential is missing.
4. `getAccessToken(): Promise<string>`:
   - Calls `getZohoToken()` from repository
   - If token exists and `expires_at > Date.now() + 60_000` (60-second safety buffer), return cached token
   - Otherwise, POST to ZOHO_TOKEN_URL with `grant_type=refresh_token` + credentials (using native `fetch`, not axios)
   - Compute `expires_at = new Date(Date.now() + expires_in * 1000)`
   - Call `saveZohoToken()` to persist
   - Return fresh access_token
5. `getAuthHeaders(): Promise<Record<string, string>>` — returns `{ Authorization: 'Zoho-oauthtoken <token>' }`
6. `makeAuthenticatedRequest(url, options)` — wraps `fetch` with auth headers injected. `Content-Type: application/json` is only added when a `body` is present (corrected 2026-07-30 — previously always added, even on bodyless GET requests). Handles JSON responses and error normalization.
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
     - **Corrected 2026-07-30 (fixes FR-014)**: after an HTTP-ok response, the per-record `data[0].status`/`code` MUST also be checked. Zoho returns HTTP 200 even for logical rejections (bad picklist value, workflow rule, etc.) — if `data[0].status !== 'success'`, this is treated as a failure (logged with the Zoho `code`/`message`, generic error thrown) so the caller never mistakes a rejected write for a success.
3. `zoho-field-map.ts` (real field names as of 2026-07-30, superseding the original placeholders):
   - `ZOHO_CRM_FIELD_MAP` maps 9 semantic keys to real Zoho Leads API names: `meetingTitle → Meeting_Title`, `meetingBand → Meeting_Band`, `meetingScore → Meeting_Score`, `meetingSummary → Meeting_Summary`, `meetingWhatWeHeard → What_We_Heard`, `meetingDetectedSignals → Detected_Signals`, `meetingWhatWasCovered → What_Was_Covered`, `meetingWhatWasDecided → What_Was_Decided`, `meetingActionItems → Action_Items`. The earlier `meetingScoreRationale` and `meetingAttendees` fields are removed — only these 9 fields are sent to Zoho.
   - `Meeting_Title` and `Meeting_Summary` are sent verbatim from `transcript.title` / `transcript.summary.narrative` — no reformatting (FR-015).
   - `Detected_Signals` groups signals under a `HOT`/`WARM`/`COLD` heading per the signal's current weight from the active scoring rubric (bands with no signals are omitted).
   - `mapMeetingToZohoPayload(transcript: TranscriptFields, signalWeights: Record<string, LeadScoreBand>): CrmMeetingPayload` — pure function; `signalWeights` (signal id → band) is supplied by the caller from the active rubric, since the persisted transcript's `detectedSignals` do not carry a per-signal band themselves.
4. `commitToCrm` (Phase 5) fetches the active rubric via `rubricSignalRepository.findActive()` and builds the `signalWeights` map before calling `mapMeetingToZohoPayload`.
5. Exported singleton: `export const zohoCrmClient = new ZohoCrmClient(env.ZOHO_CRM_API_BASE_URL)`

### Phase 5: Server Action (Orchestration)

**Files created**:
- `src/features/crm-commit/actions/commit-to-crm.ts` — server action

**Details**:
1. `'use server'` directive at top.
2. `commitToCrm(transcriptId: string): Promise<{ success: boolean; error?: string }>`:
   - Fetch the transcript record via `transcriptRepository.findById(transcriptId)` — **not** a direct `Transcript.findById(...)` Mongoose call (corrects a §IX Repository Layer conflict identified during `/speckit-analyze`: the original draft of this phase called the Mongoose model directly, contradicting this plan's own Constitution Check row)
   - If not found → return `{ success: false, error: 'Meeting record not found.' }`
   - Validate the transcript has a contact email → if missing, return `{ success: false, error: 'No prospect email found on this meeting record.' }`
   - Call `zohoCrmClient.searchLeadByEmail(contact.email)`
   - If no lead found → return `{ success: false, error: 'No matching lead found in CRM for this email.' }`
   - Fetch the active rubric via `rubricSignalRepository.findActive()` and build a `signalWeights: Record<string, LeadScoreBand>` map (signal id → band) — needed because the persisted transcript's `detectedSignals` carry no per-signal band themselves (added 2026-07-30, FR-015)
   - Call `mapMeetingToZohoPayload(transcript, signalWeights)` to build the CRM payload
   - Call `zohoCrmClient.updateLead(lead.id, payload)` — this now throws if Zoho's per-record status is not `success`, even on an HTTP 200 (FR-014)
   - On success: call `transcriptRepository.update(transcriptId, { status: 'saved', zohoLeadId: lead.id })` → return `{ success: true }`
   - On failure at any step: catch, log with context (no tokens/PII), return `{ success: false, error: 'Failed to write meeting data to CRM. Please try again.' }` — **do not** modify the transcript's status; it remains `draft` for retry (FR-012)
3. All DB access goes through `transcriptRepository` (transcript data), `rubricSignalRepository` (rubric signal weights), and the existing Zoho credential repository (token data) — no raw Mongoose calls in the server action itself.
4. All errors caught and returned as structured objects — never thrown to the client.

### Phase 5b: Remove Review Screen Edit Capability *(superseded 2026-07-30 — see spec.md Clarifications)*

**Superseded note**: The full removal below shipped, but the email field was restored shortly after (real-world testing showed the CRM lookup needs a way to correct AI-misextracted emails). Current state: `patch()`/`onPatch` exist again, scoped to `contact.email.value` only, and `runApprove` persists that one field via a dedicated `updateTranscriptEmail(id, email)` action — **not** the general `updateTranscript`/`toTranscriptPatch` path, because that mapper was found to silently wipe `summary.whatWeHeard` (a field the `MeetingRecord` view-model never carried) on every save. Phase 7 below builds on this current state.

<details>
<summary>Original Phase 5b (historical)</summary>

**Rationale**: Per clarification (2026-07-29), the Review screen is read-only after AI summary generation. The only prior edit path — `onPatch` → `contact.email.value` correction via `MetaStrip` — must be removed so the Approve flow has a single, simple orchestration path with no client-side draft mutation to reconcile against the DB.

**Files modified**:
- `src/features/workflow/hooks/use-workflow-actions.ts` — remove the `patch()` function and its entry in the returned actions object
- `src/features/workflow/hooks/workflow-actions.utils.ts` — `runApprove` no longer calls `updateTranscript({ ...draft, committed: true })`; it calls the new `commitToCrm(draft.id)` server action instead (see Phase 5c)
- `src/components/common/app-shell/app-shell.tsx` — remove the `onPatch={wf.patch}` prop passed to `ReviewScreen`
- `src/features/meeting-review/components/review-screen.tsx` — remove the `onPatch` prop from `ReviewScreenProps` and its pass-through to `MetaStrip`
- `src/features/meeting-review/components/meta-strip.tsx` — remove `onEmailChange` and render the prospect email as static text instead of an editable input
- `src/providers/workflow/workflow-context.ts` — remove `patch` from the context type if no longer used elsewhere

**Details**:
1. Confirm (via grep) that `patch`/`onPatch` has no other call sites before removing — the only current usage is the `contact.email.value` correction field in `MetaStrip`.
2. After removal, `MeetingRecord.contact.email` is populated solely from AI extraction with no manual override; this is an accepted tradeoff (documented in spec.md Edge Cases).

### Phase 5c: Wire "Approve" to the CRM Commit

**Files modified**:
- `src/features/workflow/hooks/workflow-actions.utils.ts` — `runApprove`

**Details**:
1. Replace the current body of `runApprove` (which calls `updateTranscript({ ...draft, committed: true })` unconditionally) with a call to `commitToCrm(draft.id)`.
2. On `{ success: true }`: call `updateRecent(draft.id, { status: 'CRM' })`, refresh `draft` from the repository (or trust the server action's persisted state) so `isCommitted`/`committed` reflects `status === 'saved'`, and `notify('Approved and written to CRM.', 'success')`.
3. On `{ success: false, error }`: do **not** update `updateRecent` status (transcript remains a draft in the sidebar), and `notify(error, 'reject')` so the user sees exactly why the CRM write failed.
4. No client-side field data is sent to `commitToCrm` — it re-reads the transcript by ID via the repository, consistent with the read-only Review screen (Phase 5b).

</details>

### Phase 6: Wiring & Validation

**Details**:
1. Verify `npm run type-check` passes (zero type errors).
2. Verify `npm run lint` passes (zero warnings).
3. Verify `npm run build:dev` succeeds.
4. Manual validation: confirm env variables load correctly, token refresh logic works against dev Zoho instance.
5. Manual validation: confirm the Review screen renders with no editable fields, and that Approve is the only path that can change a transcript's status to `saved` (verified by triggering both a successful and a failed CRM write and observing the persisted status in each case).

## Phase 7: UI Polish (User Story 4)

**Goal**: Fix the four issues found during real-world Approve testing — toast jump, missing in-progress feedback, fabricated data on the CRM confirmation screen, and an email field that stays editable after the record is already saved.

### Phase 7a: Toast Positioning Fix (FR-016)

**Root cause** (see research.md R8): `src/components/ui/toast/toast.tsx` applies both the Tailwind utility `-translate-x-1/2` (which Tailwind v4 compiles to the CSS `translate` property, not `transform`) **and** a CSS `animation` (`animate-toast-in` → `@keyframes kx-toast-in`) whose keyframes set the legacy `transform: translate(-50%, ...)` property directly. `translate` and `transform` are independent CSS properties that compose — during the 0.2s animation the two -50% offsets stack (toast renders too far left), then when the animation ends and its `transform` override lapses, only the Tailwind `translate: -50%` remains — producing the visible rightward jump.

**Files modified**:
- `src/app/globals.css` — rewrite `@keyframes kx-toast-in` to animate the `translate` property (not `transform`), with matching `-50%` X on both the `from` and `to` frames, so the animated value and the static Tailwind-computed value are identical the instant the animation ends:
  ```css
  @keyframes kx-toast-in {
    from { opacity: 0; translate: -50% -8px; }
    to   { opacity: 1; translate: -50% 0; }
  }
  ```
- No component changes needed — `toast.tsx` keeps its existing `-translate-x-1/2` class as a static fallback/base value; the fix is purely in which CSS property the keyframes animate.

### Phase 7b: Approve Loading Overlay (FR-017, FR-018)

**Files created**:
- `src/components/ui/overlay/loading-overlay.tsx` — new shared component

**Files modified**:
- `src/types/workflow.types.ts` — no change needed (new state is a plain boolean, not a `WorkflowStatus` value — `status: 'processing'` is already used by the capture-step `ProcessingModal` and must stay decoupled from the Approve overlay)
- `src/providers/workflow/workflow-context.ts` — add `isCommitting: boolean` to `WorkflowContextValue`
- `src/providers/workflow/workflow-provider.tsx` — add `const [isCommitting, setIsCommitting] = useState(false)`; pass `setIsCommitting` into `useWorkflowActions` deps; include `isCommitting` in the context value
- `src/features/workflow/types/workflow-action-deps.types.ts` — add `setIsCommitting: Dispatch<SetStateAction<boolean>>` to `WorkflowActionDeps`
- `src/features/workflow/hooks/workflow-actions.utils.ts` — `runApprove`: call `setIsCommitting(true)` before the try block, `setIsCommitting(false)` in a `finally` block (guarantees the overlay clears on every exit path — success, handled failure, or thrown error); on success only, after `notify(...)`, call `deps.setStep('commit')` to auto-navigate (FR-018) — failure paths `return` before reaching that line, so there is no navigation on failure
- `src/components/common/app-shell/app-shell.tsx` — render `{wf.isCommitting && <LoadingOverlay />}` at the top level (sibling to the existing `ProcessingModal` conditional), so it covers the whole viewport regardless of the current step

**`LoadingOverlay` details**:
- `fixed inset-0 z-[70]` (above `ProcessingModal`'s `z-[60]`, though the two are never shown simultaneously in practice) with a semi-transparent backdrop matching the existing `ProcessingModal` convention (`bg-midnight/[0.35] backdrop-blur-[4px]`), so it reads as a blocking layer consistent with the app's established overlay language
- Centered content: `<Icon name="Loader2" size={40} className="animate-spin-slow text-green-deep" />` — the same green used for the "HOT" band (`--green-deep` / `text-green-deep`, already used for the HOT badge elsewhere) — no text, no card, no other content
- No `onClick` handler and no `pointer-events-none` — an opaque `fixed inset-0` div with a higher z-index than the page content already blocks all clicks/interaction with what's underneath by default; nothing extra is needed to satisfy "even clicking outside the spinner should not work"

### Phase 7c: CRM Confirmation Screen Content (FR-019)

**Files modified**:
- `src/features/crm-commit/components/commit-card.tsx`:
  1. Replace the heading `{contact.company.value || 'Unnamed company'}` with `{record.summary.meetingTitle || 'Untitled meeting'}` (matching the exact fallback text already used in `review-screen.tsx`'s `title` computation, for consistency)
  2. Remove the `<span>...Saved to CRM</span>` pill entirely; keep only `<Badge band={leadScore.band} />`
  3. Change the contact line from `{contact.name.value || '—'} · {contact.title.value || '—'}{contact.email.value && ...}` to `{contact.name.value || '—'}{contact.email.value && \` · ${contact.email.value}\`}` — dropping the title segment entirely (no placeholder in its place, since FR-019 requires no fabricated fields)

### Phase 7d: Lock Email Field on Saved Meetings (FR-020)

**Files modified**:
- `src/components/ui/input/inline-input.tsx` — no functional change needed; `InlineInputProps` already extends `InputHTMLAttributes<HTMLInputElement>`, so `disabled` is already a valid prop. Add a `disabled:opacity-60 disabled:cursor-not-allowed` pair to the base class string for a visible disabled state.
- `src/features/meeting-review/components/meta-strip.tsx` — add `disabled?: boolean` to `MetaStripProps`; pass it to the `InlineInput`
- `src/features/meeting-review/components/review-screen.tsx` — pass `disabled={committed}` to `<MetaStrip>` (the `committed` prop is already available here)

### Phase 7e: Validation

1. Verify `npm run type-check`, `npm run lint` pass (zero errors/warnings).
2. Manual: trigger a failed Approve (bad email) and a successful one — confirm the toast never visibly shifts in either case.
3. Manual: click Approve on a valid record — confirm the full-viewport green spinner overlay appears immediately, blocks clicks anywhere on the page, and disappears exactly when the write resolves.
4. Manual: confirm a successful Approve auto-navigates to the CRM confirmation screen; confirm a failed Approve leaves the user on the Review screen with the error toast and does **not** navigate.
5. Manual: confirm the CRM confirmation screen shows the meeting title as its heading, only the band badge (no "Saved to CRM" pill), and `name · email` with no title segment.
6. Manual: open a saved meeting via "Open in Review" — confirm the email field is disabled. Start a new draft — confirm the email field is still fully editable.
