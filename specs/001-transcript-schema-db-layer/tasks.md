# Tasks: Transcript Schema & Database Connection Layer

**Input**: Design documents from `specs/001-transcript-schema-db-layer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not included — no testing infrastructure exists and tests were not requested in the specification.

**Organization**: Tasks are grouped by user story. US3 (Database Connectivity) is placed in the Foundational phase since it blocks all other stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure build tooling required by all subsequent phases.

- [X] T001 Install mongoose dependency via `npm install mongoose`
- [X] T002 [P] Add `@env` path alias (`"@env": ["./env.mjs"]`) to `compilerOptions.paths` in `tsconfig.json`

**Details for T001**:
- Install: `npm install mongoose`
- Mongoose 8.x ships its own TypeScript types — do NOT install `@types/mongoose`
- Verify the package appears in `package.json` dependencies

**Details for T002**:
- Add to the existing `paths` object in `tsconfig.json`: `"@env": ["./env.mjs"]`
- Keep the existing `"@/*": ["./src/*"]` alias unchanged
- This enables `import { env } from '@env'` in `src/lib/db/mongoose.ts`

---

## Phase 2: Foundational (Database Connectivity)

**Purpose**: Singleton Mongoose connection and `withDb` wrapper — MUST be complete before any model can be used. Covers User Story 3 (Reliable Database Connectivity) acceptance scenarios.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Create singleton Mongoose connection manager in `src/lib/db/mongoose.ts`
- [X] T004 Create `withDb` higher-order connection wrapper in `src/lib/db/withDb.ts`

**Details for T003** (`src/lib/db/mongoose.ts`):
- Import `mongoose` and `env` from `@env`
- Use `globalThis` to cache the Mongoose instance and the in-flight connection promise (survives Next.js HMR in dev)
- Declare the global type augmentation for TypeScript strict mode
- Export `connectDB()`: async function that returns the cached Mongoose instance or creates a new connection
  - On first call: connect with `mongoose.connect(env.MONGO_URI, options)` and cache the promise
  - On subsequent calls: return the cached instance immediately
  - On concurrent calls during cold start: return the same in-flight promise (promise deduplication)
  - On failure: clear the cached promise so the next call retries (clean retry)
  - Connection options: `bufferCommands: false`, `serverSelectionTimeoutMS: 3000`
- Export `disconnectDB()`: async function for graceful shutdown (calls `mongoose.disconnect()` and clears the cache)
- File must be under 150 lines (constitution V)
- No `any` types — use `unknown` for error catches with type narrowing (constitution III)
- No bare `catch {}` — surface errors with context (constitution XIV)

**Details for T004** (`src/lib/db/withDb.ts`):
- Import `connectDB` from `./mongoose`
- Export `withDb` function with two TypeScript overload signatures:
  - Shape 1 (zero-arg task): `withDb<T>(fn: () => Promise<T>): Promise<T>` — calls `connectDB()` then `fn()`
  - Shape 2 (route handler): `withDb<T>(fn: (req: Request) => Promise<T>): (req: Request) => Promise<T>` — returns a wrapped function that calls `connectDB()` then delegates to `fn(req)`
- Use function overloads (not a union type) for clean call-site inference
- Must propagate the return type of the wrapped function
- File must be under 150 lines (constitution V)

**Checkpoint**: After this phase, `withDb(() => ...)` should establish a connection on first call, reuse it on subsequent calls, and fail within ~3 seconds if the database is unreachable.

---

## Phase 3: User Story 1 — Store and Retrieve Call Transcript Records (Priority: P1) 🎯 MVP

**Goal**: Define the Mongoose schema and model for the `transcripts` collection with all embedded sub-schemas, enum constants, indexes, and exported TypeScript types.

**Independent Test**: Create a transcript document with all fields populated, retrieve it by user and status, and confirm all embedded data is intact. Verify the sparse unique index on `externalMeetingId` prevents duplicates while allowing multiple nulls.

### Implementation for User Story 1

- [X] T005 [P] [US1] Create Transcript Mongoose schema with embedded sub-schemas, indexes, and type exports in `src/lib/db/models/transcript.model.ts`

**Deviation from original task**: Plain-data types (`TranscriptFields` and its nested interfaces, `TranscriptStatus`, `TranscriptSource`, `AttendeeSide`, `LeadScoreBand`) and the `TRANSCRIPT_STATUSES`/`TRANSCRIPT_SOURCES`/`ATTENDEE_SIDES`/`LEAD_SCORE_BANDS` const arrays were extracted into `src/types/transcript.types.ts`, mirroring the T006/RubricSignal remediation — resolving the `/speckit-analyze` C1 finding for this model. Since `TranscriptFields.userId` must be `mongoose.Types.ObjectId` for Mongoose but `string` is the frontend-safe representation, the shared type declares `userId: string` and the model file derives a schema-only type via `Omit<TranscriptFields, 'userId'> & { userId: mongoose.Types.ObjectId }`. `transcript.model.ts` now imports the plain types and only exports the mongoose-specific `Transcript` model and `TranscriptDocument` (`HydratedDocument`) type. Constitution Principle XI was amended (v1.2.0 → v1.3.0) to make this split a permanent rule, citing frontend reuse as the rationale.

**Details for T005** (`src/lib/db/models/transcript.model.ts`):

Constants (define as `as const` arrays for shared use between Mongoose enum and TypeScript types):
- `TRANSCRIPT_STATUSES = ['processing', 'draft', 'saved', 'failed'] as const`
- `TRANSCRIPT_SOURCES = ['manual', 'zoom', 'ms_teams', 'google_meet'] as const`
- `ATTENDEE_SIDES = ['kaffeax', 'prospect'] as const`
- `LEAD_SCORE_BANDS = ['hot', 'warm', 'cold'] as const`

Embedded sub-schemas (define as `new Schema({...}, { _id: false })`):
- `actionItemSchema`: `description` (String, required), `owner` (String, required), `dueDate` (String)
- `attendeeSchema`: `name` (String, required), `side` (String, required, enum: ATTENDEE_SIDES)
- `detectedSignalSchema`: `id` (String, required), `label` (String, required), `evidence` (String, required)
- `summarySchema`: `narrative` (String, default ""), `whatWeHeard` ([String], default []), `whatWasCovered` ([String], default []), `whatWasDecided` ([String], default []), `actionItems` ([actionItemSchema], default []), `attendees` ([attendeeSchema], default [])
- `contactSchema`: `email` (String)
- `leadScoreSchema`: `band` (String, enum: LEAD_SCORE_BANDS), `detectedSignals` ([detectedSignalSchema], default []), `rationale` (String, default "")

Main transcript schema:
- `userId` (Schema.Types.ObjectId, required) — do NOT add `ref: 'User'` yet (no User model in this feature)
- `title` (String, required)
- `status` (String, required, enum: TRANSCRIPT_STATUSES, default: 'processing')
- `source` (String, required, enum: TRANSCRIPT_SOURCES)
- `externalMeetingId` (String, default: null)
- `webhookPayload` (Schema.Types.Mixed, default: null)
- `originalTranscript` (String, required)
- `cleanedTranscript` (String, default: "")
- `summary` (summarySchema, default: {})
- `contact` (contactSchema, default: {})
- `leadScore` (leadScoreSchema, default: {})
- `recapEmail` (String, default: null)
- `zohoLeadId` (String, default: null)
- Schema options: `{ timestamps: true }`

Indexes (via `schema.index()`):
- `{ userId: 1, status: 1, createdAt: -1 }` — compound
- `{ userId: 1, createdAt: -1 }` — compound
- `{ externalMeetingId: 1 }` — `{ unique: true, sparse: true }`
- `{ zohoLeadId: 1 }` — `{ sparse: true }`

Exports:
- `Transcript` model via `mongoose.models.Transcript || mongoose.model('Transcript', transcriptSchema)`
- TypeScript types inferred from schema or explicitly defined: `TranscriptDocument`, `TranscriptStatus`, `TranscriptSource`
- Export the const arrays for use by future repository/validation code

File must be under 150 lines. No `any`. No `!`.

**Checkpoint**: Transcript model can create, query, and enforce index constraints. Independently testable via quickstart scenarios 4, 5.

---

## Phase 4: User Story 2 — Manage Lead-Scoring Rubric Signals (Priority: P1)

**Goal**: Define the Mongoose schema and model for the `rubricSignals` collection with enum constants, indexes, and exported TypeScript types.

**Independent Test**: Insert rubric signal records, retrieve active signals, filter by weight, confirm signalId uniqueness, and verify soft-delete behavior.

### Implementation for User Story 2

- [X] T006 [P] [US2] Create RubricSignal Mongoose schema with indexes and type exports in `src/lib/db/models/rubric-signal.model.ts`

**Deviation from original task**: Plain-data types (`RubricSignalFields`, `SignalWeight`, `SignalSource`) and the `SIGNAL_WEIGHTS`/`SIGNAL_SOURCES` const arrays were extracted into `src/types/rubric-signal.types.ts` instead of staying inline in the model file, per constitution Principle XI (Type Isolation) and to allow frontend reuse without importing a mongoose-dependent file. `rubric-signal.model.ts` imports from that types file and only exports the mongoose-specific `RubricSignal` model and `RubricSignalDocument` (`HydratedDocument`) type. This was later applied to `transcript.model.ts` (T005) as well, closing the `/speckit-analyze` C1 finding — see T005's deviation note.

**Details for T006** (`src/lib/db/models/rubric-signal.model.ts`):

Constants:
- `SIGNAL_WEIGHTS = ['hot', 'warm', 'cold'] as const`
- `SIGNAL_SOURCES = ['client', 'proposed'] as const`

Schema fields:
- `signalId` (String, required, unique) — stable slug identifier
- `label` (String, required) — human-readable display label
- `weight` (String, required, enum: SIGNAL_WEIGHTS) — scoring band
- `source` (String, required, enum: SIGNAL_SOURCES) — origin
- `hints` ([String], default: []) — keyword/phrase detection hints
- `isActive` (Boolean, required, default: true) — soft-delete flag
- Schema options: `{ timestamps: true }`

Indexes (via `schema.index()`):
- `{ signalId: 1 }` — `{ unique: true }` (also enforce via field-level `unique: true`)
- `{ weight: 1 }`
- `{ isActive: 1 }`

Exports:
- `RubricSignal` model via `mongoose.models.RubricSignal || mongoose.model('RubricSignal', rubricSignalSchema)`
- TypeScript types: `RubricSignalDocument`, `SignalWeight`, `SignalSource`
- Export the const arrays

File must be under 150 lines. No `any`. No `!`.

**Checkpoint**: RubricSignal model can create, query by active/weight, upsert by signalId, and soft-delete. Independently testable via quickstart scenarios 6, 7.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation gates and quickstart verification.

- [X] T007 [P] Run `npm run type-check` to verify zero TypeScript errors across all new files in `src/lib/db/`
- [X] T008 [P] Run `npm run lint` to verify zero ESLint warnings/errors and correct Prettier formatting across all new files in `src/lib/db/`
- [ ] T009 Validate quickstart scenarios from `specs/001-transcript-schema-db-layer/quickstart.md`

**T009 status**: Scenarios 8 (type-check) and 9 (lint) are covered by T007/T008 above — both pass with zero errors/warnings. Scenarios 1-7 require live CRUD against the `kaffea-x-dev` MongoDB Atlas cluster (connection singleton, fail-fast, dedup index, soft-delete, label snapshotting) and were deliberately **not** automated in this session — by user decision, to avoid a script writing/deleting data on a shared dev cluster without a dedicated test setup. These remain **pending manual verification** with a running dev server, per this project's current lack of test infrastructure.

**Details for T007**:
- Run: `npm run type-check`
- Expected: zero errors
- If errors: fix in the originating file before proceeding

**Details for T008**:
- Run: `npm run lint`
- Expected: zero warnings, zero errors (--max-warnings=0)
- If formatting issues: run `npm run format` first, then re-check
- Verify import ordering matches Prettier config (react/next → third-party → @/ → ./)

**Details for T009**:
- Work through quickstart scenarios 1–9 from `quickstart.md`
- Scenarios 1–3: Connection singleton, fail-fast, retry (manual dev server test)
- Scenarios 4–5: Transcript create/retrieve and webhook dedup index
- Scenarios 6–7: RubricSignal CRUD, soft-delete, label snapshot decoupling
- Scenarios 8–9: Type-check and lint (covered by T007 and T008)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — can run in parallel with US2
- **US2 (Phase 4)**: Depends on Foundational — can run in parallel with US1
- **Polish (Phase 5)**: Depends on US1 and US2 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on US2
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — no dependencies on US1
- Both stories are fully independent and operate on separate files/collections

### Within Each Phase

- Phase 1: T001 first (install dependency), then T002 can run in parallel (different file)
- Phase 2: T003 first (connection manager), then T004 (withDb depends on connectDB)
- Phase 3: T005 (single task)
- Phase 4: T006 (single task)
- Phase 5: T007 and T008 in parallel, then T009

---

## Parallel Opportunities

### Setup Phase

```
T001 (install mongoose) → then in parallel:
  T002 (add @env path alias)
