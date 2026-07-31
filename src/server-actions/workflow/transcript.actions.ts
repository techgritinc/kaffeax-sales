'use server';

import { DEFAULT_USER_ID } from '@/constants/user';
import { RECENTS_PAGE_SIZE } from '@/constants/workflow/recents.constants';
import { logAndThrow } from '@/lib/utils/server-action.utils';
import { cleanTranscript } from '@/lib/utils/transcript-cleaner.utils';
import { toRubric } from '@/lib/utils/workflow/rubric.mapper';
import {
  formatWhen,
  toMeetingRecord,
  toTranscriptPatch,
} from '@/lib/utils/workflow/transcript.mapper';
import { rubricSignalRepository } from '@/repositories/rubric-signal.repository';
import { transcriptRepository } from '@/repositories/transcript.repository';
import { createDraftTranscriptSchema } from '@/schemas/transcript.schema';
import type { MeetingRecord } from '@/types/meeting.types';
import type { RecentsPageResult } from '@/types/recents.types';
import type { Rubric } from '@/types/rubric.types';
import type { StoredTranscript } from '@/types/transcript.types';

import {
  ACTION_LOAD_ERROR,
  ACTION_SAVE_ERROR,
  DRAFT_CREATE_ERROR,
} from '../../constants/workflow/action.constants';

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

/**
 * Persists only the prospect email — the Review screen's one editable field.
 * Deliberately bypasses `toTranscriptPatch`/`updateTranscript`: that mapper rebuilds the
 * whole `summary` sub-document from the client-side view-model, which has no `whatWeHeard`
 * field, silently wiping the AI-populated value on every save.
 */
export async function updateTranscriptEmail(id: string, email: string): Promise<boolean> {
  try {
    const updated = await transcriptRepository.update(id, { contact: { email } });
    return updated !== null;
  } catch (error) {
    logAndThrow('updateTranscriptEmail', error, ACTION_SAVE_ERROR);
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

export async function getTranscriptPage(
  page: number,
  limit: number = RECENTS_PAGE_SIZE,
): Promise<RecentsPageResult> {
  try {
    return await transcriptRepository.findPage(Math.max(1, page), limit);
  } catch (error) {
    logAndThrow('getTranscriptPage', error, ACTION_LOAD_ERROR);
  }
}

export async function searchTranscripts(query: string): Promise<StoredTranscript[]> {
  if (!query.trim()) return [];
  try {
    return await transcriptRepository.searchByTitle(query);
  } catch (error) {
    logAndThrow('searchTranscripts', error, ACTION_LOAD_ERROR);
  }
}
