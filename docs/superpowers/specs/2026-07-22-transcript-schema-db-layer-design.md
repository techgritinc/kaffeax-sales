# Transcript Schema & DB Connection Layer — Design

**Date:** 2026-07-22
**Feature:** AI Call Summary — MongoDB schema + database connection infrastructure
**Branch convention:** `chore/mongoose-setup` (already active)

---

## Context

Kaffea-X Sales is a sales ops automation tool centred on AI-generated call summaries. This spec
covers the two foundational pieces that everything else depends on:

1. The MongoDB schema for the `transcripts` and `rubricSignals` collections.
2. The database connection layer — a singleton Mongoose connection with a `withDb` wrapper so
   no call site has to manually invoke `connectDB()`.

The app shares a live MongoDB database with the existing Kaffea-X web application. The `users`
collection is already there; we must not modify it.

---

## Collections

### `transcripts`

One document per call recording / transcript processing job. Stores the raw transcript, the
AI-cleaned transcript, the full structured summary, the AI-extracted contact signal, the lead
score, and the generated recap email — all in a single document.

**Rationale for single collection (no separate `summaries`):** The summary is always 1:1 with
a transcript. There is no scenario where a summary exists without a transcript, or vice versa.
Embedding is the correct MongoDB pattern here. A separate collection would mean two queries on
every read with no benefit. Status-based filtering (draft/saved) replaces any need for a
`draft_summaries` collection.

```
transcripts {
  _id:                ObjectId          — primary key
  userId:             ObjectId          — ref: users._id (owner of this transcript)
  title:              String            — e.g. "Discovery call — Cascade Ember"
  status:             String            — enum: "processing" | "draft" | "saved" | "failed"
  source:             String            — enum: "manual" | "zoom" | "ms_teams" | "google_meet"
  externalMeetingId:  String | null     — vendor meeting ID; null for manual uploads
  webhookPayload:     Object | null     — raw vendor webhook body, stored for debug / replay
  originalTranscript: String            — verbatim transcript text (manual paste or vendor)
  cleanedTranscript:  String            — AI-cleaned / formatted version
  summary: {
    narrative:        String            — one-paragraph AI summary of the entire call
    whatWeHeard:      String[]          — key signals / observations from the prospect's side
    whatWasCovered:   String[]          — topics that came up during the call
    whatWasDiscussed: String[]          — substantive discussion points (distinct from topics)
    whatWasDecided:   String[]          — decisions reached on the call
    actionItems: [{
      description:    String
      owner:          String            — "Mohan" | "prospect" | team member name
      dueDate:        String            — natural language: "by Monday", "next week"
    }]
    attendees: [{
      name:           String
      side:           String            — "kaffea_x" | "prospect"
    }]
  }
  contact: {
    email: {
      value:          String
      confidence:     String            — "high" | "medium" | "low"
    }
  }
  leadScore: {
    band:             String            — "hot" | "warm" | "cold"
    detectedSignals: [{
      id:             String            — stable slug matching rubricSignals.signalId
      label:          String            — snapshot of label at detection time
      evidence:       String            — transcript excerpt that fired this signal
    }]
    rationale:        String            — human-readable scoring explanation
  }
  recapEmail:         String | null     — AI-generated recap email body
  zohoLeadId:         String | null     — Zoho CRM record ID; null until pushed to CRM
  createdAt:          Date
  updatedAt:          Date
}
```

**Status lifecycle:**

```
manual upload → "processing" → "draft" → "saved"
                             ↘ "failed"

webhook trigger → "processing" → "draft" → "saved"
                               ↘ "failed"
```

`draft` = AI processing complete, awaiting user review and CRM push.
`saved` = user has reviewed and committed; `zohoLeadId` is populated.
`failed` = AI processing errored; originalTranscript is still stored.

**Indexes:**

```
{ userId: 1, status: 1, createdAt: -1 }   — primary list query (user's transcripts by status)
{ userId: 1, createdAt: -1 }              — all transcripts for a user, chronological
{ externalMeetingId: 1 }                  — sparse unique; webhook deduplication
{ zohoLeadId: 1 }                          — sparse; look up by CRM record
```

---

### `rubricSignals`

