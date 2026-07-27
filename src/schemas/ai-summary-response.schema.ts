import { z } from 'zod';

export const AiSummaryResponseSchema = z.object({
  narrative: z.string().min(1),
  whatWeHeard: z.array(z.string()).default([]),
  whatWasCovered: z.array(z.string()).default([]),
  whatWasDecided: z.array(z.string()).default([]),
  actionItems: z
    .array(
      z.object({
        description: z.string().min(1),
        owner: z.string().min(1),
        dueDate: z.string().nullable().optional().default(null),
      }),
    )
    .default([]),
  attendees: z
    .array(
      z.object({
        name: z.string().min(1),
        side: z.enum(['kaffeax', 'prospect']),
      }),
    )
    .default([]),
  detectedSignals: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        evidence: z.string().min(1),
      }),
    )
    .default([]),
  leadScoreBand: z.enum(['hot', 'warm', 'cold']),
  scoreRationale: z.string().min(1),
});

export type AiSummaryResponse = z.infer<typeof AiSummaryResponseSchema>;
