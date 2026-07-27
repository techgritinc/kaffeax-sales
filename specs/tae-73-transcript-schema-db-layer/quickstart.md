# Quickstart: Transcript Schema & Database Connection Layer

**Date**: 2026-07-22 | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)

## Prerequisites

1. **MongoDB instance** running and accessible (local or Atlas)
2. **`.env.development`** contains a valid `MONGO_URI` pointing to the target database
3. **Mongoose** installed: `npm install mongoose`
4. **`@env` path alias** added to `tsconfig.json`

## Validation Scenarios

These scenarios verify the feature works end-to-end. Run them after implementation is complete.

---

### Scenario 1: Database Connection — Singleton Behavior

**Purpose**: Verify the connection is established once and reused.

**Steps**:
1. Start the dev server: `npm run dev`
2. Confirm the server starts without env validation errors
3. Trigger any server-side operation that uses `withDb` (e.g., a test server action that calls the database)
4. Trigger the same operation again

**Expected outcome**:
- First invocation establishes a Mongoose connection (logged or observable via Mongoose connection events)
- Second invocation reuses the existing connection (no new connection log entry)
- No "buffering" warnings — `bufferCommands: false` prevents queued operations

---

### Scenario 2: Database Connection — Fail-Fast on Unreachable DB

**Purpose**: Verify the connection fails quickly when the database is unreachable.

**Steps**:
1. Set `MONGO_URI` to an invalid/unreachable address in `.env.development`
2. Start the dev server: `npm run dev`
3. Trigger a server-side operation that uses `withDb`

**Expected outcome**:
- The operation fails within ~3 seconds (not minutes)
- Error message is clear and includes connection context
- No bare unhandled rejection — the error is caught and surfaced

---

### Scenario 3: Database Connection — Retry After Failure

**Purpose**: Verify that a failed connection does not permanently block subsequent attempts.

**Steps**:
1. Start with an unreachable `MONGO_URI`
2. Trigger an operation through `withDb` — observe it fails
3. Fix `MONGO_URI` to a valid address (restart server if env changes require it)
4. Trigger the operation again

**Expected outcome**:
- The second attempt establishes a fresh connection (the cached failed promise was cleared)
- The operation succeeds

---

### Scenario 4: Transcript Model — Create and Retrieve

**Purpose**: Verify the Transcript Mongoose model correctly persists and retrieves a full document.

**Steps**:
1. Using a test script or server action, create a transcript document with all fields populated:
   - `userId`: a valid ObjectId
   - `title`: "Discovery call — Cascade Ember"
   - `status`: "draft"
   - `source`: "manual"
   - `originalTranscript`: sample text
   - `cleanedTranscript`: cleaned sample text
   - `summary`: with `narrative`, `whatWeHeard`, `whatWasCovered`, `whatWasDecided`, `actionItems`, `attendees`
   - `leadScore`: with `band`, `detectedSignals` (including `id`, `label`, `evidence`), `rationale`
   - `contact`: with `email`
   - `recapEmail`: sample email body
2. Retrieve the document by `_id`
3. Query by `userId` and `status`

**Expected outcome**:
- Document is persisted with all fields intact, including nested arrays and objects
- `createdAt` and `updatedAt` are auto-populated
- Query by `userId + status` returns the document; query with a different status returns empty

---

### Scenario 5: Transcript Model — Webhook Deduplication Index

**Purpose**: Verify the sparse unique index on `externalMeetingId` prevents duplicates.

**Steps**:
1. Create a transcript with `externalMeetingId: "zoom-meeting-123"`, `source: "zoom"`
2. Attempt to create a second transcript with the same `externalMeetingId`
3. Create a transcript with `externalMeetingId: null` (manual upload)
4. Create another transcript with `externalMeetingId: null`

**Expected outcome**:
- Step 2 fails with a duplicate key error (unique index violation)
- Steps 3 and 4 both succeed (sparse index ignores null values — multiple nulls allowed)

---

### Scenario 6: RubricSignal Model — CRUD and Soft Delete

**Purpose**: Verify rubric signals can be created, queried, and soft-deleted.

**Steps**:
1. Create a rubric signal: `signalId: "budget_discussion"`, `label: "Budget Discussion"`, `weight: "hot"`, `source: "client"`, `isActive: true`
2. Query active signals — confirm the signal appears
3. Set `isActive: false` on the signal
4. Query active signals again — confirm it no longer appears
5. Query by `signalId` directly — confirm the document still exists with `isActive: false`

**Expected outcome**:
- Signal is created with all fields
- Active query returns only signals where `isActive: true`
- Soft-deleted signal is excluded from active queries but persists in the collection
- `signalId` uniqueness is enforced (duplicate slug insertion fails)

---

### Scenario 7: RubricSignal — Label Snapshot Decoupling

**Purpose**: Verify that editing a signal's label does not alter historical transcript references.

**Steps**:
1. Create a rubric signal: `signalId: "budget_discussion"`, `label: "Budget Discussion"`
2. Create a transcript with `leadScore.detectedSignals` containing `{ id: "budget_discussion", label: "Budget Discussion", evidence: "..." }`
3. Update the rubric signal's `label` to "Budget & Funding Discussion"
4. Re-read the transcript document

**Expected outcome**:
- The transcript's `detectedSignals[0].label` still reads "Budget Discussion" (the snapshot)
- The rubric signal's `label` reads "Budget & Funding Discussion" (the updated value)
- The two are independent — no cascade, no join

---

### Scenario 8: Type Safety — Compilation Check

**Purpose**: Verify all new files pass TypeScript strict mode.

**Steps**:
1. Run `npm run type-check`

**Expected outcome**:
- Zero type errors from any file in `src/lib/db/`
- No `any` types, no non-null assertions

---

### Scenario 9: Lint & Format — CI Gate

**Purpose**: Verify all new files pass linting and formatting.

**Steps**:
1. Run `npm run lint`

**Expected outcome**:
- Zero warnings, zero errors from any file in `src/lib/db/`
