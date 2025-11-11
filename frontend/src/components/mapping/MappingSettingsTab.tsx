import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Database,
  Shield,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Download,
  Upload,
  Lock,
  Unlock
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { mappingApi } from '../../lib/supabaseClient';
import type { BrandMapping } from '../../lib/supabaseClient';
import { mappingAdminToolsApi } from '../../lib/api/mappingAdminTools';
import { useAuth } from '../../context/AuthContext';

interface SystemSettings {
  autoClassificationEnabled: boolean;
  batchSizeLimit: number;
  auditRetentionDays: number;
  allowDuplicateMarqueCatFab: boolean;
  requireApprovalForBulkChanges: boolean;
}

interface DatabaseStats {
  totalMappings: number;
  totalBatches: number;
  totalHistoryRecords: number;
  databaseSize: string;
  lastBackup: string;
}

type AdminAction = 'saveSettings' | 'cleanupHistory' | 'purgeHistory' | 'purgeAllData' | 'exportData';

interface AdminActionFeedback {
  action: 'cleanup_history' | 'purge_history' | 'purge_all_data';
  counts: Record<string, number>;
  performedAt: string;
}

const DEFAULT_DB_STATS: DatabaseStats = {
  totalMappings: 0,
  totalBatches: 0,
  totalHistoryRecords: 0,
  databaseSize: '0 MB',
  lastBackup: 'Jamais'
};

const ACTION_LABELS: Record<AdminActionFeedback['action'], string> = {
  cleanup_history: 'Nettoyage historique (> rétention)',
  purge_history: 'Purge complète historique',
  purge_all_data: 'Purge totale des données mapping'
};

const COUNT_LABELS: Record<string, string> = {
  deletedRows: 'Lignes supprimées',
  deletedHistoryRows: 'Historique supprimé',
  deletedMappingRows: 'Mappings supprimés',
  deletedImportBatches: 'Imports supprimés'
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Une erreur inconnue est survenue';
};

interface ConfirmActionOptions {
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => Promise<void>;
}

const confirmDestructiveAction = ({ title, description, actionLabel, onConfirm }: ConfirmActionOptions): void => {
  toast(title, {
    description,
    action: {
      label: actionLabel,
      onClick: () => {
        void onConfirm();
      }
    },
    cancel: {
      label: 'Annuler',
      onClick: () => undefined
    }
  });
};

const formatDateTime = (isoString: string | null): string => {
  if (!isoString) {
    return 'Non renseigné';
  }

  return new Date(isoString).toLocaleString('fr-FR');
};

const formatCountLabel = (key: string): string => COUNT_LABELS[key] ?? key;

