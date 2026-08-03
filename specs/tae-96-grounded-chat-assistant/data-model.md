# Phase 1 Data Model: Grounded Chat Assistant (TAE-96)

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)

All field names are camelCase (§XVIII), in the database as well as in the AI contract. Nothing here introduces a mapping layer.

---

## GroundingContext

`src/types/chat.types.ts` — server-side only. The complete and only permitted grounding material for one answer. Assembled per question from `transcriptRepository.findById`, never sent to the client, never logged.

| Field | Type | Source | Notes |
|---|---|---|---|
| `transcriptId` | `string` | `StoredTranscript.id` | Logging and cost attribution only — never placed in the prompt. |
| `meetingTitle` | `string` | `fields.title` | AI-generated title. |
| `cleanedTranscript` | `string` | `fields.cleanedTranscript` | The primary grounding material. |
| `summary` | `TranscriptSummary` | `fields.summary` | Includes `whatWeHeard`, which the client view-model drops. |
| `leadScore` | `TranscriptLeadScore` | `fields.leadScore` | Band, percentage, rationale, detected signals with evidence. |

**There is deliberately no conversation field.** FR-031 requires that stored turns never influence an answer, and the strongest way to guarantee that is for the grounding type to have nowhere to put them. Adding one would be a visible contract change, not an accident.

**Assembly rules**

- Built only when `fields.aiProcessingStatus === 'success'`. Any other status short-circuits to the no-analysis outcome (FR-025) without an AI call.
- `cleanedTranscript` must be non-empty. Empty is treated as no-analysis, not as an empty meeting.
- Combined character length of `cleanedTranscript` + serialised analysis must not exceed `MAX_GROUNDING_CHARS`. Over the ceiling returns `context_too_large` — never truncate (FR-026, D5).
- One `GroundingContext` derives from exactly one transcript document. Never cross-meeting.

---

## ChatQuestion

Input to `askAboutMeeting`. Validated by `chatQuestionSchema` in `src/schemas/chat.schema.ts`.

| Field | Type | Validation |
|---|---|---|
| `transcriptId` | `string` | `min(1)`. Non-existent id → failure, not an empty answer. |
| `question` | `string` | Trimmed, `min(1)`, `max(MAX_QUESTION_CHARS)`. Empty is rejected client-side too (FR-022); the server check is the backstop, not the only guard. |

**No conversation history field** — turns are independent (FR-015) and restored turns are display-only (FR-031). There is nothing else to send, and no field through which history could arrive.

---

## ChatExchange — the persisted entity

One document per question-and-answer pair in the new `chatexchanges` collection. Plain types in `src/types/chat.types.ts`; `Schema`, indexes, and model in `src/lib/db/models/chat-exchange.model.ts` (§XI split).

### `ChatExchangeFields`

| Field | Type | Notes |
|---|---|---|
| `transcriptId` | `ObjectId` (persisted) / `string` (plain type) | The meeting this exchange belongs to. Required, indexed. |
| `question` | `string` | Required, as the user typed it (trimmed). |
| `answer` | `string` | Required. The full AI text — grounded answer or refusal. |
| `kind` | `'answer' \| 'refusal'` | Required. Both render identically today (FR-009); stored separately for evaluation and any future filtering. |
| `usage` | `AiUsage` | Required. Per-answer token counts and cost, reusing the existing shape and sub-schema. |

`createdAt` / `updatedAt` come from `{ timestamps: true }`.

### `StoredChatExchange`

The read shape, mirroring `StoredTranscript`:

```
{ id: string; fields: ChatExchangeFields; createdAt: Date; updatedAt: Date }
```

### Index

