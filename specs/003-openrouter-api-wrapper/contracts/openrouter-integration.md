# Integration Contract: OpenRouter Transcript Summarizer

**Date**: 2026-07-23 | **Module**: `src/integrations/openrouter/`

## Interface

### TranscriptSummarizer

A service class that encapsulates all OpenRouter API communication for transcript summarization. Mirrors the Claude integration's interface exactly.

**Location**: `src/integrations/openrouter/transcript-summarizer.ts`

#### Methods

##### `summarize(transcript: string, options?: SummarizationOptions): Promise<SummarizationResponse>`

Sends a transcript to OpenRouter and returns a typed result.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transcript` | `string` | Yes | The meeting transcript to summarize. Must be non-empty. |
| `options` | `SummarizationOptions` | No | Optional overrides for model and max tokens. |

**Returns**: `Promise<SummarizationResponse>` — a discriminated union:

| Outcome | Shape | Key Fields |
|---------|-------|------------|
| Success | `{ success: true, content, model, usage }` | `content`: model's full response text. `usage`: token counts. |
| Failure | `{ success: false, category, message, retryAfterMs }` | `category`: one of `authentication`, `rate_limit`, `invalid_request`, `network`, `api_error`. |

**Behavior**:

1. Validates `transcript` is a non-empty string (Zod). Returns `invalid_request` error if validation fails.
2. Calls OpenRouter's chat completions endpoint via the client's `fetch` wrapper.
3. Awaits the complete JSON response.
4. On success (HTTP 2xx): extracts content text, model ID, and token usage into `SummarizationResult`.
5. On failure (non-2xx or network error): maps to `SummarizationError` with user-safe message.

**Error mapping**:

| HTTP Status | → Category | User Message |
|-------------|------------|-------------|
| 401, 403 | `authentication` | "API authentication failed. Contact your administrator." |
| 429 | `rate_limit` | "Service is temporarily busy. Please try again shortly." |
| 400 | `invalid_request` | "The request could not be processed. The transcript may be too long." |
| 408, 504, fetch `TypeError` | `network` | "Unable to reach the summarization service. Check your connection." |
| 402, 500, 502, 503, other | `api_error` | "An unexpected error occurred. Please try again." |

**Invariants**:

- This method NEVER throws. All errors are returned as `SummarizationError` objects.
- No OpenRouter-specific types appear in the method signature — only plain types from `src/types/claude.types.ts`.
- The method is stateless — each call creates an independent API request.
- The method signature is identical to the Claude integration's `TranscriptSummarizer.summarize()`.

---

### OpenRouter Client

**Location**: `src/integrations/openrouter/client.ts`

A module that exports a `chatCompletion` function wrapping `fetch` for OpenRouter's API.

**Behavior**:
- Reads `OPENROUTER_API_KEY` from `env.mjs` for the `Authorization: Bearer` header.
- Sets `Content-Type: application/json`.
- Sets `HTTP-Referer` from `NEXT_PUBLIC_APP_URL` env var (for OpenRouter dashboard attribution).
- Sets `X-Title` to `Kaffea-X Sales` (app name for attribution).
- Targets `https://openrouter.ai/api/v1/chat/completions`.
- This file is the ONLY file in the OpenRouter integration that makes HTTP calls.

**Function signature**:
```text
chatCompletion(body: { model: string; messages: Array<{role: string; content: string}>; max_tokens: number }): Promise<Response>
```

Returns the raw `Response` object — the summarizer handles JSON parsing, success/error branching, and response mapping.

---

## Consumer Contract

Server actions consume the integration identically to the Claude integration:

```text
1. Import TranscriptSummarizer from '@/integrations/openrouter/transcript-summarizer'
2. Import SummarizationResponse from '@/types/claude.types'
3. Call summarizer.summarize(transcript)
4. Check response.success
   - true: use response.content
   - false: handle response.category + response.message
```

**Guarantees to consumers**:
- No OpenRouter-specific imports required in server actions
- No exceptions to catch — errors returned as values
- Response type is the same `SummarizationResponse` discriminated union used by the Claude integration
- Switching from Claude to OpenRouter requires changing only the import path — the response shape is identical
- Thread-safe — multiple concurrent calls are independent

## Environment Requirements

| Variable | Required | Default | Validated In | Description |
|----------|----------|---------|-------------|-------------|
| `OPENROUTER_API_KEY` | Yes | — | `env.mjs` (server schema) | OpenRouter API key. App crashes at startup if missing. |
| `OPENROUTER_DEFAULT_MODEL` | No | `google/gemma-4-31b-it:free` | `env.mjs` (server schema) | Default model for summarization. |
| `OPENROUTER_MAX_TOKENS` | No | `16384` | `env.mjs` (server schema) | Default max tokens in response. |
