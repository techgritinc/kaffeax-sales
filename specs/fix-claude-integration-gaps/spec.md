# Feature Specification: Claude AI Integration Reliability Fixes

**Feature Branch**: `fix/claude-integration-gaps`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "we have the claude sdk integration in this POC that we will use it for the production deployment and for regular dev testing and activities we use the open router and it's free models. As I got the Claude API key, I just updated the env file and changed the APP_ENV value to production to use Claude for the summary generation. But unfortunately I ran through so many basic errors in initializing the API call to Claude, the first and the foremost issue encountered is that in the src/integrations/claude/client.ts file, the API keys itself was not passed in the client initialization. Later when I used the claude-haiku-4-5 model, the API call ended with an API error as content was too large for the model and later it was found that that was causing with the parameter in the object type: 'Adaptive' that the claude-haiku-4-5 model doesn't support and only supported by the higher end models such as sonnet 5 opus and so on. With this I noticed that the claude SDK integration is way too back and requires more fine tuning, I should be able to switch to any model and the API call should succeed and since that we are using the same prompt with both the AI tools, I also encountered the malformed response with claude API, but I didn't faced any such with the openrouter. Can you check all those gaps accurately and thoroghly?"

## Clarifications

### Session 2026-08-06

- Q: Should `claude-haiku-4-5` be marked as a supported model for the adaptive-thinking/effort feature (alongside the base/flagship models), so it can be used for generating summaries? → A: No change needed. Model *choice* (which model to run) is already unrestricted — `claude-haiku-4-5` works today as `CLAUDE_DEFAULT_MODEL` because the feature-gating omits `thinking`/`effort` for it rather than blocking the model itself. Marking it as *supporting* adaptive thinking/effort would be factually wrong (confirmed via a live API call: Anthropic rejects that combination on this model with a 400) and would reintroduce the original defect. No spec or code change follows from this question.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Production Cutover to Claude Authenticates Successfully (Priority: P1)

An operator switches the environment configuration from development (OpenRouter) to production (Claude), supplying a valid Claude API credential. Every AI-backed feature — call summarization, the meeting chat assistant, and suggested questions — authenticates successfully against the Claude provider on the very first request, with no separate manual step beyond setting the credential.

**Why this priority**: This is the blocking defect. Without successful authentication, none of the other gaps can even be observed in production, and the production cutover cannot happen at all.

**Independent Test**: Configure a valid Claude credential for the production environment and trigger a summarization request. The request must reach the Claude provider and receive a real response (success or a provider-reported error), never an authentication failure caused by the credential not being sent.

**Acceptance Scenarios**:

1. **Given** a valid Claude credential is configured for the active environment, **When** any AI-backed feature makes a request, **Then** the request authenticates successfully with the Claude provider.
2. **Given** the configured Claude credential is missing or invalid, **When** a request is made, **Then** the user sees a clear "not configured correctly" message rather than a generic or misleading error.

---

### User Story 2 - Switching the Configured Model Never Breaks a Request (Priority: P1)

An operator changes which Claude model is configured (for example, moving between a lightweight/fast model and a higher-end reasoning model) to balance cost, speed, and quality. Every AI-backed feature continues to succeed after the change, without any code edit — because the request only includes advanced options that the currently configured model actually supports.

**Why this priority**: This caused a full outage of AI-backed features after a model change (a misleading "content too large" error), and free model choice is an explicit business requirement — operators must be able to pick the right model for cost/quality trade-offs at any time.

**Independent Test**: Configure a lightweight model that does not support extended reasoning, then trigger summarization, the meeting chat assistant, and suggested-questions generation. All three must complete successfully. Then configure a higher-end reasoning-capable model and repeat — all three must still succeed.

**Acceptance Scenarios**:

1. **Given** the configured model does not support an advanced/optional request feature, **When** a request is built for that model, **Then** the request omits that feature and still succeeds.
2. **Given** the configured model does support an advanced/optional request feature, **When** a request is built for that model, **Then** the feature may be included and the request still succeeds.
3. **Given** an operator changes the configured model, **When** the next request is made, **Then** no source code change is required for that request to succeed.

---

### User Story 3 - Structured AI Output Is as Reliable on Claude as on OpenRouter (Priority: P2)

For the same prompt and the same input transcript, the structured responses used for summarization, lead scoring, chat answers, and suggested questions parse successfully on the Claude provider at least as reliably as they already do on the OpenRouter provider used in development. Operators do not need to accept a higher failure/retry rate just because a request happened to run in production.

**Why this priority**: A visible reliability gap between the two providers undermines confidence in the production path and increases retries, latency, and cost. It is lower priority than P1 items because the system already retries and degrades gracefully today — this story is about closing a quality gap, not an outage.

**Independent Test**: Run the same set of representative transcripts and questions through both providers and compare the rate of malformed/unusable responses (before retries). The Claude provider's rate must not exceed the OpenRouter provider's rate.

