# Phase 0 Research: Suggested Questions Reach the Panel

**Ticket**: TAE-96 | **Plan**: [plan.md](./plan.md) | **Date**: 2026-07-31

Four questions had to be resolved before design. R1 is the one that decides whether the feature works at all.

---

## R1 — What should the length ceiling be, and how is it derived?

**Decision**: `MAX_SUGGESTION_CHARS = 48`, derived from the chip row's measured width budget with a two-text-line-per-chip bound. The prompt's length rule and all three worked examples are rewritten to match.

### The measurement

The binding constraint is the *narrowest desktop* panel, not the widest. From `Design/POC_Kaffea-X_Prototype.html`:

| Viewport | Grid column for chat | Source |
|---|---|---|
| > 1100px | 340px | `.kx-shell` line 158 |
| ≤ 1100px | 300px | media query line 170 |
| ≤ 900px | full-width overlay | media query line 176+ |

Panel padding is `20px 18px` (`.kx-chat`, line 656) and the chip row carries `margin-left: 42px` (`.kx-chat-chips`, line 716 — aligned to the AI bubble: 32px avatar + 10px gap). So:

```
row width = panel − 18 − 18 − 42
          = 340 − 78 = 262px   (> 1100px)
          = 300 − 78 = 222px   (≤ 1100px)   ← binding
```

At ≤900px the panel goes full-width with 16px padding, giving a much wider row — never the constraint.

Per-chip text width, from `.kx-chat-chip` (`padding: 6px 12px`, `1px` border):

```
text width = 222 − (12 × 2) − (1 × 2) = 196px
```

At `font-size: 11.5px` / `font-weight: 600` Figtree, average advance for lowercase-heavy English is ≈0.5em ≈ 5.8px. So one line of chip text holds ≈34 characters, and two lines hold ≈68.

**That is where 34 came from.** It is the widest chip that stays on a *single* line at the narrowest desktop panel. It was never a content rule; it is a layout observation that got encoded as a whole-set rejection.

### Why 48

`.kx-chat-chip` sets no `white-space: nowrap`, so chip text wraps inside the pill and the pill grows taller. Two lines of text inside a chip is a bounded, visually acceptable outcome that the prototype's styling already supports. Taking two lines as the bound gives a hard boundary near 68 characters; 48 sits comfortably inside it with margin for wide glyphs, capitals, and non-Latin text, while being long enough for the specificity FR-011 demands:

| Question | Chars | Under 34? | Under 48? |
|---|---|---|---|
| `Why did the 200kg order stall?` | 30 | ✅ | ✅ |
| `Who owns the Shopify migration?` | 31 | ✅ | ✅ |
| `What did they say about the Q3 pilot?` | 36 | ❌ | ✅ |
| `What pricing concerns did they raise?` | 36 | ❌ | ✅ |
| `Why did the June launch slip to Q4?` | 35 | ❌ | ✅ |
| `What did they say about the Shopify migration?` | 46 | ❌ | ✅ |

Rows 3–6 are exactly the shape of question the prompt's Rule 4 asks for, and every one of them currently destroys the whole set. That is the defect, quantified.

### The prompt must change with the constant

The constant alone is not enough. `src/constants/suggested-questions.ts` currently teaches the model the wrong budget in four places:

- Rule 5 says "At most 34 characters. Roughly six words."
- `EXAMPLE_GOOD` shows three questions annotated "(32, 30, and 29 characters)".
- `EXAMPLE_TOO_LONG` holds up `"What pricing concerns did the customer raise?"` (45) as a *rejection*, which under a 48-char ceiling becomes a false lesson that will suppress good output.
- The closing note in `SUGGESTION_OUTPUT_CONTRACT` restates the limit.

All four are rewritten. `EXAMPLE_TOO_LONG` needs a genuinely over-48 specimen so the lesson stays true.

### Alternatives considered

