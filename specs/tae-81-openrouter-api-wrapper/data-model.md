# Data Model: OpenRouter API Service Wrapper

**Date**: 2026-07-23 | **Spec**: [spec.md](spec.md)

## Reused Types

This feature does not introduce new types. It reuses all existing types from `src/types/claude.types.ts` to maintain response-shape parity with the Claude integration.

### SummarizationErrorCategory (union type)

Five categories shared across all providers:

| Value | When Used |
|-------|-----------|
| `authentication` | API key invalid, expired, or missing permissions |
| `rate_limit` | Provider returned 429 (too many requests) |
| `invalid_request` | Bad input: empty transcript, malformed request, transcript too long |
| `network` | Cannot reach provider: timeout, DNS failure, connection refused |
| `api_error` | Catch-all: server errors, unexpected responses, unknown failures |

### SummarizationError (interface)

| Field | Type | Description |
|-------|------|-------------|
| `success` | `false` (literal) | Discriminant for the union |
| `category` | `SummarizationErrorCategory` | Error classification |
| `message` | `string` | User-safe message (no stack traces or internal details) |
| `retryAfterMs` | `number \| null` | Milliseconds to wait before retrying (from `Retry-After` header on 429), `null` for all other categories |

### SummarizationResult (interface)

| Field | Type | Description |
|-------|------|-------------|
| `success` | `true` (literal) | Discriminant for the union |
| `content` | `string` | Model's full response text |
| `model` | `string` | Model ID used (e.g., `google/gemma-4-31b-it:free`) |
| `usage.inputTokens` | `number` | Prompt token count (mapped from `prompt_tokens`) |
| `usage.outputTokens` | `number` | Completion token count (mapped from `completion_tokens`) |

### SummarizationResponse (discriminated union)

`SummarizationResult | SummarizationError` — callers check `response.success` to narrow the type.

### SummarizationOptions (interface)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | `string` | No | Override the default model |
| `maxTokens` | `number` | No | Override the default max tokens |

## OpenRouter-Specific Mapping

The OpenRouter API returns an OpenAI-compatible response. The mapping from API fields to shared types:

| OpenRouter Response Field | → Shared Type Field |
|---------------------------|---------------------|
| `choices[0].message.content` | `SummarizationResult.content` |
| `model` | `SummarizationResult.model` |
| `usage.prompt_tokens` | `SummarizationResult.usage.inputTokens` |
| `usage.completion_tokens` | `SummarizationResult.usage.outputTokens` |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | Yes | — | OpenRouter API key. App crashes at startup if missing. |
| `OPENROUTER_DEFAULT_MODEL` | No | `google/gemma-4-31b-it:free` | Default model for summarization |
| `OPENROUTER_MAX_TOKENS` | No | `16384` | Default max tokens in model response |
