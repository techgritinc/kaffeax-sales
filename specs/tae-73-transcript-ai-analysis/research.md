# Research: Transcript AI Analysis & Scoring

**Phase**: 0 | **Feature**: [Transcript AI Analysis & Scoring](spec.md) | **Date**: 2026-07-24

All NEEDS CLARIFICATION items from Technical Context resolved below. Findings are authoritative for implementation.

---

## 1. Claude API — TypeScript SDK Integration

**Decision**: Use `@anthropic-ai/sdk` (official Anthropic TypeScript SDK) via a singleton client in `src/integrations/claude/client.ts`.

**Rationale**: Official SDK handles connection pooling, retries, and streaming abstractions. Constitution §XIV requires explicit error handling; the SDK throws typed `APIError` subclasses making structured error handling straightforward.

**Client initialization**:
```typescript
import Anthropic from '@anthropic-ai/sdk';

// Read from ANTHROPIC_API_KEY env var — validated at startup via env.mjs
const client = new Anthropic();
export { client };
```

**Alternatives considered**:
- Raw `fetch` to `api.anthropic.com/v1/messages` — rejected: more error surface, no streaming helpers, SDK already available
- `langchain` — rejected: unnecessary abstraction layer over a single API call; this feature is a Single LLM call, not an agent chain

---

## 2. Model Selection

**Decision**: `claude-opus-4-8`

**Rationale**: Default model per `claude-api` skill. Best available reasoning for structured transcript analysis and signal detection. The 1M context window easily accommodates 50,000-word transcripts.

**Alternatives considered**:
- `claude-sonnet-5` — rejected: lower reasoning capability for a task requiring nuanced signal detection against a rubric
- `claude-haiku-4-5` — rejected: 200K context limit risks truncating long transcripts; lower capability

---

## 3. Extended Thinking

**Decision**: `thinking: { type: "adaptive" }` — no `budget_tokens`.

**Rationale**: On Opus 4.8, `budget_tokens` is rejected with a 400 error. Adaptive thinking automatically decides when and how much to think based on task complexity. This is correct for transcript analysis (complex, variable-length task).

**Critical constraints** (verified against SDK skill docs):
- Do NOT pass `temperature` or `top_p` — returns 400 on Opus 4.8
- Do NOT pass `budget_tokens` — returns 400 on Opus 4.8
- `thinking: {type: "adaptive"}` is the only valid extended thinking configuration for this model

---

## 4. Structured JSON Output

**Decision**: Use `output_config: { format: { type: "json_schema", schema: ANALYSIS_JSON_SCHEMA } }` on `messages.create()`.

**Rationale**: The `output_config.format` structured output approach guarantees the response conforms to the declared JSON Schema, making Zod validation the second-layer safety net rather than the only one. The full JSON Schema is defined in `contracts/ai-analysis-response.json` and referenced at runtime.

**Critical constraints** (verified against SDK skill docs):
- Do NOT use assistant prefill (`messages: [{role: "assistant", content: "{"}]`) — returns 400 on Opus 4.8
- The `output_format` parameter is deprecated; use `output_config: {format: {...}}`
- The schema in `output_config.format.schema` is a raw JSON Schema object — the Zod schema is separately used for application-side validation

**Pattern**:
```typescript
const response = await client.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 16000,
  thinking: { type: 'adaptive' },
  output_config: {
    effort: 'high',
    format: { type: 'json_schema', schema: ANALYSIS_JSON_SCHEMA },
  },
  messages: [{ role: 'user', content: userMessage }],
  system: SYSTEM_INSTRUCTIONS,
});
```

**Alternatives considered**:
- Tool use with a single tool defining the output schema — rejected: `output_config` is the cleaner structured output path; tool use adds unnecessary wrapping
- Assistant prefill — rejected: returns 400 on Opus 4.8

---

## 5. Streaming for Large Transcripts

**Decision**: Always use `.stream().finalMessage()` pattern, even for short transcripts.

**Rationale**: Transcripts can be 50,000+ words; a non-streaming request would timeout. The streaming interface collects the full response before returning, so the application logic (validation, score calculation) is unchanged. SC-002 requires the review screen within 60 seconds — streaming prevents connection timeouts on large inputs.

**Pattern**:
```typescript
const stream = client.messages.stream({
  model: 'claude-opus-4-8',
  max_tokens: 16000,
  thinking: { type: 'adaptive' },
  output_config: { effort: 'high', format: { type: 'json_schema', schema: ANALYSIS_JSON_SCHEMA } },
  messages: [{ role: 'user', content: userMessage }],
  system: SYSTEM_INSTRUCTIONS,
});
const message = await stream.finalMessage();
```

**`max_tokens` rationale**: 16,000 output tokens is sufficient for a structured analysis dossier (all sections) plus extended thinking blocks. Opus 4.8 supports up to 128K output tokens, but 16K caps cost and latency for this use case.

---

## 6. Prompt Architecture

**Decision**: Single versioned constant in `src/integrations/claude/prompt.ts`. Three-part structure: system instructions, rubric context block (runtime-injected), transcript block (runtime-injected).

**System instructions** (static): Define the AI's role, the exact output contract (JSON schema reference), field-by-field extraction instructions, and the banding rule context (FR-006).

