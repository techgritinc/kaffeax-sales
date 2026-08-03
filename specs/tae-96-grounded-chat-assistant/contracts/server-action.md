# Contract: server actions

**File**: `src/features/assistant-chat/actions/meeting-chat.actions.ts`
**Related**: [data-model.md](../data-model.md) · [ai-response.md](./ai-response.md)

Two Server Actions, not route handlers (§X). Together they are the entire interface between the chat panel and the assistant.

| Action | Purpose |
|---|---|
| `askAboutMeeting` | Answer one question about one meeting, and persist the exchange. |
| `getMeetingConversation` | Load a meeting's stored conversation for display. |

---

# `askAboutMeeting`

## Signature

```ts
'use server';

export async function askAboutMeeting(input: {
  transcriptId: string;
  question: string;
}): Promise<MeetingChatResponse>;
```

`MeetingChatResponse` comes from `@/types/chat.types` — a discriminated union, never a bare string or a thrown value for expected outcomes.

**There is no history parameter, and that is load-bearing.** FR-031 requires stored turns never to influence an answer. A signature with nowhere to put history makes that structurally true rather than a rule someone must remember. Adding one later would be a visible contract change.

## Input

Validated by `chatQuestionSchema` as the first statement in the action body.

| Field | Rule | On violation |
|---|---|---|
| `transcriptId` | `z.string().min(1)` | `invalid_request` failure |
| `question` | trimmed, `min(1)`, `max(MAX_QUESTION_CHARS)` | `invalid_request` failure |

The client also blocks empty submissions (FR-022) and concurrent submissions (FR-021). Those are UX guards; this validation is the authority.

## Outcomes

Exactly one of three shapes. The action **never throws for an expected outcome** — only a genuine programmer error escapes, via `logAndThrow` (§XIV).

### Grounded answer

```ts
{
  success: true,
  kind: 'answer',
  answer: string,              // prose, grounding surfaced inline (FR-005)
  coveredInMeeting: boolean,   // false ⇒ in scope but not discussed (SC-003)
  unanswerablePart: string | null,
  model: string,
  provider: AiProvider,
  usage: AiUsage,
}
```

Returned only after every `evidenceSpans` entry has been verified against the grounding material. An unverifiable span never reaches this branch, and therefore never reaches storage either.

### Refusal

```ts
{
  success: true,
  kind: 'refusal',
  answer: string,              // refusal text, written to read like an answer
  model: string,
  provider: AiProvider,
  usage: AiUsage,
}
```

`success: true` is deliberate (FR-009, D6). A refusal is the assistant working correctly, and it is persisted like any other exchange.

### Failure

```ts
{
  success: false,
  category: ChatErrorCategory,
  message: string,             // user-safe, no internals (FR-027)
  retryAfterMs: number | null,
}
```

| Category | Trigger | Message intent |
|---|---|---|
| `no_analysis` | `aiProcessingStatus !== 'success'`, or empty `cleanedTranscript` | Nothing to answer from yet — run the analysis first. |
| `context_too_large` | Grounding exceeds `MAX_GROUNDING_CHARS` | This meeting is too long to answer questions about. |
| `invalid_request` | Input validation failed, transcript not found, or the provider rejected the request | The question could not be processed. |
| `authentication` | Provider credentials rejected | Contact your administrator. |
| `rate_limit` | Provider rate-limited; `retryAfterMs` populated when supplied | Busy — try again shortly. |
| `network` | Provider unreachable or timed out | Could not reach the assistant. Check your connection. |
| `malformed_response` | Unusable AI output after `MAX_CHAT_ATTEMPTS`, **including evidence-verification failure** | Could not produce a reliable answer. Please try again. |
| `api_error` | Anything else from the provider | Unexpected error. Please try again. |

Messages are named constants (§XV). No stack traces, provider names, or model ids in any of them (FR-027).

**`malformed_response` covers verification failure.** A model that cites spans not present in the transcript has produced unusable output; the honest outcome is a retryable failure, not a silently unverified answer.

**Failures are not persisted** (D8). Nothing is written on this path.

## Execution order

Cheap rejections first, so a doomed request never reaches the provider:

