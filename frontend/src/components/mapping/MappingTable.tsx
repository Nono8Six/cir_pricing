import React from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Edit, Trash2 } from 'lucide-react';

interface BrandMapping {
  id: string;
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
  created_at: string;
  version: number;
  batch_id?: string;
  created_by: string;
  source_type: string;
}

interface MappingTableProps {
  mappings: BrandMapping[];
  loading: boolean;
  searchTerm: string;
  selectedSegment: string;
  selectedMarque: string;
  deleteLoading: string | null;
  onEdit: (mapping: BrandMapping) => void;
  onDelete: (mapping: BrandMapping) => void;
}

export const MappingTable: React.FC<MappingTableProps> = ({
  mappings,
  loading,
  searchTerm,
  selectedSegment,
  selectedMarque,
  deleteLoading,
  onEdit,
  onDelete
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cir-red"></div>
      </div>
    );
  }

  if (mappings.length === 0) {
    return (
      <div className="text-center py-12">
        <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">Aucun mapping trouvé</p>
        <p className="text-sm text-gray-400 mb-4">
          {searchTerm || selectedSegment !== 'all' || selectedMarque !== 'all' 
            ? 'Aucun résultat pour les filtres appliqués'
            : 'Utilisez l\'onglet Import Excel pour commencer'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
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
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Source
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {mappings.map((mapping, index) => (
            <motion.tr
              key={mapping.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {mapping.segment}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {mapping.marque}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {mapping.cat_fab}
              </td>
              <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                {mapping.cat_fab_l || '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                {mapping.strategiq === 1 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Oui
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Non
                  </span>
                )}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                {mapping.classif_cir}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  mapping.source_type === 'excel_upload' ? 'bg-blue-100 text-blue-800' :
                  mapping.source_type === 'manual_edit' ? 'bg-green-100 text-green-800' :
                  mapping.source_type === 'api_import' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {mapping.source_type === 'excel_upload' ? 'Excel' :
                   mapping.source_type === 'manual_edit' ? 'Manuel' :
                   mapping.source_type === 'api_import' ? 'API' :
                   'Initial'}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => onEdit(mapping)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(mapping)}
                    disabled={deleteLoading === mapping.id}
                    className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Supprimer"
                  >
                    {deleteLoading === mapping.id ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};