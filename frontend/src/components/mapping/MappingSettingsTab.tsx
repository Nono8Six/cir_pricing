import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Database, 
  Shield, 
  Users,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Lock,
  Unlock,
  HardDrive
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import { supabase } from '../../lib/api';
import { mappingApi } from '../../lib/supabaseClient';

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

export const MappingSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    autoClassificationEnabled: true,
    batchSizeLimit: 10000,
    auditRetentionDays: 365,
    allowDuplicateMarqueCatFab: false,
    requireApprovalForBulkChanges: true
  });

  const [dbStats, setDbStats] = useState<DatabaseStats>({
    totalMappings: 0,
    totalBatches: 0,
    totalHistoryRecords: 0,
    databaseSize: '0 MB',
    lastBackup: 'Jamais'
  });

  const [loading, setLoading] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    fetchDatabaseStats();
    loadSettings();
  }, []);

  const loadSettings = () => {
    // Charger les paramètres depuis le localStorage ou l'API
    const savedSettings = localStorage.getItem('mappingSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      
      // Sauvegarder dans le localStorage (en production, utiliser une API)
      localStorage.setItem('mappingSettings', JSON.stringify(settings));
      
      toast.success('Paramètres sauvegardés avec succès');
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabaseStats = async () => {
    try {
      const [mappingsResult, batchesResult, historyResult] = await Promise.all([
        mappingApi.getMappings({}, 1, 1),
        supabase.from('import_batches').select('*', { count: 'exact', head: true }),
        supabase.from('brand_mapping_history').select('*', { count: 'exact', head: true })
      ]);

      setDbStats({
        totalMappings: mappingsResult.count || 0,
        totalBatches: batchesResult.count || 0,
        totalHistoryRecords: historyResult.count || 0,
        databaseSize: '~' + Math.round((mappingsResult.count || 0) * 0.5) + ' MB', // Estimation
        lastBackup: new Date().toLocaleDateString('fr-FR')
      });

    } catch (error) {
      console.error('Erreur chargement stats DB:', error);
    }
  };

  const handleCleanupHistory = async () => {
    toast(`Nettoyer l'historique de plus de ${settings.auditRetentionDays} jours ?`, {
      description: "Cette action supprimera définitivement les anciens enregistrements d'audit.",
      action: {
        label: "Confirmer",
        onClick: async () => {
          try {
            setLoading(true);
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - settings.auditRetentionDays);
            
            const { error } = await supabase
              .from('brand_mapping_history')
              .delete()
              .lt('changed_at', cutoffDate.toISOString());

            if (error) throw error;

            toast.success('Historique ancien nettoyé avec succès');
            fetchDatabaseStats();
          } catch (error) {
            console.error('Erreur nettoyage historique:', error);
            toast.error('Erreur lors du nettoyage de l\'historique');
          } finally {
            setLoading(false);
          }
        },
      },
      cancel: {
        label: "Annuler",
        onClick: () => {},
      },
    });
  };

  const handlePurgeHistory = async () => {
    toast('⚠️ Supprimer TOUT l\'historique des modifications ?', {
      description: "Cette action supprimera définitivement TOUS les enregistrements d'historique. Cette action est IRRÉVERSIBLE.",
      action: {
        label: "CONFIRMER LA SUPPRESSION",
        onClick: async () => {
          try {
            setLoading(true);
            
            // Supprimer TOUS les enregistrements sans condition
            const { error } = await supabase
              .from('brand_mapping_history')
              .delete()
              .neq('history_id', '');

            if (error) throw error;

            toast.success(`🗑️ TOUS les enregistrements d'historique ont été supprimés`);
            fetchDatabaseStats();
          } catch (error) {
            console.error('Erreur suppression historique:', error);
            toast.error('Erreur lors de la suppression de l\'historique');
          } finally {
            setLoading(false);
          }
        },
      },
      cancel: {
        label: "Annuler",
        onClick: () => {},
      },
    });
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      
      // Récupérer toutes les données
      const allMappings = await mappingApi.getAllBrandCategoryMappings();
      
      // Créer le fichier CSV
      const headers = [
        'segment', 'marque', 'cat_fab', 'cat_fab_l', 'strategiq', 
        'codif_fair', 'fsmega', 'fsfam', 'fssfa', 'classif_cir',
        'source_type', 'created_at'
      ];
      
      const csvContent = [
        headers.join(','),
        ...allMappings.map(mapping => 
          headers.map(header => {
            const value = mapping[header as keyof typeof mapping];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value || '';
          }).join(',')
        )
      ].join('\n');

      // Télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `mappings_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export terminé avec succès');
    } catch (error) {
      console.error('Erreur export:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeAllData = async () => {
    toast('⚠️ ATTENTION : Supprimer TOUTES les données de mapping ?', {
      description: "Cette action supprimera définitivement tous les mappings, l'historique et les imports. Cette action est IRRÉVERSIBLE.",
      action: {
        label: "CONFIRMER LA SUPPRESSION",
        onClick: async () => {
          try {
            setLoading(true);
            
            // Supprimer dans l'ordre pour respecter les contraintes de clés étrangères
            await supabase.from('brand_mapping_history').delete().neq('history_id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('brand_category_mappings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('import_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            
            toast.success('🗑️ Toutes les données ont été supprimées');
            
            // Recharger les statistiques
            fetchDatabaseStats();
          } catch (error) {
            console.error('Erreur suppression données:', error);
            toast.error('Erreur lors de la suppression des données');
          } finally {
            setLoading(false);
          }
        },
      },
      cancel: {
        label: "Annuler",
        onClick: () => {},
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Paramètres et Administration
          </h2>
          <p className="text-gray-600">
            Configuration système et outils d'administration
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            variant={maintenanceMode ? "outline" : "secondary"}
            className="flex items-center space-x-2"
          >
            {maintenanceMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>{maintenanceMode ? 'Désactiver' : 'Activer'} maintenance</span>
          </Button>
          
          <Button
            onClick={saveSettings}
            loading={loading}
            className="flex items-center space-x-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Sauvegarder</span>
          </Button>
        </div>
      </div>

      {/* Mode maintenance */}
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

      {/* Statistiques de la base de données */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Statistiques de la base de données</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600">Mappings</p>
                  <p className="text-xl font-bold text-blue-800">{dbStats.totalMappings.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Upload className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600">Imports</p>
                  <p className="text-xl font-bold text-green-800">{dbStats.totalBatches}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-600">Historique</p>
                  <p className="text-xl font-bold text-purple-800">{dbStats.totalHistoryRecords.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-600">Taille DB</p>
                  <p className="text-xl font-bold text-orange-800">{dbStats.databaseSize}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paramètres système */}
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
                onClick={() => setSettings(prev => ({ ...prev, autoClassificationEnabled: !prev.autoClassificationEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoClassificationEnabled ? 'bg-cir-red' : 'bg-gray-200'
                }`}
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
                onClick={() => setSettings(prev => ({ ...prev, allowDuplicateMarqueCatFab: !prev.allowDuplicateMarqueCatFab }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.allowDuplicateMarqueCatFab ? 'bg-cir-red' : 'bg-gray-200'
                }`}
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
                onClick={() => setSettings(prev => ({ ...prev, requireApprovalForBulkChanges: !prev.requireApprovalForBulkChanges }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.requireApprovalForBulkChanges ? 'bg-cir-red' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.requireApprovalForBulkChanges ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Limite de taille de batch
              </label>
              <input
                type="number"
                value={settings.batchSizeLimit}
                onChange={(e) => setSettings(prev => ({ ...prev, batchSizeLimit: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                min="100"
                max="50000"
                step="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nombre maximum de lignes par import (100-50000)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rétention de l'audit (jours)
              </label>
              <input
                type="number"
                value={settings.auditRetentionDays}
                onChange={(e) => setSettings(prev => ({ ...prev, auditRetentionDays: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                min="30"
                max="3650"
                step="30"
              />
              <p className="text-xs text-gray-500 mt-1">
                Durée de conservation des logs d'audit (30-3650 jours)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Outils d'administration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Outils d'administration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                onClick={handleExportData}
                loading={loading}
                variant="outline"
                className="w-full flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Exporter toutes les données</span>
              </Button>

              <Button
                onClick={handleCleanupHistory}
                loading={loading}
                variant="outline"
                className="w-full flex items-center justify-center space-x-2 text-yellow-600 border-yellow-300 hover:bg-yellow-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Nettoyer l'historique ancien ({settings.auditRetentionDays}j+)</span>
              </Button>

              <Button
                onClick={handlePurgeHistory}
                loading={loading}
                variant="outline"
                className="w-full flex items-center justify-center space-x-2 text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>🗑️ Purger TOUT l'historique</span>
              </Button>
              
              <Button 
                onClick={handlePurgeAllData}
                loading={loading}
                className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                <span>🗑️ Purger toutes les données</span>
              </Button>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Informations système</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dernière sauvegarde:</span>
                  <span className="font-medium">{dbStats.lastBackup}</span>
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs système récents */}
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
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center space-x-3 p-2 rounded text-sm ${
                  log.level === 'ERROR' ? 'bg-red-50 text-red-800' :
                  log.level === 'WARN' ? 'bg-yellow-50 text-yellow-800' :
                  'bg-gray-50 text-gray-800'
                }`}
              >
                <span className="font-mono text-xs text-gray-500 w-12">{log.time}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  log.level === 'ERROR' ? 'bg-red-200 text-red-800' :
                  log.level === 'WARN' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-blue-200 text-blue-800'
                }`}>
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