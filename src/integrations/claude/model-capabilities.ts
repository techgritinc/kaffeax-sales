export interface ModelCapabilityProfile {
  modelId: string;
  supportsAdaptiveThinking: boolean;
  supportsEffort: boolean;
}

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
