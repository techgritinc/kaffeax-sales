# Feature Specification: Transcript Schema & Database Connection Layer

**Feature Branch**: `chore/mongoose-setup`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Transcript schema and DB connection layer design — MongoDB schema for transcripts and rubricSignals collections, plus a singleton database connection layer with a withDb wrapper."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Store and Retrieve Call Transcript Records (Priority: P1)

As a sales operations system, the application needs to persistently store call transcript records — including the raw transcript, AI-cleaned transcript, structured summary, lead score, contact signal, and recap email — so that sales reps can review, edit, and act on processed call data.

**Why this priority**: The transcript record is the central data entity of the entire application. Every downstream feature (summary display, lead scoring UI, CRM push, recap email) depends on this data structure existing and being reliably persisted.

**Independent Test**: Can be verified by creating a transcript document with all fields populated, retrieving it by user and status, and confirming all embedded data (summary, lead score, contact, action items) is intact.

**Acceptance Scenarios**:

1. **Given** a new call has been processed, **When** the system stores the transcript record, **Then** all fields (raw transcript, cleaned transcript, summary with sub-fields, lead score with detected signals, contact, and recap email) are persisted and retrievable.
2. **Given** a user has multiple transcripts, **When** the system queries by user and status, **Then** only transcripts matching that user and status are returned, ordered by most recent first.
3. **Given** a transcript is in "draft" status, **When** the user reviews and commits it, **Then** the status transitions to "saved" and the CRM record identifier is populated.
4. **Given** a transcript with a specific external meeting identifier already exists, **When** a duplicate webhook arrives for the same meeting, **Then** the system can detect the duplicate and prevent a second record from being created.

---

### User Story 2 - Manage Lead-Scoring Rubric Signals (Priority: P1)

As a sales operations administrator, the system must store and retrieve lead-scoring rubric signals — the classification rules that determine whether a call is "hot", "warm", or "cold" — so that the AI scoring engine can evaluate transcripts against a configurable, data-driven rubric without requiring code changes.

**Why this priority**: Lead scoring is a core differentiator of the product. The rubric signals must be stored in the database (rather than hardcoded) so that new signals can be added, existing ones edited, or signals disabled — all without redeploying the application.

**Independent Test**: Can be verified by inserting rubric signal records, retrieving only active signals, filtering by scoring band, and confirming that signal identifiers remain stable across updates to label or hint text.

**Acceptance Scenarios**:

1. **Given** the rubric has been seeded with signals, **When** the AI scoring engine requests active signals, **Then** only signals marked as active are returned.
2. **Given** a rubric signal exists, **When** an administrator disables it, **Then** the signal is soft-deleted (not removed) and no longer returned in active signal queries.
3. **Given** a rubric signal has been detected in a past transcript, **When** the signal's label is later edited, **Then** the transcript retains the original label snapshot at detection time, preserving historical accuracy.
4. **Given** a new signal is added to the rubric, **When** the system processes the next transcript, **Then** the new signal is available for detection without any application restart or code deployment.

---

### User Story 3 - Reliable Database Connectivity (Priority: P1)

As any server-side operation in the application, the system must establish and maintain a reliable, singleton database connection — with automatic reuse, fail-fast behavior on connection errors, and a transparent wrapper that removes connection management boilerplate from every call site.

**Why this priority**: Every data operation in the application depends on database connectivity. Without a reliable, reusable connection layer, every feature would need to independently manage connections, leading to resource leaks, redundant code, and inconsistent error handling.

**Independent Test**: Can be verified by invoking a database operation through the wrapper, confirming the connection is established on the first call and reused on subsequent calls, and verifying that a connection failure surfaces immediately (within seconds) rather than hanging.

**Acceptance Scenarios**:

1. **Given** no database connection exists, **When** the first database operation is invoked through the wrapper, **Then** a connection is established and the operation completes successfully.
2. **Given** a database connection is already established, **When** a subsequent database operation is invoked, **Then** the existing connection is reused (no new connection is created).
3. **Given** multiple database operations are invoked concurrently during application cold start, **When** they all request a connection simultaneously, **Then** only one connection attempt is made and all operations share it.
4. **Given** the database is unreachable, **When** a database operation is attempted, **Then** the operation fails within a short timeout (seconds, not minutes) with a clear error — it does not hang indefinitely.
5. **Given** a previous connection attempt failed, **When** a new database operation is attempted after the failure, **Then** the system retries the connection (the stale failed state does not permanently block future attempts).

---

### Edge Cases

