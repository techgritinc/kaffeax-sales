# Research: OpenRouter API Service Wrapper

**Date**: 2026-07-23 | **Spec**: [spec.md](spec.md)

## R1: OpenRouter API Protocol

**Decision**: Use OpenRouter's OpenAI-compatible REST API at `https://openrouter.ai/api/v1/chat/completions` via native `fetch`.

**Rationale**: OpenRouter exposes an OpenAI-compatible endpoint — no SDK needed. A lightweight `fetch` call keeps the dependency footprint at zero (Next.js ships `fetch` natively). This mirrors the Claude integration's "one client file" pattern without adding a third-party package.

**Alternatives considered**:
- `openai` npm package (OpenRouter is compatible) — rejected because it adds a large dependency for a single endpoint call, and the spec requires a lightweight HTTP client.
- `openrouter-ai` community SDK — rejected for the same reason; adds an unvetted dependency per constitution §XV.

## R2: Authentication

**Decision**: Use `Authorization: Bearer <OPENROUTER_API_KEY>` header. The API key is read from the `OPENROUTER_API_KEY` environment variable, validated at startup via `env.mjs`.

**Rationale**: Standard Bearer token auth, identical to OpenAI convention. Fail-fast validation at startup per constitution §I.

**Additional headers** (recommended, not required):
- `HTTP-Referer`: app URL for attribution in OpenRouter dashboard
- `X-Title`: app name for attribution

## R3: Request Format

**Decision**: Standard OpenAI chat completions JSON body with `model`, `messages`, and `max_tokens`.

**Request shape**:
```json
{
  "model": "google/gemma-4-31b-it:free",
  "messages": [{ "role": "user", "content": "<transcript>" }],
  "max_tokens": 16384
}
```

**Rationale**: Matches the OpenAI chat completions spec. No streaming needed for the development provider — a standard request/response is simpler and sufficient.

## R4: Response Format

**Decision**: Extract content, model, and usage from the standard OpenAI chat completion response shape.

**Response shape**:
```json
{
  "id": "gen-xxxxxxxxxxxxxx",
  "model": "google/gemma-4-31b-it:free",
  "choices": [{
    "index": 0,
    "finish_reason": "stop",
    "message": { "role": "assistant", "content": "..." }
  }],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 150,
    "total_tokens": 175
  }
}
```

**Extraction paths**:
- Text content: `response.choices[0].message.content`
- Model: `response.model`
- Input tokens: `response.usage.prompt_tokens`
- Output tokens: `response.usage.completion_tokens`

## R5: Error Handling

**Decision**: Map HTTP status codes to the same five error categories used by the Claude integration.

**Error response shape**:
```json
{
  "error": {
    "code": 429,
    "message": "Rate limit exceeded.",
    "metadata": { "error_type": "rate_limit_error" }
  }
}
```

**Error mapping**:

| HTTP Status | → Category | User Message |
|-------------|------------|-------------|
| 401, 403 | `authentication` | "API authentication failed. Contact your administrator." |
| 429 | `rate_limit` | "Service is temporarily busy. Please try again shortly." |
| 400 | `invalid_request` | "The request could not be processed. The transcript may be too long." |
| 408, 504, network errors (fetch throws) | `network` | "Unable to reach the summarization service. Check your connection." |
| 402, 500, 502, 503, other | `api_error` | "An unexpected error occurred. Please try again." |

**Rate limiting**: OpenRouter returns `Retry-After` header (seconds) on 429 responses. Extract and convert to milliseconds for `retryAfterMs`.

**Free tier limits**: 20 requests/minute, 200 requests/day.

## R6: Free Model Selection

**Decision**: Default to `google/gemma-4-31b-it:free` as the default model, configurable via `OPENROUTER_DEFAULT_MODEL` env var.

**Rationale**: Gemma 4 31B is a capable general-purpose model available for free on OpenRouter. The model ID is configurable so developers can switch to any other free model without code changes.

**Other free models available**:
- `nvidia/nemotron-3-super-120b-a12b:free` (larger, slower)
- `openai/gpt-oss-20b:free`
- `poolside/laguna-s-2.1:free` (code-focused)

**Note**: Free model availability changes — model ID is configurable via env var for this reason.

## R7: Type Reuse

**Decision**: Reuse all existing types from `src/types/claude.types.ts`: `SummarizationResponse`, `SummarizationResult`, `SummarizationError`, `SummarizationErrorCategory`, `SummarizationOptions`.

**Rationale**: The response shape is identical — success/failure discriminated union with content, model, usage, or category/message/retryAfterMs. Reusing types enables server actions to swap providers by changing only the import path. No new type file needed.

**Consideration**: The types file is named `claude.types.ts` but contains provider-agnostic shapes. Renaming it is out of scope for this feature (would touch the Claude integration). A future refactor could rename to `summarization.types.ts`.

## R8: Client Architecture

**Decision**: Create `src/integrations/openrouter/client.ts` as a thin wrapper around `fetch` that handles auth headers and base URL. Create `src/integrations/openrouter/transcript-summarizer.ts` with the same `TranscriptSummarizer` class name and method signature as the Claude integration.

**Rationale**: Mirrors the Claude integration's two-file structure (client + summarizer). The client isolates HTTP concerns; the summarizer handles validation, response mapping, and error handling. Per constitution §XVII, no barrel `index.ts`.
