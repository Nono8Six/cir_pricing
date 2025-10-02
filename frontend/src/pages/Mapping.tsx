// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Plus, Search, CreditCard as Edit, Trash2, ListFilter as Filter, ChevronLeft, ChevronRight, Upload, History, Settings, ChartBar as BarChart3, Database } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MappingModal } from '../components/mapping/MappingModal';
import { ExcelUploadZone } from '../components/mapping/ExcelUploadZone';
import { ParseResultSummary } from '../components/mapping/ParseResultSummary';
import { MappingPreviewTable } from '../components/mapping/MappingPreviewTable';
import { MappingHistoryTab } from '../components/mapping/MappingHistoryTab';
import { MappingAnalyticsTab } from '../components/mapping/MappingAnalyticsTab';
import { MappingSettingsTab } from '../components/mapping/MappingSettingsTab';
import { CirClassificationBrowser } from '../components/cir/CirClassificationBrowser';
import { CirClassificationUploadTab } from '../components/cir/CirClassificationUploadTab';
import { toast } from 'sonner';
import { mappingApi } from '../lib/supabaseClient';
import { supabase } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import { ParseResult } from '../lib/schemas';
import { useAuth } from '../context/AuthContext';

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

type TabType = 'mappings' | 'upload' | 'history' | 'analytics' | 'settings' | 'cir-browser' | 'cir-upload';

