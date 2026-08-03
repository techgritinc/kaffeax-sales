# Contract: Suggestion Response and Validation

**Feature**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

What the model must return, and what the code does with it before anything is stored. Both provider integrations produce the raw text; `src/lib/utils/suggested-questions.utils.ts` is the single place that turns it into a set or a rejection.

---

## 1. The JSON contract

The model returns **only** a single JSON object, no prose and no code fences:

```json
{
  "questions": [
    "What pricing did they push back on?",
    "Who owns the pilot rollout?",
    "Why did the June launch slip?"
  ]
}
```

camelCase, per §XVIII. One key, `questions`, an array of strings.

An object with a single key rather than a bare array, deliberately: OpenRouter's `response_format: { type: 'json_object' }` requires a JSON *object* at the top level, and it gives the field a name the prompt can refer to.

### Zod schema — `src/schemas/suggested-questions.schema.ts`

```ts
export const SuggestedQuestionsSchema = z.object({
  questions: z.array(z.string()),
});
```

Shape only. The count, length, and distinctness rules are applied after trimming, because a model that returns `"  Who owns the rollout?  "` should pass, not be rejected on whitespace.

---

## 2. Validation rules — in order

Applied by `validateSuggestionSet(raw: unknown): SuggestionSetOutcome`. Each rule rejects the **whole set** (FR-014): three good questions and one bad one is not three chips, and it is not two — it is none.

| # | Rule | Rejection category |
|---|---|---|
| V1 | Text parses as JSON | `malformed_response` |
| V2 | Parsed value satisfies `SuggestedQuestionsSchema` | `malformed_response` |
| V3 | After `trim()` and dropping empty strings, exactly `SUGGESTED_QUESTION_COUNT` (3) remain | `rejected_set` |
| V4 | Every entry is ≤ `MAX_SUGGESTION_CHARS` (34) characters | `rejected_set` |
| V5 | No two entries are equal under `normaliseForMatch` | `rejected_set` |

Notes on what is deliberately **not** validated:

- **No trailing `?` requirement.** FR-011 asks for natural phrasing, and the chip being replaced — "Summarize next steps" — is an imperative. Requiring a question mark would reject good chips.
- **No banned-phrase list.** Screening for generic questions ("What were the next steps?") with a string blocklist would be a guess at the failure mode; SC-003 measures genericness across ten meetings, which is where it can actually be judged.
- **No answerability check.** Verifying that each question is answerable would cost three more AI calls per meeting (D12). It is a prompt obligation measured by SC-002, with evidence-span verification held in reserve if that bar is missed.
- **No semantic near-duplicate check.** V5 catches exact restatements only. Two questions that differ by a word but ask the same thing are a prompt-quality problem, judged by SC-003.

### Outcome type

```ts
export type SuggestionSetOutcome =
  | { ok: true; questions: string[] }                       // exactly 3, trimmed
  | { ok: false; category: 'malformed_response' | 'rejected_set'; rule: 'V1'|'V2'|'V3'|'V4'|'V5' };
```

The `rule` field is what makes the Phase 7 tuning loop possible: a run of `V4` rejections means the character budget is losing, which is a different fix from a run of `V3`s. It is a code, not a message built from the offending text (FR-026).

---

## 3. Retry

`MAX_SUGGESTION_ATTEMPTS = 2`. Both rejection categories retry once; provider-level failures (authentication, rate limit, network, invalid request) do not — they will not resolve within one immediate retry, and the cost of no chips is zero to the user.

This mirrors the retry shape already in `claude/meeting-chat.ts` and `openrouter/meeting-chat.ts`, including the `console.warn` on the retried attempt.

---

## 4. Failure mapping

| Condition | Category | Where it comes from |
|---|---|---|
| Grounding material exceeds `MAX_GROUNDING_CHARS` | `context_too_large` | Checked in the integration **before** calling the provider |
| SDK/HTTP auth, rate-limit, bad-request, connection, or API error | `authentication` / `rate_limit` / `invalid_request` / `network` / `api_error` | `handleSdkError` (Claude), `mapHttpError` (OpenRouter), reused unchanged |
| Response not parseable / wrong shape | `malformed_response` | V1–V2, after the last attempt |
| Well-formed but breaks the set rules | `rejected_set` | V3–V5, after the last attempt |

Every one of these has the same user-visible consequence: **no chip row**. There is no user-facing message for any of them (D13) — `SuggestedQuestionsFailure.message` exists so the log line can say something useful, and it must never contain question, transcript, or analysis text.

---

## 5. Worked examples

**Accepted** — three distinct, in-budget, meeting-specific questions:

```json
{ "questions": ["What did they say about pricing?", "Who owns the Q3 pilot?", "Why was Shopify raised?"] }
```

**Rejected, V4** — the second question is 45 characters. Note this is one of the examples from the original feature request; it does not fit the chip (D7):

```json
{ "questions": ["Who owns the pilot?", "What pricing concerns did the customer raise?", "When do they decide?"] }
```

**Rejected, V3** — four questions. Not "take the first three": the model was asked for three, and one that returns four has not followed the contract, so its judgement about which three matter is not trustworthy either.

```json
{ "questions": ["A?", "B?", "C?", "D?"] }
```

**Rejected, V5** — a restatement, not a distinct aspect:

```json
{ "questions": ["What are the next steps?", "What Are The Next Steps?", "Who owns them?"] }
```

**Rejected, V1** — the shape the prompt's "JSON only" rule exists to prevent:

```text
Here are three questions you could ask:
{ "questions": [...] }
```
