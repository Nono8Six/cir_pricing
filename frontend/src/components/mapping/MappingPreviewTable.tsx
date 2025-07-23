import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  FileSpreadsheet, 
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Database,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface BrandMapping {
  id?: string;
  segment: string;
  marque: string;
  cat_fab: string;
  cat_fab_l?: string;
  strategiq: number;
  codif_fair?: string;
  fsmega: number;
  fsfam: number;
  fssfa: number;
  classif_cir?: string;
}

interface MappingChange {
  type: 'new' | 'update';
  data: BrandMapping;
  existing?: BrandMapping;
  changes?: string[];
  autoClassified?: boolean;
}

interface MappingPreviewTableProps {
  parsedData: BrandMapping[];
  existingMappings: BrandMapping[];
  onApplyChanges: () => void;
  onRetry: () => void;
  applyLoading: boolean;
}

export const MappingPreviewTable: React.FC<MappingPreviewTableProps> = ({
  parsedData,
  existingMappings,
  onApplyChanges,
  onRetry,
  applyLoading
}) => {
  // États de pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Auto-classification CIR intelligente
  const processedData = useMemo(() => {
    return parsedData.map(mapping => {
      // Si FSMEGA, FSFAM, FSSFA sont vides ou invalides
      if (!mapping.fsmega || !mapping.fsfam || !mapping.fssfa || 
          mapping.fsmega === 0 || mapping.fsfam === 0 || mapping.fssfa === 0) {
        
        // Chercher d'autres lignes avec la même marque dans les données existantes
        const sameMarqueMappings = existingMappings.filter(m => 
          m.marque.toLowerCase() === mapping.marque.toLowerCase() && 
          m.fsmega && m.fsmega > 0
        );

        if (sameMarqueMappings.length > 0) {
          // Compter les occurrences de chaque FSMEGA
          const fsmegaCounts = sameMarqueMappings.reduce((acc, m) => {
            acc[m.fsmega] = (acc[m.fsmega] || 0) + 1;
            return acc;
          }, {} as Record<number, number>);

          // Trouver le FSMEGA le plus fréquent
          const mostFrequentFsmega = Object.entries(fsmegaCounts)
            .sort(([,a], [,b]) => b - a)[0];

          if (mostFrequentFsmega) {
            return {
              ...mapping,
              fsmega: parseInt(mostFrequentFsmega[0]),
              fsfam: 99,
              fssfa: 99,
              autoClassified: true
            };
          }
        }

        // Valeurs par défaut si aucune correspondance trouvée
        return {
          ...mapping,
          fsmega: mapping.fsmega || 1,
          fsfam: mapping.fsfam || 99,
          fssfa: mapping.fssfa || 99,
          autoClassified: !mapping.fsmega || !mapping.fsfam || !mapping.fssfa
        };
      }

      return mapping;
    });
  }, [parsedData, existingMappings]);

  // Analyser les changements avec les données traitées
  const changes = useMemo(() => {
    const result: MappingChange[] = [];
    
    // Créer un index des mappings existants par marque + cat_fab
    const existingIndex = new Map<string, BrandMapping>();
    existingMappings.forEach(mapping => {
      const key = `${mapping.marque}|${mapping.cat_fab}`;
      existingIndex.set(key, mapping);
    });

    // Analyser chaque ligne traitée
    processedData.forEach(parsedMapping => {
      const key = `${parsedMapping.marque}|${parsedMapping.cat_fab}`;
      const existing = existingIndex.get(key);

      if (!existing) {
        // Nouveau mapping
        result.push({
          type: 'new',
          data: parsedMapping,
          autoClassified: parsedMapping.autoClassified
        });
      } else {
        // Vérifier les changements
        const changedFields: string[] = [];
        
        // Comparer tous les champs pertinents
        const fieldsToCompare = [
          'segment', 'cat_fab_l', 'strategiq', 'codif_fair', 
          'fsmega', 'fsfam', 'fssfa'
        ];

        fieldsToCompare.forEach(field => {
          const existingValue = existing[field as keyof BrandMapping];
          const parsedValue = parsedMapping[field as keyof BrandMapping];
          
          // Normaliser les valeurs pour la comparaison
          const normalizeValue = (val: any) => {
            if (val === null || val === undefined || val === '') return null;
            return val;
          };

          if (normalizeValue(existingValue) !== normalizeValue(parsedValue)) {
            changedFields.push(field);
          }
        });

        if (changedFields.length > 0) {
          result.push({
            type: 'update',
            data: parsedMapping,
            existing,
            changes: changedFields,
            autoClassified: parsedMapping.autoClassified
          });
        }
      }
    });

    return result;
  }, [processedData, existingMappings]);

  const newCount = changes.filter(c => c.type === 'new').length;
  const updateCount = changes.filter(c => c.type === 'update').length;
  const autoClassifiedCount = changes.filter(c => c.autoClassified).length;

  // Pagination des changements
  const totalPages = Math.ceil(changes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedChanges = changes.slice(startIndex, endIndex);
  const startItem = startIndex + 1;
  const endItem = Math.min(endIndex, changes.length);

  // Reset page when items per page changes
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const getChangeIcon = (type: 'new' | 'update') => {
    return type === 'new' ? Plus : Edit;
  };

  const getChangeColor = (type: 'new' | 'update') => {
    return type === 'new' ? 'text-green-600' : 'text-blue-600';
  };

  const getChangeBadgeColor = (type: 'new' | 'update') => {
    return type === 'new' 
      ? 'bg-green-50 text-green-700 border-green-200' 
      : 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  };

  const renderFieldComparison = (field: string, change: MappingChange) => {
    if (change.type === 'new') {
      const value = change.data[field as keyof BrandMapping];
      const isAutoClassified = change.autoClassified && ['fsmega', 'fsfam', 'fssfa'].includes(field);
      
      return (
        <div className="flex items-center space-x-2">
          <span className={`${isAutoClassified ? 'text-purple-600 font-medium' : 'text-gray-900'}`}>
            {formatValue(value)}
          </span>
          {isAutoClassified && (
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-purple-500" />
              <span className="text-xs text-purple-600 font-medium">Auto</span>
            </div>
          )}
        </div>
      );
    }

    const isChanged = change.changes?.includes(field);
    const oldValue = change.existing?.[field as keyof BrandMapping];
    const newValue = change.data[field as keyof BrandMapping];
    const isAutoClassified = change.autoClassified && ['fsmega', 'fsfam', 'fssfa'].includes(field);

    if (!isChanged) {
      return (
        <span className="text-gray-600">
          {formatValue(newValue)}
        </span>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-red-600 line-through bg-red-50 px-2 py-1 rounded">
            {formatValue(oldValue)}
          </span>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <div className="flex items-center space-x-2">
            <span className={`font-medium px-2 py-1 rounded ${
              isAutoClassified 
                ? 'text-purple-600 bg-purple-50' 
                : 'text-green-600 bg-green-50'
            }`}>
              {formatValue(newValue)}
            </span>
            {isAutoClassified && (
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3 text-purple-500" />
                <span className="text-xs text-purple-600 font-medium">Auto</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (changes.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-800 mb-2">
            ✨ Aucune modification détectée
          </h3>
          <p className="text-green-700">
            Toutes les données du fichier correspondent exactement aux mappings existants.
          </p>
          <div className="mt-4 p-3 bg-green-100 rounded-lg">
            <p className="text-sm text-green-600">
              Votre base de données est déjà à jour ! 🎉
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions en haut */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{changes.length}</span> modifications détectées
          </div>
          <div className="text-sm text-gray-500">
            ({newCount} nouveaux, {updateCount} mises à jour)
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={onRetry}
            disabled={applyLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={onApplyChanges}
            loading={applyLoading}
            className="min-w-[160px]"
          >
            Appliquer les modifications
          </Button>
        </div>
      </div>

      {/* Header avec statistiques améliorées */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Aperçu des modifications
              </h2>
              <p className="text-sm text-gray-600">
                Comparaison avec la base de données existante
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{changes.length}</div>
            <div className="text-sm text-gray-600">changements détectés</div>
          </div>
        </div>

        {/* Statistiques détaillées */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Plus className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">{newCount}</div>
                <div className="text-xs text-gray-600">Nouveaux mappings</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Edit className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">{updateCount}</div>
                <div className="text-xs text-gray-600">Mises à jour</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-purple-600">{autoClassifiedCount}</div>
                <div className="text-xs text-gray-600">Auto-classifiés</div>
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
                  {Math.round((changes.length / processedData.length) * 100)}%
                </div>
                <div className="text-xs text-gray-600">Taux de changement</div>
              </div>
            </div>
          </div>
        </div>

        {/* Légende auto-classification */}
        {autoClassifiedCount > 0 && (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-800 mb-1">
                  🤖 Classification CIR Automatique
                </h4>
                <p className="text-sm text-purple-700">
                  <strong>{autoClassifiedCount} mappings</strong> ont été automatiquement classifiés en analysant 
                  les marques existantes. Le système a trouvé le FSMEGA le plus fréquent pour chaque marque 
                  et appliqué FSFAM=99, FSSFA=99 par défaut.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table des changements améliorée */}
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span>Détail des modifications ({changes.length})</span>
            </CardTitle>
            
            {/* Contrôles de pagination en haut */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Lignes par page:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-cir-red focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              
              <div className="text-sm text-gray-600">
                {startItem}-{endItem} sur {changes.length}
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <span className="text-sm text-gray-600 px-2">
                  {currentPage} / {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Segment
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Marque
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    CAT_FAB
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Stratégique
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Classification CIR
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedChanges.map((change, index) => {
                  const Icon = getChangeIcon(change.type);
                  return (
                    <motion.tr
                      key={`${change.data.marque}-${change.data.cat_fab}-${startIndex + index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`hover:bg-gray-50 transition-colors ${
                        change.autoClassified ? 'bg-purple-25' : ''
                      }`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-4 h-4 ${getChangeColor(change.type)}`} />
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getChangeBadgeColor(change.type)}`}>
                              {change.type === 'new' ? '✨ Nouveau' : '🔄 Mise à jour'}
                            </span>
                            {change.autoClassified && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                <Zap className="w-3 h-3 mr-1" />
                                Auto-classifié
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {renderFieldComparison('segment', change)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className="font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded">
                          {change.data.marque}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className="font-medium text-gray-900 bg-blue-50 px-2 py-1 rounded">
                          {change.data.cat_fab}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm max-w-xs">
                        <div className="truncate">
                          {renderFieldComparison('cat_fab_l', change)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {renderFieldComparison('strategiq', change)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="font-mono bg-gray-50 px-3 py-2 rounded-lg border">
                          <div className="flex items-center space-x-2">
                            <div className="grid grid-cols-3 gap-1 text-center">
                              <div className="text-xs text-gray-500">MEGA</div>
                              <div className="text-xs text-gray-500">FAM</div>
                              <div className="text-xs text-gray-500">SFA</div>
                              <div>{renderFieldComparison('fsmega', change)}</div>
                              <div>{renderFieldComparison('fsfam', change)}</div>
                              <div>{renderFieldComparison('fssfa', change)}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
        
        {/* Pagination en bas */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Affichage de <span className="font-medium">{startItem}</span> à{' '}
                <span className="font-medium">{endItem}</span> sur{' '}
                <span className="font-medium">{changes.length}</span> modifications
              </div>
              
              <div className="flex items-center space-x-2">
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
                
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-700">Page</span>
                  <span className="font-medium text-sm">{currentPage}</span>
                  <span className="text-sm text-gray-700">sur</span>
                  <span className="font-medium text-sm">{totalPages}</span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center space-x-1"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};