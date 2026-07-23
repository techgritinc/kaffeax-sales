'use server';

import { toRubric, toRubricSignalFields } from '@/features/workflow/utils/rubric.mapper';
import { rubricSignalRepository } from '@/repositories/rubric-signal.repository';
import type { RubricSignalFields } from '@/types/rubric-signal.types';
import type { Rubric, RubricSignal } from '@/types/rubric.types';

import { RUBRIC_LOAD_ERROR, RUBRIC_SAVE_ERROR } from '../constants/action.constants';

/** Log with context and surface a user-safe error (never leak internals) — constitution §XIV. */
function logAndThrow(op: string, error: unknown, message: string): never {
  console.error(`[rubric.actions] ${op} failed`, error);
  throw new Error(message);
}

async function readRubric(): Promise<Rubric> {
  return toRubric(await rubricSignalRepository.findActive());
}

export async function getRubric(): Promise<Rubric> {
  try {
    return await readRubric();
  } catch (error) {
    logAndThrow('getRubric', error, RUBRIC_LOAD_ERROR);
  }
}

export async function createRubricSignal(signal: RubricSignal): Promise<Rubric> {
  try {
    await rubricSignalRepository.create(toRubricSignalFields(signal));
    return await readRubric();
  } catch (error) {
    logAndThrow('createRubricSignal', error, RUBRIC_SAVE_ERROR);
  }
}

export async function updateRubricSignal(
  id: string,
  patch: Partial<RubricSignal>,
): Promise<Rubric> {
  try {
    const fields: Partial<RubricSignalFields> = {};
    if (patch.label !== undefined) fields.label = patch.label;
    if (patch.weight !== undefined) fields.weight = patch.weight;
    if (patch.source !== undefined) fields.source = patch.source;
    if (patch.hints !== undefined) fields.hints = patch.hints;
    await rubricSignalRepository.update(id, fields);
    return await readRubric();
  } catch (error) {
    logAndThrow('updateRubricSignal', error, RUBRIC_SAVE_ERROR);
  }
}

export async function deleteRubricSignal(id: string): Promise<Rubric> {
  try {
    await rubricSignalRepository.delete(id);
    return await readRubric();
  } catch (error) {
    logAndThrow('deleteRubricSignal', error, RUBRIC_SAVE_ERROR);
  }
}

export async function resetRubric(): Promise<Rubric> {
  try {
    await rubricSignalRepository.reset();
    return await readRubric();
  } catch (error) {
    logAndThrow('resetRubric', error, RUBRIC_SAVE_ERROR);
  }
}
