# Quickstart Validation Guide: Summarize Loader Accuracy & Response Performance

**Feature**: tae-91-summarize-loader-latency
**Date**: 2026-07-31

---

## Prerequisites

- Dev server running: `npm run dev`
- `.env.development` configured with valid `OPENROUTER_API_KEY` and `OPENROUTER_DEFAULT_MODEL`
- A transcript is loaded in the Capture screen (use "Load Sample" button for convenience)

---

## Scenario 1: Loader Advances Through Real Pipeline Stages

**Goal**: Verify each step in the loader becomes active only when the corresponding pipeline work begins, not based on a timer.

**Steps**:
1. Open the application in the browser and navigate to the Capture screen.
2. Click **Load Sample** to populate a short transcript.
3. Open browser DevTools → Network tab. Filter for `Fetch/XHR`.
4. Click **Summarise**.
5. Watch the loader modal.

**Expected behaviour**:
- The loader appears immediately showing **Step 1 "Preparing Transcript"** as active.
- Within 1–2 seconds (fast server action), Step 1 completes and **Step 2 "Agent Processing"** becomes active.
- Step 2 remains active for the duration of the AI call (2–3 minutes in dev on free-tier model). The loader is visibly stalled here — this is correct and expected.
- When the AI response arrives, Step 2 completes and **Step 3 "Extracting Summary"** briefly becomes active, then the modal closes and the review screen appears.

**Failure indicators**:
- Any step completes before its server action appears in the Network tab → timer-driven advancement is still in place.
- All three steps complete within 2 seconds → regression to instant check-marking.
- The modal stalls with all steps marked done but no review screen → state transition bug.

---

## Scenario 2: State Labels and Vendor Name Validation

**Goal**: Verify the loader shows only the three approved labels and no vendor names.

**Steps**:
1. Click **Summarise** to open the loader modal.
2. Inspect the visible text in the modal at each stage.

**Expected labels (exact)**:
- Step 1: `Preparing Transcript`
- Step 2: `Agent Processing`
- Step 3: `Extracting Summary`

**Absent text (must not appear anywhere in the modal)**:
- `Claude`, `Anthropic`, `OpenRouter`
- `Drafting recap`, `Recap Email`, `recap`
- `Extracting entities`, `Scoring intent`, `Reading transcript`

---

## Scenario 3: Duplicate Submit Prevention

**Goal**: Verify the Summarise button is disabled once summarization begins.

**Steps**:
1. Click **Summarise**.
2. Immediately attempt to click **Summarise** again (or inspect the button's `disabled` attribute in DevTools).

**Expected**: The button is disabled (non-interactive) from the moment `procStage` becomes `'preparing'` until it returns to `'idle'`.

---

## Scenario 4: Error State on AI Service Failure

**Goal**: Verify a user-friendly error appears (not a frozen loader) when the AI service returns an error.

**Steps**:
1. Temporarily set `OPENROUTER_API_KEY` in `.env.development` to an invalid value (or disconnect the network).
2. Restart the dev server.
3. Click **Summarise**.

**Expected**:
- The loader displays "Preparing Transcript" briefly, then "Agent Processing".
- When the AI call fails, the loader modal closes.
- A user-readable error message appears — no stack trace, no raw error JSON.
- A Retry button (or equivalent) is available.
- The Summarise button returns to enabled state.

**Failure indicators**:
- Loader remains open indefinitely after the error → `procStage` was not reset to `'idle'`.
- Error message contains internal details (stack trace, API key reference, raw error string) → error handling violation.

---

## Scenario 5: Latency Root Cause Verification (Investigation Only)

**Goal**: Confirm the latency is attributable to free-tier model constraints, not code-side delays.

**Steps**:
1. Open browser DevTools → Network tab.
2. Click **Summarise** and note the timestamp when the network request to OpenRouter is sent.
3. Note the timestamp when the response is received.
4. Compare: the delta between request sent and response received is the model latency (queue + generation time). This should account for nearly all of the total observed wait time.
5. Check whether the response required retries: look for multiple sequential requests to the OpenRouter endpoint within the same summarization session.

**Expected finding**: The network round-trip to OpenRouter accounts for >90% of the total summarization time. Time before the request (transcript preparation) and after (response parsing) is sub-second. See `specs/tae-91-summarize-loader-latency/research.md` (Decision 4) and spec.md (Latency Root Cause Finding section) for the documented conclusion.

---

## References

- Component contract: [`contracts/processing-modal.md`](contracts/processing-modal.md)
- Stage state contract: [`contracts/workflow-stage.md`](contracts/workflow-stage.md)
- Data model: [`data-model.md`](data-model.md)
- Research findings: [`research.md`](research.md)
