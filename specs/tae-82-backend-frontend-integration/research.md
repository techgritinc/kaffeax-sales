# Research: Backend Integration with Frontend

**Feature**: `tae-82-backend-frontend-integration` | **Date**: 2026-07-28

All unknowns from Technical Context are resolved below. No `NEEDS CLARIFICATION` markers remain.

## Decision: Repository layer rewrite (mock store → real Mongoose)

- **Decision**: Rewrite `transcriptRepository` and `rubricSignalRepository` internals to query the real `Transcript`/`RubricSignal` Mongoose models via `withDb()`, instead of `getStore()`/`reseedTranscripts()`/`reseedRubricSignals()` from `src/lib/db/mock/store`. Public method signatures are preserved where the spec still needs them (`findAll`, `findById`, `create`, `update`, `delete`); the mock-only `reset()`/`getSample()` methods are dropped (no real-DB equivalent required by any FR).
- **Rationale**: Direct reads of both repository files this session confirmed they are currently 100% mock-store-backed, not DB-backed as the source request assumed ("frontend developer already wrote the repository layer for the DB operations"). The Mongoose models, `connectDB()`, and `withDb()` all already exist and are schema-correct — the repositories are the only missing link between real UI and real MongoDB.
- **Alternatives considered**: Leaving the repositories mock-backed and adding a parallel real-DB repository was rejected — it would violate §IX (one repository class per collection) and leave two competing sources of truth.

## Decision: DRAFT-status schema relaxation

- **Decision**: At the Mongoose level, only `userId`, `title`, `status`, `source`, `originalTranscript` are required (already true in `transcript.model.ts`). A new Zod schema, `createDraftTranscriptSchema`, validates the Server Action input as `{ rawTranscript: string().min(1) }` only — no other fields are accepted or required at draft-creation time. `title` is filled with a generated placeholder (see below) and `source` defaults to `'manual'` at creation, satisfying the model's required fields without asking the user for them.
- **Rationale**: The user's request literally describes hitting a "required field" DB error today and asks for the schema to be "blended" so DRAFT status makes non-transcript fields optional — this is already mechanically true in the Mongoose schema; the missing piece was a narrowly-scoped Zod input schema for the create-draft action so validation happens at the Server Action boundary per §VIII, not by relying on Mongoose defaults alone.
- **Alternatives considered**: Making `title`/`source` truly optional in the Mongoose schema was rejected — the model already defaults/requires them sensibly, and loosening the model further would weaken the schema for every other status, not just `draft`.

## Decision: Default title generation

- **Decision**: At draft-creation time, `title` is generated as `Meeting on {formatted current date/time}` (e.g., `Meeting on Jul 28, 2026, 3:45 PM`), server-side, at the moment of insert. It is not user-facing input at this step; the AI-generated summary does not currently produce a title field (`TranscriptSummary` has no title field), so this placeholder remains the title unless a future feature adds title extraction.
- **Rationale**: `title` is required by the Mongoose schema and by the recents-bar display requirement, but nothing in the flow (paste/upload transcript → click Summarize) collects a title from the user before the first DB write. A deterministic, human-readable default avoids blocking the flow while remaining meaningful in the recents bar.
- **Alternatives considered**: Deriving a title from the first N characters of the transcript was rejected as needlessly speculative for this feature — no FR asks for smart title extraction, and it can be revisited later without any schema change (title stays a plain string).

## Decision: `aiProcessingStatus` field and navigation gating

- **Decision**: Add `aiProcessingStatus: 'pending' | 'success' | 'failed'` to `TranscriptFields`, defaulted to `'pending'` at draft creation, set to `'success'` after the AI-update write succeeds, and set to `'failed'` if `TranscriptSummarizer.summarize()` returns a `SummarizationError` (the DB record itself is still updated to record the failure, so `aiProcessingStatus` is durable across refresh). When a recents-bar item is opened (`openFromLibrary`) or the summary-by-id action is used to hydrate a session, the capture-session provider checks `aiProcessingStatus`: if it is not `'success'`, the step is forced to `'capture'` and `goTo('review')`/`goTo('commit')` are refused regardless of any locally-cached draft/committed state.
- **Rationale**: Directly satisfies the source request's explicit ask for a flag distinguishing FAILED/SUCCESS so a mid-processing refresh or failure keeps the user on the CAPTURE step and blocks Review/CRM breadcrumb steps.
- **Alternatives considered**: Deriving "still processing" purely from the absence of a `summary` object was rejected — it can't distinguish "never started" from "failed" from "in flight," which the explicit flag is designed to disambiguate.

## Decision: Two-phase Summarize Server Action flow