export const Mapping: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('mappings');
  
  // États pour les mappings
  const [mappings, setMappings] = useState<BrandMapping[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [selectedMarque, setSelectedMarque] = useState<string>('all');
  const [segmentSearch, setSegmentSearch] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<BrandMapping | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [segments, setSegments] = useState<string[]>([]);
  const [marques, setMarques] = useState<string[]>([]);
  
  // États pour les filtres avancés
  const [selectedFsmega, setSelectedFsmega] = useState<string>('all');
  const [selectedFsfam, setSelectedFsfam] = useState<string>('all');
  const [selectedFssfa, setSelectedFssfa] = useState<string>('all');
  const [selectedStrategiq, setSelectedStrategiq] = useState<string>('all');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('all');
  const [fsmegas, setFsmegas] = useState<number[]>([]);
  const [fsfams, setFsfams] = useState<number[]>([]);
  const [fssfas, setFssfas] = useState<number[]>([]);
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // États pour les statistiques globales
  const [totalSegments, setTotalSegments] = useState(0);
  const [totalMarques, setTotalMarques] = useState(0);
  const [totalStrategiques, setTotalStrategiques] = useState(0);

  // États pour le workflow d'upload
  const [uploadPhase, setUploadPhase] = useState<'upload' | 'analyze' | 'preview' | 'apply'>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [existingMappingsForPreview, setExistingMappingsForPreview] = useState<BrandMapping[]>([]);
  const [applyLoading, setApplyLoading] = useState(false);
  const [finalDataToUpsert, setFinalDataToUpsert] = useState<BrandMapping[]>([]);

  // Définition des onglets
  const tabs = [
    { id: 'mappings' as TabType, label: 'Mappings', icon: Database, count: totalCount },
    { id: 'upload' as TabType, label: 'Import Excel', icon: Upload },
    { id: 'cir-browser' as TabType, label: 'Classifications CIR', icon: Database },
    { id: 'cir-upload' as TabType, label: 'Import Classifications', icon: Upload },
    { id: 'history' as TabType, label: 'Historique', icon: History },
    { id: 'analytics' as TabType, label: 'Analyses', icon: BarChart3 },
    { id: 'settings' as TabType, label: 'Paramètres', icon: Settings }
  ];

  // Helper function pour traiter les données avec auto-classification
  const processParsedData = (parsedData: BrandMapping[], existingMappings: BrandMapping[]) => {
    return parsedData.map(mapping => {
      if (!mapping.fsmega || !mapping.fsfam || !mapping.fssfa || 
          mapping.fsmega === 0 || mapping.fsfam === 0 || mapping.fssfa === 0) {
        
        const sameMarqueMappings = existingMappings.filter(m => 
          m.marque.toLowerCase() === mapping.marque.toLowerCase() && 
          m.fsmega && m.fsmega > 0
        );

        if (sameMarqueMappings.length > 0) {
          const fsmegaCounts = sameMarqueMappings.reduce((acc, m) => {
            acc[m.fsmega] = (acc[m.fsmega] || 0) + 1;
            return acc;
          }, {} as Record<number, number>);

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
  };

  // Charger les données des mappings
  const fetchData = async () => {
    try {
      setLoading(true);
      const filters = {
        ...(selectedSegment !== 'all' && { segment: selectedSegment }),
        ...(selectedMarque !== 'all' && { marque: selectedMarque }),
        ...(debouncedSearchTerm && { cat_fab: debouncedSearchTerm }),
        ...(selectedFsmega !== 'all' && { fsmega: parseInt(selectedFsmega) }),
        ...(selectedFsfam !== 'all' && { fsfam: parseInt(selectedFsfam) }),
        ...(selectedFssfa !== 'all' && { fssfa: parseInt(selectedFssfa) }),
        ...(selectedStrategiq !== 'all' && { strategiq: parseInt(selectedStrategiq) }),
        ...(selectedSourceType !== 'all' && { source_type: selectedSourceType })
      };
      
      const [
        mappingsResult, 
        allSegmentsData, 
        allMarquesData, 
        allFsmegasData, 
        allFsfamsData, 
        allFssfasData,
        totalSegmentsCount, 
        totalMarquesCount, 
        totalStrategiquesCount
      ] = await Promise.all([
        mappingApi.getMappings(filters, currentPage, itemsPerPage),
        mappingApi.getAllUniqueSegments(),
        mappingApi.getAllUniqueMarques(),
        mappingApi.getAllUniqueFsmegas(),
        mappingApi.getAllUniqueFsfams(),
        mappingApi.getAllUniqueFssfas(),
        mappingApi.getTotalSegmentsCount(),
        mappingApi.getTotalMarquesCount(),
        mappingApi.getTotalStrategiquesCount()
      ]);

      setMappings(mappingsResult.data);
      setTotalCount(mappingsResult.count);
      setSegments(allSegmentsData);
      setMarques(allMarquesData);
      setFsmegas(allFsmegasData);
      setFsfams(allFsfamsData);
      setFssfas(allFssfasData);
      setTotalSegments(totalSegmentsCount);
      setTotalMarques(totalMarquesCount);
      setTotalStrategiques(totalStrategiquesCount);
      
    } catch (error) {
      console.error('Erreur chargement mappings:', error);
      toast.error('Erreur lors du chargement des mappings');
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSegment, selectedMarque, debouncedSearchTerm, itemsPerPage, selectedFsmega, selectedFsfam, selectedFssfa, selectedStrategiq, selectedSourceType]);

  useEffect(() => {
    if (activeTab === 'mappings') {
      fetchData();
    }
  }, [activeTab, selectedSegment, selectedMarque, debouncedSearchTerm, currentPage, itemsPerPage, selectedFsmega, selectedFsfam, selectedFssfa, selectedStrategiq, selectedSourceType]);

  // Gestionnaires pour le workflow d'upload
  const handleParseComplete = (result: ParseResult, file: File) => {
    setParseResult(result);
    setUploadedFile(file);
    setUploadPhase('analyze');
  };

  const handleParseError = (error: string) => {
    toast.error(error);
  };

  const handleContinueToPreview = async () => {
    try {
      setLoading(true);
      const existingMappings = await mappingApi.getAllBrandCategoryMappings();
      setExistingMappingsForPreview(existingMappings);
      
      if (parseResult?.data) {
        const processedData = processParsedData(parseResult.data, existingMappings);
        setFinalDataToUpsert(processedData);
      }
      
      setUploadPhase('preview');
    } catch (error) {
      console.error('Erreur chargement mappings existants:', error);
      toast.error('Erreur lors du chargement des mappings existants');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryUpload = () => {
    setUploadPhase('upload');
    setParseResult(null);
    setUploadedFile(null);
    setExistingMappingsForPreview([]);
    setFinalDataToUpsert([]);
  };

  const handleApplyChanges = async () => {
    if (!finalDataToUpsert.length) return;

    setApplyLoading(true);

    try {
      const batchStats = {
        total_lines: parseResult?.totalLines || finalDataToUpsert.length,
        processed_lines: finalDataToUpsert.length,
        error_lines: parseResult?.skippedLines || 0,
        warnings: parseResult?.info || [],
        comment: 'Excel upload'
      };

      const batch = await mappingApi.createImportBatch(
        uploadedFile?.name || 'import.xlsx',
        user?.id || '',
        batchStats
      );

      await supabase.rpc('set_current_batch_id', { batch_uuid: batch.id });
      await supabase.rpc('set_change_reason', { reason: batch.id });

      const dataWithoutGeneratedColumns = finalDataToUpsert.map(mapping => {
        const { classif_cir, autoClassified, ...cleanMapping } = mapping;
        return {
          ...cleanMapping,
          created_by: user?.id,
          source_type: 'excel_upload',
          batch_id: batch.id
        };
      });

      const result = await mappingApi.batchUpsertMappings(dataWithoutGeneratedColumns);

      await supabase.rpc('clear_audit_context');

      toast.success(`${result.length} mappings traités avec succès`);
      
      // Réinitialiser le workflow
      setUploadPhase('upload');
      setParseResult(null);
      setUploadedFile(null);
      setExistingMappingsForPreview([]);
      setFinalDataToUpsert([]);
      
      // Retourner à l'onglet mappings et recharger
      setActiveTab('mappings');
      
    } catch (error: any) {
      console.error('Erreur application des changements:', error);
      toast.error(error.message || 'Erreur lors de l\'application des modifications');
    } finally {
      setApplyLoading(false);
    }
  };

  // Gestionnaires pour les mappings
  const handleCreateMapping = () => {
    setSelectedMapping(null);
    setIsModalOpen(true);
  };

  const handleEditMapping = (mapping: BrandMapping) => {
    setSelectedMapping(mapping);
    setIsModalOpen(true);
  };

  const handleDeleteMapping = async (mapping: BrandMapping) => {
    toast(`Supprimer le mapping "${mapping.marque} - ${mapping.cat_fab}" ?`, {
      description: "Cette action est irréversible.",
      action: {
        label: "Supprimer",
        onClick: async () => {
          try {
            setDeleteLoading(mapping.id);
            await mappingApi.deleteMapping(mapping.id);
            toast.success('Mapping supprimé avec succès');
            fetchData();
          } catch (error: any) {
            console.error('Erreur suppression mapping:', error);
            toast.error(error.message || 'Erreur lors de la suppression');
          } finally {
            setDeleteLoading(null);
          }
        },
      },
      cancel: {
        label: "Annuler",
        onClick: () => {},
      },
    });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMapping(null);
  };

  const handleModalSuccess = () => {
    fetchData();
  };

  // Calculs pour la pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  // Rendu du contenu selon l'onglet actif
  const renderTabContent = () => {
    switch (activeTab) {
      case 'mappings':
        return renderMappingsTab();
      case 'upload':
        return renderUploadTab();
      case 'cir-browser':
        return <CirClassificationBrowser />;
      case 'cir-upload':
        return <CirClassificationUploadTab />;
      case 'history':
        return <MappingHistoryTab />;
      case 'analytics':
        return <MappingAnalyticsTab />;
      case 'settings':
        return <MappingSettingsTab />;
      default:
        return renderMappingsTab();
    }
  };

  const renderMappingsTab = () => (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total mappings</p>
                <p className="text-xl font-bold text-gray-900">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Filter className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Segments</p>
                <p className="text-xl font-bold text-gray-900">{totalSegments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Filter className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Marques</p>
                <p className="text-xl font-bold text-gray-900">{totalMarques}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Search className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Stratégiques</p>
                <p className="text-xl font-bold text-gray-900">{totalStrategiques}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Première ligne : Recherche + Items per page */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par CAT_FAB..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                />
              </div>

              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
              >
                <option value={10}>10 par page</option>
                <option value={20}>20 par page</option>
                <option value={50}>50 par page</option>
                <option value={100}>100 par page</option>
              </select>
            </div>

            {/* Deuxième ligne : Filtres de base */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="relative">
                <input
                  type="text"
                  value={segmentSearch}
                  onChange={(e) => setSegmentSearch(e.target.value)}
                  placeholder="Rechercher un segment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-t-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                />
                <select
                  value={selectedSegment}
                  onChange={(e) => setSelectedSegment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-b-lg border-t-0 focus:ring-2 focus:ring-cir-red focus:border-transparent max-h-48 overflow-y-auto"
                  size={5}
                >
                  <option value="all">Tous les segments</option>
                  {segments
                    .filter(segment =>
                      segment.toLowerCase().includes(segmentSearch.toLowerCase())
                    )
                    .map(segment => (
                      <option key={segment} value={segment}>
                        {segment}
                      </option>
                    ))}
                </select>
              </div>

              <select
                value={selectedMarque}
                onChange={(e) => setSelectedMarque(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
              >
                <option value="all">Toutes les marques</option>
                {marques.map(marque => (
                  <option key={marque} value={marque}>
                    {marque}
                  </option>
                ))}
              </select>

              <select
                value={selectedStrategiq}
                onChange={(e) => setSelectedStrategiq(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
              >
                <option value="all">Tous (stratégique)</option>
                <option value="1">Stratégique uniquement</option>
                <option value="0">Non stratégique uniquement</option>
              </select>

              <select
                value={selectedSourceType}
                onChange={(e) => setSelectedSourceType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
              >
                <option value="all">Toutes les sources</option>
                <option value="excel_upload">Import Excel</option>
                <option value="manual_edit">Saisie manuelle</option>
                <option value="api_import">Import API</option>
                <option value="initial_load">Chargement initial</option>
              </select>
            </div>

            {/* Troisième ligne : Filtres CIR avancés */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filtres Classification CIR
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Méga Famille (FSMEGA)
                  </label>
                  <select
                    value={selectedFsmega}
                    onChange={(e) => setSelectedFsmega(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                  >
                    <option value="all">Toutes</option>
                    {fsmegas.sort((a, b) => a - b).map(fsmega => (
                      <option key={fsmega} value={fsmega.toString()}>
                        {fsmega}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Famille (FSFAM)
                  </label>
                  <select
                    value={selectedFsfam}
                    onChange={(e) => setSelectedFsfam(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                  >
                    <option value="all">Toutes</option>
                    {fsfams.sort((a, b) => a - b).map(fsfam => (
                      <option key={fsfam} value={fsfam.toString()}>
                        {fsfam}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Sous Famille (FSSFA)
                  </label>
                  <select
                    value={selectedFssfa}
                    onChange={(e) => setSelectedFssfa(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                  >
                    <option value="all">Toutes</option>
                    {fssfas.sort((a, b) => a - b).map(fssfa => (
                      <option key={fssfa} value={fssfa.toString()}>
                        {fssfa}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedSegment('all');
                      setSegmentSearch('');
                      setSelectedMarque('all');
                      setSelectedFsmega('all');
                      setSelectedFsfam('all');
                      setSelectedFssfa('all');
                      setSelectedStrategiq('all');
                      setSelectedSourceType('all');
                    }}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Filter className="w-4 h-4" />
                    <span>Reset</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table des mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5" />
              <span>Mappings Segments ({totalCount})</span>
            </CardTitle>
            <Button
              onClick={handleCreateMapping}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau mapping</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cir-red"></div>
            </div>
          ) : mappings.length === 0 ? (
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
          ) : (
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
                            onClick={() => handleEditMapping(mapping)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMapping(mapping)}
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
          )}
        </CardContent>
        
        {/* Pagination */}
        {totalCount > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Affichage de <span className="font-medium">{startItem}</span> à{' '}
                <span className="font-medium">{endItem}</span> sur{' '}
                <span className="font-medium">{totalCount}</span> résultats
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

  const renderUploadTab = () => (
    <div className="space-y-6">
      {uploadPhase === 'upload' && (
        <>
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Import de fichier Excel
            </h2>
            <p className="text-gray-600">
              Importez vos mappings depuis un fichier Excel SEGMENTS TARIFAIRES
            </p>
          </div>
          <ExcelUploadZone
            onParseComplete={handleParseComplete}
            onParseError={handleParseError}
          />
        </>
      )}

      {uploadPhase === 'analyze' && parseResult && uploadedFile && (
        <ParseResultSummary
          result={parseResult}
          filename={uploadedFile.name}
          onContinue={handleContinueToPreview}
          onRetry={handleRetryUpload}
        />
      )}

      {uploadPhase === 'preview' && parseResult && (
        <MappingPreviewTable
          parsedData={finalDataToUpsert}
          existingMappings={existingMappingsForPreview}
          onApplyChanges={handleApplyChanges}
          onRetry={handleRetryUpload}
          applyLoading={applyLoading}
        />
      )}
    </div>
  );

  if (loading && activeTab === 'mappings') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cir-red"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Mapping Segments CIR
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Gestion avancée des mappings entre familles fabricant et classifications CIR
          </p>
        </div>
      </div>

      {/* Navigation par onglets */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      isActive
                        ? 'border-cir-red text-cir-red'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={`${
                        isActive ? 'bg-cir-red text-white' : 'bg-gray-100 text-gray-600'
                      } inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </CardContent>
      </Card>

      {/* Contenu de l'onglet actif */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderTabContent()}
      </motion.div>

      {/* Modal de création/modification */}
      <MappingModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        mapping={selectedMapping}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};