**Acceptance Scenarios**:

1. **Given** the same prompt is sent to both providers, **When** each returns its first response, **Then** both are parsed successfully at a comparable rate.
2. **Given** a response is unusable, **When** the retry ceiling has not been reached, **Then** the system retries automatically before surfacing a failure to the user.

---

### Edge Cases

- What happens when the configured model does not recognize an advanced/optional request option — does the request fail outright, or is the option simply left out?
- How does the system behave when an operator switches from a reasoning-capable model to a lightweight one (or back) between two consecutive requests, with no deployment in between?
- What happens when a response's usable content is unexpectedly short or empty because the model spent its output budget on internal reasoning rather than the final answer?
- What happens when the configured model identifier is valid for the provider but not yet known to this system's cost-tracking (e.g., a newly released model)? The request must still succeed even if cost cannot be computed.
- What happens when the credential is present but rejected by the provider (revoked, wrong tier, wrong account) versus simply absent? Both must be distinguishable from a rate limit or network failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST include the configured credential on every request made to the Claude provider, so that a correctly configured credential always results in a successfully authenticated request.
- **FR-002**: The system MUST allow an operator to change the configured Claude model without requiring any code change for subsequent requests to succeed.
- **FR-003**: The system MUST determine, per configured model, whether an advanced/optional request feature is supported, and MUST only include that feature in a request when the configured model supports it.
- **FR-004**: The system MUST NOT let an unsupported advanced/optional request feature cause a request to fail; unsupported features must be omitted rather than sent and rejected.
- **FR-005**: The system MUST produce a distinct, user-facing error category for "credential missing or rejected by provider" that is never confused with rate-limiting, network failure, or malformed-response outcomes, on either provider.
- **FR-006**: The system MUST apply the same retry-on-malformed-response behavior on the Claude provider that already exists on the OpenRouter provider, up to the existing retry ceiling, before surfacing a failure to the user.
- **FR-007**: The system MUST successfully complete a request and record a usage/cost outcome (a computed amount, or an explicit zero/unknown) even when the configured model is not yet catalogued for cost calculation — an uncatalogued model must never cause the request itself to fail.
- **FR-008**: The system MUST produce a comparable structured-output success rate between the Claude provider and the OpenRouter provider for the same prompt and input, so that switching providers is not itself a source of new failures.
- **FR-009**: The system MUST apply the same model-switching and feature-support behavior (FR-002 through FR-004) consistently across every AI-backed capability — summarization, meeting chat, and suggested questions — not just the ones where the defect was first observed.

### Key Entities

- **AI Provider Configuration**: The environment-specific settings that determine how a request is made — which provider is active, which model is configured, the credential to use, and any token limits. Drives every other requirement in this spec.
- **Model Capability Profile**: The set of advanced/optional request features a given configured model actually supports (for example, extended reasoning). Used to decide what a request may safely include before it is sent.
- **AI Response Outcome**: The categorized result of a single AI request — success, authentication failure, rate limit, malformed response, network failure, or invalid request — surfaced to the user consistently regardless of which provider handled the request.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Changing the configured Claude model to any model available on the account's plan results in a successful response for 100% of subsequent requests across all AI-backed features — no request fails due to an unsupported request option.
- **SC-002**: Once a valid credential is configured, 0% of requests fail with an authentication error; authentication failures occur only when the credential is genuinely missing, expired, or revoked.
- **SC-003**: The malformed/unusable-response rate on the Claude provider is no higher than the malformed/unusable-response rate on the OpenRouter provider, measured across the same set of representative prompts.
- **SC-004**: An operator can distinguish, from the error message alone and without reading source code, whether a failure was caused by a configuration/credential problem versus a transient provider problem, in under one minute.
- **SC-005**: 100% of completed AI requests record a usage/cost outcome, including requests made against models not previously catalogued for pricing.

## Assumptions

- The existing environment-driven provider selection (OpenRouter in development, Claude in production) remains the mechanism for choosing a provider; this feature does not introduce a new provider-selection UI or runtime toggle.
- "Any model" means any model the business's Claude account has access to, not arbitrary or unreleased models; the system must correctly support omitting unsupported features rather than emulating them for models that lack them.
- Advanced/optional request features (such as extended reasoning) are treated as enhancements applied only when supported — removing or withholding them for an unsupported model is an acceptable resolution, not a regression.
- A model lacking support for an advanced/optional feature is never treated as an unusable model — it remains a fully valid choice for `CLAUDE_DEFAULT_MODEL`, including `claude-haiku-4-5`, precisely because the unsupported feature is omitted rather than blocking the request (see Clarifications above).
- The existing retry-on-malformed-response ceiling and error-category structure are the correct baseline behavior to extend to the Claude provider, not a framework being replaced.
- No production traffic exists yet on the Claude provider, so no data migration or backward-compatibility handling for prior production requests is required.
