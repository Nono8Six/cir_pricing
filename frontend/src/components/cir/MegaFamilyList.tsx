import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Folder } from 'lucide-react';
import { CirMegaFamily } from '../../utils/cirDataTransformer';

interface MegaFamilyListProps {
  megaFamilies: CirMegaFamily[];
  selectedMegaFamily: CirMegaFamily | null;
  onSelectMegaFamily: (megaFamily: CirMegaFamily) => void;
}

export const MegaFamilyList: React.FC<MegaFamilyListProps> = ({
  megaFamilies,
  selectedMegaFamily,
  onSelectMegaFamily
}) => {
  if (megaFamilies.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Folder className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Aucune méga famille trouvée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <Folder className="w-4 h-4 mr-2 text-blue-600" />
          Méga Familles ({megaFamilies.length})
        </h3>
      </div>
      
      <div className="p-2 space-y-1">
        {megaFamilies.map((megaFamily, index) => {
          const isSelected = selectedMegaFamily?.code === megaFamily.code;
          
          return (
            <motion.button
              key={megaFamily.code}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectMegaFamily(megaFamily)}
              className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                isSelected
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'hover:bg-blue-50 text-gray-700 hover:text-blue-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isSelected 
                        ? 'bg-blue-400 text-white' 
                        : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
                    }`}>
                      {megaFamily.code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isSelected ? 'text-white' : 'text-gray-900'
                      }`}>
                        {megaFamily.designation}
                      </p>
                      <p className={`text-xs truncate ${
                        isSelected ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {megaFamily.families.length} famille{megaFamily.families.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
                
                <ChevronRight className={`w-4 h-4 transition-transform ${
                  isSelected 
                    ? 'text-white transform rotate-90' 
                    : 'text-gray-400 group-hover:text-blue-500'
                }`} />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};