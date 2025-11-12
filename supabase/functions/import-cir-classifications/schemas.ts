import { z } from 'npm:zod';

export const ClassificationRowSchema = z.object({
  fsmega_code: z.number().int(),
  fsmega_designation: z.string().min(1),
  fsfam_code: z.number().int(),
  fsfam_designation: z.string().min(1),
  fssfa_code: z.number().int(),
  fssfa_designation: z.string().min(1),
  combined_code: z.string().min(1),
  combined_designation: z.string().min(1)
});

export const ImportClassificationPayloadSchema = z.object({
  batchId: z.string().uuid(),
  rows: z.array(ClassificationRowSchema).min(1),
  diffSummary: z.record(z.string(), z.number()).optional(),
  templateId: z.string().uuid().nullable().optional()
});

export type ImportClassificationPayload = z.infer<typeof ImportClassificationPayloadSchema>;

