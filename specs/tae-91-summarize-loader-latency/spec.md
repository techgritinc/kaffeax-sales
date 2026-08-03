# Feature Specification: Summarize Loader Accuracy & Response Performance

**Feature Branch**: `feat/tae-91-audit-log-service`

**Created**: 2026-07-31

**Status**: Review

**Input**: User description: "Multi State Loader Enhancement — loader states are instantly check-marked without reflecting actual work; state names are inaccurate (e.g. 'Recap Email', vendor name exposed). API response latency — sample content takes 2–3 minutes to summarize, unacceptable for real transcripts of 100s or 1000s of lines."

## Clarifications

### Session 2026-07-31

- Q: What is the scope of the latency investigation — code fix, model upgrade, or diagnosis only? → A: Diagnosis only. Investigate and document the root cause of the observed latency in the development environment (free-tier model via third-party router: rate limits, queue time, token throughput). No code remediation required. Production will use an enterprise AI API where this latency does not apply.
- Q: Should the AI response be streamed progressively or waited for in full before the loader advances? → A: Full-wait (no streaming). The loader waits for the complete AI response before advancing to the next state. Streaming is deferred to a future enhancement.
- Q: Where should the latency root cause investigation finding be documented? → A: As a dedicated section within spec.md itself — no separate file.
- Q: What triggers the error state — a timeout, an explicit AI service error, or both? → A: Explicit AI service error only. No hard timeout. The loader waits indefinitely; an error is surfaced only when the AI service returns an error response.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Accurate Progress States During Summarization (Priority: P1)

When a user clicks the **Summarize** button on a call transcript, they see a multi-step progress indicator that advances in real time through each meaningful stage of the summarization pipeline. Each state becomes complete only when the corresponding work finishes — no state jumps ahead of the actual operation it represents.

**Why this priority**: Users currently see all states instantly check-marked, then the loader stalls indefinitely at a misleading "Recap Email" state. This creates confusion, erodes trust, and makes it impossible to tell whether the system is working or hung. Accurate states are the foundation for every other UX improvement.

**Independent Test**: Click Summarize with the sample transcript. Watch the loader — each step must visibly advance only when the real work completes, and the final state must not appear until the full summary is ready.

**Acceptance Scenarios**:

1. **Given** a transcript is loaded, **When** the user clicks Summarize, **Then** the loader displays only stages that reflect the actual processing pipeline (transcript preparation, AI processing, result extraction) — not any unrelated or placeholder stages.
2. **Given** the summarization is in progress, **When** each pipeline stage completes, **Then** that stage's indicator transitions to complete and the next stage becomes active — no stage advances before its work is done.
3. **Given** the loader is active, **When** inspecting all visible state labels, **Then** no label mentions a specific AI vendor name (e.g. "Claude") — all agent references use a vendor-neutral term such as "Agent".
4. **Given** the loader is active, **When** inspecting all visible state labels, **Then** no label references operations not performed (e.g. "Recap Email" must not appear if no email recap is being done).

---

### User Story 2 - Production Performance Targets Met (Priority: P2)

When a user submits a call transcript for summarization in the production environment, the process completes within a timeframe that is practical for real-world usage — including transcripts from long calls spanning hundreds or thousands of lines.

**Why this priority**: The production environment uses an enterprise-grade AI API (not the free-tier model used in development). The 2–3 minute latency currently observed in development is an artifact of free-tier rate limits and queue time — not a code defect — and is expected to differ significantly in production. This story establishes the performance targets that the production deployment must meet, so that the feature can be validated before go-live.

**Independent Test**: In the production environment (or against an enterprise API endpoint), click Summarize using the sample transcript and measure elapsed time from button click to result displayed. Repeat with a realistic long transcript.

**Acceptance Scenarios**:

1. **Given** the sample transcript (short, a few lines) in the production environment, **When** the user clicks Summarize, **Then** the full summarization result appears within 30 seconds.
2. **Given** a realistic call transcript (several hundred lines, roughly 30-minute call) in the production environment, **When** the user clicks Summarize, **Then** the full result appears within 2 minutes.
3. **Given** a very long call transcript (1000+ lines, 60-minute call), **When** the user clicks Summarize, **Then** the system either completes within a reasonable extended window or provides a clear, accurate progress indication that it is still working — the user is never left with a stalled loader and no feedback.

---

### User Story 3 - Latency Root Cause Documented (Priority: P2)

The team investigates and produces a written explanation of the root cause behind the 2–3 minute summarization latency observed in the development environment, identifying whether it stems from free-tier model constraints, code-side factors, or a combination of both.

