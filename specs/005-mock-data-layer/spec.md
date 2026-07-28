# Feature Specification: Mock Data Layer with Server Actions

**Feature Branch**: `005-mock-data-layer`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Design and Implement a Mock Data Injection Layer with Server Actions for a Next.js Application — centralize all scattered mock data into a single source, expose it through Next.js Server Actions that behave like real database operations (CRUD), structure the data to match the existing MongoDB schemas/models in `src/lib`, align TypeScript types to those models, and make the layer trivially replaceable with a real MongoDB implementation later — without any UI, styling, or behavior changes."

## Context Snapshot *(informational — current state)*

- Mock data currently lives in `src/providers/workflow/seed.ts` (`SAMPLE`, `SEED_LIBRARY`, `DEFAULT_RUBRIC`, `CURATED`) and is imported **directly** into the client-side `WorkflowProvider` and `use-workflow-actions.ts`.
- Two divergent type families describe the same domain concepts:
  - **UI view-models** — `src/types/meeting.types.ts`, `rubric.types.ts`, `scoring.types.ts` (snake_case fields such as `lead_score`, `recap_email`, `next_steps`; `ConfidentField` wrapper; `side: 'kaffea_x'`).
  - **Persistence models** — `src/types/transcript.types.ts`, `rubric-signal.types.ts` backing `src/lib/db/models/*.model.ts` (camelCase fields such as `leadScore`, `recapEmail`, `actionItems`; flat `contact.email`; `side: 'kaffeax'`; extra fields like `userId`, `status`, `source`, `originalTranscript`).
- Only two collections have MongoDB models today: **Transcript** and **RubricSignal**. Session-generated concepts (committed CRM record, audit log entry, chat message) have no persistence model.

## Clarifications

### Session 2026-07-23

