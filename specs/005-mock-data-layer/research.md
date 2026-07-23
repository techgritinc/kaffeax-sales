# Phase 0 Research: Mock Data Layer with Server Actions

All spec clarifications were resolved in `/speckit-clarify` (Q1 map-at-boundary, Q2 modeled-collections-only, Q3 full stateful CRUD). This document records the remaining design decisions the plan depends on. There are no open `NEEDS CLARIFICATION` items.

---

## D1. Persistence-canonical mock with a presentation supplement (the mapping strategy)

**Decision**: The mock store holds records in the **persistence-model shape** (`TranscriptFields`, `RubricSignalFields`). Because the current UI shows fields the `Transcript` schema does not model, each seed transcript fixture also carries an isolated, clearly-labeled **presentation supplement** for exactly those view-only fields. A bidirectional mapper composes `persistence + supplement → MeetingRecord` on read and decomposes `MeetingRecord → persistence (+ supplement)` on write.

**Rationale**: FR-002/SC-007 want the persisted shape to be authoritative so the future migration is a one-file swap. But the two shapes are **not losslessly convertible** — the schema is the lossy side. The following view-model data has no home in the `Transcript` schema and is displayed today (verified in `sidebar-item.tsx`, `review-screen.tsx`, `action-items.tsx`, `commit-card.tsx`):

| View-model field (displayed) | In `Transcript` schema? |
|---|---|
| `contact.name / company / title` + per-field `confidence` | ❌ (schema has `contact.email` only) |
| `summary.topics`, `summary.open_questions`, `summary.commitments` | ❌ |
| `recap_email.subject` (body maps to `recapEmail` string) | ❌ (schema stores a single string) |
| `lead_score.detected_signals[].weight` | ❌ (re-derivable from the rubric by signal id) |

Since UI changes are prohibited (SC-006) and schema changes are out of scope, the surplus must live somewhere; an isolated supplement keeps the persisted shape clean while preserving behavior.

**Alternatives considered**:
- *View-canonical mock* (author fixtures as `MeetingRecord`, derive persistence on demand): lower model-alignment; weaker literal compliance with FR-002; migration story less crisp. Rejected in favor of persistence-canonical.
- *Persistence-only mock, no supplement*: would drop company/title/confidence/etc. from the UI → prohibited behavior change. Rejected.
- *Extend the Mongo schema to model the surplus*: cleanest long-term, but the brief forbids schema deviation. Rejected (recorded as follow-up below).

**Migration follow-up (documented, out of scope)**: On real-DB migration, the presentation supplement must either (a) graduate into the `Transcript` schema, or (b) be dropped with a corresponding UI decision. Until then, SC-007's "zero UI change on swap" holds for the **modeled** fields; the supplement is a known, localized exception. This is the single most important thing for a future implementer to know.

**Field mapping** is enumerated in `data-model.md`.

---

## D2. Reconciling stateful CRUD (Q3) with "no behavior change" (SC-006) via optimistic client state

**Decision**: The client `WorkflowProvider` remains the **immediate render source** (optimistic state, exactly as today). Mutations additionally call the corresponding `'use server'` action which updates the in-memory store; the store — not the client — is the session source of truth for subsequent reads/reloads. The UI updates synchronously first; the server action is awaited in the background with error handling. High-frequency inline edits (`patch`) update client state immediately and are persisted to the store at the next discrete transition (draft create / approve), not per keystroke.

**Rationale**: Q3 requires mutations to flow through actions and be reflected in reads, but SC-006 forbids any perceptible behavior/timing change. Optimistic UI is the standard Next.js Server-Actions pattern and yields identical UX while making the store authoritative. Persisting `patch` per keystroke would add latency/chattiness and risk timing changes — folding persistence into the create/approve transition preserves behavior while keeping the store consistent at every point the data is actually read.

**Alternatives considered**:
- *Server-authoritative (await before render)*: would introduce network round-trip latency into every interaction → perceptible change. Rejected.
- *Persist every `patch`*: unnecessary chatter, timing risk. Rejected.

---

## D3. In-memory store shape, seeding, and reset

