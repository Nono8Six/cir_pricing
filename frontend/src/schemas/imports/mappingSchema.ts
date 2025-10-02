import { z } from 'zod';

// Helpers
const asInt = (defaultValue: number = 1, min: number = 1, max: number = 999) => z.preprocess((v) => {
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '') return defaultValue; // Default pour cellules vides
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : v;
  }
  return v;
}, z.number({ invalid_type_error: 'Nombre requis' }).int('Doit être entier').min(min).max(max).default(defaultValue));

const as01 = z.preprocess((v) => {
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase();
    if (t === 'oui' || t === 'true') return 1;
    if (t === 'non' || t === 'false') return 0;
    if (t === '') return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : v;
  }
  return v;
}, z.number().int().min(0).max(1));

const asTrimmed = z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().min(1));

export const mappingRowSchema = z.object({
  segment: asTrimmed,
  marque: asTrimmed,
  cat_fab: z.preprocess((v) => (typeof v === 'string' ? v.trim().toUpperCase() : v), z.string().min(1)),
  cat_fab_l: z.preprocess((v) => (v == null ? undefined : typeof v === 'string' ? v.trim() : v), z.string()).optional(),
  strategiq: as01.default(0),
  fsmega: asInt(1, 1, 999),
  fsfam: asInt(99, 0, 999), 
  fssfa: asInt(99, 0, 999),
  codif_fair: z.preprocess((v) => (v == null ? undefined : typeof v === 'string' ? v.trim() : v), z.string()).optional(),
});

export type MappingRow = z.infer<typeof mappingRowSchema>;

export const requiredMappingFields: Array<{ key: keyof MappingRow; label: string; hint?: string }> = [
  { key: 'segment', label: 'segment', hint: 'Texte (ex: Automation)' },
  { key: 'marque', label: 'marque', hint: 'Texte (ex: SKF)' },
  { key: 'cat_fab', label: 'cat_fab', hint: 'Texte (code catégorie fabricant)' },
  { key: 'strategiq', label: 'strategiq', hint: '0 ou 1' },
  { key: 'fsmega', label: 'fsmega', hint: 'Entier' },
  { key: 'fsfam', label: 'fsfam', hint: 'Entier' },
  { key: 'fssfa', label: 'fssfa', hint: 'Entier' },
];

export const optionalMappingFields: Array<{ key: keyof MappingRow; label: string; hint?: string }>= [
  { key: 'cat_fab_l', label: 'cat_fab_l', hint: 'Description (optionnel)' },
  { key: 'codif_fair', label: 'codif_fair', hint: 'Optionnel' },
];