- Q: How should the three session-generated concepts (CRM record, audit entry, chat message), which have no MongoDB model, be handled in the data layer? → A: Differentiated treatment — the **CRM record is a derived projection of a committed `Transcript`** (produced via the Transcript CRUD actions using the model's `status`/`zohoLeadId` fields; no new model), while the **audit log and chat remain ephemeral client-side session state** (no persistence, no new models). The mock/server-action layer stays scoped to Transcript + RubricSignal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single source of truth for mock data (Priority: P1)

As a developer maintaining the application, I need every piece of mock data to live in one dedicated location shaped exactly like the future database, so that I can find, edit, and trust the demo data without hunting through UI and provider files.

**Why this priority**: This is the foundational outcome. Without centralization there is nothing to expose through the data-access layer, and the scattering that motivated the work remains.

**Independent Test**: Search the UI and provider layers for hard-coded mock records; confirm none remain and that a single mock module holds all of it, structured per the MongoDB models. The application still renders the same seeded library, sample transcript, and rubric.

**Acceptance Scenarios**:

1. **Given** the refactored codebase, **When** a developer searches component and provider files for inline mock records, **Then** no mock data definitions are found outside the single dedicated mock location.
2. **Given** the mock module, **When** a developer inspects a mock record, **Then** its shape matches the corresponding MongoDB model in `src/lib` field-for-field.
3. **Given** the running application, **When** the workflow screens load, **Then** the seeded library, default rubric, and sample transcript appear exactly as before the refactor.

---

### User Story 2 - Data reached only through Server Actions (Priority: P1)

As a developer, I need the application to obtain its data exclusively through Next.js Server Actions that read from the mock layer, so that the data-access boundary mirrors a real database and UI code never imports mock data directly.

**Why this priority**: The server-action boundary is what makes the mock layer swappable for MongoDB later; it is the core architectural deliverable alongside centralization.

**Independent Test**: Confirm UI components and providers no longer import from the mock module; all data arrives via server-action calls. Replacing the mock module's internals changes the data everywhere without touching any action signature or UI file.

**Acceptance Scenarios**:

1. **Given** the refactored codebase, **When** a developer inspects UI components and providers, **Then** none import the mock data module directly — data is obtained through server-action calls only.
2. **Given** a server action for a collection, **When** it is invoked, **Then** it returns data in the persistence-model shape, resembling what the equivalent database query would return.
3. **Given** the data-access layer, **When** a developer traces a screen's data, **Then** the path is UI → server action → mock data source, with no database-specific detail leaking into the UI.

---

### User Story 3 - Database-shaped CRUD operations (Priority: P2)

As a developer, I need the server actions to expose create/read/update/delete operations that behave consistently with expected MongoDB responses, so that when a real database is introduced only the mock implementation is replaced.

**Why this priority**: CRUD parity is what guarantees the future migration touches only the mock implementation. It builds on Stories 1 and 2 but is not required for the initial centralization to deliver value.

**Independent Test**: Exercise each server action (list, get-by-id, create, update, delete as applicable per collection) and confirm the return shapes and behaviors match what a MongoDB-backed repository would produce for the same call.

**Acceptance Scenarios**:

1. **Given** a collection's server actions, **When** a read is requested for a known id, **Then** a single record in model shape is returned, and for an unknown id an empty/absent result consistent with database semantics is returned.
2. **Given** a create/update/delete operation is invoked, **When** it completes, **Then** the mock layer's in-memory store is updated and any subsequent read reflects the change in a way consistent with database behavior. Live mutations that today alter React state directly (approve → create, patch → update, reject → delete, rubric-signal edits) MUST route through these server actions, with the mock store as the source of truth for the session.
3. **Given** the future migration, **When** the mock implementation is swapped for a MongoDB-backed one, **Then** server-action signatures and all consuming code remain unchanged.

---

### User Story 4 - Consolidated, model-aligned TypeScript types (Priority: P2)

As a developer, I need one authoritative set of TypeScript types aligned to the MongoDB models, with duplicate/outdated types removed, so that the codebase has no conflicting definitions of the same concept.

**Why this priority**: Type consolidation removes a standing source of confusion and bugs and enforces the "models are the single source of truth" rule, but it depends on the shape decisions in Stories 1–3.

**Independent Test**: Confirm there is a single type definition per domain concept, sourced from or matching the MongoDB model, and that type-checking (`npm run type-check`) passes with no `any`.

**Acceptance Scenarios**:

1. **Given** the refactored types, **When** a developer looks for the persisted shape of a transcript/rubric-signal, **Then** exactly one authoritative persistence type exists, matching the MongoDB model. The existing UI view-model types are preserved; the mock/data-access layer maps persistence-model ↔ view-model at the boundary, so the UI is untouched. Any type that is a redundant *duplicate* of a persistence model (rather than a distinct view-model) is removed.
2. **Given** the codebase, **When** type-checking runs, **Then** it passes with zero errors and zero uses of `any`.
3. **Given** the type files, **When** reviewed against the constitution, **Then** plain data types remain free of any Mongoose/runtime dependency and importable by frontend code.

---

### Edge Cases

- **Unknown id on read**: A get-by-id for a nonexistent record returns a database-consistent empty result (e.g., `null`), never a thrown error that breaks the UI.
- **Concept without a model**: Session-generated concepts (committed CRM record, audit log entry, chat message) have no MongoDB model in `src/lib`. The mock/server-action layer covers **only the modeled collections (Transcript, RubricSignal)**, with differentiated treatment for the rest:
  - **CRM record** is a *derived projection* of a committed `Transcript` — "committing to CRM" is a state change on the Transcript (`status → saved`, set `zohoLeadId`), and the CRM view is produced from committed transcript reads. No separate collection or model is added.
  - **Audit log entry** and **chat message** remain ephemeral client-side session state exactly as today. No persistence and no new models are introduced for them.
- **Field-shape divergence**: Where the UI presently reads a shape different from the model (e.g., `contact.name.value` vs. the model's flat `contact.email`), the resolution must preserve on-screen output exactly (resolved by Q1).
- **Empty/failed reads**: A data-access failure surfaces through the same user-facing states the UI already has (loading/empty/error), with no new user-visible behavior.
- **Server/client boundary**: Data initialized from server actions must reach the client provider without altering the existing initial rendered state or timing in a user-perceptible way.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST consolidate all mock data currently defined across the codebase (`SAMPLE`, `SEED_LIBRARY`, `DEFAULT_RUBRIC`, `CURATED`, and any other inline mock records) into a single dedicated mock-data location.
- **FR-002**: Mock data MUST be structured to match the existing MongoDB schemas and models in `src/lib` (Transcript, RubricSignal), field-for-field, treating those models as the single source of truth. The layer covers only these two modeled collections. The CRM record is a derived projection of committed Transcripts (no separate model); the audit log and chat remain ephemeral client-side session state and are out of scope for the mock/server-action layer.
- **FR-003**: The application MUST access all mock data exclusively through Next.js Server Actions; no UI component or provider may import mock data directly.
- **FR-004**: Server Actions MUST expose operations that resemble real database CRUD operations (list, get-by-id, create, update, delete) and return results in the persistence-model shape. The mock layer MUST maintain a stateful in-memory store so that create/update/delete are reflected in subsequent reads within the session.
- **FR-004a**: Live UI mutations that currently modify React state directly MUST route through the CRUD Server Actions over the modeled collections, with the mock store as the session source of truth, while preserving the exact same resulting user-visible behavior:
  - approve/commit → update the `Transcript` (status → `saved`, set `zohoLeadId`); the CRM view is derived from this, not written separately;
  - patch → update the `Transcript` draft; reject → delete/discard the draft `Transcript`;
  - rubric-signal add/update/remove → create/update/delete `RubricSignal` records.
  - The audit log and chat continue to update client-side session state as today.
- **FR-005**: The data-access layer MUST be independent of and decoupled from UI components, such that UI code has no knowledge of whether data originates from mock or a real database.
- **FR-006**: The architecture MUST isolate the mock implementation so that a future MongoDB integration replaces only the mock data source, leaving Server Action signatures and all consuming code unchanged.
- **FR-007**: TypeScript persistence types MUST have a single authoritative definition per modeled concept (the MongoDB-model-backed type), with duplicate/outdated/redundant persistence types removed. The existing UI view-model types are retained; the mock/data-access layer MUST provide a bidirectional mapping between persistence-model and view-model shapes so UI code is unchanged.
- **FR-008**: The system MUST NOT use `any`; all data MUST be typed with concrete model-aligned types (per constitution §III).
- **FR-009**: All existing UI behavior, styling, workflows, routing, and business logic (transcript processing/scoring engine, approve/reject/patch flows) MUST be preserved exactly — this feature refactors only the data layer and its types.
- **FR-010**: The mock layer MUST behave consistently with expected MongoDB responses (e.g., returning `null`/empty for missing records rather than throwing), so that behavior does not change when a real database is introduced.
- **FR-011**: Existing public APIs, interfaces, and function signatures consumed by the UI MUST be preserved unless a change is strictly required to satisfy FR-002/FR-007, in which case the change MUST be non-visual and behavior-preserving.
- **FR-012**: No new external libraries may be introduced unless strictly required, and no database connection or MongoDB integration is set up as part of this feature.
- **FR-013**: The mock data MUST NOT be duplicated; each mock record has exactly one definition, and derived views are computed rather than copied.
- **FR-014**: Plain data types MUST remain free of any Mongoose/runtime dependency so they stay importable by frontend code (per constitution §XI).

### Key Entities *(include if feature involves data)*

- **Transcript**: A captured meeting and its extracted dossier. Attributes mirror the `Transcript` MongoDB model — owner reference, title, status, source, original/cleaned transcript text, structured summary (narrative, what-we-heard/covered/decided, action items, attendees), contact, lead score (band, detected signals, rationale), recap email, external identifiers. The seeded library and the default sample transcript are instances of this entity.
- **RubricSignal**: A single scoring signal the rubric looks for. Attributes mirror the `RubricSignal` MongoDB model — signal id, label, weight (hot/warm/cold), source (client/proposed), hints, active flag. The default rubric is a collection of these.
- **CRM record** *(derived, not a collection)*: A committed lead as shown in the commit view. It is a projection of a committed `Transcript` (via the model's `status` and `zohoLeadId` fields), produced by the Transcript CRUD actions — not an independently persisted entity and not given its own model.
- **Session-only concepts** *(out of scope for the layer)*: Audit log entry and chat message — modeled only as UI/session types with no MongoDB model in `src/lib`. These remain ephemeral client-side session state and are not moved into the mock/server-action layer. (The chat "mock" is the pure `cannedResponse()` function — mock business logic, not stored records.)
- **Mapping boundary**: The mock/data-access layer bidirectionally maps between persistence-model shapes (camelCase, flat `contact`, `side: 'kaffeax'`) and the retained UI view-model shapes (snake_case, `ConfidentField`, `side: 'kaffea_x'`), so the UI consumes the same interfaces as today.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of mock data resides in a single dedicated location; a repository-wide search finds zero inline mock records in UI components or providers.
- **SC-002**: 100% of the application's data reads flow through Server Actions; zero direct mock-data imports exist in UI/provider files.
- **SC-003**: Every mock record's shape matches its corresponding MongoDB model with zero field mismatches.
- **SC-004**: Exactly one authoritative TypeScript type exists per domain concept; the count of duplicate/redundant type definitions for modeled concepts is zero.
- **SC-005**: The full validation pipeline (type-check → lint → build) passes with zero errors, zero warnings, and zero uses of `any`.
- **SC-006**: The application's user-visible behavior is unchanged — every screen, workflow, and interaction produces the same output as before the refactor (verified against the prototype and pre-refactor behavior).
- **SC-007**: A future MongoDB migration can be completed by replacing only the mock data source, with zero changes required to Server Action signatures or consuming UI code (verified by inspection of the boundary).

## Assumptions

- The MongoDB models and their backing plain-type files under `src/lib` and `src/types` (`transcript`, `rubric-signal`) are correct and authoritative; this feature does not redesign the schemas, only aligns mock data and consumers to them.
- "Server Actions as the data-access layer" is interpreted in harmony with the constitution: Server Actions form the boundary the UI calls, delegating to a repository/mock-source abstraction whose internals are what gets swapped for MongoDB — no `/app/api/` route handlers are introduced.
- The single mock-data location will sit within the shared library/data-access area (not inside any feature or UI directory), consistent with the constitution's directory architecture.
- The transcript-processing/scoring engine (`engine.ts`) is business logic, not mock data, and remains unchanged; only the seed inputs it consumes move to the mock layer.
- "No UI changes" means no visual, styling, layout, routing, or user-workflow changes; behavior-preserving updates to how a component *receives* its data (e.g., via a server action instead of a direct import) are in scope and expected.
- No test infrastructure exists yet; verification is by the validation pipeline, inspection, and manual comparison against the prototype and current behavior.

### Resolved Clarifications (2026-07-23)

- **Type reconciliation (Q1)**: Map at the boundary. Existing UI view-model types are kept unchanged; mock data is authored in MongoDB-model shape and converted model ↔ view-model inside the data-access layer. No UI component field-access edits.
- **Entity scope (Q2, refined 2026-07-23)**: Modeled collections only, with differentiated handling of session concepts. The layer covers Transcript and RubricSignal. The CRM record is a derived projection of committed Transcripts (via `status`/`zohoLeadId`), not a new model; the audit log and chat remain ephemeral client-side session state. No new MongoDB models are added.
- **CRUD depth (Q3)**: Full stateful mock CRUD. Server actions expose list/get/create/update/delete over an in-memory mock store, and live mutations (approve/patch/reject/rubric edits) route through them, preserving identical user-visible behavior.

## Dependencies

- Existing MongoDB models/types in `src/lib/db/models/*.model.ts` and `src/types/*.types.ts`.
- The existing workflow provider and its consumers (`src/providers/workflow/*`, `src/features/*`).
- The project constitution (`.specify/memory/constitution.md`), particularly §III (TypeScript), §IX (Repository Layer), §X (Server Actions), and §XI (Type Isolation).

## Out of Scope

- Any UI, styling, CSS, layout, routing, or navigation change.
- Any change to application behavior, user workflows, or business logic.
- Real database integration, MongoDB connection setup, or data migration.
- API contract changes or new external libraries (unless strictly required).
- Refactoring outside the data layer and its directly-related types.
