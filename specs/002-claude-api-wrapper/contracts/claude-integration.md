# Integration Contract: Claude Transcript Summarizer

**Date**: 2026-07-23 | **Module**: `src/integrations/claude/`

## Interface

### TranscriptSummarizer

A service class that encapsulates all Claude API communication for transcript summarization.

**Location**: `src/integrations/claude/transcript-summarizer.ts`

#### Methods

##### `summarize(transcript: string, options?: SummarizationOptions): Promise<SummarizationResponse>`

Sends a transcript to Claude and returns a typed result.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transcript` | `string` | Yes | The meeting transcript to summarize. Must be non-empty. |
| `options` | `SummarizationOptions` | No | Optional overrides for model and max tokens. |

**Returns**: `Promise<SummarizationResponse>` — a discriminated union:

| Outcome | Shape | Key Fields |
|---------|-------|------------|
| Success | `{ success: true, content, model, usage }` | `content`: Claude's full response text. `usage`: token counts. |
| Failure | `{ success: false, category, message, retryAfterMs }` | `category`: one of `authentication`, `rate_limit`, `invalid_request`, `network`, `api_error`. |

**Behavior**:

1. Validates `transcript` is a non-empty string (Zod). Returns `invalid_request` error if validation fails.
2. Sends the transcript to Claude via streaming (`client.messages.stream()`).
3. Awaits the complete response via `.finalMessage()`.
4. On success: extracts content text, model ID, and token usage into `SummarizationResult`.
5. On failure: catches SDK exceptions, maps to `SummarizationError` with user-safe message.

**Error mapping**:

| SDK Exception | → Category | User Message |
|---------------|------------|-------------|
| `AuthenticationError` | `authentication` | "API authentication failed. Contact your administrator." |
| `RateLimitError` | `rate_limit` | "Service is temporarily busy. Please try again shortly." |
| `BadRequestError` | `invalid_request` | "The request could not be processed. The transcript may be too long." |
| `APIConnectionError` | `network` | "Unable to reach the summarization service. Check your connection." |
| `APIError` (other) | `api_error` | "An unexpected error occurred. Please try again." |

**Invariants**:

- This method NEVER throws. All errors are returned as `SummarizationError` objects.
- No Anthropic SDK types appear in the method signature — only plain types from `src/types/claude.types.ts`.
- The method is stateless — each call creates an independent API request.

---

### Claude Client

**Location**: `src/integrations/claude/client.ts`

A module-level factory that creates and exports a singleton `Anthropic` client instance.

**Behavior**:
- Instantiates `new Anthropic()` which reads `ANTHROPIC_API_KEY` from the environment.
- Exports the client for use by `TranscriptSummarizer`.
- This file is the ONLY file in the codebase that imports from `@anthropic-ai/sdk`.

---

## Consumer Contract

Server actions consume the integration as follows:

```text
1. Import TranscriptSummarizer from '@/integrations/claude/transcript-summarizer'
2. Import SummarizationResponse from '@/types/claude.types'
3. Call summarizer.summarize(transcript)
4. Check response.success
   - true: use response.content
   - false: handle response.category + response.message
```

**Guarantees to consumers**:
- No SDK imports required in server actions
- No exceptions to catch — errors returned as values
- Response type is a clean discriminated union checkable with `if (response.success)`
- Thread-safe — multiple concurrent calls are independent

## Environment Requirements

| Variable | Required | Validated In | Description |
|----------|----------|-------------|-------------|
| `ANTHROPIC_API_KEY` | Yes | `env.mjs` (server schema) | Anthropic API key. App crashes at startup if missing. |