- **Decision**: `createDraftTranscript(rawTranscript)` — validates input, computes `cleanedTranscript` via a new pure utility `cleanTranscript()`, inserts a `Transcript` document with `status: 'draft'`, `aiProcessingStatus: 'pending'`, `originalTranscript: rawTranscript`, `cleanedTranscript`, generated `title`, default `source: 'manual'`, and the app's single placeholder `userId`. Returns `{ id: string }` immediately so the client can move to a processing state. `runAiSummarization(id, signals)` — fetches the draft by id, calls `TranscriptSummarizer.summarize(cleanedTranscript, { signals })`, and on success patches the same document (`summary`, `leadScore`, `aiProcessingStatus: 'success'`) via `transcriptRepository.update`, still `status: 'draft'`; on a `SummarizationError`, patches `aiProcessingStatus: 'failed'` and returns the error to the caller for toast/error display.
- **Rationale**: Matches the source request's literal two-step sequence (insert raw+cleaned transcript first to obtain a Mongo id; use that id to write back AI results) and keeps each Server Action doing one thing, consistent with §IX/§X.
- **Alternatives considered**: A single Server Action doing both inserts in one call was rejected — it would lose the "id available immediately, before AI processing starts" property the source request explicitly relies on (e.g., for correlating a later refresh with the in-flight record).

## Decision: Cleaned-transcript algorithm

