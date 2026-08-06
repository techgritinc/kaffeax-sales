export interface ModelCapabilityProfile {
  modelId: string;
  supportsAdaptiveThinking: boolean;
  supportsEffort: boolean;
}

/**
 * Matched by prefix, not exact equality, so dated snapshot IDs (e.g.
 * `claude-haiku-4-5-20251001`) resolve to the same profile as the bare alias.
 * Only models confirmed to support `thinking: { type: 'adaptive' }` combined
 * with `output_config.effort` are listed — everything else (including Haiku
 * 4.5, Sonnet 4.5, and any model not yet added here) falls through to the
 * unsupported default below, per the "omit unless known-supported" rule.
 */
const ADAPTIVE_THINKING_AND_EFFORT_MODEL_PREFIXES = [
  'claude-fable-5',
  'claude-mythos-5',
  'claude-opus-5',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-sonnet-5',
  'claude-sonnet-4-6',
] as const;

const UNSUPPORTED_PROFILE = {
  supportsAdaptiveThinking: false,
  supportsEffort: false,
} as const;

const SUPPORTED_PROFILE = {
  supportsAdaptiveThinking: true,
  supportsEffort: true,
} as const;

/** Pure, in-process lookup — no network call, safe to call on every request. */
export function resolveModelCapabilities(modelId: string): ModelCapabilityProfile {
  const isSupported = ADAPTIVE_THINKING_AND_EFFORT_MODEL_PREFIXES.some((prefix) =>
    modelId.startsWith(prefix),
  );

  return {
    modelId,
    ...(isSupported ? SUPPORTED_PROFILE : UNSUPPORTED_PROFILE),
  };
}
