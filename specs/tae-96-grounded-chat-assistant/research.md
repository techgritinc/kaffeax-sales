# Phase 0 Research: Grounded Chat Assistant (TAE-96)

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-07-29 (revised after the persistence clarification)

Resolves the questions the specification deferred — chiefly the three-way grounding comparison requested in the feature description, and the conversation-storage shape introduced by the 2026-07-29 clarification.

---

## D1 — Grounding architecture (the core decision)

### The bar

| Gate | Requirement |
|---|---|
| SC-001 | 30 in-scope questions, **zero** fabricated claims. One fabrication fails the feature. |
| SC-002 | 20 adversarial questions, ≥95% refused. |
| SC-003 | Absent topics answered as "not discussed" ≥95%. |
| SC-005 | 95% of answers within 10s, 99% within 20s. |
| FR-005 | Grounding must be **visible in the answer** so the user can verify it. |

FR-005 does most of the discriminating: a design that produces a correct answer but cannot show *where it came from* fails the spec even if it never hallucinates.

### Option A — Full context, prompt-enforced guardrail

Whole cleaned transcript plus whole analysis in the system prompt behind a strict grounding instruction. One API call. Refusal and grounding rest entirely on the model's judgement.

| | |
|---|---|
| **Latency** | Best. One round trip. |
| **Cost** | Whole transcript per question, mitigated by prompt caching (D3). |
| **Complexity** | Lowest. Reuses the existing summarizer shape almost verbatim. |
| **Hallucination resistance** | Weakest. Nothing mechanically prevents a confident wrong answer — SC-001 rests on prompt compliance, and one failure fails the gate. |
| **FR-005** | Only if the prompt asks for quotes, and nothing verifies them. A fabricated quote satisfies the *format* while violating the requirement. |

### Option B — Full context, cached, with deterministic evidence verification ✅ **CHOSEN**

Option A's transport plus a structured answer contract: the model returns the verbatim transcript or analysis spans it relied on, and those spans are **checked in code** against the grounding material by normalised substring match. A span that isn't present is not a quote — it is a fabrication, and the answer is rejected before the user sees it (retry once, then refuse).

| | |
|---|---|
| **Latency** | Effectively Option A. Verification is local string work. One retry costs one extra round trip in the rare case. |
| **Cost** | Option A plus the evidence tokens on output (small). |
| **Complexity** | Medium, but *familiar* medium — this is what `processStructuredResponse` already does to strip hallucinated rubric signals (`src/lib/utils/structured-analysis.utils.ts:66-75`). The codebase already validates AI claims against a known set deterministically. |
| **Hallucination resistance** | Strongest. "This was said in the meeting" becomes mechanically falsifiable rather than a matter of trust. |
| **FR-005** | Satisfied natively — the verified spans *are* the visible grounding. |

### Option C — Retrieval-augmented (chunk, embed, retrieve top-k)

| | |
|---|---|
| **Latency** | Worst. Embedding call + retrieval + generation. |
| **Cost** | Generation cost drops; adds embedding calls and vector storage. Net saving only on very long transcripts. |
| **Complexity** | Highest. New dependency, new storage, chunking strategy, index lifecycle, and a whole new class of bug (bad retrieval). |
| **Hallucination resistance** | **Worse here, not better.** Retrieval exists for corpora too large to fit in context; one sales meeting fits comfortably. Feeding the model a *subset* means it cannot distinguish "not in this meeting" from "not in the chunks I was given" — which attacks SC-003 directly, the one criterion where partial context is actively harmful. |
| **FR-005** | Comparable to A. Retrieved chunks are provenance for the *prompt*, not proof the answer used them. |

### Rejected variant — second-pass AI verifier

A follow-up call asking a model to judge the answer against the transcript. Doubles latency and cost and replaces a deterministic check with a second probabilistic one that can itself be wrong. Option B's mechanical verification is strictly better for the same job.

### Decision

**Option B.** Option C is the wrong tool — it solves a context-size problem this feature does not have and degrades the criterion that matters most. Between A and B the delta is one Zod schema and one string-matching utility: cheap insurance on a gate where a single fabrication is a hard failure.

The split that matters: the guardrail prompt governs **refusal** (SC-002 — you cannot mechanically verify the absence of something), and the evidence check governs **fabrication** (SC-001). Two gates, two mechanisms.

