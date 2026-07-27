# Quickstart Validation Guide: OpenRouter API Service Wrapper

**Date**: 2026-07-23 | **Spec**: [spec.md](spec.md) | **Contract**: [contracts/openrouter-integration.md](contracts/openrouter-integration.md)

## Prerequisites

1. Node.js and npm installed
2. Project dependencies installed (`npm install`)
3. Valid `OPENROUTER_API_KEY` set in `.env.development` (get one from https://openrouter.ai/keys)
4. `OPENROUTER_API_KEY` added to `env.mjs` server schema

## Validation Scenarios

### VS-1: Environment Validation (Fail-Fast)

**What to verify**: App crashes at startup if `OPENROUTER_API_KEY` is missing.

**Steps**:
1. Remove or comment out `OPENROUTER_API_KEY` from `.env.development`
2. Run `npm run dev`
3. **Expected**: Server fails to start with a Zod validation error naming `OPENROUTER_API_KEY`
4. Restore the key and verify `npm run dev` starts successfully

---

### VS-2: Successful Summarization via OpenRouter

**What to verify**: The integration accepts a transcript and returns a response from a free model.

**Steps**:
1. Start the dev server (`npm run dev`)
2. Create a minimal server action or script that:
   - Imports `TranscriptSummarizer` from `@/integrations/openrouter/transcript-summarizer`
   - Calls `summarizer.summarize("Meeting between Alice and Bob. Alice: We need to ship the feature by Friday. Bob: I'll have the PR ready by Thursday.")`
3. **Expected**: Response has `success: true` with:
   - `content`: a non-empty string containing the model's response
   - `model`: `"google/gemma-4-31b-it:free"` (or the configured default model)
   - `usage`: object with `inputTokens` and `outputTokens` as positive numbers

---

### VS-3: Empty Transcript Rejection

**What to verify**: The integration rejects empty input without calling the API.

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
1. Set `OPENROUTER_API_KEY` to an invalid value (e.g., `"sk-invalid-key"`)
2. Call `summarizer.summarize("Test transcript")`
3. **Expected**: Response has `success: false` with:
   - `category`: `"authentication"`
   - `message`: a user-safe string (no stack traces, no raw API error)

---

### VS-5: Type Safety and Provider Interchangeability

**What to verify**: The OpenRouter integration uses the same types as the Claude integration and can be swapped by changing only the import path.

**Steps**:
1. Run `npm run type-check`
2. Verify that `SummarizationResponse` from `@/types/claude.types` works with both the Claude and OpenRouter `TranscriptSummarizer`
3. Verify that files outside `src/integrations/openrouter/` can import and use the summarizer without depending on any OpenRouter-specific types
4. **Expected**: Type-check passes. The only difference between providers is the import path.

---

### VS-6: Build Validation

**What to verify**: The full validation pipeline passes.

**Steps**:
1. Run `npm run validate` (with `SKIP_ENV_VALIDATION=true` for CI)
2. **Expected**: All three gates pass with zero errors and zero warnings

---

### VS-7: Integration Isolation

**What to verify**: The OpenRouter integration is completely independent from the Claude integration.

**Steps**:
1. Verify `src/integrations/openrouter/` contains exactly two files: `client.ts` and `transcript-summarizer.ts`
2. Verify neither file imports from `src/integrations/claude/`
3. Verify no barrel `index.ts` exists in `src/integrations/openrouter/`
4. **Expected**: Zero cross-imports between the two integration directories

## Success Indicators

| Scenario | Pass Criteria |
|----------|--------------|
| VS-1 | App crashes with clear error when key is missing; starts when key is present |
| VS-2 | Returns `{ success: true }` with non-empty content and usage stats |
| VS-3 | Returns `{ success: false, category: "invalid_request" }` without API call |
| VS-4 | Returns `{ success: false, category: "authentication" }` with safe message |
| VS-5 | `npm run type-check` passes; same response type used by both providers |
| VS-6 | `npm run validate` passes all three gates |
| VS-7 | Zero cross-imports between claude/ and openrouter/ directories |