- What happens when the database connection drops mid-operation? The connection layer must allow the next request to attempt a fresh connection rather than permanently caching a dead connection.
- What happens when the `MONGO_URI` environment variable is missing or malformed? The application must crash at startup with a clear error message (fail-fast, enforced by existing env validation).
- What happens when a transcript is created via webhook but AI processing fails? The transcript must remain in "failed" status with the original transcript text preserved for retry.
- What happens when a rubric signal's `signalId` collides with an existing one during an upsert? The unique index on `signalId` must enforce uniqueness and the upsert must update the existing record.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store call transcript records containing: raw transcript text, AI-cleaned transcript text, structured summary (narrative, observations, topics covered, decisions, action items with owner and due date, attendees), contact signal, lead score (band, detected signals with evidence, rationale), recap email, and CRM record identifier.
- **FR-002**: System MUST support a transcript lifecycle with four statuses: "processing" (AI pipeline in progress), "draft" (AI complete, awaiting user review), "saved" (user reviewed and committed to CRM), and "failed" (AI processing errored).
- **FR-003**: System MUST associate every transcript with a specific user (the owner who created or received the transcript).
- **FR-004**: System MUST support multiple transcript sources: manual upload and future webhook-driven ingestion (Zoom, Microsoft Teams, Google Meet) — distinguished by a source field.
- **FR-005**: System MUST support webhook deduplication by storing an external meeting identifier that serves as a uniqueness key for vendor-triggered transcript jobs.
- **FR-006**: System MUST store the raw webhook payload for any webhook-triggered transcript, enabling debug replay and re-processing.
- **FR-007**: System MUST store lead-scoring rubric signals as data records with: a stable unique identifier (slug), a human-readable label, a scoring band weight (hot/warm/cold), a source indicator (client-provided or proposed), keyword/phrase detection hints, and an active/inactive flag.
- **FR-008**: System MUST support soft-deletion of rubric signals (marking inactive rather than removing) so that historical transcript references remain valid.
- **FR-009**: System MUST snapshot the rubric signal's label at detection time when recording detected signals in a transcript, decoupling historical records from future edits to the rubric.
- **FR-010**: System MUST provide a database connection mechanism that is reusable across all server-side operations without requiring manual connection management at each call site.
- **FR-011**: System MUST ensure that the database connection fails fast (within seconds) when the database is unreachable, rather than hanging or buffering commands.
- **FR-012**: System MUST deduplicate concurrent connection attempts during cold start, ensuring only one connection is established and shared.
- **FR-013**: System MUST support efficient querying of transcripts by: user + status + date (primary list view), user + date (all transcripts chronologically), external meeting identifier (webhook dedup), and CRM record identifier (CRM lookup).
- **FR-014**: System MUST coexist with the existing shared MongoDB database and its `users` collection without modifying the existing collection in any way.

### Key Entities

- **Transcript**: The central record for a call recording processing job. Contains the raw and cleaned transcript text, a structured summary (narrative, observations, topics, decisions, action items, attendees), a contact signal, a lead score with detected rubric signals and evidence, a generated recap email, and a CRM record reference. Each transcript belongs to exactly one user and progresses through a defined status lifecycle.
- **Rubric Signal**: A configurable lead-scoring rule stored in the database. Defines what the AI looks for in transcripts to determine lead temperature. Has a stable unique identifier so that historical references in transcripts remain valid even if the signal's label or hints are later edited. Can be activated or deactivated without deletion.
- **User** *(existing)*: The owner of transcripts. Already exists in the shared database — must not be modified by this feature. Transcripts reference users by their existing identifier.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All transcript fields defined in the specification can be stored and retrieved without data loss — including nested structures (summary sub-fields, action items, detected signals with evidence).
- **SC-002**: Transcript queries by user and status return results ordered by creation date (newest first) and complete within acceptable interactive response times.
- **SC-003**: Duplicate webhook-triggered transcripts for the same external meeting are prevented by the system (zero duplicate records for the same meeting identifier).
- **SC-004**: Rubric signals can be added, updated, and deactivated through data operations alone — no application code changes or restarts required for rubric modifications.
- **SC-005**: Historical transcript records retain the original signal label from detection time, even after the rubric signal's label is subsequently edited.
- **SC-006**: The database connection is established within seconds on first use and reused for all subsequent operations within the same application lifecycle — no redundant connections.
- **SC-007**: When the database is unreachable, operations fail with a clear error within seconds rather than hanging indefinitely.
- **SC-008**: Concurrent cold-start operations share a single connection attempt — no connection stampede under load.

## Assumptions

- The existing shared MongoDB database is accessible and the application has read/write permissions for creating new collections alongside the existing `users` collection.
- The `MONGO_URI` connection string is already configured and validated at startup via the existing `env.mjs` schema — this feature does not need to implement environment validation, only consume the validated value.
- The `users` collection schema and structure are owned by the existing Kaffea-X web application and will not be modified or migrated by this feature. Transcripts reference users by their existing identifier.
- Manual transcript upload is the initial ingestion method. Webhook-driven ingestion (Zoom, MS Teams, Google Meet) is a future capability — the data model accommodates it from the start but no webhook handling is built in this feature.
- CRM integration (Zoho) is a downstream feature. This feature only reserves the CRM record identifier field in the transcript schema; no CRM push logic is implemented.
- The database connection layer will be used exclusively on the server side (server actions, repository classes, background jobs). No client-side database access is intended or supported.
