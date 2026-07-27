# Contract: TranscriptRepository

**Location**: `src/repositories/transcript.repository.ts` (future)

**Dependencies**: `@/lib/db` (Mongoose connection + Transcript model)

This contract defines the public interface for the transcript repository class. The repository encapsulates all database operations for the `transcripts` collection, following the constitution's repository layer principle (IX).

> **Note**: The repository class itself is NOT implemented in this feature. This contract documents the expected interface so that the Mongoose schema and indexes are designed to support these operations efficiently.

## Interface

### `create(data: CreateTranscriptInput): Promise<Transcript>`

Create a new transcript document.

- **Input**: All required fields (`userId`, `title`, `source`, `originalTranscript`) plus optional fields
- **Initial state**: `status` defaults to `"processing"`
- **Returns**: The created document with `_id`, `createdAt`, `updatedAt`
- **Supports**: FR-001, FR-002, FR-003, FR-004

### `findById(id: string): Promise<Transcript | null>`

Retrieve a single transcript by its `_id`.

- **Returns**: Full document or `null` if not found
- **Supports**: FR-001

### `findByUser(userId: string, options?: { status?: TranscriptStatus; limit?: number; offset?: number }): Promise<Transcript[]>`

List transcripts for a user, optionally filtered by status.

- **Default sort**: `createdAt` descending (newest first)
- **Pagination**: `limit` and `offset` for cursor-free pagination
- **Index used**: `{ userId: 1, status: 1, createdAt: -1 }` when status provided; `{ userId: 1, createdAt: -1 }` otherwise
- **Supports**: FR-013, SC-002

### `findByExternalMeetingId(externalMeetingId: string): Promise<Transcript | null>`

Look up a transcript by vendor meeting ID (webhook deduplication).

- **Index used**: `{ externalMeetingId: 1 }` (sparse unique)
- **Returns**: Matching document or `null`
- **Supports**: FR-005, SC-003

### `findByZohoLeadId(zohoLeadId: string): Promise<Transcript | null>`

Look up a transcript by CRM record ID.

- **Index used**: `{ zohoLeadId: 1 }` (sparse)
- **Returns**: Matching document or `null`
- **Supports**: FR-013

### `updateStatus(id: string, status: TranscriptStatus, updates?: Partial<Transcript>): Promise<Transcript | null>`

Transition a transcript to a new status, optionally updating other fields.

- **Validation**: Status transitions should follow the lifecycle (processing → draft/failed, draft → saved)
- **Returns**: Updated document or `null` if not found
- **Supports**: FR-002

### `updateSummary(id: string, summary: TranscriptSummary): Promise<Transcript | null>`

Update the structured summary after AI processing.

- **Supports**: FR-001

### `updateLeadScore(id: string, leadScore: LeadScore): Promise<Transcript | null>`

Update the lead score and detected signals after AI scoring.

- **Note**: `detectedSignals[].label` is a snapshot captured at this point
- **Supports**: FR-001, FR-009, SC-005
