# Quickstart Validation Guide: Claude API Service Wrapper

**Date**: 2026-07-23 | **Spec**: [spec.md](spec.md) | **Contract**: [contracts/claude-integration.md](contracts/claude-integration.md)

## Prerequisites

1. Node.js and npm installed
2. Project dependencies installed (`npm install`)
3. `@anthropic-ai/sdk` package installed
4. Valid `ANTHROPIC_API_KEY` set in `.env.development`
5. `ANTHROPIC_API_KEY` added to `env.mjs` server schema

## Validation Scenarios

### VS-1: Environment Validation (Fail-Fast)

**What to verify**: App crashes at startup if `ANTHROPIC_API_KEY` is missing.

**Steps**:
1. Remove or comment out `ANTHROPIC_API_KEY` from `.env.development`
2. Run `npm run dev`
3. **Expected**: Server fails to start with a Zod validation error naming `ANTHROPIC_API_KEY`
4. Restore the key and verify `npm run dev` starts successfully

---

### VS-2: Successful Summarization

**What to verify**: The integration accepts a transcript and returns Claude's response.

**Steps**:
1. Start the dev server (`npm run dev`)
2. Create a minimal server action or script that:
   - Imports `TranscriptSummarizer` from `@/integrations/claude/transcript-summarizer`
   - Calls `summarizer.summarize("Meeting between Alice and Bob. Alice: We need to ship the feature by Friday. Bob: I'll have the PR ready by Thursday.")` 
3. **Expected**: Response has `success: true` with:
   - `content`: a non-empty string containing Claude's summary
   - `model`: `"claude-opus-4-8"` (or the default model)
   - `usage`: object with `inputTokens` and `outputTokens` as positive numbers

---

### VS-3: Empty Transcript Rejection

**What to verify**: The integration rejects empty/whitespace input without calling the API.

**Steps**:
1. Call `summarizer.summarize("")`
2. **Expected**: Response has `success: false` with:
   - `category`: `"invalid_request"`
   - `message`: a user-safe string explaining the input was empty
   - No API call made (verify via logging or network inspection)

---

### VS-4: Authentication Error Handling

**What to verify**: An invalid API key produces a structured error, not an unhandled exception.

**Steps**:
1. Set `ANTHROPIC_API_KEY` to an invalid value (e.g., `"sk-invalid-key"`) — note: `env.mjs` validates presence, not format, so the app will start
2. Call `summarizer.summarize("Test transcript")`
3. **Expected**: Response has `success: false` with:
   - `category`: `"authentication"`
   - `message`: a user-safe string (no stack traces, no raw API error)

---

### VS-5: Type Safety Verification

**What to verify**: No Anthropic SDK types leak into the public interface.

**Steps**:
1. Run `npm run type-check`
2. Verify that files outside `src/integrations/claude/` can import and use `SummarizationResponse` without depending on `@anthropic-ai/sdk`
3. **Expected**: Type-check passes. Server action files import only from `@/types/claude.types` and `@/integrations/claude/transcript-summarizer`

---

### VS-6: Build Validation

**What to verify**: The full validation pipeline passes.

**Steps**:
1. Run `npm run validate` (type-check → lint → build)
2. **Expected**: All three gates pass with zero errors and zero warnings

## Success Indicators

| Scenario | Pass Criteria |
|----------|--------------|
| VS-1 | App crashes with clear error when key is missing; starts when key is present |
| VS-2 | Returns `{ success: true }` with non-empty content and usage stats |
| VS-3 | Returns `{ success: false, category: "invalid_request" }` without API call |
| VS-4 | Returns `{ success: false, category: "authentication" }` with safe message |
| VS-5 | `npm run type-check` passes; no SDK types in server action imports |
| VS-6 | `npm run validate` passes all three gates |
