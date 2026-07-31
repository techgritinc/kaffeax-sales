/** USD per million tokens for a given model. */
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  /** Cache write (5-min TTL) — Anthropic only. Standard rate = 1.25× input. */
  cacheWritePerMillion?: number;
  /** Cache read — Anthropic only. Standard rate = 0.1× input. */
  cacheReadPerMillion?: number;
}

export const ANTHROPIC_MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-fable-5': {
    inputPerMillion: 10.0,
    outputPerMillion: 50.0,
    cacheWritePerMillion: 12.5,
    cacheReadPerMillion: 1.0,
  },
  'claude-mythos-5': {
    inputPerMillion: 10.0,
    outputPerMillion: 50.0,
    cacheWritePerMillion: 12.5,
    cacheReadPerMillion: 1.0,
  },
  'claude-opus-4-8': {
    inputPerMillion: 5.0,
    outputPerMillion: 25.0,
    cacheWritePerMillion: 6.25,
    cacheReadPerMillion: 0.5,
  },
  'claude-opus-4-7': {
    inputPerMillion: 5.0,
    outputPerMillion: 25.0,
    cacheWritePerMillion: 6.25,
    cacheReadPerMillion: 0.5,
  },
  'claude-opus-4-6': {
    inputPerMillion: 5.0,
    outputPerMillion: 25.0,
    cacheWritePerMillion: 6.25,
    cacheReadPerMillion: 0.5,
  },
  'claude-sonnet-5': {
    inputPerMillion: 2.0,
    outputPerMillion: 10.0,
    cacheWritePerMillion: 2.5,
    cacheReadPerMillion: 0.2,
  },
  'claude-sonnet-4-6': {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    cacheWritePerMillion: 3.75,
    cacheReadPerMillion: 0.3,
  },
  'claude-haiku-4-5': {
    inputPerMillion: 1.0,
    outputPerMillion: 5.0,
    cacheWritePerMillion: 1.25,
    cacheReadPerMillion: 0.1,
  },
  'claude-haiku-4-5-20251001': {
    inputPerMillion: 1.0,
    outputPerMillion: 5.0,
    cacheWritePerMillion: 1.25,
    cacheReadPerMillion: 0.1,
  },
};

/**
 * OpenRouter model pricing (USD per million tokens).
 * Free-tier models (`:free` suffix) are handled separately — they always cost $0.
 * Models absent from this table fall back to the cost OpenRouter reports in the
 * API response if available; otherwise cost is recorded as $0.
 * OpenRouter does not expose per-call cache pricing, so no cache fields are set.
 */
export const OPENROUTER_MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'openai/gpt-4o': { inputPerMillion: 5.0, outputPerMillion: 15.0 },
  'openai/gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'openai/gpt-4-turbo': { inputPerMillion: 10.0, outputPerMillion: 30.0 },
  'openai/gpt-3.5-turbo': { inputPerMillion: 0.5, outputPerMillion: 1.5 },
  // Meta
  'meta-llama/llama-3.1-405b-instruct': { inputPerMillion: 2.7, outputPerMillion: 2.7 },
  'meta-llama/llama-3.1-70b-instruct': { inputPerMillion: 0.52, outputPerMillion: 0.75 },
  'meta-llama/llama-3.3-70b-instruct': { inputPerMillion: 0.59, outputPerMillion: 0.79 },
  // Google
  'google/gemini-pro-1.5': { inputPerMillion: 2.5, outputPerMillion: 7.5 },
  'google/gemini-flash-1.5': { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  // Anthropic via OpenRouter
  'anthropic/claude-3.5-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'anthropic/claude-3-opus': { inputPerMillion: 15.0, outputPerMillion: 75.0 },
  // NVIDIA paid tiers
  'nvidia/llama-3.1-nemotron-70b-instruct': { inputPerMillion: 0.2, outputPerMillion: 0.2 },
};
