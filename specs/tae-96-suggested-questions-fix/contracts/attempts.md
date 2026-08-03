# Contract: Attempt Sequencing, Feedback, Usage, and Outcomes

**Ticket**: TAE-96 | **Plan**: [../plan.md](../plan.md)

**Implementation**: new pure util `src/lib/utils/suggestion-attempts.utils.ts`, consumed identically by `integrations/openrouter/suggested-questions.ts` and `integrations/claude/suggested-questions.ts`.

The util exists for a reason beyond §V's line cap: the two provider files have already drifted once — OpenRouter pins `temperature: 0` and Claude does not — and that drift is half of the retry defect. Shared logic makes the two verifiably consistent.

---

## 1. Attempt sequencing

`MAX_SUGGESTION_ATTEMPTS` stays at **2**. SC-005 allows generation ≤5s at p95, and each attempt is a full round-trip over grounding material up to 400,000 characters.

| | Attempt 1 | Attempt 2 |
|---|---|---|
| User turn | base prompt | base prompt **+ corrective note** |
| OpenRouter temperature | `0` | `0.7` |
| Claude sampling | default | default (already non-deterministic) |
| Entered when | grounding size ≤ ceiling | attempt 1 returned a well-formed response that failed V1–V5 |
| **Not** entered when | — | attempt 1 failed at transport level (HTTP error, network, SDK error) — those return immediately today and continue to |

FR-008 forbids issuing an attempt guaranteed to reproduce a rejected set. Attempt 2 differs in **both** its input and, on OpenRouter, its sampling. Attempt 1 stays at `temperature: 0` so the common path remains deterministic and cheap.

## 2. Corrective feedback

Attempt 2 appends a short note naming the constraint that was violated. Derived from the `rule` on the `SuggestionSetOutcome`, so it is exhaustive over the union:

| Rule | Corrective note conveys |
|---|---|
| `V1` | The previous response was not valid JSON. Return only the JSON object, no prose and no code fences. |
| `V2` | The previous response did not match the required shape. Use exactly `{"questions": ["…","…","…"]}`. |
| `V3` | The previous response had the wrong number of questions. Return exactly three, none empty. |
| `V4` | One or more questions exceeded the character limit. Every question must be at most `MAX_SUGGESTION_CHARS` characters — shorten by dropping lead-ins, keeping the concrete noun. |
| `V5` | Two questions were duplicates. All three must ask about different aspects of the meeting. |

**The note must not echo the rejected questions.** Two reasons: it risks the model anchoring on the bad set, and it puts question text into a second location it has no need to exist in. The note names the constraint only.

The V4 note deliberately says *how* to shorten — drop the lead-in, keep the noun — because the failure mode is a model that shortens by going generic, which trades a V4 rejection for an SC-004 failure.

## 3. Usage accumulation

**Every attempt's tokens and cost accumulate.** The `usage` returned on success is the sum over all attempts, not the winning attempt's.

Today both integrations return the winning attempt's `response.usage`, so a meeting that succeeds on attempt 2 under-reports its true cost by roughly half — breaching FR-025 and SC-011.

Accumulated fields, all camelCase per §XVIII, matching the existing `suggestionUsage` shape so nothing downstream changes:

```
inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens,
inputCostUsd, outputCostUsd, cacheCreationCostUsd, cacheReadCostUsd, totalCostUsd
```

`model` and `provider` come from the **final** attempt, not summed.

### Usage on the failure path

A run that exhausts both attempts currently returns a `SuggestedQuestionsFailure` with no usage field, so its tokens vanish entirely — the most expensive outcome is the least visible.

`SuggestedQuestionsFailure` gains an **optional** `usage` field. Optional, not required, because `context_too_large` and network failures genuinely spend nothing, and forcing a zeroed object there would be noise. `storeSuggestedQuestions` writes `suggestionUsage` when the failure carries usage, so exhausted-attempt cost stays attributable without changing the success contract.

## 4. Generation outcome (FR-026)

Four outcomes, exhaustive and mutually exclusive. Each is logged exactly once per meeting per analysis run.

| Outcome | Condition | Logged fields |
|---|---|---|
| `not_attempted` | grounding exceeded `MAX_GROUNDING_CHARS`, or analysis failed before generation | `transcriptId`, `reason` |
| `no_response` | transport-level failure — HTTP error, network, SDK error | `transcriptId`, `category`, `provider` |
| `rejected` | well-formed response failed V1–V5 on the final attempt | `transcriptId`, `rule`, `attempts`, `provider`, `model`, accumulated token counts |
| `stored` | three questions persisted | `transcriptId`, `provider`, `model`, `count`, `lengths`, `attempts`, accumulated token counts and cost |

This closes the gap that made the original defect look like the wrong bug: today a meeting with no chips is indistinguishable from one where generation never ran. `rejected` carrying its `rule` is what makes SC-008 measurable — and `lengths` on `stored` is the field that would have exposed the V4 ceiling months ago, which is why it stays.

### Permitted and prohibited log content

Per §XIV, FR-027, and SC-009 — SC-009 counts **any** occurrence as a failure.

**Permitted**: transcript id, rule identifier, attempt number, category, provider, model, question *count*, question *character lengths*, token counts, cost.

**Prohibited**: question text, transcript content, analysis content, prompt text, personal data, credentials.

Character lengths are metadata, not content — 34 characters of a question reveals nothing about the meeting.

## 5. Failure isolation (unchanged, load-bearing)

`storeSuggestedQuestions` is called **after** the analysis result is committed in `runAiSummarization`, and returns the unmodified `stored` record on every failure path. This ordering is what makes FR-022 and SC-005's "100% of forced failures still produce a successful analysis" true, and it must survive the change:

- No generation outcome may alter `title`, `summary`, `leadScore`, `aiProcessingStatus`, or `aiUsage`.
- No generation outcome may throw out of `storeSuggestedQuestions`. Its `try`/`catch` returns `stored` — the one place a broad catch is correct here, and it is not bare: it logs with context per §XIV.
- No generation outcome may surface anything to the user beyond the absent chip row (FR-023).
