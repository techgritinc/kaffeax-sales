import { z } from 'zod';

export const ChatAnswerSchema = z.object({
  inScope: z.boolean(),
  coveredInMeeting: z.boolean(),
  answer: z.string().min(1),
  evidenceSpans: z.array(z.string().min(1)).default([]),
  unanswerablePart: z.string().nullable().default(null),
});

export type ChatAnswer = z.infer<typeof ChatAnswerSchema>;
