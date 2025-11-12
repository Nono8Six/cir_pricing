import { supabase } from '../api';
import { parseExcelFile, parseCirClassificationExcelFile } from '../excelParser';
import type {
  BrandMappingOutput,
  CirClassificationOutput,
  CirParseResult,
  ParseResult
} from '../schemas';

const IMPORT_BUCKET = 'imports';

export interface CirStats {
  total_classifications: number;
  total_segments: number;
  total_segment_links: number;
  classification_history: number;
  segment_history: number;
  last_classification_import: Record<string, unknown> | null;
  last_segment_import: Record<string, unknown> | null;
}

export interface CirActivityLog {
  type: string;
  description: string;
  date: string;
  user?: string | null;
}

export interface DiffSummary {
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
}

export interface ImportResult {
  batchId: string;
  diffSummary: DiffSummary;
  info: string[];
}

export interface PreparedClassificationImport {
  file: File;
  rows: CirClassificationOutput[];
  diffSummary: DiffSummary;
  info: string[];
  totalLines: number;
  skippedLines: number;
  mapping?: Record<string, string>;
  templateId?: string | null;
}

export interface PreparedSegmentImport {
  file: File;
  rows: BrandMappingOutput[];
  diffSummary: DiffSummary;
  info: string[];
  totalLines: number;
  skippedLines: number;
  mapping?: Record<string, string>;
  templateId?: string | null;
}

export type DatasetType = 'cir_classification' | 'cir_segment';

export interface MappingTemplate {
  id: string;
  name: string;
  description: string | null;
  dataset_type: DatasetType;
  mapping: Record<string, string>;
  transforms: Record<string, unknown> | null;
  is_default: boolean;
  is_system: boolean;
  is_archived: boolean;
  template_version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  last_used_batch: {
    id: string;
    filename: string;
    created_at: string;
    diff_summary: DiffSummary | null;
  } | null;
}

