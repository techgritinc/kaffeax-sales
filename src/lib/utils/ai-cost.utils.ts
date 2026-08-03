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

function normaliseAnthropicModel(model: string): string {
  return model.replace(/-\d{8}$/, '');
}

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