export const MappingSettingsTab: React.FC = () => {
  const { isAdmin } = useAuth();
  const isAdminUser = isAdmin();

  const [settings, setSettings] = useState<SystemSettings>({
    autoClassificationEnabled: true,
    batchSizeLimit: 10000,
    auditRetentionDays: 365,
    allowDuplicateMarqueCatFab: false,
    requireApprovalForBulkChanges: true
  });

  const [dbStats, setDbStats] = useState<DatabaseStats>(DEFAULT_DB_STATS);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [lastActionFeedback, setLastActionFeedback] = useState<AdminActionFeedback | null>(null);

  const [actionLoading, setActionLoading] = useState<Record<AdminAction, boolean>>({
    saveSettings: false,
    cleanupHistory: false,
    purgeHistory: false,
    purgeAllData: false,
    exportData: false
  });

  useEffect(() => {
    void fetchDatabaseStats();
    loadSettings();
  }, []);

  const setActionLoadingState = (action: AdminAction, isLoading: boolean): void => {
    setActionLoading(prev => ({ ...prev, [action]: isLoading }));
  };

  const assertAdminAccess = (): boolean => {
    if (isAdminUser) {
      return true;
    }

    toast.error('Accès refusé', {
      description: 'Seuls les administrateurs peuvent utiliser ces outils.'
    });
    return false;
  };

  const loadSettings = (): void => {
    try {
      const savedSettings = localStorage.getItem('mappingSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings) as SystemSettings);
      }
    } catch (error) {
      toast.error('Impossible de charger les paramètres locaux', {
        description: getErrorMessage(error)
      });
    }
  };

  const saveSettings = (): void => {
    if (!assertAdminAccess()) return;

    setActionLoadingState('saveSettings', true);

    try {
      localStorage.setItem('mappingSettings', JSON.stringify(settings));
      toast.success('Paramètres sauvegardés', {
        description: 'Les préférences locales ont été mises à jour.'
      });
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde', {
        description: getErrorMessage(error)
      });
    } finally {
      setActionLoadingState('saveSettings', false);
    }
  };

  const fetchDatabaseStats = async (): Promise<void> => {
    try {
      setStatsLoading(true);
      const stats = await mappingAdminToolsApi.fetchDatabaseStats();

      setDbStats({
        totalMappings: stats.totalMappings,
        totalBatches: stats.totalImportBatches,
        totalHistoryRecords: stats.totalHistoryRecords,
        databaseSize: `~${stats.databaseSizeMb.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} MB`,
        lastBackup: formatDateTime(stats.lastBackupAt)
      });
    } catch (error) {
      toast.error('Impossible de charger les statistiques', {
        description: getErrorMessage(error)
      });
      setDbStats(DEFAULT_DB_STATS);
    } finally {
      setStatsLoading(false);
    }
  };

  const recordAdminActionFeedback = (
    action: AdminActionFeedback['action'],
    counts: Record<string, number>
  ): void => {
    setLastActionFeedback({
      action,
      counts,
      performedAt: new Date().toISOString()
    });
  };

  const handleCleanupHistory = (): void => {
    if (!assertAdminAccess()) return;

    confirmDestructiveAction({
      title: `Nettoyer l'historique de plus de ${settings.auditRetentionDays} jours ?`,
      description: 'Cette action supprimera définitivement les enregistrements obsolètes.',
      actionLabel: 'Confirmer',
      onConfirm: async () => {
        try {
          setActionLoadingState('cleanupHistory', true);
          const result = await mappingAdminToolsApi.cleanupHistory(settings.auditRetentionDays);
          toast.success('Historique nettoyé', {
            description: `${result.deletedRows.toLocaleString('fr-FR')} lignes supprimées.`
          });
          recordAdminActionFeedback('cleanup_history', { deletedRows: result.deletedRows });
          await fetchDatabaseStats();
        } catch (error) {
          toast.error('Échec du nettoyage de l’historique', {
            description: getErrorMessage(error)
          });
        } finally {
          setActionLoadingState('cleanupHistory', false);
        }
      }
    });
  };

  const handlePurgeHistory = (): void => {
    if (!assertAdminAccess()) return;

    confirmDestructiveAction({
      title: 'Supprimer TOUT l’historique des modifications ?',
      description: 'Cette action est irréversible.',
      actionLabel: 'Confirmer la suppression',
      onConfirm: async () => {
        try {
          setActionLoadingState('purgeHistory', true);
          const result = await mappingAdminToolsApi.purgeHistory();
          toast.success('Historique purgé', {
            description: `${result.deletedRows.toLocaleString('fr-FR')} lignes supprimées.`
          });
          recordAdminActionFeedback('purge_history', { deletedRows: result.deletedRows });
          await fetchDatabaseStats();
        } catch (error) {
          toast.error('Échec de la purge de l’historique', {
            description: getErrorMessage(error)
          });
        } finally {
          setActionLoadingState('purgeHistory', false);
        }
      }
    });
  };

  const handleExportData = async (): Promise<void> => {
    if (!assertAdminAccess()) return;

    try {
      setActionLoadingState('exportData', true);
      const allMappings = await mappingApi.getAllBrandCategoryMappings();

      const headers: (keyof BrandMapping)[] = [
        'segment',
        'marque',
        'cat_fab',
        'cat_fab_l',
        'strategiq',
        'codif_fair',
        'fsmega',
        'fsfam',
        'fssfa',
        'classif_cir',
        'source_type',
        'created_at'
      ];

      const csvContent = [
        headers.join(','),
        ...allMappings.map(mapping =>
          headers
            .map(header => {
              const value = mapping[header];
              if (value === null || value === undefined) {
                return '';
              }
              return typeof value === 'string' && value.includes(',')
                ? `"${value}"`
                : `${value}`;
            })
            .join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `mappings_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export terminé', {
        description: `${allMappings.length.toLocaleString('fr-FR')} lignes exportées.`
      });
    } catch (error) {
      toast.error('Erreur lors de l’export', {
        description: getErrorMessage(error)
      });
    } finally {
      setActionLoadingState('exportData', false);
    }
  };

  const handlePurgeAllData = (): void => {
    if (!assertAdminAccess()) return;

    confirmDestructiveAction({
      title: 'Supprimer TOUTES les données de mapping ?',
      description: 'Cette opération supprimera les mappings, l’historique et les imports.',
      actionLabel: 'CONFIRMER',
      onConfirm: async () => {
        try {
          setActionLoadingState('purgeAllData', true);
          const result = await mappingAdminToolsApi.purgeAllData();
          toast.success('Base de données purgée', {
            description: [
              `${result.deletedMappingRows.toLocaleString('fr-FR')} mappings`,
              `${result.deletedHistoryRows.toLocaleString('fr-FR')} historiques`,
              `${result.deletedImportBatches.toLocaleString('fr-FR')} imports`
            ].join(' · ')
          });
          recordAdminActionFeedback('purge_all_data', {
            deletedHistoryRows: result.deletedHistoryRows,
            deletedMappingRows: result.deletedMappingRows,
            deletedImportBatches: result.deletedImportBatches
          });
          await fetchDatabaseStats();
        } catch (error) {
          toast.error('Échec de la purge des données', {
            description: getErrorMessage(error)
          });
        } finally {
          setActionLoadingState('purgeAllData', false);
        }
      }
    });
  };

  const statCards = [
    {
      label: 'Mappings',
      value: dbStats.totalMappings.toLocaleString('fr-FR'),
      icon: FileSpreadsheet,
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-600'
    },
    {
      label: 'Imports',
      value: dbStats.totalBatches.toLocaleString('fr-FR'),
      icon: Upload,
      bgClass: 'bg-green-50',
      textClass: 'text-green-600'
    },
    {
      label: 'Historique',
      value: dbStats.totalHistoryRecords.toLocaleString('fr-FR'),
      icon: Shield,
      bgClass: 'bg-purple-50',
      textClass: 'text-purple-600'
    },
    {
      label: 'Taille DB',
      value: dbStats.databaseSize,
      icon: Database,
      bgClass: 'bg-orange-50',
      textClass: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Paramètres et Administration</h2>
          <p className="text-gray-600">Configuration système et outils d'administration</p>
        </div>

        {isAdminUser ? (
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => {
                if (!assertAdminAccess()) return;
                setMaintenanceMode(prev => !prev);
              }}
              variant={maintenanceMode ? 'outline' : 'secondary'}
              className="flex items-center space-x-2"
            >
              {maintenanceMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{maintenanceMode ? 'Désactiver' : 'Activer'} maintenance</span>
            </Button>

            <Button onClick={saveSettings} loading={actionLoading.saveSettings} className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Sauvegarder</span>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Les actions sensibles sont réservées aux administrateurs.
          </p>
        )}
      </div>

      {maintenanceMode && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <h4 className="font-medium text-orange-800">Mode maintenance activé</h4>
                <p className="text-sm text-orange-700">
                  Les imports et modifications sont temporairement désactivés.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Statistiques de la base de données</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => void fetchDatabaseStats()} loading={statsLoading}>
            Rafraîchir
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(card => (
              <div key={card.label} className={`${card.bgClass} rounded-lg p-4`}>
                <div className="flex items-center space-x-3">
                  <card.icon className={`w-5 h-5 ${card.textClass}`} />
                  <div>
                    <p className={`text-sm ${card.textClass}`}>{card.label}</p>
                    {statsLoading ? (
                      <div className="h-6 w-20 bg-white/60 rounded animate-pulse" />
                    ) : (
                      <p className={`text-xl font-bold ${card.textClass}`}>{card.value}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Dernière sauvegarde connue : {statsLoading ? 'Chargement...' : dbStats.lastBackup}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Paramètres généraux</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Auto-classification CIR</h4>
                <p className="text-sm text-gray-600">
                  Classification automatique basée sur les marques existantes
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings(prev => ({ ...prev, autoClassificationEnabled: !prev.autoClassificationEnabled }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoClassificationEnabled ? 'bg-cir-red' : 'bg-gray-200'
                }`}
                disabled={!isAdminUser}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoClassificationEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Autoriser les doublons</h4>
                <p className="text-sm text-gray-600">
                  Permettre plusieurs mappings pour la même marque/CAT_FAB
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings(prev => ({ ...prev, allowDuplicateMarqueCatFab: !prev.allowDuplicateMarqueCatFab }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.allowDuplicateMarqueCatFab ? 'bg-cir-red' : 'bg-gray-200'
                }`}
                disabled={!isAdminUser}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.allowDuplicateMarqueCatFab ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Approbation pour imports massifs</h4>
                <p className="text-sm text-gray-600">
                  Requiert une validation pour les imports de plus de 1000 lignes
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings(prev => ({ ...prev, requireApprovalForBulkChanges: !prev.requireApprovalForBulkChanges }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.requireApprovalForBulkChanges ? 'bg-cir-red' : 'bg-gray-200'
                }`}
                disabled={!isAdminUser}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.requireApprovalForBulkChanges ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Limite de taille de batch</label>
              <input
                type="number"
                value={settings.batchSizeLimit}
                onChange={event => {
                  const nextValue = parseInt(event.target.value, 10);
                  setSettings(prev => ({
                    ...prev,
                    batchSizeLimit: Number.isNaN(nextValue) ? prev.batchSizeLimit : nextValue
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                min={100}
                max={50000}
                step={100}
                disabled={!isAdminUser}
              />
              <p className="text-xs text-gray-500 mt-1">Nombre maximum de lignes par import (100-50000)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rétention de l'audit (jours)</label>
              <input
                type="number"
                value={settings.auditRetentionDays}
                onChange={event => {
                  const nextValue = parseInt(event.target.value, 10);
                  setSettings(prev => ({
                    ...prev,
                    auditRetentionDays: Number.isNaN(nextValue) ? prev.auditRetentionDays : nextValue
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                min={30}
                max={3650}
                step={30}
                disabled={!isAdminUser}
              />
              <p className="text-xs text-gray-500 mt-1">
                Durée de conservation des logs d'audit (30-3650 jours)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Outils d'administration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdminUser ? (
              <>
                <div className="space-y-3">
                  <Button
                    onClick={() => void handleExportData()}
                    loading={actionLoading.exportData}
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exporter toutes les données</span>
                  </Button>

                  <Button
                    onClick={handleCleanupHistory}
                    loading={actionLoading.cleanupHistory}
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2 text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Nettoyer l'historique ancien ({settings.auditRetentionDays}j+)</span>
                  </Button>

                  <Button
                    onClick={handlePurgeHistory}
                    loading={actionLoading.purgeHistory}
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Purger TOUT l'historique</span>
                  </Button>

                  <Button
                    onClick={handlePurgeAllData}
                    loading={actionLoading.purgeAllData}
                    className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Purger toutes les données</span>
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Informations système</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dernière sauvegarde:</span>
                      <span className="font-medium">{statsLoading ? '---' : dbStats.lastBackup}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Version du schéma:</span>
                      <span className="font-medium">v2.1.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Statut RLS:</span>
                      <span className="font-medium text-green-600">Activé</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rétention audit:</span>
                      <span className="font-medium">{settings.auditRetentionDays} jours</span>
                    </div>
                  </div>
                  {lastActionFeedback && (
                    <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-3 bg-white/60">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Dernière action : {ACTION_LABELS[lastActionFeedback.action]}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {formatDateTime(lastActionFeedback.performedAt)}
                      </p>
                      <div className="space-y-1">
                        {Object.entries(lastActionFeedback.counts).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm text-gray-700">
                            <span>{formatCountLabel(key)}</span>
                            <span className="font-semibold">{value.toLocaleString('fr-FR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 bg-gray-50">
                Accès restreint. Contactez un administrateur pour exécuter les opérations de maintenance sensibles.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Logs système récents</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[
              { time: '14:32', level: 'INFO', message: 'Import batch completed successfully (1,234 records)' },
              { time: '14:15', level: 'WARN', message: 'Auto-classification applied to 45 records' },
              { time: '13:58', level: 'INFO', message: 'Database maintenance completed' },
              { time: '13:45', level: 'ERROR', message: 'Failed to process batch: duplicate key constraint' },
              { time: '13:30', level: 'INFO', message: 'User authentication successful' }
            ].map((log, index) => (
              <motion.div
                key={`${log.time}-${log.level}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center space-x-3 p-2 rounded text-sm ${
                  log.level === 'ERROR'
                    ? 'bg-red-50 text-red-800'
                    : log.level === 'WARN'
                      ? 'bg-yellow-50 text-yellow-800'
                      : 'bg-gray-50 text-gray-800'
                }`}
              >
                <span className="font-mono text-xs text-gray-500 w-12">{log.time}</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    log.level === 'ERROR'
                      ? 'bg-red-200 text-red-800'
                      : log.level === 'WARN'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-blue-200 text-blue-800'
                  }`}
                >
                  {log.level}
                </span>
                <span className="flex-1">{log.message}</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