```

### User Story Models (after Foundational completes)

```
In parallel:
  T005 [US1] (Transcript model in src/lib/db/models/transcript.model.ts)
  T006 [US2] (RubricSignal model in src/lib/db/models/rubric-signal.model.ts)
```

### Polish Validation

```
In parallel:
  T007 (type-check)
  T008 (lint)
→ then T009 (quickstart validation)
```

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004) — connection layer operational
3. Complete Phase 3: US1 (T005) — transcript model available
4. **STOP and VALIDATE**: Run quickstart scenarios 1–5
5. This is the MVP — the core data entity and connection layer are ready for the next feature (transcript processing pipeline)

### Full Delivery

1. Setup → Foundational → US1 + US2 in parallel → Polish
2. Total: 9 tasks across 5 phases
3. Each phase builds on the previous; US1 and US2 are the only parallelizable story phases

### Single Developer Flow

```
T001 → T002 → T003 → T004 → T005 → T006 → T007 + T008 → T009
```

Estimated: ~2 hours for a developer familiar with Mongoose and the project.

---

## Notes

- No test tasks included — testing infrastructure does not exist yet
- All files must stay under 150 lines (constitution V)
- No `any` types, no `!` assertions (constitution III)
- No bare `catch {}` blocks (constitution XIV)
- Commit after each task or logical group using conventional commits: `chore(db): ...`
- The `users` collection is NOT touched — `userId` stores a raw ObjectId without `ref`
