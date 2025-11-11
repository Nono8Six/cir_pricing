import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabase } from '../api';

const RPC_NAMES = {
  stats: 'admin_get_mapping_stats',
  cleanupHistory: 'admin_cleanup_mapping_history',
  purgeHistory: 'admin_purge_mapping_history',
  purgeAllData: 'admin_purge_mapping_data'
} as const;

const StatsResponseSchema = z.object({
  total_mappings: z.number().int().nonnegative(),
  total_import_batches: z.number().int().nonnegative(),
  total_history_records: z.number().int().nonnegative(),
  database_size_mb: z.number().nonnegative(),
  last_backup_at: z.string().nullable().optional()
});

const IntegerResultSchema = z.object({
  deleted_rows: z.number().int().nonnegative()
});

const PurgeAllDataResponseSchema = z.object({
  deleted_history_rows: z.number().int().nonnegative(),
  deleted_mapping_rows: z.number().int().nonnegative(),
  deleted_import_batches: z.number().int().nonnegative()
});

export interface MappingAdminStats {
  totalMappings: number;
  totalImportBatches: number;
  totalHistoryRecords: number;
  databaseSizeMb: number;
  lastBackupAt: string | null;
}

export interface CleanupHistoryResult {
  deletedRows: number;
}

export interface PurgeHistoryResult {
  deletedRows: number;
}

export interface PurgeAllDataResult {
  deletedHistoryRows: number;
  deletedMappingRows: number;
  deletedImportBatches: number;
}

interface RpcCallConfig<T> {
  rpcName: string;
  args?: Record<string, unknown>;
  parser: (payload: unknown) => T;
  fallback: () => Promise<T>;
}

const parseStatsPayload = (payload: unknown): MappingAdminStats => {
  const parsed = StatsResponseSchema.parse(payload);
  return {
    totalMappings: parsed.total_mappings,
    totalImportBatches: parsed.total_import_batches,
    totalHistoryRecords: parsed.total_history_records,
    databaseSizeMb: parsed.database_size_mb,
    lastBackupAt: parsed.last_backup_at ?? null
  };
};

const parseIntegerResult = (payload: unknown): number => {
  const parsed = IntegerResultSchema.parse(payload);
  return parsed.deleted_rows;
};

const parsePurgeAllDataResult = (payload: unknown): PurgeAllDataResult => {
  const parsed = PurgeAllDataResponseSchema.parse(payload);
  return {
    deletedHistoryRows: parsed.deleted_history_rows,
    deletedMappingRows: parsed.deleted_mapping_rows,
    deletedImportBatches: parsed.deleted_import_batches
  };
};

const isMissingRpcError = (error?: PostgrestError | null): boolean =>
  Boolean(error?.code === 'PGRST201');

const fetchStatsFallback = async (): Promise<MappingAdminStats> => {
  const [
    { count: mappingsCount, error: mappingsError },
    { count: batchesCount, error: batchesError },
    { count: historyCount, error: historyError }
  ] = await Promise.all([
    supabase.from('brand_category_mappings').select('id', { count: 'exact', head: true }),
    supabase.from('import_batches').select('id', { count: 'exact', head: true }),
    supabase.from('brand_mapping_history').select('history_id', { count: 'exact', head: true })
  ]);

  if (mappingsError) {
    throw new Error(`brand_category_mappings count failed: ${mappingsError.message}`);
  }
  if (batchesError) {
    throw new Error(`import_batches count failed: ${batchesError.message}`);
  }
  if (historyError) {
    throw new Error(`brand_mapping_history count failed: ${historyError.message}`);
  }

  const totalMappings = mappingsCount ?? 0;
  const estimatedSizeMb = Number((totalMappings * 0.5).toFixed(1));

  return {
    totalMappings,
    totalImportBatches: batchesCount ?? 0,
    totalHistoryRecords: historyCount ?? 0,
    databaseSizeMb: estimatedSizeMb,
    lastBackupAt: new Date().toISOString()
  };
};

