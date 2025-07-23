// @ts-nocheck
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
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Eye
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

interface BrandMappingHistory {
  history_id: string;
  mapping_id: string;
  old_data: any;
  new_data: any;
  change_type: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_at: string;
  changed_by: string;
  batch_id?: string;
  reason: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

export const MappingHistoryTab: React.FC = () => {
  const [activeView, setActiveView] = useState<'batches' | 'changes'>('batches');
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [changes, setChanges] = useState<BrandMappingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>('all');
  
  const [stats, setStats] = useState({
    totalImports: 0,
    successfulImports: 0,
    totalLinesProcessed: 0,
    averageSuccessRate: 0,
    totalChanges: 0,
    recentChanges: 0
  });

  useEffect(() => {
    if (activeView === 'batches') {
      fetchImportBatches();
    } else {
      fetchMappingChanges();
    }
  }, [activeView, currentPage, itemsPerPage, searchTerm, statusFilter, changeTypeFilter]);

  const fetchImportBatches = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('import_batches')
        .select('*')
        .order('timestamp', { ascending: false });

      // Appliquer les filtres
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (searchTerm) {
        query = query.ilike('filename', `%${searchTerm}%`);
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data: batchesData, error } = await query;

      if (error) throw error;

      setBatches(batchesData || []);

      // Récupérer les informations des profils séparément
      if (batchesData && batchesData.length > 0) {
        const userIds = [...new Set(batchesData.map(batch => batch.user_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          // Enrichir les batches avec les informations des profils
          const enrichedBatches = batchesData.map(batch => ({
            ...batch,
            profiles: profilesData.find(profile => profile.id === batch.user_id)
          }));
          setBatches(enrichedBatches);
        }
      }

      // Calculer les statistiques pour les batches
      const { data: allBatches, error: statsError } = await supabase
        .from('import_batches')
        .select('*');

      if (!statsError && allBatches) {
        const totalImports = allBatches.length;
        const successfulImports = allBatches.filter(b => b.status === 'completed').length;
        const totalLinesProcessed = allBatches.reduce((sum, b) => sum + (b.processed_lines || 0), 0);
        const averageSuccessRate = allBatches.length > 0 
          ? allBatches.reduce((sum, b) => {
              const rate = b.total_lines > 0 ? (b.processed_lines / b.total_lines) * 100 : 0;
              return sum + rate;
            }, 0) / allBatches.length
          : 0;

        setStats(prev => ({
          ...prev,
          totalImports,
          successfulImports,
          totalLinesProcessed,
          averageSuccessRate
        }));
      }

    } catch (error) {
      console.error('Erreur chargement historique batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMappingChanges = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('brand_mapping_history')
        .select('*')
        .order('changed_at', { ascending: false });

      // Appliquer les filtres
      if (changeTypeFilter !== 'all') {
        query = query.eq('change_type', changeTypeFilter);
      }
      
      if (searchTerm) {
        query = query.or(`old_data->>marque.ilike.%${searchTerm}%,new_data->>marque.ilike.%${searchTerm}%`);
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data: changesData, error } = await query;

      if (error) throw error;

      setChanges(changesData || []);

      // Récupérer les informations des profils séparément
      if (changesData && changesData.length > 0) {
        const userIds = [...new Set(changesData.map(change => change.changed_by))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          // Enrichir les changements avec les informations des profils
          const enrichedChanges = changesData.map(change => ({
            ...change,
            profiles: profilesData.find(profile => profile.id === change.changed_by)
          }));
          setChanges(enrichedChanges);
        }
      }

      // Calculer les statistiques pour les changements
      const { data: allChanges, error: statsError } = await supabase
        .from('brand_mapping_history')
        .select('*');

      if (!statsError && allChanges) {
        const totalChanges = allChanges.length;
        const recentChanges = allChanges.filter(c => {
          const changeDate = new Date(c.changed_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return changeDate > weekAgo;
        }).length;

        setStats(prev => ({
          ...prev,
          totalChanges,
          recentChanges
        }));
      }

    } catch (error) {
      console.error('Erreur chargement historique changements:', error);
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

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'INSERT':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'UPDATE':
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'DELETE':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <History className="w-4 h-4 text-gray-600" />;
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'INSERT':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'UPDATE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELETE':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatUserName = (item: ImportBatch | BrandMappingHistory) => {
    if (item.profiles?.first_name && item.profiles?.last_name) {
      return `${item.profiles.first_name} ${item.profiles.last_name}`;
    }
    return item.profiles?.email || 'Utilisateur inconnu';
  };

  const calculateSuccessRate = (batch: ImportBatch) => {
    if (batch.total_lines === 0) return 0;
    return Math.round((batch.processed_lines / batch.total_lines) * 100);
  };

  const renderBatchesView = () => (
    <div className="space-y-6">
      {/* Filtres pour les batches */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom de fichier..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="completed">Terminé</option>
              <option value="failed">Échec</option>
              <option value="pending">En cours</option>
              <option value="rolled_back">Annulé</option>
            </select>

            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
            >
              <option value={10}>10 par page</option>
              <option value={20}>20 par page</option>
              <option value={50}>50 par page</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table des batches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5" />
            <span>Historique des imports ({batches.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cir-red"></div>
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun import trouvé</p>
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

  const renderChangesView = () => (
    <div className="space-y-6">
      {/* Filtres pour les changements */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par marque..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
              />
            </div>

            <select
              value={changeTypeFilter}
              onChange={(e) => setChangeTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
            >
              <option value="all">Tous les types</option>
              <option value="INSERT">Création</option>
              <option value="UPDATE">Modification</option>
              <option value="DELETE">Suppression</option>
            </select>

            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
            >
              <option value={10}>10 par page</option>
              <option value={20}>20 par page</option>
              <option value={50}>50 par page</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table des changements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>Historique des modifications ({changes.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cir-red"></div>
            </div>
          ) : changes.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune modification trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marque / CAT_FAB
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Raison
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {changes.map((change, index) => (
                    <motion.tr
                      key={change.history_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getChangeTypeIcon(change.change_type)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getChangeTypeColor(change.change_type)}`}>
                            {change.change_type === 'INSERT' ? 'Création' :
                             change.change_type === 'UPDATE' ? 'Modification' :
                             'Suppression'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">
                            {change.new_data?.marque || change.old_data?.marque || '-'}
                          </div>
                          <div className="text-gray-500">
                            {change.new_data?.cat_fab || change.old_data?.cat_fab || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {formatUserName(change)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {formatDate(change.changed_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 max-w-xs truncate block">
                          {change.reason}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
                Historique et Audit
              </h2>
              <p className="text-sm text-gray-600">
                Suivi complet des imports et modifications
              </p>
            </div>
          </div>
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
                <History className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-purple-600">{stats.totalChanges}</div>
                <div className="text-xs text-gray-600">Total modifications</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-orange-600">{stats.recentChanges}</div>
                <div className="text-xs text-gray-600">Cette semaine</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation entre les vues */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveView('batches')}
                className={`${
                  activeView === 'batches'
                    ? 'border-cir-red text-cir-red'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Imports Excel</span>
                <span className={`${
                  activeView === 'batches' ? 'bg-cir-red text-white' : 'bg-gray-100 text-gray-600'
                } inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`}>
                  {stats.totalImports}
                </span>
              </button>
              
              <button
                onClick={() => setActiveView('changes')}
                className={`${
                  activeView === 'changes'
                    ? 'border-cir-red text-cir-red'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
              >
                <History className="w-4 h-4" />
                <span>Modifications</span>
                <span className={`${
                  activeView === 'changes' ? 'bg-cir-red text-white' : 'bg-gray-100 text-gray-600'
                } inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`}>
                  {stats.totalChanges}
                </span>
              </button>
            </nav>
          </div>
        </CardContent>
      </Card>

      {/* Contenu selon la vue active */}
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeView === 'batches' ? renderBatchesView() : renderChangesView()}
      </motion.div>

      {/* Pagination */}
      {(batches.length > 0 || changes.length > 0) && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center space-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Précédent</span>
          </Button>
          
          <span className="text-sm text-gray-700">Page {currentPage}</span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={(activeView === 'batches' ? batches.length : changes.length) < itemsPerPage}
            className="flex items-center space-x-1"
          >
            <span>Suivant</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};