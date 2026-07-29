import { env } from '@env';

import { TranscriptSummarizer as ClaudeTranscriptSummarizer } from '@/integrations/claude/transcript-summarizer';
import { TranscriptSummarizer as OpenRouterTranscriptSummarizer } from '@/integrations/openrouter/transcript-summarizer';
import type { SummarizationOptions, SummarizationResponse } from '@/types/claude.types';

/** Structural contract both provider integrations satisfy. */
export interface TranscriptSummarizerLike {
  summarize(transcript: string, options?: SummarizationOptions): Promise<SummarizationResponse>;
}

/** Picks the AI provider by environment: OpenRouter in development, Claude in production. */
export function getTranscriptSummarizer(): TranscriptSummarizerLike {
  return env.NEXT_PUBLIC_APP_ENV === 'development'
    ? new OpenRouterTranscriptSummarizer()
    : new ClaudeTranscriptSummarizer();
}
