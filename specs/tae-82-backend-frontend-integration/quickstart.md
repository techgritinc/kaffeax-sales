# Quickstart: Backend Integration with Frontend

**Feature**: `tae-82-backend-frontend-integration`

## Prerequisites

- `.env.development` populated (`NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`, `MONGO_URI` pointing at a reachable MongoDB instance — see CLAUDE.md § Environment Setup).
- At least one Claude API credential configured for `TranscriptSummarizer` (existing integration, unchanged by this feature).
- `npm install` already run.

## Setup

```bash
npm run dev
```

Server-side seeding in `page.tsx` will call `getRubric()` and `getTranscripts()` against the real MongoDB collections — an empty database is fine (both providers seed with empty arrays).

## Scenario 1 — Recents bar reflects real data, not mocks

1. Open the app. Recents bar should be empty (or show whatever real `Transcript` documents already exist) — never the previous hardcoded mock entries.
2. Confirm the mock deletion: `src/lib/db/mock/` no longer exists; `providers/workflow/engine.ts` and `curated.ts` no longer exist.

**Expected**: No references to `getStore`/`reseedTranscripts`/`reseedRubricSignals` anywhere in `src/repositories/*.repository.ts` (verify via `npm run type-check` — deleting the mock module will surface any lingering import as a build error).

## Scenario 2 — Summarize happy path (draft → AI success → recents bar update)

1. Paste or upload a transcript containing a few timestamped lines and hyphen separators; click **Summarize**.
2. **Immediately** observe: the Summarize button is disabled, a blocking processing overlay appears, and a new `DRAFT` item (no badge yet) appears at the top of the recents bar.
3. Attempt to dismiss the overlay by clicking outside it or pressing Escape — it must NOT close (FR-014/FR-015 from spec.md's Clarifications).
4. Wait for AI processing to complete. The overlay closes, the UI moves to the Review step, and the recents-bar item updates in place to show the correct `HOT | WARM | COLD` badge, still `DRAFT`.
5. Inspect the MongoDB `transcripts` collection for this document: `status: 'draft'`, `aiProcessingStatus: 'success'`, `originalTranscript` contains the raw pasted text, `cleanedTranscript` has timestamps/hyphens stripped, `summary`/`leadScore` populated.

**Expected**: Exactly two writes occurred for this document — the initial draft insert and the AI-result patch — both attributable to `createDraftTranscript` and `runAiSummarization` respectively (check server logs for the two corresponding operation names from §XIV structured logging).

## Scenario 3 — Refresh / failure mid-processing keeps user on CAPTURE

1. Start a Summarize run; while the overlay is showing, refresh the browser tab.
2. After reload, click the same item from the recents bar (it should still show `DRAFT`, no badge).
3. **Expected**: the app opens directly to the CAPTURE step; the Review and CRM breadcrumb steps are not reachable, because `aiProcessingStatus` is still `'pending'` (or `'failed'` if the summarization call errored before the refresh).

## Scenario 4 — Fetching a specific summary by id ("/summaries/:id")

1. Note the Mongo `_id` of any existing transcript (from Scenario 2 or the database directly).
2. Click that item in the recents bar.

**Expected**: The client calls the `getTranscriptById` Server Action (no `/app/api/` network request — verify in the browser Network tab that no request to `/api/summaries/...` is made), and the full record hydrates the capture-session provider correctly.

## Scenario 5 — Rubric signal freshness at Summarize time

1. Load the app (rubric signals seeded server-side).
2. Add a new HOT signal via the rubric editor UI — do not refresh the page.
3. Paste a transcript and click Summarize.
4. **Expected**: the AI call's `signals` argument (verify via a temporary log or breakpoint in `runAiSummarization`, or by checking whether the new signal's label appears in the resulting `leadScore.detectedSignals`/rationale when applicable) includes the just-added signal — not the server-seeded set from step 1.

## Scenario 6 — Approve flow (Zoho still out of scope)

1. From a successfully summarized (Review-step) record, enter a contact email and click Approve.
2. **Expected**: `status` flips to `'saved'`, the recents-bar item updates in place to `CRM`, and no Zoho-related network call or error occurs (Zoho integration remains unimplemented/out of scope).

## Validation gate

```bash
npm run validate
```

Must pass with zero warnings/errors (type-check → lint → build) before this feature is considered complete.