**Rubric context block** (runtime-assembled by `build-prompt.ts`): Lists each active signal with its label, weight category, pointValue, and hints. Assembled from the array returned by `RubricSignalRepository.getActiveSignals()`.

**Transcript block** (runtime-injected): The `cleanedTranscript` field from the Transcript document, wrapped in XML-like delimiters for clear parsing boundaries.

**Versioning**: A `PROMPT_VERSION` constant (`'v1'`) exported alongside the template. When the template changes, the version is bumped and stored on the analysis record for debugging and reproducibility.

**Rationale**: A single code-controlled constant means prompt changes are git-tracked, reviewable via PR, and always consistent across environments. The co-location of the Zod response schema in the same file ensures the schema and prompt evolve together — they are tightly coupled artifacts (FR-001 requirement).

---

## 7. AI Response Validation

**Decision**: Zod schema validation (`analysisResponseSchema.safeParse(parsed)`) after JSON parsing of the AI text block, before any DB write or further computation.

**Two-layer validation**:
1. `output_config.format.json_schema` — Claude-side enforcement (rejected at API level if schema violated)
2. Zod `safeParse` — application-side enforcement before the data touches any business logic

**Pattern**:
```typescript
const textBlock = message.content.find(b => b.type === 'text');
if (!textBlock || textBlock.type !== 'text') throw new AnalysisError('No text block in response');
const parsed: unknown = JSON.parse(textBlock.text);
const result = analysisResponseSchema.safeParse(parsed);
if (!result.success) {
  // Log result.error.format() for debugging; surface generic error to user
  throw new AnalysisValidationError('AI response did not match expected schema');
}
```

**On validation failure**: Transcript status set to `failed`; structured error surfaced to user; raw AI response logged server-side for debugging; never exposed to client (§XIV).

---

## 8. Score Calculation and Band Resolution

**Decision**: All numeric score and band logic executes in application code — NOT in the AI.

**Score** (`score-calculator.ts`): Sum the `pointValue` of each detected signal cross-referenced against the fetched rubric signals. Cap at 100. The AI only reports which `signalId` values were detected; the application looks up the `pointValue` from the known rubric array.

**Band** (`band-resolver.ts`):
```
HOT  → detectedSignals.some(s => s.weight === 'hot') AND hasAgreedNextStep === true
WARM → detectedSignals.some(s => s.weight === 'warm') AND no cold-only signals
        OR detectedSignals.some(s => s.weight === 'hot') AND hasAgreedNextStep === false
COLD → no qualifying signals (or only cold-weight signals)
```

The AI also returns `bandSuggestion` and `hasAgreedNextStep`. The application verifies the AI's `bandSuggestion` against the deterministic result; deterministic result wins on mismatch (FR-025). `hasAgreedNextStep` is an explicit boolean in the AI response (required for HOT determination).

**Signal enrichment**: After Zod validation, the application code cross-references each `detectedSignal.signalId` against the rubric array (already in memory from the DB fetch) to add `weight` and `pointValue` to the `DetectedSignal` record. This prevents hallucinated weights — the authoritative source is always the DB-fetched rubric.

---

## 9. Prospect Email Extraction

**Decision**: Email extraction is part of the single analysis call — not a separate request.

The AI returns a `contact` object with `email?: string` and `confidence: 'high' | 'medium' | 'low'`. The `confidence` field is always present. Low-confidence or absent email flags the review screen for manual entry.

---

## 10. Outlook mailto URL

**Decision**: `email-formatter.ts` assembles a `mailto:` string with `?subject=...&body=...` where body and subject are `encodeURIComponent`-encoded.

**Body content** (FR-028, FR-029): Narrative paragraph + "Topics Covered:" bulleted list + "Decisions:" bulleted list + "Action Items:" numbered list with owners and due dates. Meeting-specific names/companies from the summary — no generic placeholders.

**Limitation**: mailto body is limited to browser-safe URL lengths (~2000 characters). Implementation truncates gracefully if body exceeds limit. Full contract in `contracts/mailto-url.md`.

---

## 11. Error Handling Strategy

| Failure Mode | Handling |
|---|---|
| ANTHROPIC_API_KEY missing | Crashes at startup (env.mjs fail-fast — §I) |
| API connection failure / timeout | Catch `Anthropic.APIError`, log with context, set transcript status to `failed`, return structured error to client |
| API rate limit (429) | Same as connection failure — no automatic retry at application layer (retry belongs at infrastructure/queue level) |
| JSON parse failure | Catch `SyntaxError`, set status to `failed`, log raw response |
| Zod validation failure | `safeParse` returns `success: false`, log `error.format()`, set status to `failed`, surface generic error |
| Signal cross-reference miss | Log warning with `signalId`; skip signal (rubric may have changed between fetch and response) |
| Score > 100 before cap | Cap silently at 100 — expected behavior per FR-021 |

---

## 12. `ANTHROPIC_API_KEY` Environment Variable

**Decision**: Add `ANTHROPIC_API_KEY` to `env.mjs` as a required server-only variable.

**Pattern**:
```typescript
server: {
  ANTHROPIC_API_KEY: z.string().min(1),
  // ...existing vars
}
```

It is a server-only variable — never exposed via `NEXT_PUBLIC_` prefix.
