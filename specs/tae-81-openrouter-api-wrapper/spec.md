# Feature Specification: OpenRouter API Service Wrapper

**Feature Branch**: `feat/openrouter-api-wrapper`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Create a second integration layer for OpenRouter, mirroring the existing Claude integration's type structure and error handling. This provides a free/low-cost AI model for development use while the Claude integration remains the production provider. The OpenRouter integration lives in its own directory (`src/integrations/openrouter/`) with its own client file, completely independent from the Claude integration. Server actions call the repository method and receive the same discriminated-union response shape."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send Transcript for Summarization via OpenRouter (Priority: P1)

A developer working on the summarization feature needs to test the end-to-end flow without consuming paid Claude API credits. They configure the system to use the OpenRouter integration, which sends the transcript to a free AI model via the OpenRouter API and returns a structured response in the same shape as the Claude integration.

**Why this priority**: This is the core purpose of the wrapper. Without the ability to send a transcript and receive a response through OpenRouter, developers have no free alternative for iterating on the summarization feature.

**Independent Test**: Can be tested by invoking the repository method with a sample transcript string and verifying that a response is returned from OpenRouter without errors, using the same response shape as the Claude integration.

**Acceptance Scenarios**:

1. **Given** a transcript string is available, **When** the OpenRouter repository method is called with the transcript, **Then** the system sends the transcript to a free AI model via OpenRouter and returns a response object containing the model's output.
2. **Given** a transcript string is available, **When** the repository method is called, **Then** the call completes within a reasonable time frame and does not block the calling server action indefinitely.
3. **Given** a valid transcript, **When** the repository method is called, **Then** the response shape matches the same discriminated-union structure used by the Claude integration — `{ success: true, content, model, usage }` on success.

---

### User Story 2 - Handle OpenRouter API Failures Gracefully (Priority: P1)

When the OpenRouter API is unavailable, rate-limited, or returns an error, the integration layer must surface a meaningful, structured error to the calling server action — not raw exception details. The error shape must match the same categories used by the Claude integration.

**Why this priority**: Co-equal with Story 1. An API wrapper that crashes or exposes raw errors on failure is unusable even for development. Consistent error handling across providers simplifies the server action layer.

**Independent Test**: Can be tested by simulating API errors (invalid key, rate limit, network timeout) and verifying the repository returns structured error information in the same shape as the Claude integration's error objects.

**Acceptance Scenarios**:

1. **Given** the OpenRouter API returns a rate-limit error, **When** the repository method is called, **Then** it returns a structured error object with `category: "rate_limit"` without exposing internal API details.
2. **Given** the OpenRouter API is unreachable (network failure), **When** the repository method is called, **Then** it returns a structured error object with `category: "network"` within a bounded timeout period.
3. **Given** the API key is invalid or missing, **When** the repository method is called, **Then** it returns a structured error object with `category: "authentication"`.

---

### User Story 3 - Server Action Integration (Priority: P2)

A server action calls the OpenRouter repository method to process a transcript. The server action passes the transcript and receives back either a successful response or a structured error. The server action does not contain any OpenRouter API logic — it delegates entirely to the repository. The response types are identical to the Claude integration's types, so the server action can use either provider interchangeably.

**Why this priority**: Important for architectural compliance and provider interchangeability, but depends on Story 1 and Story 2 being functional first.

**Independent Test**: Can be tested by creating a minimal server action that calls the OpenRouter repository method and verifying the server action contains zero direct OpenRouter API logic while still producing the expected result.

**Acceptance Scenarios**:

1. **Given** a server action receives a summarization request, **When** it calls the OpenRouter repository method with the transcript, **Then** it receives either a success response or a structured error without needing any OpenRouter API knowledge.
2. **Given** the OpenRouter integration is properly configured, **When** a server action imports and uses it, **Then** no OpenRouter SDK imports or API-specific code exist in the server action file.
3. **Given** a server action is written to work with the Claude integration, **When** it is switched to use the OpenRouter integration, **Then** the only change required is the import path — the response types remain identical.

