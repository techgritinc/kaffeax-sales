import { z } from 'zod';

import { SIGNAL_WEIGHTS } from '@/types/rubric-signal.types';

export const createDraftTranscriptSchema = z.object({
  rawTranscript: z.string().min(1),
});

const simplifiedSignalSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  tier: z.enum(SIGNAL_WEIGHTS),
  hints: z.array(z.string()).optional(),
  numericWeight: z.number(),
});

export const runAiSummarizationSchema = z.object({
  id: z.string().min(1),
  signals: simplifiedSignalSchema.array(),
});
