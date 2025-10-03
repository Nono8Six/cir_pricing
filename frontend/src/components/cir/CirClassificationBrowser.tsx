import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, RefreshCw, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { MegaFamilyList } from './MegaFamilyList';
import { FamilyList } from './FamilyList';
import { SubFamilyList } from './SubFamilyList';
import { cirClassificationApi } from '../../lib/supabaseClient';
import { 
  transformCirClassificationsToHierarchy, 
  getHierarchyStats,
  CirMegaFamily, 
  CirFamily 
} from '../../utils/cirDataTransformer';
import { toast } from 'sonner';

export const CirClassificationBrowser: React.FC = () => {
  const [hierarchy, setHierarchy] = useState<CirMegaFamily[]>([]);
  const [selectedMegaFamily, setSelectedMegaFamily] = useState<CirMegaFamily | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<CirFamily | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMegaFamilies: 0,
    totalFamilies: 0,
    totalSubFamilies: 0,
    totalClassifications: 0
  });

  useEffect(() => {
    loadClassifications();
  }, []);

  const loadClassifications = async () => {
    try {
      setLoading(true);
      const classifications = await cirClassificationApi.getAllClassifications();
      
      if (classifications.length === 0) {
        toast.info('Aucune classification CIR trouvée. Importez d\'abord vos données.');
        setHierarchy([]);
        setStats({
          totalMegaFamilies: 0,
          totalFamilies: 0,
          totalSubFamilies: 0,
          totalClassifications: 0
        });
        return;
      }

      const hierarchyData = transformCirClassificationsToHierarchy(classifications);
      const hierarchyStats = getHierarchyStats(hierarchyData);
      
      setHierarchy(hierarchyData);
      setStats(hierarchyStats);
      
      toast.success(`${hierarchyStats.totalClassifications} classifications chargées`);
    } catch (error) {
      console.error('Erreur chargement classifications:', error);
      toast.error('Erreur lors du chargement des classifications');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMegaFamily = (megaFamily: CirMegaFamily) => {
    setSelectedMegaFamily(megaFamily);
    setSelectedFamily(null); // Reset family selection
  };

  const handleSelectFamily = (family: CirFamily) => {
    setSelectedFamily(family);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cir-red mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des classifications CIR...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Classifications CIR
              </h2>
              <p className="text-sm text-gray-600">
                Navigation hiérarchique des familles de produits
              </p>
            </div>
          </div>
          
          <Button
            onClick={loadClassifications}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualiser</span>
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">{stats.totalMegaFamilies}</div>
                <div className="text-xs text-gray-600">Méga Familles</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">{stats.totalFamilies}</div>
                <div className="text-xs text-gray-600">Familles</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-purple-600">{stats.totalSubFamilies}</div>
                <div className="text-xs text-gray-600">Sous-Familles</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Database className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-orange-600">{stats.totalClassifications}</div>
                <div className="text-xs text-gray-600">Classifications</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation en trois colonnes */}
      {hierarchy.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucune classification CIR
            </h3>
            <p className="text-gray-600 mb-4">
              Importez vos données de classification pour commencer à naviguer dans la hiérarchie.
            </p>
            <p className="text-sm text-gray-500">
              Utilisez l'onglet "Import Excel" pour charger vos classifications.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Colonne 1: Méga Familles */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="h-full">
              <MegaFamilyList
                megaFamilies={hierarchy}
                selectedMegaFamily={selectedMegaFamily}
                onSelectMegaFamily={handleSelectMegaFamily}
              />
            </Card>
          </motion.div>

          {/* Colonne 2: Familles */}
          <motion.div
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="h-full">
              <FamilyList
                selectedMegaFamily={selectedMegaFamily}
                selectedFamily={selectedFamily}
                onSelectFamily={handleSelectFamily}
              />
            </Card>
          </motion.div>

          {/* Colonne 3: Sous-Familles */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="h-full">
              <SubFamilyList
                selectedMegaFamily={selectedMegaFamily}
                selectedFamily={selectedFamily}
              />
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
};