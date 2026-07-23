# Contract: Mappers & Repositories (internal boundary)

## Repositories (`src/repositories/`) — the DB swap seam

Both classes expose `async` CRUD over persistence-model types. **Today** their bodies read/write `src/lib/db/mock/store.ts`. **On migration** their bodies call the Mongoose models in `src/lib/db/models/`. Nothing else in the app references the store or the models directly.

### `TranscriptRepository`

```
findAll(): Promise<TranscriptFields[]>
findById(id: string): Promise<TranscriptFields | null>
create(doc: TranscriptFields): Promise<TranscriptFields>
update(id: string, patch: Partial<TranscriptFields>): Promise<TranscriptFields | null>
delete(id: string): Promise<boolean>
reset(): Promise<void>            // mock-only; no-op / re-seed under real DB
```

### `RubricSignalRepository`

```
findActive(): Promise<RubricSignalFields[]>
create(doc: RubricSignalFields): Promise<RubricSignalFields>
update(id: string, patch: Partial<RubricSignalFields>): Promise<RubricSignalFields | null>
delete(id: string): Promise<boolean>
reset(): Promise<void>
```

**Return type = persistence-model type** (constitution §XI: repositories deal in persisted shapes; mapping to view-models happens in the action layer). Repositories NEVER import view-models.

## Mappers (`src/features/workflow/utils/`) — pure, no I/O

- `transcript.mapper.ts`: `toMeetingRecord(fields, supplement, rubric)`, `toTranscript(record) -> { fields, supplement }`. Pure functions; the field table is in `data-model.md`. Enum normalization (`kaffea_x ↔ kaffeax`) lives here.
- `rubric.mapper.ts`: `toRubric(signals)`, `toRubricSignals(rubric)`.
- Fully typed, no `any`, no non-null assertions. Independently unit-testable (constitution §VII).

## Presentation supplement source

The supplement is stored **with** each transcript fixture in `src/lib/db/mock/transcripts.fixture.ts` (co-located, clearly named). Under the mock store, `findById`/`findAll` return the persisted fields; the store also exposes the supplement so the action layer can compose the view-model. On real-DB migration the supplement is the documented follow-up (see `research.md` D1) — the mapper's supplement parameter becomes the graduated schema fields or is removed.

## Data-flow summary

```
page.tsx (server)          → getTranscripts()/getRubric()  → repo.findAll()/findActive() → store
   └─ props → WorkflowProvider (client, optimistic state)
client mutation → action (use server) → repo.create/update/delete → store
                        └─ mapper composes MeetingRecord/Rubric for the return value
```
