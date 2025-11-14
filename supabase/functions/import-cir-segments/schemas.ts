import { z } from 'npm:zod';

export const SegmentRowSchema = z.object({
  segment: z.string().min(1),
  marque: z.string().min(1),
  cat_fab: z.string().min(1),
  cat_fab_l: z.string().nullable().optional(),
  strategiq: z.number().int().default(0),
  codif_fair: z.string().nullable().optional(),
  fsmega: z.number().int().nullable(),  // Accepte null
  fsfam: z.number().int().nullable(),   // Accepte null
  fssfa: z.number().int().nullable(),   // Accepte null
  classif_cir: z.string().nullable().optional()
});

export const ImportSegmentPayloadSchema = z.object({
  batchId: z.string().uuid(),
  rows: z.array(SegmentRowSchema).min(1),
  diffSummary: z.record(z.string(), z.number()).optional(),
  templateId: z.string().uuid().nullable().optional()
});

export type ImportSegmentPayload = z.infer<typeof ImportSegmentPayloadSchema>;

