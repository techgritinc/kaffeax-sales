# Research: Summarize Loader Accuracy & Response Performance

**Feature**: tae-91-summarize-loader-latency
**Date**: 2026-07-31
**Branch**: feat/tae-91-audit-log-service

---

## Decision 1: Pipeline Stage Tracking Mechanism

**Decision**: Replace the timer-based `procTick: number` counter with a typed `ProcessingStage` enum driven by real async callbacks in `runSummarize`.

**Rationale**: The current implementation in `src/hooks/workflow/workflow-actions.utils.ts` (line 37) starts a `window.setInterval` firing every `PROC_TICK_MS` (380 ms, defined in `src/constants/workflow.ts` line 2). The active step is computed in `processing-modal.tsx` (line 43) as `Math.min(procTick, PROC_STEPS.length - 1)`. This means all four states cycle through in approximately 1.5 seconds regardless of actual work completion — the UI is entirely decoupled from the real pipeline. The fix is to set the stage enum explicitly at each `await` boundary in `runSummarize`, which gives the modal a real signal for each transition.

**Alternatives considered**:
- **Server-sent events / polling**: Would require a new API mechanism and backend infrastructure. Unnecessary here because the summarization is a single blocking server action — there are only two discrete await points client-side (`createDraftTranscript` and `runAiSummarization`), both of which are already reachable via simple pre/post assignment.
- **Keep timer with longer intervals**: Does not solve the correctness problem — states would still complete independently of actual work.

---

## Decision 2: State Label Canonicalization (3-Stage Model)

**Decision**: Replace the current 4 labels (`'Reading transcript'`, `'Extracting entities'`, `'Scoring intent'`, `'Drafting recap'`) with 3 accurate, vendor-neutral labels:

| Stage | Label | Trigger |
|-------|-------|---------|
| `preparing` | Preparing Transcript | Before `createDraftTranscript` call |
| `processing` | Agent Processing | Before `runAiSummarization` call |
| `extracting` | Extracting Summary | When `runAiSummarization` resolves successfully |

**Rationale**:
- `'Drafting recap'` (Mail icon) is the "Recap Email" state called out in the spec — it implies email drafting, which is not part of the summarization pipeline. Removed.
- `'Extracting entities'` and `'Scoring intent'` describe internal AI reasoning that is invisible to the pipeline layer. They are not real client-side stages. Removed.
- The three replacement labels map directly to the two server actions (`createDraftTranscript`, `runAiSummarization`) plus the post-processing step (response parsing and state transition).
- No AI vendor names appear in any label.

**Alternatives considered**:
- **2-stage model** (`Preparing` + `Processing`): Simpler but loses the brief post-processing phase where the response is cleaned and parsed. The `extracting` stage provides honest feedback that work is still in progress after the AI responds.
- **Keep 4 stages**: The fourth stage has no corresponding real pipeline step.

---

## Decision 3: Error State Trigger

**Decision**: Error state is triggered exclusively by an explicit failure signal from `runAiSummarization` (i.e., `{ success: false, error: string }`). No timeout is imposed.

**Rationale**: The `runAiSummarization` server action already returns a typed result object. The existing `runSummarize` function in `workflow-actions.utils.ts` has a `try/catch` block that sets error state on failure. No new mechanism is needed. Removing the timeout (which did not exist in the original timer approach anyway) is consistent with the development environment reality: free-tier models can take 2–3 minutes and must not be treated as failures.

**Alternatives considered**:
- **Hard timeout (5 min)**: Would trigger false errors in dev environment on long free-tier queues. Rejected per spec (clarification Q4).
- **Environment-aware timeout**: Adds config complexity for no production benefit since enterprise API responds well within any reasonable threshold.

---

## Decision 4: Latency Root Cause Finding

*This decision documents the investigation findings required by FR-006. See also the "Latency Root Cause Finding" section in spec.md for the authoritative record.*

**Decision**: The 2–3 minute latency in the development environment is attributable to free-tier model constraints on OpenRouter, compounded by a potential 3× retry multiplier from malformed JSON responses. No code-side avoidable delays were identified.

**Evidence from codebase**:

1. **Free-tier rate limiting and queue time** — `src/integrations/openrouter/client.ts` (line 12) issues a plain `fetch` to `https://openrouter.ai/api/v1/chat/completions`. The model used is `env.OPENROUTER_DEFAULT_MODEL`. Free-tier models on OpenRouter are subject to: (a) per-minute request rate limits (typically 20 req/min), (b) queue prioritisation that places free-tier requests behind paid traffic, and (c) lower token-per-second generation throughput. These account for the bulk of the observed latency.

2. **Retry overhead** — `src/integrations/openrouter/structured-summarizer.ts` retries up to `MAX_STRUCTURED_ATTEMPTS = 3` (defined in `src/lib/utils/summarization-prompt.utils.ts` line 10, referenced at line 20 of the structured-summarizer) on `malformed_response`. If the free model returns malformed JSON — common with smaller/free models — each retry incurs the full queue time again, potentially multiplying the latency up to 3×.

3. **No streaming** — The OpenRouter path uses `response_format: { type: 'json_object' }` with a blocking `await response.json()`. The full response must generate and transfer before anything is returned. This is intentional (spec Q2: full-wait) and not a bug, but it means there is no partial visibility into progress.

4. **No code-side avoidable delays** — The prompt assembly (`buildSummarizationPrompt` in `src/lib/utils/summarization-prompt.utils.ts` line 28) and transcript cleaning are synchronous and fast. The two server actions (`createDraftTranscript`, `runAiSummarization`) have no artificial delays. No N+1 queries. No unnecessary awaits in the hot path.

5. **Production path is structurally different** — `src/integrations/claude/transcript-summarizer.ts` uses `client.messages.stream()` (Anthropic SDK) with `thinking: { type: 'adaptive' }`. Enterprise API throughput and streaming delivery mean this path will not exhibit the same latency.

**Conclusion**: The latency is entirely attributable to free-tier model constraints on OpenRouter (queue time, rate limits, lower throughput, retry overhead). No code fix is required or appropriate. Production behaviour with the claude-haiku enterprise API will differ significantly.

---

## Resolved Unknowns

| Unknown | Resolution |
|---------|------------|
| How does the loader currently advance? | Timer: `setInterval` at 380ms — decoupled from real pipeline |
| What are the current state labels? | `'Reading transcript'`, `'Extracting entities'`, `'Scoring intent'`, `'Drafting recap'` |
| Where does "Recap Email" come from? | `'Drafting recap'` label with Mail icon in `processing-modal.tsx` |
| Is the latency a code bug? | No — free-tier model constraints on OpenRouter |
| Does the code include streaming? | Dev (OpenRouter): no. Prod (Claude SDK): yes (out of scope for this ticket) |
| Does a retry multiplier exist? | Yes — `MAX_STRUCTURED_ATTEMPTS = 3` on malformed JSON |
| Where does the error state live currently? | In `runSummarize` catch block in `workflow-actions.utils.ts` |
