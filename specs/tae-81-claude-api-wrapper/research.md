# Research: Claude API Service Wrapper

**Date**: 2026-07-23 | **Status**: Complete

## R1: Anthropic SDK Client Initialization

**Decision**: Use `new Anthropic()` which auto-resolves the API key from the `ANTHROPIC_API_KEY` environment variable.

**Rationale**: The SDK's default constructor reads credentials from the environment without explicit configuration. This aligns with the project's `env.mjs` fail-fast pattern — the key is validated at startup via Zod, and the SDK picks it up at runtime. No hardcoded keys, no manual config passing.

**Alternatives considered**:
- Passing `apiKey` explicitly to the constructor — adds a code path that could diverge from env validation. Rejected for unnecessary coupling.
- Using a config file — overengineered for a single API key. Rejected.

## R2: Streaming vs. Non-Streaming

**Decision**: Use `client.messages.stream()` with `.finalMessage()` as the default communication pattern.

**Rationale**: Meeting transcripts can be long (10k–100k+ characters). Non-streaming requests risk HTTP timeouts on large inputs. The SDK's `.stream()` method returns a `MessageStream` object; calling `.finalMessage()` waits for the complete response — giving timeout safety without requiring event-by-event handling. If real-time streaming to the UI is needed later, the same stream can be consumed incrementally without changing the integration layer's interface.

**Alternatives considered**:
- Non-streaming `client.messages.create()` — simpler but risks timeouts on long transcripts. Rejected for production reliability.
- Manual SSE parsing — unnecessary, the SDK handles it. Rejected.

## R3: Error Taxonomy

**Decision**: Categorize errors into five types: `authentication`, `rate_limit`, `invalid_request`, `network`, and `api_error`.

**Rationale**: The Anthropic SDK provides typed exception classes that map cleanly to these categories:
- `Anthropic.AuthenticationError` → `authentication`
- `Anthropic.RateLimitError` → `rate_limit`
- `Anthropic.BadRequestError` → `invalid_request`
- `Anthropic.APIConnectionError` → `network`
- `Anthropic.APIError` (base) → `api_error` (catch-all)

This taxonomy gives server actions enough information to decide user messaging (e.g., "try again later" for rate limits, "contact admin" for auth errors) without exposing SDK internals.

**Alternatives considered**:
- Re-throwing raw SDK errors — violates constitution §XIV (no internal details exposed). Rejected.
- Single generic error type — insufficient for server actions to differentiate retry-able vs. permanent failures. Rejected.

## R4: Model Selection

**Decision**: Default to `claude-opus-4-8`. Allow override via an optional parameter.

**Rationale**: Per the claude-api skill defaults, `claude-opus-4-8` is the required default model. The service accepts an optional model override for flexibility (e.g., using a cheaper model for testing or a future model upgrade) without hardcoding a single model throughout.

**Alternatives considered**:
- Hardcoding the model with no override — too rigid for a service wrapper. Rejected.
- Making model a required parameter — shifts responsibility to every caller. Rejected.

## R5: Thinking / Extended Reasoning

**Decision**: Enable adaptive thinking by default (`thinking: { type: "adaptive" }`).

**Rationale**: Transcript summarization involves complex reasoning (extracting key points, categorizing, scoring). Adaptive thinking lets Claude decide when deeper reasoning is needed. This is the recommended default for "anything remotely complicated" per the claude-api skill guidelines. On claude-opus-4-8, `budget_tokens` is rejected — only `{ type: "adaptive" }` is valid.

**Alternatives considered**:
- Disabling thinking entirely — may reduce output quality on complex transcripts. Rejected.
- Fixed `budget_tokens` — deprecated on Opus 4.6+ and rejected with 400 on Opus 4.8. Not viable.

## R6: Directory Placement

**Decision**: Place the integration in `src/integrations/claude/`, not `src/repositories/`.

**Rationale**: The constitution's directory architecture defines:
- `integrations/` — "External service integrations and API clients"
- `repositories/` — "Database abstraction layer (classes)"

The Claude API is an external service, not a database. The user's term "repository layer" maps semantically to the integration pattern — a class that hides all SDK details behind a clean method interface. The distinction matters: `repositories/` should only contain MongoDB/Mongoose abstractions.

**Alternatives considered**:
- Placing in `src/repositories/` — violates the constitution's directory semantics. Rejected.
- Placing in `src/lib/` — constitution reserves `lib/` for "shared infrastructure: database client, authentication helpers, and global utilities. No business logic." An API integration is not generic infrastructure. Rejected.

## R7: Environment Variable Validation

**Decision**: Add `ANTHROPIC_API_KEY` to the `env.mjs` server schema as a required, non-empty string.

**Rationale**: The project uses `@t3-oss/env-nextjs` + Zod for fail-fast env validation (constitution §I). Adding the API key here ensures the server crashes immediately at startup if the key is missing — consistent with how `MONGO_URI` is validated today. The SDK's own missing-key error would fire later and with a less clear message.

**Alternatives considered**:
- Checking the key in the integration constructor — catches it later than startup, inconsistent with existing pattern. Rejected as the sole approach (but the integration should still validate gracefully).
- No validation — crashes with a cryptic SDK error at first API call. Rejected.

## R8: Input Validation

**Decision**: Use Zod to validate the transcript input before sending to Claude.

**Rationale**: Constitution §VIII mandates Zod as the exclusive validation library. A Zod schema validates that the transcript is a non-empty string before an API call is made. This prevents wasted API calls on empty/invalid inputs and provides consistent error formatting.

**Alternatives considered**:
- Manual `if (!transcript)` check — works but inconsistent with the project's Zod-first approach. Rejected.
- No validation (let Claude handle it) — wastes an API call and returns a confusing error. Rejected.
