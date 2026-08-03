'use server';

import {
  logSuggestionFailure,
  logSuggestionStored,
  logSuggestionUnstorable,
} from '@/features/workflow/utils/suggestion-outcome.utils';
import { toMeetingRecord } from '@/features/workflow/utils/transcript.mapper';
import { getSuggestedQuestions } from '@/integrations/suggested-questions.factory';
import { getTranscriptSummarizer } from '@/integrations/transcript-summarizer.factory';
import { buildGroundingContext } from '@/lib/utils/grounding.utils';
import { logAndThrow } from '@/lib/utils/server-action.utils';
import { transcriptRepository } from '@/repositories/transcript.repository';
import { runAiSummarizationSchema } from '@/schemas/transcript.schema';
import type { MeetingRecord } from '@/types/meeting.types';
import type { SimplifiedSignal } from '@/types/rubric-signal.types';
import type { StoredTranscript } from '@/types/transcript.types';

import { AI_SUMMARIZATION_ERROR } from '../constants/action.constants';
import { currentRubric } from './transcript.actions';

const transcriptSummarizer = getTranscriptSummarizer();
const suggestedQuestions = getSuggestedQuestions();

async function markProcessingFailed(id: string): Promise<void> {
  try {
    await transcriptRepository.update(id, { aiProcessingStatus: 'failed' });
  } catch (error) {
    console.error('[transcript-ai.actions] markProcessingFailed failed', error);
  }
}

async function storeSuggestedQuestions(
  id: string,
  stored: StoredTranscript,
): Promise<StoredTranscript> {
  try {
    const result = await suggestedQuestions.generate(buildGroundingContext(stored));

    if (!result.success) {
      logSuggestionFailure(id, result);
      if (result.usage && result.provider && result.model) {
        await transcriptRepository.update(id, {
          suggestionUsage: { model: result.model, provider: result.provider, ...result.usage },
        });
      }
      return stored;
    }

    const patched = await transcriptRepository.update(id, {
      suggestedQuestions: result.questions,
      suggestionUsage: { model: result.model, provider: result.provider, ...result.usage },
    });

    if (!patched) {
      logSuggestionUnstorable(id, 'transcript missing on write');
      return stored;
    }

    logSuggestionStored(id, result);
    return patched;
  } catch (error) {
    logSuggestionUnstorable(id, error instanceof Error ? error.message : 'Unknown error');
    return stored;
  }
}

export async function runAiSummarization(input: {
  id: string;
  signals: SimplifiedSignal[];
}): Promise<{ success: true; record: MeetingRecord } | { success: false; error: string }> {
  let id: string | undefined;
  try {
    const parsed = runAiSummarizationSchema.parse(input);
    id = parsed.id;

    const stored = await transcriptRepository.findById(id);
    if (!stored) {
      throw new Error(`Transcript ${id} not found`);
    }

    await transcriptRepository.update(id, {
      aiProcessingStatus: 'pending',
      suggestedQuestions: [],
    });

    const result = await transcriptSummarizer.summarize(stored.fields.cleanedTranscript, {
      signals: parsed.signals,
    });

    if (!result.success) {
      await transcriptRepository.update(id, { aiProcessingStatus: 'failed' });
      return { success: false, error: result.message };
    }
    if (!('summary' in result)) {
      throw new Error('Summarizer returned an unstructured response for a structured request');
    }

    const updated = await transcriptRepository.update(id, {
      title: result.meetingTitle,
      summary: result.summary,
      leadScore: result.leadScore,
      aiProcessingStatus: 'success',
      aiUsage: {
        model: result.model,
        provider: result.provider,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cacheCreationTokens: result.usage.cacheCreationTokens,
        cacheReadTokens: result.usage.cacheReadTokens,
        inputCostUsd: result.usage.inputCostUsd,
        outputCostUsd: result.usage.outputCostUsd,
        cacheCreationCostUsd: result.usage.cacheCreationCostUsd,
        cacheReadCostUsd: result.usage.cacheReadCostUsd,
        totalCostUsd: result.usage.totalCostUsd,
      },
    });
    if (!updated) {
      throw new Error(`Transcript ${id} not found after update`);
    }
    const withSuggestions = await storeSuggestedQuestions(id, updated);

    return { success: true, record: toMeetingRecord(withSuggestions, await currentRubric()) };
  } catch (error) {
    if (id) await markProcessingFailed(id);
    logAndThrow('runAiSummarization', error, AI_SUMMARIZATION_ERROR);
  }
}
