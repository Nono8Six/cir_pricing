import { z } from 'npm:zod';

/**
 * Schema for the main request body sent to process-import Edge Function
 */
export const ProcessImportRequestSchema = z.object({
  batch_id: z.string().uuid('batch_id must be a valid UUID'),
  dataset_type: z.enum(['mapping', 'classification'], {
    errorMap: () => ({ message: 'dataset_type must be either "mapping" or "classification"' })
  }),
  file_path: z.string().min(1, 'file_path cannot be empty'),
  mapping: z.record(z.string(), z.string()).refine(
    (obj) => Object.keys(obj).length > 0,
    { message: 'mapping must contain at least one field mapping' }
  )
});

export type ProcessImportRequest = z.infer<typeof ProcessImportRequestSchema>;

/**
 * Schema for a single row in brand_category_mappings dataset
 * Based on table: brand_category_mappings
 *
 * Required fields: segment, marque, cat_fab, fsmega, fsfam, fssfa
 * Optional fields: cat_fab_l, strategiq, codif_fair
 * Generated fields (excluded): id, classif_cir, created_at
 */
export const MappingRowSchema = z.object({
  segment: z.string().min(1, 'segment is required'),
  marque: z.string().min(1, 'marque is required'),
  cat_fab: z.string().min(1, 'cat_fab is required'),
  cat_fab_l: z.string().optional().nullable(),
  strategiq: z.union([
    z.number().int().min(0).max(1),
    z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(0).max(1))
  ]).default(0),
  codif_fair: z.string().optional().nullable(),
  fsmega: z.union([
    z.number().int(),
    z.string().transform(val => parseInt(val, 10)).pipe(z.number().int())
  ]),
  fsfam: z.union([
    z.number().int(),
    z.string().transform(val => parseInt(val, 10)).pipe(z.number().int())
  ]),
  fssfa: z.union([
    z.number().int(),
    z.string().transform(val => parseInt(val, 10)).pipe(z.number().int())
  ])
}).strict();

export type MappingRow = z.infer<typeof MappingRowSchema>;

/**
 * Schema for a single row in cir_classifications dataset
 * Based on table: cir_classifications
 *
 * All fields are required except id, created_at, updated_at (auto-generated)
 */
export const ClassificationRowSchema = z.object({
  fsmega_code: z.union([
    z.number().int(),
    z.string().transform(val => parseInt(val, 10)).pipe(z.number().int())
  ]),
  fsmega_designation: z.string().min(1, 'fsmega_designation is required'),
  fsfam_code: z.union([
    z.number().int(),
    z.string().transform(val => parseInt(val, 10)).pipe(z.number().int())
  ]),
  fsfam_designation: z.string().min(1, 'fsfam_designation is required'),
  fssfa_code: z.union([
    z.number().int(),
    z.string().transform(val => parseInt(val, 10)).pipe(z.number().int())
  ]),
  fssfa_designation: z.string().min(1, 'fssfa_designation is required'),
  combined_code: z.string().min(1, 'combined_code is required'),
  combined_designation: z.string().min(1, 'combined_designation is required')
}).strict();

export type ClassificationRow = z.infer<typeof ClassificationRowSchema>;
