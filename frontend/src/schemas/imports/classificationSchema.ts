import { z } from 'zod';

const asInt = z.preprocess((v) => {
  if (typeof v === 'string') return v.trim() === '' ? undefined : Number(v);
  return v;
}, z.number({ invalid_type_error: 'Nombre requis' }).int('Doit être entier'));

const asTrim = z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().min(1));

export const classificationRowSchema = z
  .object({
    fsmega_code: asInt,
    fsmega_designation: asTrim,
    fsfam_code: asInt,
    fsfam_designation: asTrim,
    fssfa_code: asInt,
    fssfa_designation: asTrim,
    combined_code: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().min(1)).optional(),
    combined_designation: z.preprocess((v) => (v == null ? undefined : typeof v === 'string' ? v.trim() : v), z.string()).optional(),
  })
  .transform((row) => {
    const cc = row.combined_code || `${row.fsmega_code} ${row.fsfam_code} ${row.fssfa_code}`;
    return { ...row, combined_code: cc };
  });

export type ClassificationRow = z.infer<typeof classificationRowSchema>;

export const requiredClassificationFields: Array<{ key: keyof ClassificationRow; label: string; hint?: string }> = [
  { key: 'fsmega_code', label: 'fsmega_code', hint: 'Entier' },
  { key: 'fsmega_designation', label: 'fsmega_designation', hint: 'Texte' },
  { key: 'fsfam_code', label: 'fsfam_code', hint: 'Entier' },
  { key: 'fsfam_designation', label: 'fsfam_designation', hint: 'Texte' },
  { key: 'fssfa_code', label: 'fssfa_code', hint: 'Entier' },
  { key: 'fssfa_designation', label: 'fssfa_designation', hint: 'Texte' },
];

export const optionalClassificationFields: Array<{ key: keyof ClassificationRow; label: string; hint?: string }> = [
  { key: 'combined_code', label: 'combined_code', hint: 'Optionnel (auto-calculé si absent)' },
  { key: 'combined_designation', label: 'combined_designation', hint: 'Optionnel' },
];
