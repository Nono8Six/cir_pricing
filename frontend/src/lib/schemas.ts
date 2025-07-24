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

// Schéma de validation pour les classifications CIR
export const CirClassificationSchema = z.object({
  fsmega_code: z.number()
    .int("FSMEGA doit être un entier")
    .min(1, "FSMEGA doit être supérieur à 0")
    .max(999, "FSMEGA ne peut pas dépasser 999"),
  
  fsmega_designation: z.string()
    .min(1, "La désignation FSMEGA est requise")
    .max(200, "La désignation FSMEGA ne peut pas dépasser 200 caractères")
    .trim(),
  
  fsfam_code: z.number()
    .int("FSFAM doit être un entier")
    .min(0, "FSFAM doit être supérieur ou égal à 0")
    .max(999, "FSFAM ne peut pas dépasser 999"),
  
  fsfam_designation: z.string()
    .min(1, "La désignation FSFAM est requise")
    .max(200, "La désignation FSFAM ne peut pas dépasser 200 caractères")
    .trim(),
  
  fssfa_code: z.number()
    .int("FSSFA doit être un entier")
    .min(0, "FSSFA doit être supérieur ou égal à 0")
    .max(999, "FSSFA ne peut pas dépasser 999"),
  
  fssfa_designation: z.string()
    .min(1, "La désignation FSSFA est requise")
    .max(200, "La désignation FSSFA ne peut pas dépasser 200 caractères")
    .trim(),
  
  combined_code: z.string()
    .min(1, "Le code combiné est requis")
    .max(50, "Le code combiné ne peut pas dépasser 50 caractères")
    .trim(),
  
  combined_designation: z.string()
    .min(1, "La désignation combinée est requise")
    .max(500, "La désignation combinée ne peut pas dépasser 500 caractères")
    .trim()
});

export type CirClassificationInput = z.input<typeof CirClassificationSchema>;
export type CirClassificationOutput = z.output<typeof CirClassificationSchema>;

// Types pour la gestion des erreurs
export interface ParseResult {
  data: BrandMappingOutput[];
  info: string[];
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

// Mapping des colonnes pour les classifications CIR
export const CIR_CLASSIFICATION_COLUMN_MAPPINGS: Record<string, string[]> = {
  fsmega_code: ['Code FSMEGA', 'FSMEGA', 'Code_FSMEGA', 'Fsmega_Code'],
  fsmega_designation: ['Désignation FSMEGA', 'Designation FSMEGA', 'FSMEGA_Designation', 'Fsmega_Designation'],
  fsfam_code: ['Code FSFAM', 'FSFAM', 'Code_FSFAM', 'Fsfam_Code'],
  fsfam_designation: ['Désignation FSFAM', 'Designation FSFAM', 'FSFAM_Designation', 'Fsfam_Designation'],
  fssfa_code: ['Code FSSFA', 'FSSFA', 'Code_FSSFA', 'Fssfa_Code'],
  fssfa_designation: ['Désignation FSSFA', 'Designation FSSFA', 'FSSFA_Designation', 'Fssfa_Designation'],
  combined_code: ['Code 1&2&3', 'Code_1_2_3', 'Combined_Code', 'Code123'],
  combined_designation: ['Désignation 1&2&3', 'Designation_1_2_3', 'Combined_Designation', 'Designation123']
};