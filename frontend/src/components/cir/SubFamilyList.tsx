import React from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertCircle, Tag, Hash } from 'lucide-react';
import type { CirMegaFamily, CirFamily } from '../../utils/cirDataTransformer';

interface SubFamilyListProps {
  selectedMegaFamily: CirMegaFamily | null;
  selectedFamily: CirFamily | null;
}

export const SubFamilyList: React.FC<SubFamilyListProps> = ({
  selectedMegaFamily,
  selectedFamily
}) => {
  if (!selectedMegaFamily || !selectedFamily) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Sélectionnez une famille</p>
          <p className="text-xs text-gray-400 mt-1">pour voir les sous-familles associées</p>
        </div>
      </div>
    );
  }

  const subFamilies = selectedFamily.subFamilies;

  if (subFamilies.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-orange-300" />
          <p className="text-sm">Aucune sous-famille trouvée</p>
          <p className="text-xs text-gray-400 mt-1">
            pour la famille {selectedFamily.code}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <FileText className="w-4 h-4 mr-2 text-purple-600" />
          Sous-Familles ({subFamilies.length})
        </h3>
        <div className="text-xs text-gray-600 mt-1 space-y-1">
          <p>Méga famille {selectedMegaFamily.code}: {selectedMegaFamily.designation}</p>
          <p>Famille {selectedFamily.code}: {selectedFamily.designation}</p>
        </div>
      </div>
      
      <div className="p-2 space-y-2">
        {subFamilies.map((subFamily, index) => (
          <motion.div
            key={subFamily.code}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-sm font-bold text-purple-600">
                  {subFamily.code}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  {subFamily.designation}
                </h4>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Hash className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600">Code combiné:</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-800">
                      {subFamily.combinedCode}
                    </code>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Tag className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-600">Désignation complète:</span>
                      <p className="text-xs text-gray-800 mt-1 leading-relaxed">
                        {subFamily.combinedDesignation}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Hiérarchie complète */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {selectedMegaFamily.code}
                    </span>
                    <span>→</span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                      {selectedFamily.code}
                    </span>
                    <span>→</span>
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {subFamily.code}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};