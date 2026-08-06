# Contract: Model Capability Resolution

This feature has no external HTTP/API surface of its own (no `/app/api/` routes, no new Server Actions) — the only "interface" introduced is an internal one: the contract between each Claude call site and the model-capability resolver that decides what an outbound request to the Anthropic Messages API may contain. Documented as a contract because three independent call sites (`transcript-summarizer.ts`, `meeting-chat.ts`, `suggested-questions.ts`) must all honor it identically, per [FR-009](../spec.md).

## Function contract

```
resolveModelCapabilities(modelId: string): ModelCapabilityProfile
```

- **Input**: `modelId` — the exact string that will be sent as `model` on the Anthropic Messages API request (from `env.CLAUDE_DEFAULT_MODEL` or a per-call override).
- **Output**: `ModelCapabilityProfile` (see [data-model.md](../data-model.md)) — never throws, never returns `undefined`. An unrecognized `modelId` returns the all-`false` safe default.
- **Purity**: no I/O, no network call, no dependency on request state. Callable at request-build time with zero added latency.

## Request-building contract

Every Claude call site MUST build its request as:

```
const capabilities = resolveModelCapabilities(modelId)

const request = {
  model: modelId,
  max_tokens: maxTokens,
  ...(capabilities.supportsAdaptiveThinking ? { thinking: { type: 'adaptive' } } : {}),
  ...(capabilities.supportsEffort ? { output_config: { effort } } : {}),
  // ...rest of the request (system, messages, output_config.format, etc.)
}
```

- If `supportsEffort` is `true` but the call site also needs `output_config.format` (structured outputs, see below), both keys MUST be merged into a single `output_config` object — `output_config` cannot be sent twice.
- Omitting `thinking`/`output_config.effort` MUST NOT be treated as an error path — it is the expected, successful shape of a request to a model that doesn't support them ([FR-004](../spec.md)).

## Structured-output contract (for JSON-producing call sites)

For any call site that requires the model to return parseable JSON matching a known shape (`transcript-summarizer.ts`'s structured branch, `meeting-chat.ts`, `suggested-questions.ts`):

```
output_config: {
  format: { type: 'json_schema', schema: <JSON Schema derived from the existing Zod contract> }
  // effort, if supportsEffort — merged into the same output_config object
}
```

- The JSON Schema passed here MUST be derived from the same Zod schema already used for response validation (`AiSummaryResponseSchema` and the chat/suggestion equivalents) — one schema, two uses (request-time enforcement, response-time type narrowing), never two hand-maintained copies.
- This replaces prompt-only JSON instructions as the enforcement mechanism; the prompt instructions may remain as human-readable context but MUST NOT be the only mechanism relied upon for parseability.

## Non-goals

- This contract does not change the shape of `SummarizationResponse` / `MeetingChatResponse` / `SuggestedQuestionsResponse` returned to callers outside `src/integrations/claude/`.
- This contract does not apply to `src/integrations/openrouter/`, which already has its own, unrelated JSON-enforcement mechanism (`response_format: json_object`).
