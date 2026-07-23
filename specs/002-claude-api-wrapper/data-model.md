# Data Model: Claude API Service Wrapper

**Date**: 2026-07-23 | **Location**: `src/types/claude.types.ts`

## Overview

All types below live in `src/types/claude.types.ts` with zero SDK dependency — directly importable by server actions, components, and other layers. The integration layer (`src/integrations/claude/`) imports these types but never exports SDK-specific types.

## Types

### SummarizationErrorCategory

```text
Union type: 'authentication' | 'rate_limit' | 'invalid_request' | 'network' | 'api_error'
```

Maps to Anthropic SDK exception classes:
- `authentication` — API key invalid or missing
- `rate_limit` — Request throttled by Anthropic
- `invalid_request` — Malformed request (e.g., empty transcript, context overflow)
- `network` — Connection failure / timeout
- `api_error` — Any other API-level error

### SummarizationError

| Field | Type | Description |
|-------|------|-------------|
| `success` | `false` (literal) | Discriminant for result union |
| `category` | `SummarizationErrorCategory` | Error classification |
| `message` | `string` | User-safe error description |
| `retryAfterMs` | `number \| null` | Milliseconds to wait before retry (rate limits only) |

### SummarizationResult

| Field | Type | Description |
|-------|------|-------------|
| `success` | `true` (literal) | Discriminant for result union |
| `content` | `string` | Claude's response text |
| `model` | `string` | Model ID that produced the response |
| `usage` | `{ inputTokens: number; outputTokens: number }` | Token consumption for monitoring |

### SummarizationResponse

```text
Discriminated union: SummarizationResult | SummarizationError
```

Callers use the `success` discriminant:
```text
if (response.success) → access .content, .model, .usage
if (!response.success) → access .category, .message, .retryAfterMs
```

### SummarizationOptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `model` | `string` | `'claude-opus-4-8'` | Claude model ID override |
| `maxTokens` | `number` | `16384` | Maximum response tokens |

Optional configuration passed to the summarization method. All fields are optional with sensible defaults.

## Relationships

```text
Server Action
    │
    ▼
TranscriptSummarizer.summarize(transcript: string, options?: SummarizationOptions)
    │
    ▼
SummarizationResponse (discriminated union)
    ├── success: true  → SummarizationResult
    └── success: false → SummarizationError
```

## Validation Rules

- **Transcript input**: Must be a non-empty string (validated via Zod schema before API call)
- **SummarizationOptions.model**: Optional string, defaults to `claude-opus-4-8`
- **SummarizationOptions.maxTokens**: Optional positive integer, defaults to `16384`

## Existing Type Integration

The existing `TranscriptFields` type (`src/types/transcript.types.ts`) contains:
- `originalTranscript: string` — the raw transcript text that gets passed to the summarizer
- `cleanedTranscript: string` — a cleaned version (may be used instead)
- `summary: TranscriptSummary` — the structured output (will be populated by a future prompt engineering phase)

This feature's wrapper returns raw Claude output as a string. A future phase will parse that output into the `TranscriptSummary` structure.
