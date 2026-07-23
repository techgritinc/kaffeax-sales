# Contract: RubricSignalRepository

**Location**: `src/repositories/rubric-signal.repository.ts` (future)

**Dependencies**: `@/lib/db` (Mongoose connection + RubricSignal model)

This contract defines the public interface for the rubric signal repository class. The repository encapsulates all database operations for the `rubricSignals` collection.

> **Note**: The repository class itself is NOT implemented in this feature. This contract documents the expected interface so that the Mongoose schema and indexes are designed to support these operations efficiently.

## Interface

### `findActive(): Promise<RubricSignal[]>`

Retrieve all active rubric signals.

- **Filter**: `isActive: true`
- **Index used**: `{ isActive: 1 }`
- **Returns**: Array of active signals (may be empty)
- **Supports**: FR-007, SC-004

### `findByWeight(weight: SignalWeight): Promise<RubricSignal[]>`

Retrieve rubric signals filtered by scoring band.

- **Filter**: `weight` equals provided value
- **Index used**: `{ weight: 1 }`
- **Returns**: Array of matching signals
- **Supports**: FR-007

### `findBySignalId(signalId: string): Promise<RubricSignal | null>`

Look up a single signal by its stable slug identifier.

- **Index used**: `{ signalId: 1 }` (unique)
- **Returns**: Matching document or `null`
- **Supports**: FR-007

### `upsert(signalId: string, data: UpsertRubricSignalInput): Promise<RubricSignal>`

Insert a new signal or update an existing one by `signalId`.

- **Upsert key**: `signalId` (unique index ensures no duplicates)
- **Returns**: The upserted document
- **Supports**: FR-007, SC-004

### `deactivate(signalId: string): Promise<RubricSignal | null>`

Soft-delete a signal by setting `isActive: false`.

- **Does not remove** the document; historical references in transcripts remain valid
- **Returns**: Updated document or `null` if not found
- **Supports**: FR-008

### `activate(signalId: string): Promise<RubricSignal | null>`

Re-enable a previously deactivated signal.

- **Returns**: Updated document or `null` if not found
- **Supports**: FR-008
