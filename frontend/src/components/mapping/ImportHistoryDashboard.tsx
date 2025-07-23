import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  History, 
  User, 
  Calendar, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  Clock,
  TrendingUp,
  Download
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/api';
import { formatDate } from '../../lib/utils';

interface ImportBatch {
  id: string;
  filename: string;
  user_id: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed' | 'rolled_back';
  total_lines: number;
  processed_lines: number;
  error_lines: number;
  warnings: string[];
  comment: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

interface ImportHistoryDashboardProps {
  onClose?: () => void;
}

export const ImportHistoryDashboard: React.FC<ImportHistoryDashboardProps> = ({ onClose }) => {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalImports: 0,
    successfulImports: 0,
    totalLinesProcessed: 0,
    averageSuccessRate: 0
  });

  useEffect(() => {
    fetchImportHistory();
  }, []);

  const fetchImportHistory = async () => {
    try {
      setLoading(true);
      
      // Récupérer l'historique des imports avec les profils utilisateurs
      const { data: batchesData, error } = await supabase
        .from('import_batches')
        .select(`
          *,
          profiles:users!import_batches_user_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;

      setBatches(batchesData || []);

      // Calculer les statistiques
      if (batchesData && batchesData.length > 0) {
        const totalImports = batchesData.length;
        const successfulImports = batchesData.filter(b => b.status === 'completed').length;
        const totalLinesProcessed = batchesData.reduce((sum, b) => sum + (b.processed_lines || 0), 0);
        const averageSuccessRate = batchesData.length > 0 
          ? batchesData.reduce((sum, b) => {
              const rate = b.total_lines > 0 ? (b.processed_lines / b.total_lines) * 100 : 0;
              return sum + rate;
            }, 0) / batchesData.length
          : 0;

        setStats({
          totalImports,
          successfulImports,
          totalLinesProcessed,
          averageSuccessRate
        });
      }

    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'failed':
        return 'Échec';
      case 'pending':
        return 'En cours';
      case 'rolled_back':
        return 'Annulé';
      default:
        return status;
    }
  };

  const formatUserName = (batch: ImportBatch) => {
    if (batch.profiles?.first_name && batch.profiles?.last_name) {
      return `${batch.profiles.first_name} ${batch.profiles.last_name}`;
    }
    return batch.profiles?.email || 'Utilisateur inconnu';
  };

  const calculateSuccessRate = (batch: ImportBatch) => {
    if (batch.total_lines === 0) return 0;
    return Math.round((batch.processed_lines / batch.total_lines) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'historique...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-500 rounded-xl shadow-lg">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Historique des Imports
              </h2>
              <p className="text-sm text-gray-600">
                Suivi des mises à jour de mappings
              </p>
            </div>
          </div>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          )}
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">{stats.totalImports}</div>
                <div className="text-xs text-gray-600">Total imports</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">{stats.successfulImports}</div>
                <div className="text-xs text-gray-600">Réussis</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-purple-600">
                  {stats.totalLinesProcessed.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">Lignes traitées</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-orange-600">
                  {stats.averageSuccessRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Taux moyen</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des imports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>Historique détaillé ({batches.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {batches.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun import effectué</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fichier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Résultats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taux de réussite
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commentaire
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {batches.map((batch, index) => (
                    <motion.tr
                      key={batch.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(batch.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(batch.status)}`}>
                            {getStatusLabel(batch.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {batch.filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {formatUserName(batch)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {formatDate(batch.timestamp)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>{batch.processed_lines} / {batch.total_lines}</div>
                          {batch.error_lines > 0 && (
                            <div className="text-xs text-red-600">
                              {batch.error_lines} erreurs
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                calculateSuccessRate(batch) >= 90 ? 'bg-green-500' :
                                calculateSuccessRate(batch) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${calculateSuccessRate(batch)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {calculateSuccessRate(batch)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 max-w-xs truncate block">
                          {batch.comment || '-'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};