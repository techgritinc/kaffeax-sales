import { z } from 'zod';

export const openRouterResponseSchema = z.object({
  model: z.string(),
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    cost: z.number().optional(),
  }),
});

export type OpenRouterResponse = z.infer<typeof openRouterResponseSchema>;

export const openRouterErrorEnvelopeSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.number(),
  }),
});
