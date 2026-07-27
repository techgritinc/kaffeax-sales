import { env } from '@env';
import { z } from 'zod';

import { determineBand } from '@/lib/utils/scoring.utils';
import { AiSummaryResponseSchema } from '@/schemas/ai-summary-response.schema';
import type {
  StructuredSummarizationResult,
  SummarizationOptions,
  SummarizationResponse,
  SummarizationResult,
} from '@/types/claude.types';
import type { SimplifiedSignal } from '@/types/rubric-signal.types';
import type { TranscriptLeadScore, TranscriptSummary } from '@/types/transcript.types';

import client, {
  APIConnectionError,
  APIError,
  AuthenticationError,
  BadRequestError,
  RateLimitError,
} from './client';
import { buildSummarizationPrompt } from './prompt';

const transcriptSchema = z.string().min(1);

export class TranscriptSummarizer {
  async summarize(
    transcript: string,
    options?: SummarizationOptions,
  ): Promise<SummarizationResponse> {
    const validation = transcriptSchema.safeParse(transcript);
    if (!validation.success) {
      return {
        success: false,
        category: 'invalid_request',
        message: 'Transcript must be a non-empty string.',
        retryAfterMs: null,
      };
    }

    try {
      if (options?.signals !== undefined) {
        return await this.summarizeStructured(transcript, options.signals, options);
      }

      const stream = client.messages.stream({
        model: options?.model ?? env.CLAUDE_DEFAULT_MODEL,
        max_tokens: options?.maxTokens ?? env.CLAUDE_MAX_TOKENS,
        thinking: { type: 'adaptive' },
        messages: [{ role: 'user', content: transcript }],
      });

      const response = await stream.finalMessage();

      const content = response.content.reduce<string>((acc, block) => {
        if (block.type === 'text') return acc + block.text;
        return acc;
      }, '');

      const result: SummarizationResult = {
        success: true,
        content,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };

      return result;
    } catch (error) {
      return this.handleSdkError(error);
    }
  }

  private async summarizeStructured(
    transcript: string,
    signals: SimplifiedSignal[],
    options: SummarizationOptions,
  ): Promise<SummarizationResponse> {
    const { system } = buildSummarizationPrompt(signals);

    const stream = client.messages.stream({
      model: options.model ?? env.CLAUDE_DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? env.CLAUDE_MAX_TOKENS,
      system,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: transcript }],
    });

    const response = await stream.finalMessage();

    const rawText = response.content.reduce<string>((acc, block) => {
      if (block.type === 'text') return acc + block.text;
      return acc;
    }, '');

    const cleanedText = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      return {
        success: false,
        category: 'api_error',
        message: 'AI response could not be parsed. Please try again.',
        retryAfterMs: null,
      };
    }

    const zodResult = AiSummaryResponseSchema.safeParse(parsed);
    if (!zodResult.success) {
      console.warn(
        '[TranscriptSummarizer] AI response failed schema validation',
        zodResult.error.issues,
      );
      return {
        success: false,
        category: 'api_error',
        message: 'AI response structure was unexpected. Please try again.',
        retryAfterMs: null,
      };
    }

    const validated = zodResult.data;

    const inputIds = new Set(signals.map((s) => s.id));
    const filteredSignals = validated.detectedSignals.filter((ds) => {
      if (!inputIds.has(ds.id)) {
        console.warn('[TranscriptSummarizer] Hallucinated signal stripped from response', {
          id: ds.id,
        });
        return false;
      }
      return true;
    });

    const band = determineBand(filteredSignals, signals);

    if (band !== validated.leadScoreBand) {
      console.warn('[TranscriptSummarizer] Band discrepancy', {
        computed: band,
        aiSuggested: validated.leadScoreBand,
      });
    }

    const summary: TranscriptSummary = {
      narrative: validated.narrative,
      whatWeHeard: validated.whatWeHeard,
      whatWasCovered: validated.whatWasCovered,
      whatWasDecided: validated.whatWasDecided,
      actionItems: validated.actionItems.map((item) => ({
        description: item.description,
        owner: item.owner,
        ...(item.dueDate != null ? { dueDate: item.dueDate } : {}),
      })),
      attendees: validated.attendees,
    };

    const leadScore: TranscriptLeadScore = {
      band,
      detectedSignals: filteredSignals,
      rationale: validated.scoreRationale,
    };

    const result: StructuredSummarizationResult = {
      success: true,
      summary,
      leadScore,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };

    return result;
  }

  private handleSdkError(error: unknown): SummarizationResponse {
    if (error instanceof AuthenticationError) {
      return {
        success: false,
        category: 'authentication',
        message: 'API authentication failed. Contact your administrator.',
        retryAfterMs: null,
      };
    }
    if (error instanceof RateLimitError) {
      const retryAfter = error.headers?.get('retry-after');
      const seconds = retryAfter != null ? parseInt(retryAfter, 10) : NaN;
      return {
        success: false,
        category: 'rate_limit',
        message: 'Service is temporarily busy. Please try again shortly.',
        retryAfterMs: isNaN(seconds) ? null : seconds * 1000,
      };
    }
    if (error instanceof BadRequestError) {
      return {
        success: false,
        category: 'invalid_request',
        message: 'The request could not be processed. The transcript may be too long.',
        retryAfterMs: null,
      };
    }
    if (error instanceof APIConnectionError) {
      return {
        success: false,
        category: 'network',
        message: 'Unable to reach the summarization service. Check your connection.',
        retryAfterMs: null,
      };
    }
    if (error instanceof APIError) {
      return {
        success: false,
        category: 'api_error',
        message: 'An unexpected error occurred. Please try again.',
        retryAfterMs: null,
      };
    }
    console.error(
      '[TranscriptSummarizer] Unexpected non-SDK error',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return {
      success: false,
      category: 'api_error',
      message: 'An unexpected error occurred. Please try again.',
      retryAfterMs: null,
    };
  }
}
