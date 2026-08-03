# Quickstart: Verifying Suggested Questions Reach the Panel

**Ticket**: TAE-96 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

This repository has **no test infrastructure** (`CLAUDE.md`), so these scenarios carry the acceptance burden. Scenarios 1, 2, and 5 are the ones that decide whether the defect is fixed; skipping any of them leaves the outcome unknown.

## Prerequisites

```bash
# Development uses OpenRouter (NEXT_PUBLIC_APP_ENV=development)
# Confirm OPENROUTER_API_KEY and OPENROUTER_DEFAULT_MODEL are set in .env.development
npm run dev
```

- **A corpus of at least 10 varied, real-length transcripts.** This is a hard prerequisite, not a nice-to-have. The defect is specifically that *real-world* questions get rejected where contrived short ones pass, so synthetic fixtures will show a pass that production would not. SC-001, SC-003, SC-004 and SC-013 are unmeasurable without it.
- Transcripts should include quantified content — figures, dates, volumes, named products — since that is what forces questions into the 35–46 character range that previously destroyed every set.
- Server logs visible in the terminal running `npm run dev`.

## Gate 0 — Static validation

```bash
npm run validate      # type-check → lint (--max-warnings=0) → build
```

Must pass before any scenario is run. Also confirm §V compliance, since the plan projects three files near the 150-line cap:

```bash
# every changed/added file must be under 150 lines
wc -l src/constants/suggested-questions.ts \
      src/lib/utils/suggested-questions.utils.ts \
      src/lib/utils/suggestion-attempts.utils.ts \
      src/integrations/openrouter/suggested-questions.ts \
      src/integrations/claude/suggested-questions.ts
```

And confirm the ceiling moved everywhere it is stated — a stale 34 in the prompt re-creates the defect at a lower rate:

```bash
grep -rn "34" src/constants/suggested-questions.ts    # expect no character-limit references
grep -rn "MAX_SUGGESTION_CHARS" src/                  # expect the constant, interpolated in the rules
```

---

## Scenario 1 — The defect is fixed (SC-001, SC-002) — **primary**

1. For each of the 10 corpus transcripts: paste into Capture, click **Summarize**, wait for the review screen.
2. Open the follow-up panel.
3. Record whether three chips appear.

**Pass**: at least **9 of 10** meetings show exactly three chips (SC-001). Every meeting shows either three or zero — never one or two (SC-002).

**Baseline for comparison**: on the current build this figure is near zero. If it is not, the diagnosis in [spec.md](./spec.md) is wrong and that must be raised before accepting the change.

Cross-check the database directly for the same 10:

```
suggestedQuestions.length ∈ {0, 3}   for every document — never 1 or 2
```

## Scenario 2 — Chips lead to grounded answers (SC-003, SC-004, SC-013) — **primary**

Using the sets from Scenario 1:

1. Click all three chips on each meeting, one at a time, waiting for each answer.
2. Count answers that are a refusal or "not discussed in this meeting".

**Pass**:
- **≥29 of 30** chips return a grounded answer (SC-003). A chip leading to a refusal counts as a failure — it is the outcome the whole feature exists to avoid.
- No question text appears verbatim in more than two of the ten sets; every set of three is internally distinct (SC-004).
- On at least 5 meetings, the three chips alone convey three substantive facts not guessable from the meeting title (SC-013).

A rise in refusals after raising the ceiling would mean the longer budget let the model drift off-grounding — that is a Rule 1 regression, not a length problem, and the fix is prompt-side.

## Scenario 3 — Failure is isolated and silent (SC-005, SC-006, FR-022, FR-023)

Force generation to fail. Temporarily invalidate `OPENROUTER_API_KEY`, or set `MAX_GROUNDING_CHARS` to `1` to force the `not_attempted` path.

1. Summarize a transcript.
2. Observe the review screen and open the panel.

**Pass**:
- Analysis completes successfully — summary, lead score, and `aiProcessingStatus: 'success'` all recorded (FR-022).
- **No** error, warning, toast, or empty state anywhere in the interface (FR-023, SC-006).
- Panel opens cleanly, input fully usable, no chip row and no "Suggested" heading.
- `suggestedQuestions` is `[]` in the database.

Restore the environment afterwards.

## Scenario 4 — Latency bound (SC-005)

Time the analysis step with generation enabled and disabled, across at least 5 transcripts including the largest in the corpus.

**Pass**: generation adds **≤5s at p95**, including both attempts when a retry occurs. The analysis step never hangs and never fails because of generation.

## Scenario 5 — Visual parity (SC-007, §XII) — **primary**

The §XII gate. Run at **1440px, 1100px, 900px, 560px**, in both the has-suggestions and no-suggestions states.

1. Open `Design/POC_Kaffea-X_Prototype.html` and the running app side by side at each width.
2. Compare the chip row: position, indent, gap, font size, weight, padding, border radius, hover state.
3. Measure the tallest chip in each set from Scenario 1.

