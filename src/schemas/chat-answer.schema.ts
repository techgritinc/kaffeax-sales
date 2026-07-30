import { z } from 'zod';

/**
 * The contract the model must return, as a single JSON object.
 *
 * Two flags rather than one, deliberately: "outside this meeting's scope"
 * (`inScope: false`) and "in scope but never discussed"
 * (`coveredInMeeting: false`) are different answers to the user and are
 * measured by different success criteria. Collapsing them would leave the
 * evaluation unable to tell a guardrail failure from a recall failure.
 */
export const ChatAnswerSchema = z.object({
  inScope: z.boolean(),
  coveredInMeeting: z.boolean(),
  answer: z.string().min(1),
  evidenceSpans: z.array(z.string().min(1)).default([]),
  unanswerablePart: z.string().nullable().default(null),
});

export type ChatAnswer = z.infer<typeof ChatAnswerSchema>;
