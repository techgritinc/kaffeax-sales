# Quickstart: Validating the Claude Integration Fixes

Manual validation steps — this repo has no automated test infrastructure yet (see `CLAUDE.md`). Each scenario below maps to an Acceptance Scenario in [spec.md](./spec.md).

## Prerequisites

- A valid Claude API key (`sk-ant-...`).
- Access to `.env.development` (or your local env file) with permission to change `NEXT_PUBLIC_APP_ENV`, `CLAUDE_API_KEY`, and `CLAUDE_DEFAULT_MODEL`.
- `npm run dev` (or `npm run dev:prod` if validating against the production env file).

## Scenario 1 — Authentication succeeds with a valid credential (User Story 1)

1. Set `NEXT_PUBLIC_APP_ENV=production` and `CLAUDE_API_KEY=<a real key>` in your env file.
2. Restart the dev server so `env.mjs` re-validates: `npm run dev:prod`.
3. In the app, trigger a transcript summarization (upload/select a sample transcript and click **Summarize**).
4. **Expected**: the request reaches Claude and completes — either a successful summary, or a provider-side error (rate limit, etc.), but never an authentication failure caused by the key not being sent.
5. Repeat against the meeting chat assistant (ask a question about an analyzed meeting) and suggested questions (open a meeting's summary) — both must also authenticate successfully.

**Negative check**: set `CLAUDE_API_KEY` to an obviously invalid value and repeat step 3. Expected: a clear "not configured correctly" / authentication-category message — not a generic or misleading error, and not silently treated as a different failure category.

## Scenario 2 — Switching models never breaks a request (User Story 2)

1. Set `CLAUDE_DEFAULT_MODEL=claude-haiku-4-5` (a model without adaptive-thinking/effort support).
2. Restart the dev server.
3. Trigger, in turn: transcript summarization, the meeting chat assistant, and suggested-questions generation.
4. **Expected**: all three complete successfully — no `invalid_request` / 400 failure referencing `thinking` or `effort`.
5. Set `CLAUDE_DEFAULT_MODEL=claude-sonnet-5` (a model that does support them) and repeat steps 3–4.
6. **Expected**: all three still complete successfully — this confirms the capability gate lets the feature through rather than unconditionally stripping it.

**One-time verification of the capability map** (not part of every run — see [research.md](./research.md) R2): when adding a new model to `model-capabilities.ts`, confirm its actual support level once via the Models API:

```ts
const model = await client.models.retrieve('the-new-model-id');
console.log(model.capabilities.thinking?.types?.adaptive?.supported);
console.log(model.capabilities.effort?.max?.supported);
```

## Scenario 3 — Structured output reliability on par with OpenRouter (User Story 3)

1. With `NEXT_PUBLIC_APP_ENV=development` (OpenRouter), run a representative transcript through summarization 5–10 times and note any `malformed_response` outcomes (visible in the summary's failure message, or in server logs from `TranscriptSummarizer`).
2. Switch to `NEXT_PUBLIC_APP_ENV=production` (Claude) with the same transcript(s) and repeat the same number of runs.
3. **Expected**: the Claude run's `malformed_response` rate is not higher than the OpenRouter run's rate for the same inputs.
4. Confirm retries still occur for any residual malformed response (up to `MAX_STRUCTURED_ATTEMPTS`) before a failure is ever surfaced to the user — check server logs for the `retrying (attempt N/...)` warning.

## Rollback check

Confirm the OpenRouter (development) path is unaffected: with `NEXT_PUBLIC_APP_ENV=development`, run all three AI-backed features once and confirm behavior is unchanged from before this feature (no new errors, no changed response shape).
