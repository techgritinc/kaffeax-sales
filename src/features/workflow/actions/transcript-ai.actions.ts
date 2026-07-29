'use server';

import { toMeetingRecord } from '@/features/workflow/utils/transcript.mapper';
import { getTranscriptSummarizer } from '@/integrations/transcript-summarizer.factory';
import { logAndThrow } from '@/lib/utils/server-action.utils';
import { transcriptRepository } from '@/repositories/transcript.repository';
import { runAiSummarizationSchema } from '@/schemas/transcript.schema';
import type { MeetingRecord } from '@/types/meeting.types';
import type { SimplifiedSignal } from '@/types/rubric-signal.types';

import { AI_SUMMARIZATION_ERROR } from '../constants/action.constants';
import { currentRubric } from './transcript.actions';

const transcriptSummarizer = getTranscriptSummarizer();

async function markProcessingFailed(id: string): Promise<void> {
  try {
    await transcriptRepository.update(id, { aiProcessingStatus: 'failed' });
  } catch (error) {
    console.error('[transcript-ai.actions] markProcessingFailed failed', error);
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

    if (stored.fields.aiProcessingStatus !== 'pending') {
      await transcriptRepository.update(id, { aiProcessingStatus: 'pending' });
    }

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
    });
    if (!updated) {
      throw new Error(`Transcript ${id} not found after update`);
    }

    return { success: true, record: toMeetingRecord(updated, await currentRubric()) };
  } catch (error) {
    if (id) await markProcessingFailed(id);
    logAndThrow('runAiSummarization', error, AI_SUMMARIZATION_ERROR);
  }
}