- **Decision**: `cleanTranscript(raw: string): string` strips: (a) leading timestamp tokens per line (patterns like `[00:12:34]`, `00:12:34 -`, `12:34:56`), (b) standalone hyphen/dash separator lines, and (c) collapses resulting multiple blank lines — implemented as a small set of regex passes plus `trim()`. It is a pure function in `src/lib/utils/transcript-cleaner.utils.ts`, unit-testable in isolation even though no test suite exists yet.
- **Rationale**: The source request explicitly calls out "removing the timestamps, hyphens" as the definition of "cleaned version." A pure utility function keeps this logic out of the Server Action and repository layers per §XV (no business logic embedded where it doesn't belong) and out of the AI integration layer (which only consumes an already-clean string).
- **Alternatives considered**: Doing the cleaning inside `TranscriptSummarizer` was rejected — that integration is explicitly scoped to summarization only, and the source request treats "insert raw + cleaned transcript" as a DB-write-time concern, before any AI call happens.

## Decision: Rubric-signal freshness at Summarize time

- **Decision**: `runAiSummarization` always receives `signals: SimplifiedSignal[]` computed from the **current** `RubricSignalsProvider` context state (populated by `rubric-signal.actions.ts`'s `getRubric()` on load, and kept current by `addSignal`/`updateSignal`/`removeSignal`), never from a value captured earlier in the session. Because the Summarize button handler reads `useRubricSignals()`'s live signals array at click time (not at page-load time), any signal added right before clicking Summarize is included.
- **Rationale**: Directly satisfies the source request's "tricky part" — a signal added moments before clicking Summarize must be included in that run's AI call. Sourcing from live Context state (rather than a prop threaded down once at mount) guarantees this by construction.
- **Alternatives considered**: Re-fetching rubric signals from the DB immediately before every Summarize click was rejected — the existing rubric CRUD Server Actions already keep the Context state and DB in sync on every add/update/remove, so a redundant re-fetch would add latency without improving correctness.

## Decision: `simplifySignals` mapper — already exists, no new code needed

- **Decision**: Reuse `simplifySignals(signals: RubricSignalFields[]): SimplifiedSignal[]` from `src/lib/utils/scoring.utils.ts` unchanged. No new mapping function is introduced by this feature.
- **Rationale**: Direct read of `scoring.utils.ts` this session confirmed the mapper already implements exactly the `signalId→id`, `weight→tier`, pass-through `label`, conditional `hints`, and `numericWeight` mapping `SimplifiedSignal` requires. A prior research pass had incorrectly flagged this as a gap; verifying against the current file corrected that.
- **Alternatives considered**: N/A — nothing to design here.

## Decision: Context API split — `RubricSignalsProvider` and `RecentsProvider`

- **Decision**: Introduce two new, independent Context providers alongside the existing (slimmed) capture-session `WorkflowProvider`:
  - `RubricSignalsProvider` (`src/providers/rubric-signals/`) owns the rubric signal list, seeded server-side from `getRubric()` in `page.tsx`, and exposes `addSignal`/`updateSignal`/`removeSignal` (moved out of `workflow-provider.tsx`, unchanged in behavior — still calling the existing rubric Server Actions and persisting via the existing `persist()`-style pattern).
  - `RecentsProvider` (`src/providers/recents/`) owns the recents-bar list (`RecentItem[]`: id, title, status `DRAFT | CRM`, badge `HOT | WARM | COLD`, `when`/date), seeded server-side from a lightweight recents projection, and exposes `prependRecent(item)` (called once a draft is created and again after AI success/failure, so the bar reflects status changes without a full page reload) and `refreshRecents()`.
  - The capture-session `WorkflowProvider` is nested inside both (or calls their hooks directly, since providers can be siblings higher in the tree and consumed via hooks at any depth below) so `process()`/`approve()`/`openFromLibrary()` can read the latest rubric signals and push updates to the recents list without prop-drilling.
- **Rationale**: Directly satisfies the explicit source-request instruction to add proper Context API state for rubric signals and recents-bar metadata, replacing ad hoc state currently baked into the monolithic `WorkflowProvider`.
- **Alternatives considered**: A single combined `AppDataProvider` holding rubric + recents + capture-session state was rejected — it would recreate the same monolith the source request is asking to break apart, and would force unrelated consumers (e.g., a component only needing recents) to re-render on rubric signal changes and vice versa.

## Decision: Recents-bar projection shape

- **Decision**: A new lightweight Server Action / mapper, `toRecentItem(stored: StoredTranscript): RecentItem`, projects only `{ id, title, status: 'DRAFT' | 'CRM', badge?: 'HOT' | 'WARM' | 'COLD', when: string }` — `status` is `'CRM'` when the transcript's internal `status === 'saved'` (i.e., approved/committed) and `'DRAFT'` otherwise; `badge` is the uppercased `leadScore.band` when present, omitted otherwise (e.g., before AI processing completes). `getTranscripts()` (existing action) is reused as the data source — it already returns full `StoredTranscript[]`, and the projection happens in the mapper layer, not the repository, so the repository keeps returning full domain objects per §IX.
- **Rationale**: Matches the source request precisely: "we only need meeting title, status of the summary such as DRAFT | CRM, badges such as HOT | WARM | COLD... along with the date time."
- **Alternatives considered**: Adding a repository method that queries only projected fields (Mongoose `.select()`) was considered for performance but rejected as premature optimization — the dataset is demo-scale (Scale/Scope above), and introducing a second repository query shape purely for the recents bar adds complexity §XV explicitly discourages without a demonstrated need.

## Decision: `DEFAULT_USER_ID` placeholder

- **Decision**: Add `export const DEFAULT_USER_ID = '000000000000000000000001';` (a valid 24-hex-char ObjectId string) to a new `src/constants/user.ts`, replacing the `DEMO_USER_ID` import currently pulled from the mock fixture module being deleted.
- **Rationale**: No authentication/user-management feature exists yet; every transcript still needs a `userId` to satisfy the required Mongoose field. A named constant in `src/constants/` (not a mock fixture) keeps this a legitimate, documented placeholder rather than a leftover mock dependency.
- **Alternatives considered**: Making `userId` optional in the schema was rejected — it's a real, indexed field or future auth work, and this feature explicitly excludes auth/user-management from scope.

## Decision: `TRANSCRIPT_STATUSES` narrowing

- **Decision**: Narrow `TRANSCRIPT_STATUSES` from `['processing', 'draft', 'saved', 'failed']` to `['draft', 'saved']`. `'processing'` is superseded by `aiProcessingStatus: 'pending'` (status stays `'draft'` throughout AI processing per the source request: "Still the status will remain as 'DRAFT'"); `'failed'` is superseded by `aiProcessingStatus: 'failed'` for the same reason — a failed AI run does not change the document's lifecycle `status`, only its processing flag.
- **Rationale**: Keeps the two concerns — record lifecycle (`draft` → `saved`, i.e., un-approved vs. approved/committed to CRM) and AI-run outcome (`pending`/`success`/`failed`) — orthogonal, exactly as the source request implies by introducing `aiProcessingStatus` as a separate flag rather than expanding `status`.
- **Alternatives considered**: Keeping all four status values and layering `aiProcessingStatus` on top was rejected as redundant state that could drift out of sync (e.g., `status: 'processing'` and `aiProcessingStatus: 'success'` simultaneously would be contradictory and require extra invariant-checking code with no behavioral benefit).

## Decision: Snake_case remediation scope

- **Decision**: Rename `MeetingRecord.lead_score`→`leadScore`, `.recap_email`→`recapEmail`, `Summary.meeting_title`→`meetingTitle`, `.open_questions`→`openQuestions`, `.next_steps`→`nextSteps`, `NextStep.due_date`→`dueDate`, `LeadScore.detected_signals`→`detectedSignals`, updating `transcript.mapper.ts` and the two confirmed extra consumers (`review-screen.tsx`, `action-items.tsx`) accordingly. Enum literal values (e.g., `Side`'s `'kaffea_x'`) are left as-is — §XVIII targets object keys/field names, not string literal values.
- **Rationale**: This feature already rewrites `transcript.mapper.ts` end-to-end (new `aiProcessingStatus` field, new draft-flow mapping, new `toRecentItem` projection) — doing the rename now avoids touching the same functions twice, and the constitution treats snake_case as a zero-tolerance violation with no "existing debt" exception.
- **Alternatives considered**: Deferring the rename to a separate cleanup ticket was considered, but rejected here specifically because the blast radius is fully known and small (2 extra files) and the mapper is being rewritten regardless.

## Decision: `/summaries/:id` GET requirement

- **Decision**: Satisfied by the existing `getTranscriptById(id)` Server Action (already present in `transcript.actions.ts`, reading through `transcriptRepository.findById`), called directly from the client when a recents-bar item is clicked. No `/app/api/summaries/[id]/route.ts` handler is added.
- **Rationale**: Already recorded as a deliberate spec-level reinterpretation in `checklists/requirements.md`, driven by constitution §X's prohibition on `/app/api/` route handlers. This decision simply confirms the mechanism at the plan level: reuse, don't reimplement.
- **Alternatives considered**: None — the checklist note already closed this question during `/speckit-clarify`/spec validation.
