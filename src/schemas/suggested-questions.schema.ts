import { z } from 'zod';

/**
 * The contract the model must return, as a single JSON object.
 *
 * Shape only. Count, length, and distinctness are applied after trimming in
 * `validateSuggestionSet` — a model that returns `"  Who owns the rollout?  "`
 * has followed the contract and should not be rejected on whitespace.
 *
 * An object with one key rather than a bare array because OpenRouter's
 * `json_object` response format requires a JSON object at the top level.
 */
export const SuggestedQuestionsSchema = z.object({
  questions: z.array(z.string()),
});

export type SuggestedQuestionsPayload = z.infer<typeof SuggestedQuestionsSchema>;
