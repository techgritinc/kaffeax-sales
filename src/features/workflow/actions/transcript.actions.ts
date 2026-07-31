'use server';

import { DEFAULT_USER_ID } from '@/constants/user';
import { toRubric } from '@/features/workflow/utils/rubric.mapper';
import {
  formatWhen,
  toMeetingRecord,
  toTranscriptPatch,
} from '@/features/workflow/utils/transcript.mapper';
import { logAndThrow } from '@/lib/utils/server-action.utils';
import { cleanTranscript } from '@/lib/utils/transcript-cleaner.utils';
import { rubricSignalRepository } from '@/repositories/rubric-signal.repository';
import { transcriptRepository } from '@/repositories/transcript.repository';
import { createDraftTranscriptSchema } from '@/schemas/transcript.schema';
import type { MeetingRecord } from '@/types/meeting.types';
import type { Rubric } from '@/types/rubric.types';
import type { StoredTranscript } from '@/types/transcript.types';

import {
  ACTION_LOAD_ERROR,
  ACTION_SAVE_ERROR,
  DRAFT_CREATE_ERROR,
} from '../constants/action.constants';

export async function currentRubric(): Promise<Rubric> {
  return toRubric(await rubricSignalRepository.findActive());
}

export async function getTranscripts(): Promise<StoredTranscript[]> {
  try {
    return await transcriptRepository.findAll();
  } catch (error) {
    logAndThrow('getTranscripts', error, ACTION_LOAD_ERROR);
  }
}

export async function getTranscriptById(id: string): Promise<MeetingRecord | null> {
  try {
    const [stored, rubric] = await Promise.all([
      transcriptRepository.findById(id),
      currentRubric(),
    ]);
    return stored ? toMeetingRecord(stored, rubric) : null;
  } catch (error) {
    logAndThrow('getTranscriptById', error, ACTION_LOAD_ERROR);
  }
}

export async function updateTranscript(record: MeetingRecord): Promise<MeetingRecord | null> {
  try {
    const stored = await transcriptRepository.update(record.id, toTranscriptPatch(record));
    return stored ? toMeetingRecord(stored, await currentRubric()) : null;
  } catch (error) {
    logAndThrow('updateTranscript', error, ACTION_SAVE_ERROR);
  }
}

export async function deleteTranscript(id: string): Promise<{ ok: boolean }> {
  try {
    return { ok: await transcriptRepository.delete(id) };
  } catch (error) {
    logAndThrow('deleteTranscript', error, ACTION_SAVE_ERROR);
  }
}

export async function createDraftTranscript(input: {
  rawTranscript: string;
}): Promise<{ id: string }> {
  try {
    const { rawTranscript } = createDraftTranscriptSchema.parse(input);
    const stored = await transcriptRepository.create({
      userId: DEFAULT_USER_ID,
      title: `Meeting on ${formatWhen(new Date())}`,
      status: 'draft',
      aiProcessingStatus: 'pending',
      source: 'manual',
      originalTranscript: rawTranscript,
      cleanedTranscript: cleanTranscript(rawTranscript),
    });
    return { id: stored.id };
  } catch (error) {
    logAndThrow('createDraftTranscript', error, DRAFT_CREATE_ERROR);
  }
}