`{ transcriptId: 1, createdAt: 1 }` — serves the only read query (a meeting's exchanges in order) and the cascade delete.

### Why one document per *exchange*

Turns are strictly paired: stateless single-turn answering means every persisted question has exactly one AI response. One write per exchange makes `createdAt` ascending an unambiguous ordering — two separate documents written in the same millisecond would need a sequence field to sort deterministically. It also halves document and index count, and gives `usage` exactly the granularity cost reporting wants (D9).

On load, one exchange expands into two `ChatMessage` bubbles. That is a rendering concern, not a storage one.

### What is *not* stored

**Failure notices are not persisted** (D8). An exchange is committed only once a real answer or refusal exists. Rationale:

- A restored "Service is temporarily busy" bubble from three days ago is noise, and mildly alarming — it describes a condition that has almost certainly passed.
- Persisting the question but not the failed answer would leave a dangling question bubble on restore, which reads as a bug.

The user sees the failure live; the record contains what actually happened in the conversation.

This is now normative rather than an interpretation: FR-014 states that only completed exchanges are persisted and that failure notices are shown live but never stored, and Key Entities describes exchanges carrying an answer or a refusal. (Both were amended on 2026-07-29 after `/speckit-analyze` flagged the original wording as contradicting this design.)

### Lifecycle

| Event | Effect |
|---|---|
| Answer or refusal produced | One exchange inserted (best-effort — FR-032). |
| Operational failure | Nothing written. |
| Meeting reopened | All exchanges for that `transcriptId` read in `createdAt` order. |
| Meeting deleted | All its exchanges deleted (FR-033). |
| Time passes | Nothing. No expiry, archival, or redaction is in scope. |

No update path — an exchange is immutable once written. Editing or deleting individual turns is out of scope.

---

## Per-meeting cost

SC-009 is satisfied by aggregating `usage` over a meeting's exchanges. No aggregate counters, no `$inc`, no transcript schema change — and unlike an aggregate, `model` and `provider` are preserved exactly per answer instead of being last-write-wins.

The previous revision of this plan carried a droppable phase to maintain `chatUsage` / `chatAnswerCount` on the transcript document. Persisting exchanges made that phase unnecessary: the reversal that added a collection also removed a schema change.

---

## AI answer contract

`src/schemas/chat-answer.schema.ts`. Unchanged by the persistence decision. Full semantics and prompt wording in [contracts/ai-response.md](./contracts/ai-response.md).

| Field | Type | Meaning |
|---|---|---|
| `inScope` | `boolean` | Whether the question can be answered from the grounding material at all. `false` drives a refusal. |
| `answer` | `string` | The prose answer when `inScope` is true; the refusal text when false. Non-empty either way. |
| `evidenceSpans` | `string[]` | Verbatim spans from the transcript or analysis supporting every factual claim. Required non-empty when `inScope` is true and the topic was covered. |
| `coveredInMeeting` | `boolean` | `true` when the meeting genuinely addressed the topic; `false` when the question is in scope but was never discussed (the SC-003 case). |
| `unanswerablePart` | `string \| null` | For partly-answerable questions, the portion the model could not address (FR-010). |

Two flags rather than one, deliberately: "outside this meeting's scope" (`inScope: false`) and "in scope but never discussed" (`coveredInMeeting: false`) are different answers to the user and are measured by different criteria (SC-002 vs SC-003). Collapsing them would leave the evaluation unable to tell a guardrail failure from a recall failure.

---

## Evidence verification

Applied in `grounded-chat.utils.ts` after schema validation, before any answer is returned or persisted. The mechanical half of SC-001.

1. Normalise haystack and span: collapse whitespace runs to a single space, trim, lowercase.
2. Haystack is `cleanedTranscript` plus every string field of `summary` and `leadScore` (narrative, list entries, action item descriptions and owners, attendee names, rationale, signal labels and evidence).
3. Every entry in `evidenceSpans` must appear in the haystack as a substring. A span that does not is a fabrication.
4. Any unverified span rejects the whole answer: retry once (`MAX_CHAT_ATTEMPTS`), then return a `malformed_response` failure. Never surface, and never persist, a partially verified answer.
5. Skipped when `inScope` is false — a refusal has no factual claims to ground.

Parallels the hallucinated-signal stripping in `processStructuredResponse` (`structured-analysis.utils.ts:66-75`). The difference: there, an unrecognised signal is dropped and the rest kept; here an unverifiable span invalidates the answer, because the prose depends on it.

---

## MeetingChatResponse

`src/types/chat.types.ts`. Discriminated union returned by the provider integrations and, after mapping, by `askAboutMeeting`.

```
MeetingChatResponse =
  | ChatAnswerResult   { success: true;  kind: 'answer';  answer, evidenceSpans, coveredInMeeting, unanswerablePart, model, provider, usage }
  | ChatRefusalResult  { success: true;  kind: 'refusal'; answer, model, provider, usage }
  | ChatFailure        { success: false; category, message, retryAfterMs }
```

`ChatFailure.category` reuses `SummarizationErrorCategory` (`authentication`, `rate_limit`, `invalid_request`, `network`, `api_error`, `malformed_response`) plus two feature-specific members:

| Category | Cause | User-facing message intent |
|---|---|---|
| `no_analysis` | Open meeting has no successful analysis (FR-025) | Nothing to answer from yet. |
| `context_too_large` | Grounding exceeds `MAX_GROUNDING_CHARS` (D5) | This meeting is too long to answer questions about. |

`usage` is the existing `AiUsage` shape, so cache reads and per-answer cost are visible with no new type — and it is the same value written to the exchange document.

**A refusal carries `success: true`.** FR-009 requires refusals to read as answers; routing them through the failure path would present correct behaviour as a malfunction (D6). It is also why refusals *are* persisted while failures are not — a refusal is part of the conversation.

---

## ChatMessage (client, extended)

`src/types/workflow.types.ts` — existing type, one field added.

| Field | Type | Change |
|---|---|---|
| `id` | `string` | unchanged |
| `role` | `ChatRole` | unchanged |
| `text` | `string` | unchanged |
| `pending` | `boolean?` | unchanged |
| `kind` | `'answer' \| 'refusal' \| 'failure' \| undefined` | **new** — lets `chat-messages.tsx` style a failure distinctly while answers and refusals render identically (FR-009). Optional, so user messages and the opening line are unaffected. |

Note `kind` has three values client-side but only two are persisted: `failure` exists for the live session only (D8).

Deliberately does **not** carry `evidenceSpans` as structured data. Grounding is expressed inside `text` as the model wrote it (FR-005), keeping the render path and the prototype's single-bubble layout untouched (FR-024). The spans exist server-side to be *verified*; surfacing them as separate UI would be a visual change this feature has no licence to make.

### Mapping restored exchanges

`chat-message.mapper.ts` turns `StoredChatExchange[]` into `ChatMessage[]`: each exchange yields a `user` message carrying `question`, then an `ai` message carrying `answer` with `kind` from the stored value. Message ids derive from the exchange id (`${id}-q`, `${id}-a`) so React keys are stable across re-renders without a client counter.

---

## Data flow

### Asking

```
ChatPanel (client)
  └─ use-meeting-chat  { transcriptId, question }         ← no transcript, no history
       └─ askAboutMeeting (server action)
            ├─ chatQuestionSchema.parse
            ├─ transcriptRepository.findById              ← §IX
            ├─ aiProcessingStatus check                   → no_analysis
            ├─ size ceiling check                         → context_too_large
            ├─ buildGroundingContext                      ← no conversation field exists
            ├─ getMeetingChat()  (env-selected provider)
            │    ├─ buildGroundedChatPrompt(context)      ← cached system prefix
            │    ├─ provider call (question in user turn)
            │    └─ processChatResponse(raw, context)     ← Zod + evidence verification
            ├─ chatExchangeRepository.create              ← answers/refusals only, best-effort
            └─ MeetingChatResponse
       └─ render as ChatMessage { kind }
```

### Restoring

```
activeId changes
  └─ use-meeting-chat: clear immediately                  ← no frame shows the wrong meeting
       └─ getMeetingConversation(transcriptId)
            └─ chatExchangeRepository.listByTranscript    ← indexed, ordered
       └─ toChatMessages(exchanges)
       └─ render; opening message only when empty
```

Every arrow carrying transcript content stays server-side. The only things crossing to the browser are questions, answers, and a kind discriminator — and restored content, being questions and answers the user already saw, adds no new exposure.
