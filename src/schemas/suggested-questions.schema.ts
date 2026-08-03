import { z } from 'zod';

export const SuggestedQuestionsSchema = z.object({
  questions: z.array(z.string()),
});

export type SuggestedQuestionsPayload = z.infer<typeof SuggestedQuestionsSchema>;