---

## D2 — Where the grounding context is assembled

**Decision: server-side, from the repository, keyed by transcript id. The client sends only `{ transcriptId, question }`.**

Not a stylistic choice — the client physically cannot do it:

- `MeetingRecord` (what `wf.draft` holds) **has no transcript**. `toMeetingRecord` never copies `cleanedTranscript`.
- It also drops `whatWeHeard` — the summary's richest field — because `Summary` in `meeting.types.ts` has no equivalent (`transcript.mapper.ts:58-74`).

Consequences: transcript content never crosses to the browser; the request payload stays tiny regardless of meeting length; and a tampered client cannot substitute its own "transcript" to change what the assistant will claim was said.

---

## D3 — Prompt caching

**Decision: one `cache_control: { type: 'ephemeral' }` breakpoint on the last system block (Anthropic path only). No-op on OpenRouter.**

Caching is a prefix match over `tools` → `system` → `messages`, so the layout follows:

- **system** — guardrail instructions, then transcript, then analysis. Stable for every question about a given meeting. Breakpoint at the end.
- **messages** — the question alone. Volatile, and after the breakpoint where it belongs.

Follow-ups read the transcript at ~0.1× input price instead of 1×. Writes cost 1.25× at the default 5-minute TTL, so break-even is the second question — and a user who opens the panel rarely asks exactly one thing. Default TTL is right: follow-ups come in bursts.

Two things not to be surprised by:

- **The minimum cacheable prefix is model-dependent** — 512 tokens on Opus 5, 1024 on Opus 4.8 / Sonnet 5, 4096 on Opus 4.6 / Haiku 4.5. Short transcripts (the bundled sample is ≈800 tokens) may silently not cache: `cacheCreationTokens` stays 0, no error. Harmless, but don't call a zero a bug without checking length against the model's floor.
- **One byte of drift in the prefix kills the cache.** No timestamp, no question text, no per-request id may appear ahead of the breakpoint. This is the single implementation detail most likely to silently erase the saving, so it belongs in review.

`AiUsage` already carries the four cache fields and `computeAnthropicCost` already prices them — cache effectiveness is observable on day one with no new plumbing.

---

## D4 — Model invocation parameters

**Decision: non-streaming `client.messages.create`, adaptive thinking, `effort: 'low'`, `max_tokens` ≈ 1024.**

- **Non-streaming.** Answers are short — well under the ~16K threshold where non-streaming risks SDK HTTP timeouts. The summarizer uses `.stream().finalMessage()` because it emits large structured output; that reason does not apply here.
- **Adaptive thinking, low effort.** A grounded lookup over material already in context is not deep-reasoning work, and SC-005 caps 95% of answers at 10 seconds. Raise to `medium` only if evaluation shows shallow reads on multi-part questions — don't prompt around it.
- **`max_tokens` ≈ 1024** fits an answer plus evidence spans. It caps thinking *and* text together; on `stop_reason: 'max_tokens'`, raise it rather than trimming the answer format.
- Model id stays `env.CLAUDE_DEFAULT_MODEL` / `env.OPENROUTER_DEFAULT_MODEL`. No new environment variables.

---

## D5 — Oversized transcripts

**Decision: a deterministic character-count guard before the call, returning a distinct `context_too_large` error.**

The spec forbids answering from a silently truncated transcript while implying full coverage. Rejected: `messages.count_tokens` (an extra round trip on every question for a rare case) and truncation (prohibited outright). A character threshold in constants produces a specific message and cannot silently mislead. Characters are a coarse token proxy; acceptable because the threshold only needs to sit safely below the window.

---

## D6 — A refusal is a success, not an error

**Decision: the answer contract carries an explicit in-scope flag; refusals travel the success path.**

FR-009 requires refusals to read as answers. Modelling "out of scope" as an error would drag correct behaviour through the failure path and present it as a malfunction. Only operational faults (provider down, rate-limited, oversized, unusable response) return `success: false`.

---

## D7 — Conversation storage shape ⚠️ **revised by the 2026-07-29 clarification**

The clarification reversed the earlier session-only decision: conversations are now persisted per meeting (FR-014) and restored on reopen, while turns remain independent for answering (FR-015, FR-031). Where they live is a genuine design question.