const cleanupHistoryFallback = async (retentionDays: number): Promise<CleanupHistoryResult> => {
  const safeRetention = Math.max(1, retentionDays);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - safeRetention);

  const cutoffIso = cutoffDate.toISOString();

  const { count, error } = await supabase
    .from('brand_mapping_history')
    .select('history_id', { count: 'exact', head: true })
    .lt('changed_at', cutoffIso);

  if (error) {
    throw new Error(`history cleanup preview failed: ${error.message}`);
  }

  const { error: deleteError } = await supabase
    .from('brand_mapping_history')
    .delete()
    .lt('changed_at', cutoffIso);

  if (deleteError) {
    throw new Error(`history cleanup failed: ${deleteError.message}`);
  }

  return { deletedRows: count ?? 0 };
};

const purgeHistoryFallback = async (): Promise<PurgeHistoryResult> => {
  const { count, error } = await supabase
    .from('brand_mapping_history')
    .select('history_id', { count: 'exact', head: true });

  if (error) {
    throw new Error(`history purge preview failed: ${error.message}`);
  }

  const { error: deleteError } = await supabase.from('brand_mapping_history').delete();

  if (deleteError) {
    throw new Error(`history purge failed: ${deleteError.message}`);
  }

  return { deletedRows: count ?? 0 };
};

const purgeAllDataFallback = async (): Promise<PurgeAllDataResult> => {
  const [
    { count: historyCount, error: historyError },
    { count: mappingCount, error: mappingError },
    { count: batchCount, error: batchError }
  ] = await Promise.all([
    supabase.from('brand_mapping_history').select('history_id', { count: 'exact', head: true }),
    supabase.from('brand_category_mappings').select('id', { count: 'exact', head: true }),
    supabase.from('import_batches').select('id', { count: 'exact', head: true })
  ]);

  if (historyError) {
    throw new Error(`history purge preview failed: ${historyError.message}`);
  }
  if (mappingError) {
    throw new Error(`mapping purge preview failed: ${mappingError.message}`);
  }
  if (batchError) {
    throw new Error(`batch purge preview failed: ${batchError.message}`);
  }

  const historyDeletion = await supabase.from('brand_mapping_history').delete();
  if (historyDeletion.error) {
    throw new Error(`history purge failed: ${historyDeletion.error.message}`);
  }

  const mappingDeletion = await supabase.from('brand_category_mappings').delete();
  if (mappingDeletion.error) {
    throw new Error(`mapping purge failed: ${mappingDeletion.error.message}`);
  }

  const batchDeletion = await supabase.from('import_batches').delete();
  if (batchDeletion.error) {
    throw new Error(`batch purge failed: ${batchDeletion.error.message}`);
  }

  return {
    deletedHistoryRows: historyCount ?? 0,
    deletedMappingRows: mappingCount ?? 0,
    deletedImportBatches: batchCount ?? 0
  };
};

const callRpcWithFallback = async <T>({
  rpcName,
  args,
  parser,
  fallback
}: RpcCallConfig<T>): Promise<T> => {
  const { data, error } = await supabase.rpc(rpcName, args ?? {});
  if (error) {
    if (isMissingRpcError(error)) {
      return fallback();
    }
    throw new Error(`[${rpcName}] ${error.message}`);
  }

  return parser(data);
};

export const mappingAdminToolsApi = {
  async fetchDatabaseStats(): Promise<MappingAdminStats> {
    return callRpcWithFallback({
      rpcName: RPC_NAMES.stats,
      parser: parseStatsPayload,
      fallback: fetchStatsFallback
    });
  },

  async cleanupHistory(retentionDays: number): Promise<CleanupHistoryResult> {
    const sanitizedRetention = Math.max(1, retentionDays);

    return callRpcWithFallback({
      rpcName: RPC_NAMES.cleanupHistory,
      args: { retention_days: sanitizedRetention },
      parser: payload => ({ deletedRows: parseIntegerResult(payload) }),
      fallback: () => cleanupHistoryFallback(sanitizedRetention)
    });
  },

  async purgeHistory(): Promise<PurgeHistoryResult> {
    return callRpcWithFallback({
      rpcName: RPC_NAMES.purgeHistory,
      parser: payload => ({ deletedRows: parseIntegerResult(payload) }),
      fallback: purgeHistoryFallback
    });
  },

  async purgeAllData(): Promise<PurgeAllDataResult> {
    return callRpcWithFallback({
      rpcName: RPC_NAMES.purgeAllData,
      parser: parsePurgeAllDataResult,
      fallback: purgeAllDataFallback
    });
  }
};
