import { z } from 'zod';

// Schéma de validation pour une ligne de mapping
export const BrandMappingSchema = z.object({
  segment: z.string()
    .min(1, "Le segment est requis")
    .max(10, "Le segment ne peut pas dépasser 10 caractères")
    .trim(),
  
  marque: z.string()
    .min(1, "La marque est requise")
    .max(50, "La marque ne peut pas dépasser 50 caractères")
    .trim(),
  
  cat_fab: z.string()
    .min(1, "La catégorie fabricant est requise")
    .max(20, "La catégorie fabricant ne peut pas dépasser 20 caractères")
    .trim(),
  
  cat_fab_l: z.string()
    .max(200, "La description ne peut pas dépasser 200 caractères")
    .trim()
    .optional()
    .nullable(),
  
  strategiq: z.number()
    .int("Stratégique doit être un entier")
    .min(0, "Stratégique doit être 0 ou 1")
    .max(1, "Stratégique doit être 0 ou 1")
    .default(0),
  
  codif_fair: z.string()
    .max(50, "Le code FAIR ne peut pas dépasser 50 caractères")
    .trim()
    .optional()
    .nullable(),
  
  fsmega: z.number()
    .int("FSMEGA doit être un entier")
    .min(1, "FSMEGA doit être supérieur à 0")
    .max(999, "FSMEGA ne peut pas dépasser 999")
    .default(1),
  
  fsfam: z.number()
    .int("FSFAM doit être un entier")
    .min(1, "FSFAM doit être supérieur à 0")
    .max(999, "FSFAM ne peut pas dépasser 999")
    .default(99),
  
  fssfa: z.number()
    .int("FSSFA doit être un entier")
    .min(1, "FSSFA doit être supérieur à 0")
    .max(999, "FSSFA ne peut pas dépasser 999")
    .default(99)
});

export type BrandMappingInput = z.input<typeof BrandMappingSchema>;
export type BrandMappingOutput = z.output<typeof BrandMappingSchema>;

// Types pour la gestion des erreurs
export type ValidationErrorLevel = 'BLOCKING' | 'WARNING' | 'INFO';

export interface ValidationError {
  line: number;
  column: string;
  field: string;
  value: any;
  expected?: string;
  message: string;
  level: ValidationErrorLevel;
  suggestion?: string;
}

export interface ParseResult {
  data: BrandMappingOutput[];
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  totalLines: number;
  validLines: number;
  skippedLines: number;
}

// Configuration pour le mapping des colonnes
export interface ColumnMapping {
  [key: string]: string; // key = nom de colonne détecté, value = nom de champ dans le schéma
}

export const DEFAULT_COLUMN_MAPPINGS: Record<string, string[]> = {
  segment: ['SEGMENT', 'Segment', 'segment', 'SEG'],
  marque: ['MARQUE', 'Marque', 'marque', 'BRAND', 'Brand', 'brand'],
  cat_fab: ['CAT_FAB', 'Cat_Fab', 'cat_fab', 'CATEGORY', 'Category'],
  cat_fab_l: ['CAT_FAB_L', 'Cat_Fab_L', 'cat_fab_l', 'DESCRIPTION', 'Description'],
  strategiq: ['STRATEGIQ', 'Strategiq', 'strategiq', 'STRATEGIC', 'Strategic'],
  codif_fair: ['CODIF_FAIR', 'Codif_Fair', 'codif_fair', 'CODE_FAIR', 'Code_Fair'],
  fsmega: ['FSMEGA', 'Fsmega', 'fsmega', 'FS_MEGA', 'Fs_Mega'],
  fsfam: ['FSFAM', 'Fsfam', 'fsfam', 'FS_FAM', 'Fs_Fam'],
  fssfa: ['FSSFA', 'Fssfa', 'fssfa', 'FS_SFA', 'Fs_Sfa']
};