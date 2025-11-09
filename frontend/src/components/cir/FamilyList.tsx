import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, FolderOpen, AlertCircle } from 'lucide-react';
import type { CirMegaFamily, CirFamily } from '../../utils/cirDataTransformer';

interface FamilyListProps {
  selectedMegaFamily: CirMegaFamily | null;
  selectedFamily: CirFamily | null;
  onSelectFamily: (family: CirFamily) => void;
}

export const FamilyList: React.FC<FamilyListProps> = ({
  selectedMegaFamily,
  selectedFamily,
  onSelectFamily
}) => {
  if (!selectedMegaFamily) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Sélectionnez une méga famille</p>
          <p className="text-xs text-gray-400 mt-1">pour voir les familles associées</p>
        </div>
      </div>
    );
  }

  const families = selectedMegaFamily.families;

  if (families.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-orange-300" />
          <p className="text-sm">Aucune famille trouvée</p>
          <p className="text-xs text-gray-400 mt-1">
            pour la méga famille {selectedMegaFamily.code}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <FolderOpen className="w-4 h-4 mr-2 text-green-600" />
          Familles ({families.length})
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Méga famille {selectedMegaFamily.code}: {selectedMegaFamily.designation}
        </p>
      </div>
      
      <div className="p-2 space-y-1">
        {families.map((family, index) => {
          const isSelected = selectedFamily?.code === family.code;
          
          return (
            <motion.button
              key={family.code}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectFamily(family)}
              className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                isSelected
                  ? 'bg-green-500 text-white shadow-md'
                  : 'hover:bg-green-50 text-gray-700 hover:text-green-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isSelected 
                        ? 'bg-green-400 text-white' 
                        : 'bg-green-100 text-green-600 group-hover:bg-green-200'
                    }`}>
                      {family.code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isSelected ? 'text-white' : 'text-gray-900'
                      }`}>
                        {family.designation}
                      </p>
                      <p className={`text-xs truncate ${
                        isSelected ? 'text-green-100' : 'text-gray-500'
                      }`}>
                        {family.subFamilies.length} sous-famille{family.subFamilies.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
                
                <ChevronRight className={`w-4 h-4 transition-transform ${
                  isSelected 
                    ? 'text-white transform rotate-90' 
                    : 'text-gray-400 group-hover:text-green-500'
                }`} />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};