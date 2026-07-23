# Feature Specification: Claude API Service Wrapper

**Feature Branch**: `feat/claude-api-wrapper`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Create a repository/service layer that wraps Claude API calls using the @anthropic-ai/sdk TypeScript SDK. The wrapper sends a transcript to Claude and receives a summarized version. Output format and prompt engineering are deferred — this scope covers only the service/repository abstraction. Server actions will call this repository layer; business logic must not live in server actions."

## Clarifications

### Session 2026-07-23

- Q: Should Phase 5 create a barrel export (`src/integrations/claude/index.ts`) for consumers to use as a single import path? → A: No. Barrel imports/exports are prohibited across the entire codebase per constitution §XVII. Server actions MUST import directly from `@/integrations/claude/transcript-summarizer` and `@/types/claude.types`.
- Q: Should `DEFAULT_MODEL` and `DEFAULT_MAX_TOKENS` be hardcoded in `transcript-summarizer.ts`? → A: No. Both MUST be read from environment variables (`CLAUDE_DEFAULT_MODEL`, `CLAUDE_MAX_TOKENS`) via `env.mjs`. These are optional server-side vars with fallback defaults (`claude-opus-4-8` and `16384` respectively), validated at startup.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send Transcript for Summarization (Priority: P1)

A sales team member has finished a meeting and a transcript is available in the system. When the user clicks the "Summarize" button on the transcript view, the system sends the transcript text to Claude and returns a structured summary. The repository layer handles the API communication — accepting the transcript as input, calling Claude, and returning whatever Claude produces.

**Why this priority**: This is the core purpose of the wrapper. Without the ability to send a transcript and receive a response from Claude, no downstream features (summary display, CRM entry, lead scoring) can function.

**Independent Test**: Can be tested by invoking the repository method with a sample transcript string and verifying that a response is returned from the Claude API without errors.

**Acceptance Scenarios**:

1. **Given** a transcript string is available, **When** the repository method is called with the transcript, **Then** the system sends the transcript to Claude and returns a response object containing Claude's output.
2. **Given** a transcript string is available, **When** the repository method is called, **Then** the call completes within a reasonable time frame and does not block the calling server action indefinitely.
3. **Given** a valid transcript, **When** the repository method is called, **Then** the response preserves the full content returned by Claude without truncation or modification.

---

### User Story 2 - Handle API Failures Gracefully (Priority: P1)

When the Claude API is unavailable, rate-limited, or returns an error, the repository layer must surface a meaningful, structured error to the calling server action — not raw exception details. The server action can then decide how to present this to the user.

**Why this priority**: Co-equal with Story 1. An API wrapper that crashes or exposes raw errors on failure is unusable in production. Graceful error handling is essential for a reliable integration.

**Independent Test**: Can be tested by simulating API errors (invalid key, rate limit, network timeout) and verifying the repository returns structured error information rather than throwing unhandled exceptions.

**Acceptance Scenarios**:

1. **Given** the Claude API returns a rate-limit error, **When** the repository method is called, **Then** it returns a structured error object indicating the rate-limit condition without exposing internal API details.
2. **Given** the Claude API is unreachable (network failure), **When** the repository method is called, **Then** it returns a structured error object indicating a connectivity issue within a bounded timeout period.
3. **Given** the API key is invalid or missing, **When** the repository method is called, **Then** it returns a structured error object indicating an authentication failure.

---

### User Story 3 - Server Action Integration (Priority: P2)

A server action (triggered by the UI's "Summarize" button) calls the repository method to process a transcript. The server action passes the transcript and receives back either a successful response or a structured error. The server action does not contain any Claude API logic — it delegates entirely to the repository.

**Why this priority**: Important for architectural compliance, but depends on Story 1 and Story 2 being functional first. This story validates the integration contract between server actions and the repository layer.

**Independent Test**: Can be tested by creating a minimal server action that calls the repository method and verifying the server action contains zero direct API logic while still producing the expected result.

**Acceptance Scenarios**:

1. **Given** a server action receives a summarization request, **When** it calls the repository method with the transcript, **Then** it receives either a success response or a structured error without needing any Claude API knowledge.
2. **Given** the repository layer is properly configured, **When** a server action imports and uses it, **Then** no Anthropic SDK imports or API-specific code exist in the server action file.

---

### Edge Cases

- What happens when the transcript is empty or contains only whitespace?
- What happens when the transcript exceeds Claude's context window limit?
- How does the system handle concurrent summarization requests for multiple transcripts?
- What happens when the API response is malformed or does not match expected structure?
- What happens when the API key environment variable is not set at startup?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a repository class that encapsulates all Claude API communication behind a clean interface.
- **FR-002**: System MUST accept a transcript (string) as input and return Claude's response through the repository method.
- **FR-003**: System MUST use the official `@anthropic-ai/sdk` TypeScript SDK for all Claude API interactions.
- **FR-004**: System MUST use streaming for API calls to prevent request timeouts on long transcripts.
- **FR-005**: System MUST categorize API errors into distinct types (authentication, rate-limit, network, invalid-request, unknown) and return structured error objects.
- **FR-006**: System MUST validate that the required API key environment variable is present; absence MUST produce a clear, actionable error.
- **FR-007**: System MUST NOT expose raw API error details, stack traces, or internal system information to callers.
- **FR-008**: System MUST be callable from Next.js Server Actions without requiring the server action to import or reference any Anthropic SDK types.
- **FR-009**: System MUST validate that the transcript input is a non-empty string before making an API call.
- **FR-010**: The repository/integration layer MUST be the sole location for Claude API logic — no direct Anthropic SDK usage in server actions, components, or other layers.

### Key Entities

- **TranscriptSummarizationRequest**: Represents the input to the repository — contains the transcript text to be summarized and any optional configuration (model override, etc.).
- **TranscriptSummarizationResponse**: Represents the successful output from the repository — contains Claude's response content and metadata (token usage, model used).
- **SummarizationError**: Represents a failed API call — contains an error category, a user-safe message, and optionally a retry-after hint for rate-limit errors.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A server action can request a transcript summary by calling a single repository method with no direct knowledge of the Claude API.
- **SC-002**: All Claude API errors are caught and returned as structured error objects — zero unhandled exceptions propagate to the server action layer.
- **SC-003**: The repository method returns a usable response for transcripts up to 100,000 characters without timeout or truncation.
- **SC-004**: The integration layer is fully isolated — removing or replacing the Claude API provider requires changes only within the integration and repository directories, not in server actions or components.
- **SC-005**: The system validates the API key at initialization and fails fast with a clear error message if the key is missing.

## Assumptions

- The Anthropic API key will be provided via an environment variable and validated at startup through the existing `env.mjs` schema.
- The `@anthropic-ai/sdk` npm package is (or will be) installed as a project dependency.
- Prompt engineering and output format definition are explicitly out of scope — the repository will pass the transcript to Claude with a minimal placeholder prompt. The prompt and structured output parsing will be implemented in a future iteration.
- The Claude model to use defaults to `claude-opus-4-8` but may be configurable.
- The UI layer (Summarize button, loading states, result display) is being built by another team member and is out of scope for this specification.
- Lead scoring, CRM integration, and structured field extraction (topics, decisions, next steps) are downstream features that depend on this wrapper but are not part of this scope.
- Streaming is the default communication pattern to handle long transcripts and avoid HTTP timeouts.
