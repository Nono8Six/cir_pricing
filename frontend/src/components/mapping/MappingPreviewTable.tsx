import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  FileSpreadsheet, 
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

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
}

interface MappingPreviewTableProps {
  parsedData: BrandMapping[];
  existingMappings: BrandMapping[];
}

export const MappingPreviewTable: React.FC<MappingPreviewTableProps> = ({
  parsedData,
  existingMappings
}) => {
  // Analyser les changements
  const changes = useMemo(() => {
    const result: MappingChange[] = [];
    
    // Créer un index des mappings existants par marque + cat_fab
    const existingIndex = new Map<string, BrandMapping>();
    existingMappings.forEach(mapping => {
      const key = `${mapping.marque}|${mapping.cat_fab}`;
      existingIndex.set(key, mapping);
    });

    // Analyser chaque ligne parsée
    parsedData.forEach(parsedMapping => {
      const key = `${parsedMapping.marque}|${parsedMapping.cat_fab}`;
      const existing = existingIndex.get(key);

      if (!existing) {
        // Nouveau mapping
        result.push({
          type: 'new',
          data: parsedMapping
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
            changes: changedFields
          });
        }
      }
    });

    return result;
  }, [parsedData, existingMappings]);

  const newCount = changes.filter(c => c.type === 'new').length;
  const updateCount = changes.filter(c => c.type === 'update').length;

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
      return (
        <span className="text-gray-900">
          {formatValue(change.data[field as keyof BrandMapping])}
        </span>
      );
    }

    const isChanged = change.changes?.includes(field);
    const oldValue = change.existing?.[field as keyof BrandMapping];
    const newValue = change.data[field as keyof BrandMapping];

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
          <span className="text-red-600 line-through">
            {formatValue(oldValue)}
          </span>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <span className="text-green-600 font-medium">
            {formatValue(newValue)}
          </span>
        </div>
      </div>
    );
  };

  if (changes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune modification détectée
          </h3>
          <p className="text-gray-600">
            Toutes les données du fichier correspondent exactement aux mappings existants.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Résumé des changements */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <FileSpreadsheet className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{changes.length}</p>
            <p className="text-xs text-gray-600">Total changements</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{newCount}</p>
            <p className="text-xs text-gray-600">Nouveaux mappings</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Edit className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{updateCount}</p>
            <p className="text-xs text-gray-600">Mises à jour</p>
          </CardContent>
        </Card>
      </div>

      {/* Table des changements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span>Aperçu des modifications ({changes.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Segment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marque
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CAT_FAB
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stratégique
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Classification CIR
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {changes.map((change, index) => {
                  const Icon = getChangeIcon(change.type);
                  return (
                    <motion.tr
                      key={`${change.data.marque}-${change.data.cat_fab}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-4 h-4 ${getChangeColor(change.type)}`} />
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getChangeBadgeColor(change.type)}`}>
                            {change.type === 'new' ? 'Nouveau' : 'Mise à jour'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {renderFieldComparison('segment', change)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className="font-medium text-gray-900">
                          {change.data.marque}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className="font-medium text-gray-900">
                          {change.data.cat_fab}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm max-w-xs">
                        {renderFieldComparison('cat_fab_l', change)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {renderFieldComparison('strategiq', change)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-mono">
                        <div className="space-y-1">
                          <div>
                            {renderFieldComparison('fsmega', change)} {' '}
                            {renderFieldComparison('fsfam', change)} {' '}
                            {renderFieldComparison('fssfa', change)}
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
      </Card>
    </div>
  );
};