### Option A — Array embedded on the transcript document

`chatTurns: ChatTurn[]` on the existing transcript.

| | |
|---|---|
| **Pros** | One document, one collection, no new model. Deletion cascade is free — FR-033 satisfied by doing nothing. The conversation arrives with the `findById` the grounding read already performs. |
| **Cons** | **Regresses the sidebar.** `getTranscripts()` → `transcriptRepository.findAll()` (`transcript.actions.ts:29-35`) returns *full documents* for the recents list; every conversation in the workspace would be dragged into memory to render a list of titles. Also an unbounded array inside a 16 MB document ceiling, and `$push` growth causes repeated document relocation. |
| **Mitigation** | A projection on `findAll` — but then the document's shape differs by query path, which is its own trap. |

### Option B — One document per exchange, dedicated collection ✅ **CHOSEN**

A `chatexchanges` collection, one document per question-and-answer pair, indexed on `{ transcriptId, createdAt }`.

| | |
|---|---|
| **Pros** | Unbounded turn growth is safe. The sidebar and the grounding read are completely unaffected — `findById` stays exactly as cheap as today, which matters because it runs on every question. A turn is a single small independent insert, which is the natural write for FR-032's best-effort semantics. Ordering is unambiguous. Per-meeting cost aggregation falls out for free (see below). |
| **Cons** | A new model and repository class. One extra query on panel open. FR-033's cascade must be explicit. |
| **On the cascade** | `deleteTranscript` already exists (`transcript.actions.ts:58-64`), so the cascade has a concrete home today rather than a "when deletion is added" caveat — one `deleteByTranscript` call alongside the existing delete. |

### Option C — One document per conversation, embedded turns array

Middle ground: separate collection so list queries are safe, but still an unbounded array under a 16 MB ceiling and still `$push` relocation. Strictly worse than B with no compensating simplicity.

### Decision

**Option B.** The sidebar regression is what rules out Option A: `findAll()` returning full documents is existing behaviour this feature must not make expensive. Everything else — safe growth, cheap grounding reads, clean per-turn writes — follows.

### Why this made cost recording *simpler*, not harder

The previous plan carried a droppable Phase 7: aggregate `chatUsage` counters on the transcript document via `$inc`, with `model`/`provider` as last-write-wins and a dedicated repository method.

All of that disappears. Store `usage: AiUsage` **on the exchange document itself**: per-answer cost, exact rather than aggregated, no `$inc`, no last-write-wins loss, no transcript schema change, and per-meeting cost is an ordinary query over the collection. SC-009 is satisfied more precisely than the aggregate would have managed.

This is the pleasant surprise of the clarification — the reversal that added a collection also removed a whole phase and a schema change.

---

## D8 — What gets persisted (and what doesn't)

**Decision: persist an exchange only when the AI produced an answer or a refusal. Failure notices are not persisted.**

The spec's Key Entities line originally said a turn carries "whether it was an answer, a refusal, or a failure notice", which read as though all three are stored. On reflection that was the wrong behaviour:

- A restored "Service is temporarily busy" bubble from three days ago is noise, and mildly alarming — it describes a condition that has almost certainly passed.
- Persisting the question but not the failed answer would leave a dangling question bubble on restore, which reads as a bug.
- So an exchange is committed only once it has a real answer or a real refusal. A question that failed operationally is shown live and then simply isn't part of the history. The user saw the error; the record contains what actually happened in the conversation.

`kind` is still stored (`'answer' | 'refusal'`) because the two render identically today but are worth distinguishing for evaluation and any future filtering.

**Resolved 2026-07-29**: `/speckit-analyze` flagged the mismatch and the spec was amended — FR-014 now states that only completed exchanges are persisted and that failure notices are shown live but never stored, and Key Entities describes exchanges carrying an answer or a refusal. This decision is now normative rather than an interpretation.

---

## D9 — One document per *exchange*, not per turn

**Decision: a single document holds the question and its answer.**

Turns are strictly paired — stateless single-turn answering means every persisted question has exactly one AI response (D8 discards the unpaired case). Consequences:

- **Ordering is trivially correct.** One write per exchange, so `createdAt` ascending is unambiguous. Two separate documents written in the same millisecond would need a sequence field to sort deterministically.
- Half the document count, half the index size.
- One `usage` per exchange, which is exactly the granularity cost reporting wants.