function base64ToBlob(data: string, type: string): Blob {
  const byteCharacters = atob(data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
}

export function computeDiff<T>(
  incoming: T[],
  existing: Map<string, T>,
  getKey: (item: T) => string,
  isEqual: (a: T, b: T) => boolean
): DiffSummary {
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  const seenKeys = new Set<string>();

  for (const row of incoming) {
    const key = getKey(row);
    seenKeys.add(key);
    const current = existing.get(key);

    if (!current) {
      added++;
      continue;
    }

    if (isEqual(row, current)) {
      unchanged++;
    } else {
      updated++;
    }
  }

  let removed = 0;
  existing.forEach((_value, key) => {
    if (!seenKeys.has(key)) {
      removed++;
    }
  });

  return { added, updated, removed, unchanged };
}

async function createImportBatch(params: {
  filename: string;
  datasetType: DatasetType;
  totalLines: number;
  errorLines: number;
  templateId?: string | null;
  diffSummary: DiffSummary;
  mapping?: Record<string, unknown> | null;
}): Promise<string> {
  const {
    filename,
    datasetType,
    totalLines,
    errorLines,
    templateId,
    diffSummary,
    mapping
  } = params;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('import_batches')
    .insert({
      filename,
      user_id: user?.id ?? null,
      status: 'processing',
      total_lines: totalLines,
      processed_lines: 0,
      error_lines: errorLines,
      dataset_type: datasetType,
      template_id: templateId ?? null,
      diff_summary: diffSummary,
      mapping: mapping ?? null,
      created_count: 0,
      updated_count: 0,
      skipped_count: diffSummary.unchanged
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Impossible de créer le batch');
  }

  return data.id;
}

async function uploadFileToStorage(batchId: string, datasetType: DatasetType, file: File): Promise<string> {
  const path = `${datasetType}/${batchId}/${file.name}`;
  const { error } = await supabase.storage.from(IMPORT_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream'
  });
  if (error) throw error;
  await supabase.from('import_batches').update({ file_url: path }).eq('id', batchId);
  return path;
}

async function fetchExistingClassifications(): Promise<Map<string, CirClassificationOutput>> {
  const { data, error } = await supabase
    .from('cir_classifications')
    .select('fsmega_code, fsmega_designation, fsfam_code, fsfam_designation, fssfa_code, fssfa_designation, combined_code, combined_designation');

  if (error) throw error;
  const map = new Map<string, CirClassificationOutput>();
  (data ?? []).forEach((row) => {
    map.set(row.combined_code, row as CirClassificationOutput);
  });
  return map;
}

export async function getExistingClassificationsMap(): Promise<Map<string, CirClassificationOutput>> {
  return fetchExistingClassifications();
}

async function fetchExistingSegments(): Promise<Map<string, BrandMappingOutput>> {
  const { data, error } = await supabase
    .from('brand_category_mappings')
    .select('segment, marque, cat_fab, cat_fab_l, strategiq, codif_fair, fsmega, fsfam, fssfa, classif_cir');

  if (error) throw error;
  const map = new Map<string, BrandMappingOutput>();
  (data ?? []).forEach((row) => {
    map.set(row.segment, row as BrandMappingOutput);
  });
  return map;
}

export async function getExistingSegmentsMap(): Promise<Map<string, BrandMappingOutput>> {
  return fetchExistingSegments();
}

function isClassificationEqual(a: CirClassificationOutput, b: CirClassificationOutput): boolean {
  return (
    a.fsmega_code === b.fsmega_code &&
    a.fsmega_designation === b.fsmega_designation &&
    a.fsfam_code === b.fsfam_code &&
    a.fsfam_designation === b.fsfam_designation &&
    a.fssfa_code === b.fssfa_code &&
    a.fssfa_designation === b.fssfa_designation &&
    (a.combined_designation ?? '') === (b.combined_designation ?? '')
  );
}

function isSegmentEqual(a: BrandMappingOutput, b: BrandMappingOutput): boolean {
  const aClassif = (a as Record<string, unknown>).classif_cir ?? '';
  const bClassif = (b as Record<string, unknown>).classif_cir ?? '';

  return (
    a.marque === b.marque &&
    a.cat_fab === b.cat_fab &&
    (a.cat_fab_l ?? '') === (b.cat_fab_l ?? '') &&
    (a.codif_fair ?? '') === (b.codif_fair ?? '') &&
    a.strategiq === b.strategiq &&
    a.fsmega === b.fsmega &&
    a.fsfam === b.fsfam &&
    a.fssfa === b.fssfa &&
    aClassif === bClassif
  );
}

async function finalizeBatch(
  functionName: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.functions.invoke(functionName, {
    body: payload
  });

  if (error) {
    throw new Error(error.message ?? `Erreur fonction ${functionName}`);
  }
}

export async function applyClassificationImport(
  prepared: PreparedClassificationImport,
  options: { templateId?: string | null } = {}
): Promise<ImportResult> {
  const templateId = options.templateId ?? prepared.templateId ?? null;

  const batchId = await createImportBatch({
    filename: prepared.file.name,
    datasetType: 'cir_classification',
    totalLines: prepared.totalLines,
    errorLines: prepared.skippedLines,
    templateId,
    diffSummary: prepared.diffSummary,
    mapping: prepared.mapping ?? null
  });

  await uploadFileToStorage(batchId, 'cir_classification', prepared.file);

  await finalizeBatch('import-cir-classifications', {
    batchId,
    rows: prepared.rows,
    diffSummary: prepared.diffSummary,
    templateId
  });

  return { batchId, diffSummary: prepared.diffSummary, info: prepared.info };
}

export async function applySegmentImport(
  prepared: PreparedSegmentImport,
  options: { templateId?: string | null } = {}
): Promise<ImportResult> {
  const templateId = options.templateId ?? prepared.templateId ?? null;

  const batchId = await createImportBatch({
    filename: prepared.file.name,
    datasetType: 'cir_segment',
    totalLines: prepared.totalLines,
    errorLines: prepared.skippedLines,
    templateId,
    diffSummary: prepared.diffSummary,
    mapping: prepared.mapping ?? null
  });

  await uploadFileToStorage(batchId, 'cir_segment', prepared.file);

  await finalizeBatch('import-cir-segments', {
    batchId,
    rows: prepared.rows,
    diffSummary: prepared.diffSummary,
    templateId
  });

  return { batchId, diffSummary: prepared.diffSummary, info: prepared.info };
}

export const cirAdminApi = {
  async fetchCirStats(): Promise<CirStats> {
    const { data, error } = await supabase.rpc('admin_get_cir_stats');
    if (error || !data) throw error ?? new Error('Impossible de récupérer les statistiques CIR');
    return data as CirStats;
  },

  async exportClassifications(): Promise<Blob> {
    const { data, error } = await supabase.rpc('admin_export_cir_classifications_csv');
    if (error || !data) throw error ?? new Error('Export classifications échoué');
    return base64ToBlob(data as string, 'text/csv;charset=utf-8');
  },

  async exportSegments(): Promise<Blob> {
    const { data, error } = await supabase.rpc('admin_export_cir_segments_csv');
    if (error || !data) throw error ?? new Error('Export segments échoué');
    return base64ToBlob(data as string, 'text/csv;charset=utf-8');
  },

  async purgeHistory(): Promise<Record<string, number>> {
    const { data, error } = await supabase.rpc('admin_purge_cir_history');
    if (error || !data) throw error ?? new Error('Purge historique échouée');
    return data as Record<string, number>;
  },

  async purgeClassifications(): Promise<Record<string, number>> {
    const { data, error } = await supabase.rpc('admin_purge_cir_classifications');
    if (error || !data) throw error ?? new Error('Purge classifications échouée');
    return data as Record<string, number>;
  },

  async purgeSegments(): Promise<Record<string, number>> {
    const { data, error } = await supabase.rpc('admin_purge_cir_segments');
    if (error || !data) throw error ?? new Error('Purge segments échouée');
    return data as Record<string, number>;
  },

  async fetchRecentActivity(limit = 20): Promise<CirActivityLog[]> {
    const { data, error } = await supabase.rpc('admin_get_recent_activity', { entry_limit: limit });
    if (error) throw error;
    return (data as CirActivityLog[]) ?? [];
  },

  async listTemplates(datasetType: DatasetType, options: { includeArchived?: boolean } = {}): Promise<MappingTemplate[]> {
    const query = supabase
      .from('mapping_templates')
      .select(
        `
        *,
        last_used_batch:import_batches!mapping_templates_last_used_batch_fkey (
          id,
          filename,
          created_at,
          diff_summary
        )
      `
      )
      .eq('dataset_type', datasetType)
      .order('is_system', { ascending: false })
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (!options.includeArchived) {
      query.eq('is_archived', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as MappingTemplate[];
  },

  async createTemplate(payload: {
    name: string;
    description?: string;
    datasetType: DatasetType;
    mapping: Record<string, string>;
    transforms?: Record<string, unknown> | null;
    isDefault?: boolean;
  }): Promise<MappingTemplate> {
    const { data, error } = await supabase
      .from('mapping_templates')
      .insert({
        name: payload.name,
        description: payload.description ?? null,
        dataset_type: payload.datasetType,
        mapping: payload.mapping,
        transforms: payload.transforms ?? null,
        is_default: payload.isDefault ?? false
      })
      .select()
      .single();

    if (error) throw error;
    return data as MappingTemplate;
  },

  async updateTemplate(id: string, updates: Record<string, unknown>): Promise<MappingTemplate> {
    const { data, error } = await supabase
      .from('mapping_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as MappingTemplate;
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('mapping_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async archiveTemplate(id: string): Promise<MappingTemplate> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('mapping_templates')
      .update({
        is_archived: true,
        archived_at: now,
        is_default: false
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as MappingTemplate;
  },

  async restoreTemplate(id: string): Promise<MappingTemplate> {
    const { data, error } = await supabase
      .from('mapping_templates')
      .update({
        is_archived: false,
        archived_at: null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as MappingTemplate;
  },

  async uploadClassificationExcel(file: File, options: { templateId?: string | null } = {}): Promise<ImportResult> {
    const parsed: CirParseResult = await parseCirClassificationExcelFile(file);
    if ((parsed.data ?? []).length === 0) {
      throw new Error('Aucune ligne valide détectée dans le fichier');
    }

    const existing = await fetchExistingClassifications();
    const diffSummary = computeDiff(
      parsed.data,
      existing,
      (row) => row.combined_code,
      isClassificationEqual
    );

    const batchId = await createImportBatch({
      filename: file.name,
      datasetType: 'cir_classification',
      totalLines: parsed.totalLines,
      errorLines: parsed.skippedLines,
      templateId: options.templateId ?? null,
      diffSummary,
      mapping: null
    });

    await uploadFileToStorage(batchId, 'cir_classification', file);

    await finalizeBatch('import-cir-classifications', {
      batchId,
      rows: parsed.data,
      diffSummary,
      templateId: options.templateId ?? null
    });

    return { batchId, diffSummary, info: parsed.info };
  },

  async uploadSegmentExcel(file: File, options: { templateId?: string | null } = {}): Promise<ImportResult> {
    const parsed: ParseResult = await parseExcelFile(file);
    if ((parsed.data ?? []).length === 0) {
      throw new Error('Aucune ligne valide détectée dans le fichier');
    }

    const existing = await fetchExistingSegments();
    const diffSummary = computeDiff(
      parsed.data,
      existing,
      (row) => row.segment,
      isSegmentEqual
    );

    const batchId = await createImportBatch({
      filename: file.name,
      datasetType: 'cir_segment',
      totalLines: parsed.totalLines,
      errorLines: parsed.skippedLines,
      templateId: options.templateId ?? null,
      diffSummary,
      mapping: null
    });

    await uploadFileToStorage(batchId, 'cir_segment', file);

    await finalizeBatch('import-cir-segments', {
      batchId,
      rows: parsed.data,
      diffSummary,
      templateId: options.templateId ?? null
    });

    return { batchId, diffSummary, info: parsed.info };
  }
};