---

### Edge Cases

- What happens when the transcript is empty or contains only whitespace?
- What happens when the transcript exceeds the chosen model's context window limit?
- How does the system handle concurrent summarization requests for multiple transcripts?
- What happens when the API response is malformed or does not match the expected OpenAI-compatible structure?
- What happens when the API key environment variable is not set at startup?
- What happens when the configured free model becomes unavailable or is removed from OpenRouter?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a repository class that encapsulates all OpenRouter API communication behind a clean interface, located in `src/integrations/openrouter/`.
- **FR-002**: System MUST accept a transcript (string) as input and return the AI model's response through the repository method.
- **FR-003**: System MUST communicate with OpenRouter via its OpenAI-compatible REST API, using a lightweight HTTP client — not a heavyweight SDK.
- **FR-004**: System MUST reuse the existing `SummarizationResponse`, `SummarizationResult`, `SummarizationError`, `SummarizationErrorCategory`, and `SummarizationOptions` types from `src/types/claude.types.ts` to ensure response-shape parity with the Claude integration.
- **FR-005**: System MUST categorize API errors into the same five types used by the Claude integration (authentication, rate_limit, invalid_request, network, api_error) and return structured error objects.
- **FR-006**: System MUST validate that the required OpenRouter API key environment variable is present at startup; absence MUST produce a clear, actionable error.
- **FR-007**: System MUST NOT expose raw API error details, stack traces, or internal system information to callers.
- **FR-008**: System MUST be callable from Next.js Server Actions without requiring the server action to import or reference any OpenRouter-specific types beyond the shared summarization types.
- **FR-009**: System MUST validate that the transcript input is a non-empty string before making an API call.
- **FR-010**: The OpenRouter integration MUST be completely independent from the Claude integration — separate directory, separate client file, no shared code except the common types in `src/types/`.
- **FR-011**: The default model and max tokens MUST be configurable via environment variables, not hardcoded.

### Key Entities

- **TranscriptSummarizationRequest**: Represents the input to the repository — contains the transcript text to be summarized and optional configuration (model override, max tokens).
- **TranscriptSummarizationResponse**: Represents the successful output — uses the same `SummarizationResult` type as the Claude integration: content, model, and token usage.
- **SummarizationError**: Represents a failed API call — uses the same `SummarizationError` type as the Claude integration: error category, user-safe message, and optional retry-after hint.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A server action can request a transcript summary through OpenRouter by calling a single repository method with no direct knowledge of the OpenRouter API.
- **SC-002**: All OpenRouter API errors are caught and returned as structured error objects — zero unhandled exceptions propagate to the server action layer.
- **SC-003**: The OpenRouter integration returns the same response types as the Claude integration — a server action can switch providers by changing only the import path.
- **SC-004**: The OpenRouter integration is fully isolated in its own directory — it shares only the common type definitions with the Claude integration, with zero cross-imports between the two integration directories.
- **SC-005**: The system validates the OpenRouter API key at initialization and fails fast with a clear error message if the key is missing.
- **SC-006**: Developers can use a free AI model through OpenRouter for development and testing without incurring costs.

## Assumptions

- OpenRouter provides an OpenAI-compatible API at `https://openrouter.ai/api/v1/chat/completions` that accepts standard chat completion requests.
- A free model is available on OpenRouter for development use (the specific model will be configurable via environment variable).
- The OpenRouter API key will be provided via an environment variable and validated at startup through the existing `env.mjs` schema.
- The existing shared types in `src/types/claude.types.ts` are sufficient for OpenRouter's response shape — no new type files are needed.
- The Claude integration is not modified in any way by this feature.
- Prompt engineering and output format definition are explicitly out of scope — the repository will pass the transcript to the model with a minimal placeholder prompt.
- The UI layer is not modified — this is a backend-only integration for development use.
- Streaming is not required for OpenRouter since it is a development-only provider; a standard request/response pattern is acceptable. If streaming proves necessary for timeout prevention, it can be added in a follow-up.
