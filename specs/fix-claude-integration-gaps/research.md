# Phase 0 Research: Claude AI Integration Reliability Fixes

## R1 — Why the API key never reaches the Anthropic client

**Decision**: Pass `apiKey: env.CLAUDE_API_KEY` explicitly in the `Anthropic` constructor in [`src/integrations/claude/client.ts`](../../src/integrations/claude/client.ts).

**Rationale**: `new Anthropic()` with no arguments does not read this project's validated `CLAUDE_API_KEY` — the official SDK's zero-arg constructor falls back to the raw environment variable `ANTHROPIC_API_KEY`, which this project never sets (it validates and exposes `CLAUDE_API_KEY` instead, via `env.mjs`). This is exactly the first symptom reported: the key was "not passed in the client initialization." Confirmed against the current `env.mjs` schema, which already defines `CLAUDE_API_KEY: z.string().min(1)` and maps it from `process.env.CLAUDE_API_KEY` — the value is available and validated; it simply isn't wired into the SDK client.

**Alternatives considered**:
- Renaming the env var to `ANTHROPIC_API_KEY` so the SDK's implicit fallback works — rejected: changes a public-facing env contract (`.env.development`, deployment configs, `CLAUDE_API_KEY` naming used throughout `env.mjs`) for no benefit over the one-line explicit fix, and diverges from the project's existing `CLAUDE_`-prefixed naming convention for every other Claude-related variable (`CLAUDE_DEFAULT_MODEL`, `CLAUDE_MAX_TOKENS`).

## R2 — Model-specific support for `thinking: { type: 'adaptive' }` + `output_config.effort`

**Decision**: Treat "does this model support adaptive thinking + effort" as a per-model boolean capability, gated in code before the request is built, defaulting new/unrecognized models to "unsupported" (safe default — omit the feature) rather than "supported."

**Rationale**: Confirmed authoritatively (Anthropic's own model/API reference): adaptive thinking (`thinking: { type: 'adaptive' }`) combined with `output_config.effort` is supported on Claude Opus 5, Claude Sonnet 5, and the Opus/Sonnet 4.6+ family. It is **not** supported in that form on Claude Haiku 4.5 — Haiku 4.5 falls in the "older models" tier that either takes no `thinking` field at all, or the legacy `thinking: { type: 'enabled', budget_tokens: N }` shape, and `effort` errors outright on it. This exactly matches the second reported symptom: switching to `claude-haiku-4-5` broke the request because of the hardcoded `thinking`/`effort` params, not because of "content too large" (that was a misdiagnosis of the resulting 400's surface message).

The unsupported case is not silent — the Anthropic SDK raises a typed `BadRequestError` (HTTP 400, `invalid_request_error`) with a message naming the rejected parameter. This is important for [FR-004](./spec.md): the fix is to never send the parameter to a model that doesn't support it, not to add error-recovery after the fact.

**Alternatives considered**:
- **Query the Models API (`client.models.retrieve(modelId)` → `capabilities.thinking.types.adaptive.supported`) at request time** — rejected as the primary mechanism: it adds a network round trip (and a new failure mode — what if *that* call fails) to every summarization/chat/suggestion request, for a value that changes only when Anthropic ships a new model, not per-request. Retained as a **secondary, one-time verification step** in `quickstart.md` — an operator can call it once when adding a new model to the capability map, to confirm the map is still accurate.
- **Catch the `BadRequestError` from the unsupported params and silently retry without them** — rejected: this doubles latency and cost on every request to an unsupported model (every call fails once before succeeding), and masks a configuration mistake that should be visible, not silently worked around forever.
- **A capability flag per environment variable (e.g. `CLAUDE_SUPPORTS_ADAPTIVE_THINKING=true/false`) set alongside `CLAUDE_DEFAULT_MODEL`** — rejected: pushes a decision the code can already make correctly (model X supports feature Y) onto the operator, who has no way to know the right answer without reading the same reference this plan already encodes; also risks drifting out of sync with the actual configured model.