**Why this priority**: Before production go-live, the team needs to understand whether the latency is entirely attributable to the dev environment's free-tier model, or whether any code-side factors (blocking waits, oversized prompts, missing streaming) also contribute independently. This finding informs future work without requiring a fix in this ticket.

**Independent Test**: A written root cause explanation exists and is accessible; it identifies the primary cause(s) of the observed latency with enough specificity to distinguish between model-tier constraints and code-side factors.

**Acceptance Scenarios**:

1. **Given** the summarization latency in dev is 2–3 minutes, **When** the investigation is complete, **Then** a documented finding identifies the primary cause (e.g. free-tier rate limiting, queue time, token throughput cap) with supporting evidence.
2. **Given** the investigation finding, **When** reviewing whether code-side factors contribute, **Then** the finding explicitly states whether the code path introduces any avoidable delay independent of model-tier constraints.
3. **Given** the finding is complete, **When** the production environment uses an enterprise AI API, **Then** the investigation confirms or refutes the hypothesis that the latency will not recur in production.

---

### User Story 4 - Failure State Communicated Clearly (Priority: P3)

When the summarization process fails, the user sees a clear, actionable error state rather than a silent failure or a permanently active loader.

**Why this priority**: Without a defined error state, users cannot tell whether to wait longer or retry. A defined failure UX is necessary for the feature to be production-ready.

**Independent Test**: Trigger a summarization failure by simulating an AI service error response. Confirm the loader exits cleanly, displays a user-readable error, and offers a retry option.

**Acceptance Scenarios**:

1. **Given** the summarization is in progress, **When** the AI service returns an error response, **Then** the loader exits the active state and displays a user-friendly error message — no stack traces or technical details.
2. **Given** an error state is displayed, **When** the user clicks Retry, **Then** the summarization process restarts from the beginning with the same transcript.
3. **Given** the AI service returns a malformed or unparseable response, **When** the result extraction stage fails, **Then** the loader transitions to the error state and offers a retry — the user is not left with a blank result or a frozen loader.

---

### Edge Cases

- What happens when the transcript is empty or contains only whitespace when Summarize is clicked?
- What happens if the AI service returns a malformed or incomplete response that cannot be parsed into a summary?
- How does the system behave if the user navigates away mid-summarization — does the process cancel, and is any partial state cleared?
- What happens if the transcript is extremely large and exceeds any processing limit imposed by the downstream AI service?
- How does the system handle multiple rapid clicks of the Summarize button (debounce / idempotency)?
- In the development environment, extended wait times (2–3 minutes) are expected due to free-tier model constraints and must not be treated as failures — the loader waits with no timeout and only surfaces an error on an explicit AI service error response.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The progress loader MUST display state labels that accurately describe the actual summarization pipeline steps: transcript preparation, AI processing (via "Agent"), and result extraction. The AI processing state represents a full blocking wait — the loader remains in this state for the entire duration of the AI response and does not advance until the complete response is received. Streaming delivery of the AI response is explicitly out of scope for this ticket.
- **FR-002**: The progress loader MUST advance each state indicator to "complete" only after the corresponding pipeline stage has actually finished — no optimistic or instant advancement.
- **FR-003**: The progress loader MUST NOT display the "Recap Email" state or any other state that does not correspond to an operation performed during summarization.
- **FR-004**: All visible state labels MUST use vendor-neutral language; references to specific AI providers MUST be replaced with the generic term "Agent".
- **FR-005**: In the production environment (enterprise AI API), the summarization pipeline MUST complete and deliver results for short transcripts (sample content) within 30 seconds under normal conditions.
- **FR-006**: The team MUST investigate and produce a written root cause explanation for the 2–3 minute latency observed in the development environment. The finding must identify whether the cause is: (a) free-tier rate limits, (b) queue/scheduling time imposed by the model provider, (c) token throughput constraints, (d) code-side factors (blocking wait, oversized prompt, absence of streaming), or a combination. No code remediation is required as part of this ticket; the finding is the deliverable and MUST be recorded in the "Latency Root Cause Finding" section of this spec file.
- **FR-007**: The system MUST display a user-friendly error message and a retry action when the AI service returns an explicit error response. There is no hard timeout — the loader waits indefinitely for a response and transitions to error only on an explicit failure signal from the AI service.
- **FR-008**: Duplicate Summarize button submissions MUST be prevented while a summarization is already in progress (button disabled or debounced).
- **FR-009**: The loader MUST handle the case where the AI service response is received but cannot be parsed, surfacing a clear error rather than silently hanging.

### Key Entities

