import { repairJson } from '@/lib/utils/json-repair.utils';
import { computeScorePercentage, determineBand } from '@/lib/utils/scoring.utils';
import { AiSummaryResponseSchema } from '@/schemas/ai-summary-response.schema';
import type { SummarizationError } from '@/types/claude.types';
import type { SimplifiedSignal } from '@/types/rubric-signal.types';
import type { TranscriptLeadScore, TranscriptSummary } from '@/types/transcript.types';

export { buildSummarizationPrompt } from '@/lib/utils/summarization-prompt.utils';

export const MAX_STRUCTURED_ATTEMPTS = 3;

// ─── Shared Analysis Pipeline ──────────────────────────────────────────────────

type ProcessedStructuredResponse =
  | {
      success: true;
      meetingTitle: string;
      summary: TranscriptSummary;
      leadScore: TranscriptLeadScore;
    }
  | SummarizationError;

export function processStructuredResponse(
  rawText: string,
  signals: SimplifiedSignal[],
): ProcessedStructuredResponse {
  const cleanedText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedText);
  } catch {
    const repaired = repairJson(cleanedText);
    try {
      parsed = JSON.parse(repaired);
    } catch {
      console.error('[TranscriptSummarizer] AI response could not be parsed as JSON', { rawText });
      return {
        success: false,
        category: 'malformed_response',
        message: 'AI response could not be parsed. Please try again.',
        retryAfterMs: null,
      };
    }
  }

  const zodResult = AiSummaryResponseSchema.safeParse(parsed);
  if (!zodResult.success) {
    console.warn(
      '[TranscriptSummarizer] AI response failed schema validation',
      zodResult.error.issues,
    );
    return {
      success: false,
      category: 'malformed_response',
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
  const scorePercentage = computeScorePercentage(filteredSignals, signals);

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
    scorePercentage,
  };

  return { success: true, meetingTitle: validated.meetingTitle, summary, leadScore };
}
