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

const callRpc = async <T>({ rpcName, args, parser }: RpcCallConfig<T>): Promise<T> => {
  const { data, error } = await supabase.rpc(rpcName, args ?? {});
  if (error) {
    throw new Error(`[${rpcName}] ${error.message}`);
  }

  return parser(data);
};

export const mappingAdminToolsApi = {
  async fetchDatabaseStats(): Promise<MappingAdminStats> {
    return callRpc({
      rpcName: RPC_NAMES.stats,
      parser: parseStatsPayload,
    });
  },

  async cleanupHistory(retentionDays: number): Promise<CleanupHistoryResult> {
    const sanitizedRetention = Math.max(1, retentionDays);

    return callRpc({
      rpcName: RPC_NAMES.cleanupHistory,
      args: { retention_days: sanitizedRetention },
      parser: payload => ({ deletedRows: parseIntegerResult(payload) }),
    });
  },

  async purgeHistory(): Promise<PurgeHistoryResult> {
    return callRpc({
      rpcName: RPC_NAMES.purgeHistory,
      parser: payload => ({ deletedRows: parseIntegerResult(payload) }),
    });
  },

  async purgeAllData(): Promise<PurgeAllDataResult> {
    return callRpc({
      rpcName: RPC_NAMES.purgeAllData,
      parser: parsePurgeAllDataResult,
    });
  }
};