1. `chatQuestionSchema.parse(input)` → `invalid_request`
2. `transcriptRepository.findById(transcriptId)` → not found ⇒ `invalid_request`
3. `aiProcessingStatus !== 'success'` or empty transcript ⇒ `no_analysis` — **no AI call**
4. Size ceiling ⇒ `context_too_large` — **no AI call**
5. Build `GroundingContext`
6. `getMeetingChat().ask(context, question)`
7. On success (answer or refusal): `chatExchangeRepository.create(...)` — **best-effort**
8. Return

Steps 3 and 4 short-circuiting before the provider is what makes FR-025 and the oversized-transcript case cheap and deterministic rather than a wasted round trip.

## Persistence semantics (FR-032)

Step 7 is wrapped so that a storage failure **cannot** turn a delivered answer into an error:

```ts
try {
  await chatExchangeRepository.create({ ... });
} catch (error) {
  console.error('[meeting-chat] exchange persist failed', { transcriptId, kind, error });
  // fall through — the answer is still returned
}
```

This is the one place in the action where a caught error is deliberately not surfaced, and §XIV permits it precisely because it *is* handled: logged with context, and the user still receives the correct answer. The consequence — the turn may be missing when they return — is stated in the spec's edge cases and is the better trade.

Note this is not a bare `catch {}`: the error is logged with context, which is what the constitution actually prohibits omitting.

## Concurrency and cancellation

- Single-in-flight is enforced client-side (FR-021). The action does not deduplicate.
- The action is **not** idempotent — each successful invocation writes an exchange. Two identical questions produce two stored exchanges, which is correct: the user asked twice.
- Cancellation is client-side. A resolved response whose meeting has changed is discarded by the hook's generation guard (FR-017, D10). **The exchange may still have been written**, and that is correct — it was written against the meeting the question was asked about. The guard prevents rendering it under the wrong meeting, not recording it under the right one.

---

# `getMeetingConversation`

## Signature

```ts
'use server';

export async function getMeetingConversation(
  transcriptId: string,
): Promise<StoredChatExchange[]>;
```

## Behaviour

| Case | Result |
|---|---|
| Meeting has exchanges | All of them, `createdAt` ascending. |
| Meeting has none | `[]` — the panel then shows its opening message. |
| Meeting does not exist | `[]`. A missing meeting and an unasked meeting are indistinguishable here, and the distinction does not matter: either way there is nothing to show. Asking a question against a bad id still fails loudly through `askAboutMeeting`. |
| Repository throws | `logAndThrow` — the hook surfaces a restore failure and the panel falls back to its opening state. A failed restore must not block asking new questions. |

Read-only. Returns storage shapes; the client maps them to `ChatMessage[]` via `chat-message.mapper.ts` (§VII — mapping is a pure util, not action or component work).

**No pagination.** Conversations are per-meeting and human-sized; the index makes the full read cheap. If a meeting ever accumulates enough turns for this to matter, the index that serves this query also serves a ranged one — a change confined to this contract.

---

## Logging

One structured line per invocation (§XIV, FR-028).

**Permitted**: `transcriptId`, outcome (`answer` / `refusal` / failure category), `model`, `provider`, token counts, cost, duration, attempt count, count of verified spans, exchange count on restore, persist-failure flag.

**Prohibited**: question text, answer text, evidence spans, transcript content, summary content, attendee names, credentials.

The verification-failure log needs the most care: the instinct is to log the unverified span to debug it, and that span is transcript-adjacent content. Log the *count* of failed spans and their lengths, never the text.

---

## Client consumption

```ts
// Restore, on activeId change
setMessages([]);                                  // clear first — never show the wrong meeting
const exchanges = await getMeetingConversation(transcriptId);
setMessages(toChatMessages(exchanges));           // empty ⇒ opening message renders

// Ask
const result = await askAboutMeeting({ transcriptId, question });
if (!result.success) {
  append({ role: 'ai', text: result.message, kind: 'failure' });   // live only, not stored
} else {
  append({ role: 'ai', text: result.answer, kind: result.kind });
}
```

Answers and refusals render identically (FR-009); only `failure` is styled distinctly. `coveredInMeeting` and `unanswerablePart` are available but not rendered separately — the model already expresses both in `answer`, and adding UI for them would change the panel's appearance (FR-024).
