'use server';

import { toRubric } from '@/features/workflow/utils/rubric.mapper';
import { toMeetingRecord, toStoredTranscript } from '@/features/workflow/utils/transcript.mapper';
import { DEMO_USER_ID } from '@/lib/db/mock/transcripts.fixture';
import { rubricSignalRepository } from '@/repositories/rubric-signal.repository';
import { transcriptRepository } from '@/repositories/transcript.repository';
import type { MeetingRecord } from '@/types/meeting.types';
import type { Rubric } from '@/types/rubric.types';

const LOAD_ERROR = 'Unable to load meeting data. Please try again.';
const SAVE_ERROR = 'Unable to save changes. Please try again.';

/** Log with context and surface a user-safe error (never leak internals) — constitution §XIV. */
function logAndThrow(op: string, error: unknown, message: string): never {
  console.error(`[transcript.actions] ${op} failed`, error);
  throw new Error(message);
}

/** The current rubric is the source of truth for detected-signal weights. */
async function currentRubric(): Promise<Rubric> {
  return toRubric(await rubricSignalRepository.findActive());
}

export async function getTranscripts(): Promise<MeetingRecord[]> {
  try {
    const [stored, rubric] = await Promise.all([transcriptRepository.findAll(), currentRubric()]);
    return stored.map((t) => toMeetingRecord(t, rubric));
  } catch (error) {
    logAndThrow('getTranscripts', error, LOAD_ERROR);
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
    logAndThrow('getTranscriptById', error, LOAD_ERROR);
  }
}

export async function getSampleTranscript(): Promise<string> {
  try {
    return await transcriptRepository.getSample();
  } catch (error) {
    logAndThrow('getSampleTranscript', error, LOAD_ERROR);
  }
}

export async function createTranscript(record: MeetingRecord): Promise<MeetingRecord> {
  try {
    const stored = await transcriptRepository.create(toStoredTranscript(record, DEMO_USER_ID));
    return toMeetingRecord(stored, await currentRubric());
  } catch (error) {
    logAndThrow('createTranscript', error, SAVE_ERROR);
  }
}

export async function updateTranscript(record: MeetingRecord): Promise<MeetingRecord | null> {
  try {
    const decomposed = toStoredTranscript(record, DEMO_USER_ID);
    const stored = await transcriptRepository.update(record.id, {
      fields: decomposed.fields,
      presentation: decomposed.presentation,
    });
    return stored ? toMeetingRecord(stored, await currentRubric()) : null;
  } catch (error) {
    logAndThrow('updateTranscript', error, SAVE_ERROR);
  }
}

export async function deleteTranscript(id: string): Promise<{ ok: boolean }> {
  try {
    return { ok: await transcriptRepository.delete(id) };
  } catch (error) {
    logAndThrow('deleteTranscript', error, SAVE_ERROR);
  }
}

export async function resetTranscripts(): Promise<void> {
  try {
    await transcriptRepository.reset();
  } catch (error) {
    logAndThrow('resetTranscripts', error, SAVE_ERROR);
  }
}
