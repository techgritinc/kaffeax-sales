'use server';

import { after } from 'next/server';

import { getSuggestedQuestions } from '@/integrations/suggested-questions.factory';
import { getTranscriptSummarizer } from '@/integrations/transcript-summarizer.factory';
import { buildGroundingContext } from '@/lib/utils/grounding.utils';
import { logAndThrow } from '@/lib/utils/server-action.utils';
import {
  logSuggestionFailure,
  logSuggestionStored,
  logSuggestionUnstorable,
} from '@/lib/utils/workflow/suggestion-outcome.utils';
import { toMeetingRecord } from '@/lib/utils/workflow/transcript.mapper';
import { transcriptRepository } from '@/repositories/transcript.repository';
import { runAiSummarizationSchema } from '@/schemas/transcript.schema';
import type { MeetingRecord } from '@/types/meeting.types';
import type { SimplifiedSignal } from '@/types/rubric-signal.types';
import type { StoredTranscript } from '@/types/transcript.types';

import {
  AI_SUMMARIZATION_ERROR,
  ALREADY_PROCESSING_ERROR,
} from '../../constants/workflow/action.constants';
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

async function generateSummary(
  id: string,
  signals: SimplifiedSignal[],
  stored: StoredTranscript,
): Promise<{ success: true; record: MeetingRecord } | { success: false; error: string }> {
  const current = await transcriptRepository.findById(id);
  if (current?.fields.aiProcessingStatus === 'cancelled') {
    return { success: false, error: 'Generation was cancelled.' };
  }

  await transcriptRepository.update(id, {
    aiProcessingStatus: 'processing',
    suggestedQuestions: [],
  });

  const result = await transcriptSummarizer.summarize(stored.fields.cleanedTranscript, {
    signals,
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
}

export async function runAiSummarization(input: {
  id: string;
  signals: SimplifiedSignal[];
}): Promise<
  | { success: true; record: MeetingRecord }
  | { success: false; error: string }
  | { success: false; error: string; alreadyProcessing: true }
> {
  let id: string | undefined;
  try {
    const parsed = runAiSummarizationSchema.parse(input);
    id = parsed.id;

    const stored = await transcriptRepository.findById(id);
    if (!stored) {
      throw new Error(`Transcript ${id} not found`);
    }

    if (stored.fields.aiProcessingStatus === 'processing') {
      return { success: false, error: ALREADY_PROCESSING_ERROR, alreadyProcessing: true };
    }

    return await generateSummary(id, parsed.signals, stored);
  } catch (error) {
    if (id) await markProcessingFailed(id);
    logAndThrow('runAiSummarization', error, AI_SUMMARIZATION_ERROR);
  }
}

export async function runAiSummarizationInBackground(input: {
  id: string;
  signals: SimplifiedSignal[];
}): Promise<{ started: true } | { started: false; reason: 'already_processing' | 'not_found' }> {
  const parsed = runAiSummarizationSchema.parse(input);
  const { id, signals } = parsed;

  const stored = await transcriptRepository.findById(id);
  if (!stored) {
    return { started: false, reason: 'not_found' };
  }
  if (stored.fields.aiProcessingStatus === 'processing') {
    return { started: false, reason: 'already_processing' };
  }

  await transcriptRepository.update(id, {
    aiProcessingStatus: 'processing',
    suggestedQuestions: [],
  });

  after(async () => {
    try {
      await generateSummary(id, signals, stored);
    } catch (error) {
      await markProcessingFailed(id);
      console.error('[transcript-ai.actions] background summarization failed', { id, error });
    }
  });

  return { started: true };
}

export async function cancelProcessing(id: string): Promise<{ cancelled: boolean }> {
  try {
    const stored = await transcriptRepository.findById(id);
    if (!stored) {
      return { cancelled: false };
    }

    if (
      stored.fields.aiProcessingStatus !== 'pending' &&
      stored.fields.aiProcessingStatus !== 'processing'
    ) {
      return { cancelled: false };
    }

    await transcriptRepository.update(id, { aiProcessingStatus: 'cancelled' });
    return { cancelled: true };
  } catch (error) {
    console.error('[transcript-ai.actions] cancelProcessing failed', { id, error });
    return { cancelled: false };
  }
}
