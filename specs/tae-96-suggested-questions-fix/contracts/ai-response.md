# Contract: AI Response

**Ticket**: TAE-96 | **Plan**: [../plan.md](../plan.md) | **Consumer**: `validateSuggestionSet` in `src/lib/utils/suggested-questions.utils.ts`

Unchanged from the existing implementation except where noted. Recorded here because [validation.md](./validation.md) references it rule by rule.

## Required shape

The model's entire response must be a single JSON object:

```json
{
  "questions": ["string", "string", "string"]
}
```

- Key is `questions`, camelCase, per §XVIII. No snake_case variant is accepted and none is mapped.
- Exactly three entries. See [validation.md](./validation.md) V3.
- Governed by `SuggestedQuestionsSchema` (`src/schemas/suggested-questions.schema.ts`) — Zod is the sole validator per §VIII.

## Tolerated wrappings

The parser accepts two deviations before rejecting, both already implemented:

1. **Fenced code blocks** — a leading ` ```json ` or ` ``` ` and a trailing ` ``` ` are stripped before parsing.
2. **Minor JSON damage** — on a parse failure the text is passed through `repairJson` (`src/lib/utils/json-repair.utils.ts`) and parsed once more.

Anything still unparseable is V1. Anything parseable but off-contract is V2.

## Request configuration

| Setting | Attempt 1 | Attempt 2 | Source |
|---|---|---|---|
| Max output tokens | `SUGGESTION_MAX_TOKENS` (512) | same | `constants/suggested-questions.ts` |
| OpenRouter temperature | `0` | **`0.7`** ← changed | `integrations/openrouter/suggested-questions.ts` |
| OpenRouter response format | `{ type: 'json_object' }` | same | ditto |
| Claude effort | `SUGGESTION_EFFORT` (`'low'`) | same | `integrations/claude/suggested-questions.ts` |
| Claude thinking | `{ type: 'adaptive' }` | same | ditto |
| User turn | base prompt | base prompt **+ corrective note** ← changed | [attempts.md](./attempts.md) |

Provider selection is inherited and unchanged: OpenRouter when `NEXT_PUBLIC_APP_ENV === 'development'`, Claude otherwise (`integrations/suggested-questions.factory.ts`).

## Prompt-side contract changes

`src/constants/suggested-questions.ts` states the character ceiling in four places, all of which must move from 34 to `MAX_SUGGESTION_CHARS` (48) together. Leaving any one behind teaches the model the old budget and re-creates the defect at a lower rate:

| Location | Current | Required |
|---|---|---|
| `SUGGESTION_RULES` Rule 5 | "At most 34 characters. Roughly six words." | interpolate `${MAX_SUGGESTION_CHARS}`; "roughly eight words" |
| `SUGGESTION_OUTPUT_CONTRACT` closing note | already interpolates the constant | no edit needed — verify it still reads correctly at 48 |
| `EXAMPLE_GOOD` | annotated "(32, 30, and 29 characters)" | keep or replace the specimens; annotation must match the actual lengths |
| `EXAMPLE_TOO_LONG` | rejects a 45-char question | **must be replaced** — 45 is legal at 48, so this example now teaches the model to suppress valid output |

`EXAMPLE_TOO_GENERIC` is unaffected; it demonstrates Rule 4, not length.

Rules 1, 2, 3, 4, 6, and 7 and `SUGGESTION_PERSONA` are unchanged. Rule 4's demand for the concrete noun is the requirement the old ceiling contradicted, and it is the one that stays.