- **Keep 34 and make the prompt terser.** Push the model to noun-phrase form (`"Pricing pushback?"`, `"Who owns June launch?"`). Rejected as the *sole* fix: it is the fragile half of the solution — prompt discipline is exactly what is failing now, and one long word in a company name still destroys the set. The terser phrasing guidance is worth keeping as a preference, but it cannot be the mechanism.
- **Truncate or ellipsise an over-length question.** Rejected: FR-007 requires whole-set rejection, and a truncated question is no longer something the model wrote, which makes both the ceiling and SC-003's grounding measurement meaningless.
- **Remove the length rule entirely.** Rejected: it would breach §XII by letting an arbitrarily tall chip distort the row, and FR-006 requires *a* rule derived from what the row can display.
- **Add `white-space: nowrap` plus horizontal scroll to the row.** Rejected: a visual change to a settled design, prohibited by the spec's Out of Scope and by §XII.
- **Set the ceiling from the widest panel (262px → ~40 single-line chars).** Rejected: it fails at 1100px, which is an SC-007 checkpoint.

### Residual risk, and how it is closed

The 5.8px average-advance figure is an estimate, not a measurement of rendered Figtree. If the real advance is materially wider, a 48-character question could reach a third line at 222px. This is not left to chance: quickstart Scenario 5 measures the rendered chip at each SC-007 checkpoint width, and if any chip exceeds two text lines the ceiling is lowered to the measured two-line value rather than the estimated one. The constant is a named constant precisely so that adjustment is a one-line change.

---

## R2 — How is a retry made materially different, without breaching SC-005?

**Decision**: Attempt 2 sends a corrective feedback turn naming the rule that rejected attempt 1, and the OpenRouter path raises `temperature` from `0` to `0.7` on retries only. `MAX_SUGGESTION_ATTEMPTS` stays at **2**.

### Why the current retry is a no-op

`src/integrations/openrouter/suggested-questions.ts` builds `{ system, user }` once outside the loop (line 36) and re-sends it unchanged on every iteration, with `temperature: 0` (line 48). Identical input, zero temperature, same model — attempt 2 reproduces attempt 1's rejected set by construction. It costs tokens and latency and cannot change the outcome. This is the specific behaviour SC-010 forbids.

The Claude path (`src/integrations/claude/suggested-questions.ts`) sets no temperature, so its default sampling makes attempt 2 *nondeterministic* — but still uninformed. It re-asks the identical question with no signal about what was wrong, so it is a coin flip rather than a correction.

### The fix

Two changes, both required:

1. **Feedback.** Attempt 2's user turn appends a short corrective note derived from the failing rule — for V4, that the previous set exceeded the character ceiling and every question must be shortened; for V5, that it contained a duplicate; for V3, that the count was wrong; for V1/V2, that the response was not parseable JSON matching the contract. The note names the constraint, never the rejected text, so no question text is echoed anywhere (FR-027 applies to logs; keeping it out of prompts too avoids reinforcing the bad output).
2. **Sampling.** OpenRouter retries use `temperature: 0.7`. Attempt 1 stays at `0` so the common path remains deterministic and cheap.

Together these satisfy FR-008: attempt 2 differs in both its input and its sampling, so it is not *guaranteed* to reproduce the rejected set.

### Why the attempt count stays at 2

SC-005 allows generation to add ≤5s at p95. Each attempt is a full model round-trip on grounding material up to 400,000 characters (`MAX_GROUNDING_CHARS`). A third attempt buys a diminishing slice of success rate against a linear latency cost on exactly the path the user is waiting on. With R1 raising the ceiling, most sets should pass on attempt 1 and the retry becomes the exception rather than the norm — which is the cheaper way to raise the success rate.

### Alternatives considered

- **Raise attempts to 3–5.** Rejected on SC-005 grounds above; also treats the symptom rather than R1's cause.
- **Retry with a different model.** Rejected: the spec's Assumptions fix service and model selection as inherited and out of scope.
- **Raise temperature without feedback.** Rejected: makes the retry a lottery. Feedback is what turns it into a correction, and it is the cheaper of the two changes.
- **Give feedback by echoing the rejected questions.** Rejected: risks the model anchoring on the bad set, and pushes question text into a second place it does not need to exist.

