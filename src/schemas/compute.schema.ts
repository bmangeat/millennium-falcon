import { z } from 'zod';

export const computeRequestSchema = z.strictObject({
  arrival: z.string().trim().min(1).max(100),
});

export type ComputeRequest = z.infer<typeof computeRequestSchema>;
