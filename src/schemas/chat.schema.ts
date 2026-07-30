import { z } from 'zod';

import { MAX_QUESTION_CHARS } from '@/constants/grounded-chat';

export const transcriptIdSchema = z.string().min(1);

export const chatQuestionSchema = z.object({
  transcriptId: transcriptIdSchema,
  question: z.string().trim().min(1).max(MAX_QUESTION_CHARS),
});

export type ChatQuestionInput = z.infer<typeof chatQuestionSchema>;