## R3 — Closing the malformed-response gap between Claude and OpenRouter

**Decision**: For the structured (JSON-producing) call paths — `transcript-summarizer.ts`'s structured branch, and the JSON-contract paths in `meeting-chat.ts` / `suggested-questions.ts` — use the Anthropic Messages API's native structured-output enforcement (`output_config: { format: { type: 'json_schema', schema: ... } }`) instead of relying on prompt instructions plus after-the-fact `JSON.parse` + repair.

**Rationale**: The OpenRouter path already sets `response_format: { type: 'json_object' }` on every structured request ([`openrouter/transcript-summarizer.ts`](../../src/integrations/openrouter/transcript-summarizer.ts)) — a provider-level guarantee that the response is valid JSON. The Claude path has no equivalent constraint: it sends only prompt-level instructions ("Return ONLY valid, parseable JSON…") and depends on [`processStructuredResponse`](../../src/lib/utils/structured-analysis.utils.ts) to strip code fences, attempt `JSON.parse`, fall back to a JSON-repair pass, and retry the whole request up to `MAX_STRUCTURED_ATTEMPTS` times on failure. This asymmetry — enforced JSON on one provider, best-effort JSON on the other, for the *same prompt* — is the direct cause of the reported "malformed response with Claude API" that doesn't reproduce on OpenRouter.

The Anthropic Messages API supports an equivalent, stronger guarantee via `output_config.format` with a `json_schema`: the response is constrained to match the schema at generation time, rather than validated afterward. `AiSummaryResponseSchema` (already a Zod schema, already camelCase per §XVIII) is the natural source for that JSON schema — the same schema currently used for post-hoc validation becomes the enforcement contract instead.

**Alternatives considered**:
- **Leave prompt-only enforcement and only tighten the repair/retry loop** — rejected: treats the symptom (occasional malformed JSON) rather than the cause (no enforcement at the API level), and can never fully close the gap with OpenRouter's `response_format: json_object`.
- **Switch Claude requests to use tool-use with a forced single tool call as a JSON-shaping mechanism** — rejected: functionally equivalent to `output_config.format` for this use case but adds a tool-definition layer and a `tool_use` content-block parsing path purely to get a JSON shape, when the API has a purpose-built parameter for exactly this.
- **Assistant-turn prefill (`{"role": "assistant", "content": "{"}`) to bias the model toward JSON** — rejected: unsupported (400) on the current default model family (Sonnet 5 / Opus-tier), and structured outputs are the documented replacement for this exact pattern.

## R4 — Scope check: does this fix apply to all three Claude call sites?

**Decision**: Yes — all three (`transcript-summarizer.ts`, `meeting-chat.ts`, `suggested-questions.ts`) get the capability gate for `thinking`/`effort`; `meeting-chat.ts` and `suggested-questions.ts` (which already require strict JSON contracts per their prompt files) get the structured-output enforcement in the same pass as `transcript-summarizer.ts`'s structured branch.

**Rationale**: `meeting-chat.ts` and `suggested-questions.ts` already hardcode `thinking`/`effort` today (confirmed by direct code read), so they are exactly as exposed to the model-switch defect as the reported case. `transcript-summarizer.ts`'s non-structured branch (plain-text summarization, no `signals` option) has no JSON contract to enforce and is unaffected by R3 — only its `summarizeStructured` branch and the two chat/suggestion call sites need the structured-output change. This satisfies [FR-009](./spec.md), which requires the fix to be consistent across every AI-backed capability rather than only the one where the defect was first observed.

**Alternatives considered**:
- **Fix only the exact code path the user hit** — rejected: the spec's User Story 2 and FR-009 explicitly require the fix to generalize; leaving `meeting-chat.ts`/`suggested-questions.ts` with the same hardcoded params would leave the model-switch defect fully reproducible there.

## Outstanding NEEDS CLARIFICATION

None. All Technical Context items in `plan.md` are resolved; no unknowns remain for Phase 1.