**Pass**:
- The panel is visually indistinguishable from the prototype at all four widths.
- The chip row's wrapping behaviour matches the prototype's own at the same width.
- **No individual chip exceeds two lines of text** at any width.
- No horizontal overflow anywhere.

**1100px is the binding case** — the chat column narrows to 300px there, giving a 222px row, the width the 48-character ceiling was derived from.

**If any chip exceeds two lines**: lower `MAX_SUGGESTION_CHARS` to the measured two-line value and re-run Scenarios 1, 2, and 5. This is the expected correction path — the 48 figure rests on an estimated 5.8px average glyph advance, and this scenario is what replaces the estimate with a measurement. See [contracts/validation.md](./contracts/validation.md).

## Scenario 6 — The retry actually differs (SC-010, FR-008)

Force a rejection that a retry could plausibly recover from — temporarily set `MAX_SUGGESTION_CHARS` to a very low value (e.g. `12`) so attempt 1 fails V4.

1. Summarize a transcript.
2. Read the server logs.

**Pass**:
- Attempt 2 is issued with a **corrective note** naming the V4 constraint, and on OpenRouter with `temperature: 0.7`.
- Attempt 2's request is not byte-identical to attempt 1's.
- Zero attempts are issued that are guaranteed to reproduce a rejected set (SC-010).
- Attempts stop at 2; the analysis still completes successfully.

On the current build attempt 2 is byte-identical with `temperature: 0`, so this scenario fails before the change — confirming it tests something real.

Restore the constant afterwards.

## Scenario 7 — Diagnosability (SC-008, User Story 4)

Trigger each outcome and inspect the logs:

| Outcome | How to trigger |
|---|---|
| `not_attempted` | set `MAX_GROUNDING_CHARS` to `1` |
| `no_response` | invalidate the API key |
| `rejected` | set `MAX_SUGGESTION_CHARS` to `1` |
| `stored` | normal run |

**Pass**:
- All four are distinguishable from the logs alone, without re-running the meeting (SC-008).
- `rejected` names the specific rule (`V1`–`V5`) and the attempt count.
- 100% of forced rejections have their responsible rule determinable.

## Scenario 8 — No content in logs (SC-009, FR-027)

After completing Scenarios 1–7, scan the full session's server output.

**Pass — zero occurrences of**: question text, transcript content, analysis content, prompt text, personal data, credentials.

**Permitted and expected**: transcript ids, rule identifiers, attempt numbers, categories, provider and model names, question counts, question character *lengths*, token counts, cost.

Spot-check by taking a distinctive phrase from one transcript and one generated question and grepping the captured output for both. Both must be absent.

## Scenario 9 — Lifecycle (FR-016, FR-004, FR-020, SC-006)

1. **Re-analysis**: summarize a meeting, note its three chips, click Summarize again. → New chips reflect the new analysis; none of the previous set remains; the set is replaced wholesale, never merged.
2. **Cross-meeting**: with meeting A's chips visible, open meeting B from Recents. → B shows its own three; none of A's remains visible.
3. **Restored conversation**: ask a question on A, navigate away, reopen A. → The restored conversation is shown with **no** chip row prepended (FR-018).
4. **Approve round-trip**: approve a meeting to CRM, then reopen it. → Its three chips survive; `toTranscriptPatch` omits the field so the stored set is not clobbered.
5. **Deletion**: reject/delete a meeting. → Its stored suggestions go with the document; nothing orphaned.
6. **Interrupted run**: if the unconditional-reset fix from [data-model.md](./data-model.md) was applied, force `aiProcessingStatus` to `'pending'` on a meeting that already has three stored questions, then re-analyse and force generation to fail. → The panel shows **no** chips, not the previous set.

## Scenario 10 — Pre-existing meetings (SC-014, FR-021)

Using at least 3 meetings analysed **before** this change:

**Pass**: 100% show no chip row and no "Suggested" heading. 0% show a partial row. 0% show generic or fallback questions — this is the Option A decision, and any fixed question text appearing here is an SC-012 failure.

---

## Acceptance summary

| Scenario | Criteria | Blocking |
|---|---|---|
| 0 | Gate 0 static validation, §V line counts | yes |
| 1 | SC-001, SC-002 | yes |
| 2 | SC-003, SC-004, SC-013 | yes |
| 3 | SC-005, SC-006 | yes |
| 4 | SC-005 | yes |
| 5 | SC-007, §XII | yes |
| 6 | SC-010 | yes |
| 7 | SC-008 | yes |
| 8 | SC-009 | yes |
| 9 | FR-004, FR-016, FR-018, FR-020 | yes |
| 10 | SC-012, SC-014 | yes |

SC-011 (cost attributable per meeting, all attempts) is verified by inspecting `suggestionUsage` on documents from Scenarios 1 and 6 — the Scenario 6 document must show the cost of **both** attempts, not one.