- **Summarization Pipeline**: The end-to-end process that transforms a raw transcript into a structured summary; composed of discrete, ordered stages (preparation, AI processing, extraction).
- **Progress State**: A named step in the loader UI representing one stage of the pipeline, with a status (pending, active, complete, error) and a vendor-neutral label.
- **Transcript**: The raw input text submitted for summarization; may range from a few lines to thousands of lines in length.
- **Summarization Result**: The structured output produced at the end of the pipeline, rendered into the UI upon successful completion.
- **Latency Root Cause Finding**: A written investigation output that attributes the observed development-environment latency to specific technical constraints (model-tier, code path, or both).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the production environment, the sample transcript summarizes completely in under 30 seconds, measured from Summarize button click to result displayed. Note: in the development environment, 2–3 minute latency is expected due to free-tier model constraints and is not a success criterion failure.
- **SC-002**: Each progress state label in the loader accurately names the work being done; zero states referencing operations not performed (e.g. "Recap Email") remain visible.
- **SC-003**: Zero vendor-specific names (e.g. specific AI provider names) appear in any progress state label visible to the user.
- **SC-004**: Each state indicator transitions to complete only after its corresponding operation finishes; no state completes before its work does, verifiable by timing observations during use.
- **SC-005**: When the AI service returns an explicit error response, an error message is displayed and a retry path is available within the same session. The loader does not impose a timeout — it waits for either a success response or an explicit error.
- **SC-006**: The Summarize button is not re-entrant; submitting while a summarization is in progress produces no duplicate requests.
- **SC-007**: A written root cause finding exists in the "Latency Root Cause Finding" section of this spec, explaining the development-environment latency and distinguishing between model-tier constraints and any code-side contributing factors.

## Assumptions

- The current multi-state loader UI component exists and will be modified in place, not rebuilt from scratch.
- The development environment uses a free-tier AI model via a third-party router (subject to rate limits, queue time, and token throughput constraints). The production environment uses an enterprise-grade AI API. Latency differences between the two environments are expected and not treated as code defects.
- The 2–3 minute latency observed in development is hypothesised to be primarily a function of free-tier model constraints; however, the investigation (FR-006) will confirm or refute this and identify any additional code-side contributors.
- The summarization pipeline stages are sufficiently well-defined in the current implementation to map each stage to a meaningful, real-time progress state.
- The "Recap Email" state was a placeholder or legacy label — removing it does not break any downstream functionality.
- Real-world call transcripts to be summarized are expected to range from a few dozen to a few thousand lines; transcript sizes beyond this are treated as edge cases.
- The retry mechanism does not require session persistence — a retry simply re-submits the current transcript from the UI state already in memory.
- There is no timeout on the summarization request. The loader waits indefinitely and transitions to an error state only when the AI service returns an explicit error. This design intentionally accommodates the extended wait times observed in the development environment (free-tier model) without triggering false failures.

## Latency Root Cause Finding

> **Status**: Complete — investigated during planning phase (2026-07-31). Full detail in [`research.md`](research.md) Decision 4.

### Hypothesis Outcomes

1. **Free-tier rate limits** ✅ Confirmed primary cause — OpenRouter free tier imposes per-minute request rate limits (typically ~20 req/min) and queues free-tier traffic behind paid users. The request to `https://openrouter.ai/api/v1/chat/completions` (`src/integrations/openrouter/client.ts` line 12) waits in this queue for the majority of the observed latency window.

2. **Queue/scheduling time** ✅ Confirmed — free-tier requests are deprioritised server-side by OpenRouter. The queue wait is the dominant latency contributor, not the model's generation speed itself.

3. **Token throughput constraints** ✅ Likely contributing — free models on OpenRouter typically have lower token-per-second generation rates than paid models, adding to the total response time after the queue resolves.

4. **Code-side factors** — No avoidable delays found. The prompt assembly (`buildSummarizationPrompt` in `src/lib/utils/summarization-prompt.utils.ts`) and transcript cleaning are fast and synchronous. There are no unnecessary awaits in the hot path. However, one compounding factor exists: `MAX_STRUCTURED_ATTEMPTS = 3` retries on malformed JSON (`src/integrations/openrouter/structured-summarizer.ts`). If the free model returns unparseable JSON output, each retry incurs the full queue wait again — potentially multiplying the base latency up to 3×.

### Conclusion

The 2–3 minute latency is **entirely attributable to free-tier model constraints** on OpenRouter: queue time, rate limits, lower throughput, and a potential 3× retry multiplier on malformed JSON. No code-side avoidable delay was identified. The production environment uses the Anthropic claude-haiku enterprise API (`src/integrations/claude/transcript-summarizer.ts`) with a streaming delivery path — these constraints do not apply, and the observed latency will not recur in production.
