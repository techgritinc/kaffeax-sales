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

/**
 * OpenRouter sometimes reports an upstream provider failure (e.g. a timeout) as an HTTP 200
 * response carrying this envelope instead of a real non-2xx status — most common with free-tier
 * models whose backing provider is overloaded or slow to respond.
 */
export const openRouterErrorEnvelopeSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.number(),
  }),
});
