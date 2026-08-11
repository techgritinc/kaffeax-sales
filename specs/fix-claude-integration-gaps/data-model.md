# Phase 1 Data Model: Claude AI Integration Reliability Fixes

No database schema changes — nothing here touches MongoDB, a repository class, or a Mongoose model. These are in-process, request-shaping concepts introduced or clarified by this feature, named to match the Key Entities in [spec.md](./spec.md).

## Model Capability Profile

Describes, per Claude model identifier, which optional/advanced request features that model accepts.

| Field | Type | Notes |
|---|---|---|
| `modelId` | `string` | The exact model identifier as configured in `CLAUDE_DEFAULT_MODEL` (e.g. `claude-sonnet-5`, `claude-haiku-4-5`). Matched by prefix so dated snapshot IDs still resolve. |
| `supportsAdaptiveThinking` | `boolean` | Whether `thinking: { type: 'adaptive' }` may be sent to this model. |
| `supportsEffort` | `boolean` | Whether `output_config.effort` may be sent to this model. In every model this feature currently maps, this is identical to `supportsAdaptiveThinking` (the two ship together), but the fields are kept independent since the underlying API documents them as separately-gated. |

**Resolution rule**: an unrecognized `modelId` resolves to `{ supportsAdaptiveThinking: false, supportsEffort: false }` — the safe default is to omit the advanced feature, per [FR-004](./spec.md), never to assume support.

**Lifecycle**: static, hand-maintained data (not persisted, not fetched at request time — see [research.md](./research.md) R2). Updated only when a new Claude model is adopted via `CLAUDE_DEFAULT_MODEL`.

## AI Provider Configuration

The existing environment-driven settings that select and configure the active provider. No new fields — documented here because [FR-001](./spec.md) and [FR-002](./spec.md) depend on it being read correctly.

| Field | Source | Notes |
|---|---|---|
| `provider` | derived from `NEXT_PUBLIC_APP_ENV` in `transcript-summarizer.factory.ts` | `development` → OpenRouter, anything else → Claude. Unchanged by this feature. |
| `apiKey` | `env.CLAUDE_API_KEY` | Currently validated but not passed to the SDK client — this is the fix in [FR-001](./spec.md). |
| `modelId` | `env.CLAUDE_DEFAULT_MODEL`, or a per-call `options.model` override | Feeds the Model Capability Profile lookup. |
| `maxTokens` | `env.CLAUDE_MAX_TOKENS`, or a per-call `options.maxTokens` override | Unchanged. |

## AI Response Outcome

The existing discriminated-union error/result shape (`SummarizationResponse`, `MeetingChatResponse`, `SuggestedQuestionsResponse` and their `category` fields in `src/types/claude.types.ts` / `src/types/chat.types.ts` / `src/types/suggested-questions.types.ts`). No shape change — this feature must not introduce a new failure category, per the existing category set:

| Category | Meaning | Affected by this feature? |
|---|---|---|
| `authentication` | Credential missing/rejected by provider | Directly fixed by R1 — previously mis-firing or masked by the key never being sent. |
| `invalid_request` | Malformed/oversized request | Was the visible symptom of the `thinking`/`effort` mismatch (the "content too large"-looking error); after R2, a supported-vs-unsupported feature no longer produces this. |
| `rate_limit` | Provider throttling | Unaffected. |
| `network` | Connectivity failure | Unaffected. |
| `malformed_response` | Response failed JSON/schema parsing | Target of R3 — expected to occur less often on Claude after adopting structured outputs, converging with OpenRouter's rate. |
| `api_error` | Uncategorized provider error | Unaffected. |

No new category is introduced. FR-005 requires `authentication` to never be confused with `rate_limit`/`network`/`malformed_response` — this already holds structurally in `handleSdkError` ([`sdk-error.utils.ts`](../../src/integrations/claude/sdk-error.utils.ts)); R1 makes the `authentication` branch actually reachable when a credential problem is the real cause.