On load, one exchange expands into two `ChatMessage` bubbles. That is a rendering concern, not a storage one.

---

## D10 — Session state, restoration, and in-flight abandonment

**Decision: a client hook keyed by the active transcript id; load on change; a monotonic generation counter discards stale work.**

- **On `activeId` change**: clear immediately, then load that meeting's exchanges, then render. Clearing first means no frame ever shows meeting A's messages under meeting B's header (FR-013).
- **Restoration is display-only.** Loaded exchanges become `ChatMessage`s and nothing else. They are never added to a request — FR-031 is enforced by the server action's signature, which has no history parameter at all. That is the strongest available guarantee: there is no field through which history *could* reach the model.
- **Loading state.** A transient muted line in the existing `AI_BUBBLE` style, matching how the pending row already renders (`chat-messages.tsx:73-78`). No new visual vocabulary, so FR-024 holds.
- **In-flight abandonment (FR-017).** A `useRef` generation counter, incremented on every send and every meeting change; a resolved response renders only if its generation still matches. `AbortController` alone is insufficient — a server action that has already completed can still resolve into a component whose meeting changed underneath it, so the guard must be on the render side. The action persists before returning, so an abandoned request may still have been committed; that is correct, because it was committed against the *right* meeting — the guard only prevents rendering it under the wrong one.

---

## D11 — Where the opening message's content comes from

**Finding: prospect company is not extracted anywhere in the system.** `toMeetingRecord` hardcodes `contact.name`, `contact.company`, and `contact.title` to empty strings (`transcript.mapper.ts:50-56`), and `AiSummaryResponseSchema` has no company field — so `DEFAULT_CHAT_COMPANY` is not a fallback for missing data, it is the *only* value the panel has ever displayed.

**Decision: build the opening line from `summary.meetingTitle` and the labels of `leadScore.detectedSignals`.** Both are real, per-meeting, AI-derived values already on the record. Adding company extraction would change the analysis output contract, which the spec puts out of scope. FR-019's intent is met: the title names the meeting, the signals are genuinely detected.

**Also**: the opening message is shown only when a meeting has no stored exchanges. A restored conversation opens with its own history, not a fresh greeting.

---

## D12 — Prompt-injection containment

**Decision: delimit the untrusted material, state the rule once, and rely on the evidence check as the backstop.**

Three layers, in order of reliability:

1. **Structural** — transcript and analysis wrapped in named delimiters, with an explicit statement that everything inside is content to report on and never instructions to follow.
2. **Positional** — grounding material lives in the system block ahead of the cache breakpoint; the question arrives in the user turn.
3. **Mechanical** — the D1 evidence check does not care what the transcript told the model to do; a claim with no matching span still fails.

Layer 3 holds when the first two are talked past.

**Persistence adds no new injection surface**, because stored exchanges are never sent to the model (D10). Had the answer to the memory question also flipped, this section would need substantial rework — a stored conversation that *is* replayed becomes a persistent injection vector, where a single poisoned turn contaminates every later answer in that meeting. Worth recording as the reason FR-031 is load-bearing rather than incidental.

---

## D13 — Provider parity

**Decision: mirror the existing summarizer split — `MeetingChatLike` interface, one implementation per provider, one factory, prompt and response processing shared in `lib/utils`.**

Parallels `TranscriptSummarizerLike` / `getTranscriptSummarizer` / `structured-analysis.utils.ts`. Environment-based selection (OpenRouter in development, Claude in production) inherited unchanged. Accepted divergences: OpenRouter reports no cache tokens (zeros, as the summarizer already does) and uses `response_format: { type: 'json_object' }` with `temperature: 0` where Anthropic uses adaptive thinking. Per §XVII, consumers import each symbol from the file that declares it.

---

## Open questions carried forward

- **The evaluation sets do not exist.** SC-001 (30 in-scope questions across ≥3 meetings) and SC-002 (20 adversarial questions) are the real acceptance gate, and authoring them is a task in its own right. Sequenced explicitly in the plan.
- **Refusal calibration is empirical.** No prompt design guarantees ≥95% up front; expect one or two tuning rounds against the adversarial set after the path works end to end.
- **Spec wording to narrow**: the Key Entities sentence on failure notices is broader than D8's decision.