**Decision**: A module-level singleton in `src/lib/db/mock/store.ts` holds `Map`-like collections of persistence records (`transcripts`, `rubricSignals`) plus the sample transcript text. It lazily seeds from the fixtures on first access and exposes `resetStore()` used by the workflow's `resetDemo`. IDs are strings (the existing `ZOHO-*`, `DRF-*` prefixes), preserving current id semantics; mock reads/writes are `async` to mirror DB latency semantics and match the real repository signatures.

**Rationale**: A singleton mirrors a single database instance for the demo; `async` methods mean swapping to Mongoose changes only the repository body, not signatures (SC-007). Reset is required so `resetDemo` behaves as today.

**Note on server semantics**: Module state is per server process and shared across requests — acceptable for a single-user demo. Documented so no one mistakes it for per-session isolation.

---

## D4. Server/client hydration seam

**Decision**: `src/app/page.tsx` becomes an `async` Server Component that calls the read actions (`getTranscripts`, `getRubric`, `getSampleTranscript`) and passes results as props (`initialLibrary`, `initialRubric`, `initialSample`) into `WorkflowProvider`. The provider initializes its `useState` from props instead of importing `seed.ts`.

**Rationale**: Guarantees the first client paint already has the data (no loading/empty flash → no behavior change), removes the direct mock import from the provider (FR-003), and keeps mutations as client-invoked server actions. Values are byte-identical to today's seed, so there is no hydration mismatch.

**Alternatives considered**:
- *Client-side `useEffect` fetch on mount*: introduces a loading flash / empty first render → behavior change. Rejected.

---

## D5. `CURATED` is engine reference data, not a database record

**Decision**: `CURATED` (the hand-authored extraction answer the engine substitutes when the input matches the sample transcript) stays in the **engine's business-logic domain**, not the DB mock layer. It moves from `seed.ts` into an engine-local fixture and is imported by `engine.ts` as today.

**Rationale**: `CURATED` is not a `Transcript` record — it is a partial extraction *result* baked into the mock processing algorithm. Treating it as DB mock data would (a) force the client engine to fetch it via a server action, changing the synchronous processing behavior (prohibited), and (b) misclassify algorithm reference data as persisted data. Keeping it with the engine respects "engine unchanged" and "no direct mock-DB imports in UI".

**Scope line**: The DB mock layer owns `SEED_LIBRARY` (transcript records), `DEFAULT_RUBRIC` (rubric-signal records), and `SAMPLE` (sample `originalTranscript` text, served via `getSampleTranscript`). `CURATED` and the `makeSeed`/`buildRecap`/`buildNarrative` builders stay engine-side.

---

## D6. CRM projection, audit, and chat (Q2 differentiated treatment)

**Decision**: "Commit to CRM" is modeled as a Transcript state change — `updateTranscript(id, { status: 'saved', zohoLeadId })`. The CRM list shown in the commit view is **derived** from committed-transcript reads (mapped to `CrmRecord`), not stored separately and given no new model. Audit entries and chat messages remain ephemeral client-side session state exactly as today; `cannedResponse()` stays as mock business logic.

**Rationale**: Directly implements clarification Q2 (Option A). Keeps the layer scoped to the two real models and avoids speculative schema design (YAGNI, §XV).

---

## D7. Type consolidation scope (Q1 retained view-models)

**Decision**: Persistence types (`transcript.types.ts`, `rubric-signal.types.ts`) are the single authoritative persisted shapes. The view-model types (`meeting`, `rubric`, `scoring`, `workflow`) are **retained** (Q1) because the UI consumes them and mapping happens at the boundary. Only types that are genuine redundant *duplicates of a persistence model* (not distinct view-models) are removed. If a presentation-supplement type is needed, it lives beside the persistence type in `src/types/transcript.types.ts` (Mongoose-free, frontend-safe per §XI).

**Rationale**: Honors Q1 while still satisfying FR-007's "one authoritative definition per persisted concept." No net-new global types file; no `any`.

**Verification note**: A sweep for duplicate/outdated types will be part of implementation; current inspection shows the view-models are distinct (not duplicates) and must stay, so removals are expected to be minimal.
