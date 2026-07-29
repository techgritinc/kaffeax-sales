import {
  ANTHROPIC_MODEL_PRICING,
  type ModelPricing,
  OPENROUTER_MODEL_PRICING,
} from '@/constants/ai-pricing';

export interface AiCost {
  inputCostUsd: number;
  outputCostUsd: number;
  cacheCreationCostUsd: number;
  cacheReadCostUsd: number;
  totalCostUsd: number;
}

const ZERO_COST: AiCost = {
  inputCostUsd: 0,
  outputCostUsd: 0,
  cacheCreationCostUsd: 0,
  cacheReadCostUsd: 0,
  totalCostUsd: 0,
};

/** Round to 6 decimal places (µcent precision). */
const round = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

function fromPricing(
  pricing: ModelPricing,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens = 0,
  cacheReadTokens = 0,
): AiCost {
  const inputCostUsd = round((inputTokens / 1_000_000) * pricing.inputPerMillion);
  const outputCostUsd = round((outputTokens / 1_000_000) * pricing.outputPerMillion);
  const cacheCreationCostUsd = pricing.cacheWritePerMillion
    ? round((cacheCreationTokens / 1_000_000) * pricing.cacheWritePerMillion)
    : 0;
  const cacheReadCostUsd = pricing.cacheReadPerMillion
    ? round((cacheReadTokens / 1_000_000) * pricing.cacheReadPerMillion)
    : 0;
  return {
    inputCostUsd,
    outputCostUsd,
    cacheCreationCostUsd,
    cacheReadCostUsd,
    totalCostUsd: round(inputCostUsd + outputCostUsd + cacheCreationCostUsd + cacheReadCostUsd),
  };
}

/**
 * Anthropic resolves alias model IDs (e.g. `claude-sonnet-4-6`) to their full
 * dated snapshot IDs (e.g. `claude-sonnet-4-6-20251114`) in the API response.
 * Strip the trailing `-YYYYMMDD` suffix so the pricing table lookup always hits
 * the canonical alias we maintain.
 */
function normaliseAnthropicModel(model: string): string {
  return model.replace(/-\d{8}$/, '');
}

/**
 * Compute exact cost for a direct Anthropic API call.
 * Pass `response.model` (the full snapshot ID the SDK returns) — the function
 * normalises it to the alias before doing the pricing table lookup.
 * Includes prompt-cache costs when `cacheCreationTokens` or `cacheReadTokens`
 * are non-zero (both default to 0 when caching is not in use).
 */
export function computeAnthropicCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens = 0,
  cacheReadTokens = 0,
): AiCost {
  const alias = normaliseAnthropicModel(model);
  const pricing = ANTHROPIC_MODEL_PRICING[alias] ?? ANTHROPIC_MODEL_PRICING[model];
  if (!pricing) {
    console.warn(`[ai-cost] Unknown Anthropic model: ${model} — cost recorded as $0`);
    return ZERO_COST;
  }
  return fromPricing(pricing, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens);
}

/**
 * Compute cost for an OpenRouter API call.
 *
 * Priority:
 * 1. Free models (`:free` suffix) → $0
 * 2. Known model in pricing table → exact calculation
 * 3. API-reported total cost → use as totalCostUsd, split proportionally if
 *    pricing is known, otherwise store as total with $0 input/output breakdown
 * 4. Unknown with no API cost → $0 with a warning
 */
export function computeOpenRouterCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  apiReportedCost?: number,
): AiCost {
  const pricing = OPENROUTER_MODEL_PRICING[model];
  if (pricing) return fromPricing(pricing, inputTokens, outputTokens);

  if (apiReportedCost != null && apiReportedCost > 0) {
    const total = round(apiReportedCost);
    const inputRatio =
      inputTokens + outputTokens > 0 ? inputTokens / (inputTokens + outputTokens) : 0;
    const inputCostUsd = round(total * inputRatio);
    return {
      inputCostUsd,
      outputCostUsd: round(total - inputCostUsd),
      cacheCreationCostUsd: 0,
      cacheReadCostUsd: 0,
      totalCostUsd: total,
    };
  }

  if (apiReportedCost === 0) return ZERO_COST;

  console.warn(`[ai-cost] Unknown OpenRouter model: ${model} — cost recorded as $0`);
  return ZERO_COST;
}