Stores the lead-scoring rubric signals that the AI uses to classify calls as hot / warm / cold.
Signals are fetched from the database so new ones can be added or disabled without a code deploy.

```
rubricSignals {
  _id:        ObjectId
  signalId:   String      — stable slug, e.g. "distribution_pipeline_challenge"
  label:      String      — human-readable label shown in the UI
  weight:     String      — "hot" | "warm" | "cold"
  source:     String      — "client" | "proposed"
  hints:      String[]    — keyword/phrase hints used for signal detection in transcripts
  isActive:   Boolean     — false = soft-deleted / temporarily disabled (not removed)
  createdAt:  Date
  updatedAt:  Date
}
```

`signalId` is a unique index. When a signal is detected in a transcript, its `signalId` and a
snapshot of its `label` at detection time are stored in `transcript.leadScore.detectedSignals`.
Snapshots decouple historical records from future edits to the rubric.

**Indexes:**

```
{ signalId: 1 }       — unique; used for upserts
{ weight: 1 }         — filter by scoring band
{ isActive: 1 }       — filter active signals only
```

---

## Database Connection Layer

Location: `src/lib/db/`

Two files, following the pattern from the existing Kaffea-X platform:

### `src/lib/db/mongoose.ts`

Singleton Mongoose connection with a global process-level cache. Key behaviours:
- **Fail fast** — `serverSelectionTimeoutMS: 3000`, `bufferCommands: false`
- **Connection reuse** — second call returns the cached connection immediately
- **Promise deduplication** — concurrent calls during cold start share one in-flight promise
- **Clean retry** — on connection failure, the cached promise is cleared so the next request
  can attempt a fresh connection
- Reads `MONGO_URI` from `env.mjs` (already validated at startup by the T3 env schema)

### `src/lib/db/withDb.ts`

A higher-order wrapper that ensures the DB is connected before the wrapped function runs.
Supports two call shapes:

```typescript
// Shape 1 — zero-arg async task (repository calls, background jobs)
await withDb(() => transcriptRepository.findDrafts(userId));

// Shape 2 — Next.js route handler (future webhook endpoints)
export const POST = withDb(async (req: Request) => { ... });
```

This eliminates `await connectDB()` boilerplate at every call site.

### `tsconfig.json` — path alias

Add `"@env": ["./env.mjs"]` to `compilerOptions.paths` so `mongoose.ts` can import the
validated env object with `import { env } from '@env'`, matching the KX platform convention.

### Dependencies

`mongoose` is not yet installed. Must be added: `npm install mongoose`.
`@types/mongoose` is not needed — mongoose ships its own TypeScript types.

---

## Webhook Extensibility (future)

The schema is designed to accommodate webhook-driven ingestion without migration:

- `source` field distinguishes manual uploads from vendor-triggered jobs.
- `externalMeetingId` is the deduplication key for idempotent webhook processing.
- `webhookPayload` stores the raw vendor body so any replay or re-processing is possible.
- `status: "processing"` is the initial state for webhook-triggered jobs; the AI pipeline
  updates it to `"draft"` or `"failed"` when done.

When Zoom / Microsoft Graph webhooks are integrated, a new route handler will:
1. Validate the webhook signature.
2. Create a `transcript` document with `status: "processing"`, `source: "zoom"` (or `"ms_teams"`),
   `externalMeetingId`, and `webhookPayload`.
3. Trigger the AI pipeline (server action or background job).
4. AI pipeline updates `cleanedTranscript`, `summary`, `leadScore`, `status: "draft"`.

No schema changes are needed at that point.

---

## Files to Create

```
src/
└── lib/
    └── db/
        ├── mongoose.ts     — singleton connect() + ensureConnected() + disconnect()
        └── withDb.ts       — withDb() higher-order wrapper
```

Plus `tsconfig.json` patch (`@env` path alias) and `npm install mongoose`.

---

## Out of Scope

- Mongoose model / schema files (`TranscriptModel`, `RubricSignalModel`) — those come with
  the repository layer in the next feature ticket.
- Repository classes — next ticket.
- AI pipeline integration — separate feature.
- Zoho CRM push — separate feature.
- Zoom / Microsoft Graph webhook handlers — separate feature.