---

## R3 — How is AI cost accounted across attempts?

**Decision**: Accumulate token counts and cost across **every** attempt, successful or not. The `usage` returned on success is the sum over all attempts, not the winning attempt's.

Both integrations currently return `response.usage` from the winning attempt only. Tokens spent on rejected attempts are discarded, so a meeting that succeeded on attempt 2 under-reports its true cost by roughly half. FR-025 requires cost to cover every attempt and SC-011 requires per-meeting cost to be complete.

`storeSuggestedQuestions` in `transcript-ai.actions.ts` writes `suggestionUsage` from `result.usage`, so accumulating inside the integration is sufficient — no change to the action's write, the repository, or the schema.

One consequence worth stating: a run that exhausts both attempts and fails returns no usage at all today, so its tokens vanish entirely. The accumulator makes those countable, but the failure branch returns a `SuggestedQuestionsFailure`, which carries no `usage` field. Attaching usage to the failure shape is the honest fix, and `contracts/attempts.md` specifies it as an optional field on the failure so the cost is reportable without changing the success contract.

**Alternatives considered**: reporting only the winning attempt (status quo — rejected, breaches FR-025); logging per-attempt usage without accumulating (rejected — makes per-meeting totals a log-aggregation exercise rather than a stored value, and SC-011 asks for attributable stored cost).

---

## R4 — What must be logged to make a missing chip row diagnosable?

**Decision**: A single explicit outcome discriminator per meeting, logged with rule identifiers, counts, and provider metadata only.

The reported defect was misdiagnosed as "hard-coded chips are showing" when the real behaviour was "every set is discarded". The reason that mistake was possible is that a meeting with no chips looks identical from the outside whether generation never ran, ran and errored, or ran and was rejected. FR-026 and User Story 4 exist to close that gap.

Four outcomes must be distinguishable:

| Outcome | Meaning |
|---|---|
| `not_attempted` | Grounding exceeded the ceiling, or analysis failed before generation |
| `no_response` | The provider errored, timed out, or returned nothing usable at transport level |
| `rejected` | A well-formed response failed validation — carries the rule (`V1`–`V5`) and the attempt count |
| `stored` | Three questions persisted — carries provider, model, count, and accumulated usage |

The existing `console.info` on success already logs `count` and `lengths` (character counts, not text) — metadata, which is fine and worth keeping since `lengths` is exactly the signal that would have exposed R1 months ago. The gap is on the failure side: `storeSuggestedQuestions` logs a warning with `category` and `detail`, but nothing distinguishes `not_attempted` from a provider error, and the `V*` rule arrives only embedded in a prose message string.

Per §XIV and FR-027, logs carry no transcript content, no analysis content, no question text, no personal data, no credentials. Character counts, rule identifiers, attempt numbers, token counts, model and provider names are all permitted and none of them is content.

**Alternatives considered**: persisting the outcome on the transcript document (rejected — adds a schema field for a diagnostic concern the logs can carry, and the spec's Out of Scope excludes new user-visible state); logging the rejected questions to speed diagnosis (rejected outright — FR-027 and §XIV both prohibit it, and SC-009 counts any occurrence as a failure).

---

## Summary of decisions

| ID | Decision | Primary requirement served |
|---|---|---|
| R1 | Ceiling 34 → 48, derived from a 222px row and a two-text-line chip bound; prompt rule and all three examples rewritten | FR-006, SC-001 |
| R2 | Corrective feedback turn on retry + `temperature: 0.7` on OpenRouter retries; attempts stay at 2 | FR-008, SC-010, SC-005 |
| R3 | Accumulate usage across all attempts; expose it on the failure shape too | FR-025, SC-011 |
| R4 | Four-way outcome discriminator, metadata-only logging | FR-026, FR-027, SC-008, SC-009 |

No NEEDS CLARIFICATION items remain.
