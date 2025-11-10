import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Plus, Search, ListFilter as Filter, ChevronLeft, ChevronRight, Upload, History, Settings, BarChart3, Database } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { MappingModal } from '../components/mapping/MappingModal';
import { MappingTable } from '../components/mapping/MappingTable';
import { MappingHistoryTab } from '../components/mapping/MappingHistoryTab';
import { MappingAnalyticsTab } from '../components/mapping/MappingAnalyticsTab';
import { MappingSettingsTab } from '../components/mapping/MappingSettingsTab';
import { CirClassificationBrowser } from '../components/cir/CirClassificationBrowser';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { mappingApi, type BrandMapping } from '../lib/supabaseClient';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';

// BrandMapping interface imported from supabaseClient.ts

type TabType = 'mappings' | 'history' | 'analytics' | 'settings' | 'cir-browser';

export const Mapping: React.FC = () => {
  const { canManageMappings } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('mappings');

  // États pour les mappings
  const [mappings, setMappings] = useState<BrandMapping[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [selectedMarque, setSelectedMarque] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<BrandMapping | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [segments, setSegments] = useState<string[]>([]);
  const [marques, setMarques] = useState<string[]>([]);
  
  // États pour les filtres avancés
  const [selectedFsmega, setSelectedFsmega] = useState<string>('all');
  const [selectedFsfam, setSelectedFsfam] = useState<string>('all');
  const [selectedFssfa, setSelectedFssfa] = useState<string>('all');
  const [selectedStrategiq, setSelectedStrategiq] = useState<string>('all');
  const [fsmegas, setFsmegas] = useState<number[]>([]);
  const [fsfams, setFsfams] = useState<number[]>([]);
  const [fssfas, setFssfas] = useState<number[]>([]);
  
  // États de loading pour les filtres
  const [filtersLoading, setFiltersLoading] = useState(true);
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // États pour les statistiques globales
  const [totalSegments, setTotalSegments] = useState(0);
  const [totalMarques, setTotalMarques] = useState(0);
  const [totalStrategiques, setTotalStrategiques] = useState(0);

  // États pour le workflow d'upload (removed - dead code from deleted renderUploadTab)

  // Définition des onglets
  const tabs = [
    { id: 'mappings' as TabType, label: 'Mappings', icon: Database, count: totalCount },
    { id: 'cir-browser' as TabType, label: 'Classifications CIR', icon: Database },
    { id: 'history' as TabType, label: 'Historique', icon: History },
    { id: 'analytics' as TabType, label: 'Analyses', icon: BarChart3 },
    { id: 'settings' as TabType, label: 'Paramètres', icon: Settings }
  ];

  // Filtrer les tabs selon les permissions (seuls les admins voient history, analytics, settings)
  const visibleTabs = tabs.filter(tab => {
    // Admin-only tabs
    if (['history', 'analytics', 'settings'].includes(tab.id)) {
      return canManageMappings();
    }
    return true; // mappings et cir-browser visibles pour tous
  });

  // Protection contre l'accès programmatique aux tabs admin-only
  useEffect(() => {
    const adminOnlyTabs: TabType[] = ['history', 'analytics', 'settings'];
    if (adminOnlyTabs.includes(activeTab) && !canManageMappings()) {
      toast.error('Accès non autorisé', {
        description: 'Vous n\'avez pas les permissions pour accéder à cet onglet.'
      });
      setActiveTab('mappings');
    }
  }, [activeTab, canManageMappings]);

  // Helper function pour traiter les données avec auto-classification (removed - dead code)

  // Charger les options de filtre (une seule fois au début)
  const fetchFilterOptions = async () => {
    try {
      setFiltersLoading(true);
      const [
        allSegmentsData, 
        allMarquesData, 
        allFsmegasData, 
        allFsfamsData, 
        allFssfasData,
        totalSegmentsCount, 
        totalMarquesCount, 
        totalStrategiquesCount
      ] = await Promise.all([
        mappingApi.getAllUniqueSegments(),
        mappingApi.getAllUniqueMarques(),
        mappingApi.getAllUniqueFsmegas(),
        mappingApi.getAllUniqueFsfams(),
        mappingApi.getAllUniqueFssfas(),
        mappingApi.getTotalSegmentsCount(),
        mappingApi.getTotalMarquesCount(),
        mappingApi.getTotalStrategiquesCount()
      ]);

      setSegments(allSegmentsData);
      setMarques(allMarquesData);
      setFsmegas(allFsmegasData);
      setFsfams(allFsfamsData);
      setFssfas(allFssfasData);
      setTotalSegments(totalSegmentsCount);
      setTotalMarques(totalMarquesCount);
      setTotalStrategiques(totalStrategiquesCount);
      
    } catch (error) {
      console.error('Erreur chargement options de filtre:', error);
      toast.error('Erreur lors du chargement des filtres');
    } finally {
      setFiltersLoading(false);
    }
  };

  // Charger seulement les données des mappings (rapide)
  const fetchMappings = async () => {
    try {
      setTableLoading(true);
      const filters = {
        ...(selectedSegment !== 'all' && { segment: selectedSegment }),
        ...(selectedMarque !== 'all' && { marque: selectedMarque }),
        ...(debouncedSearchTerm && { cat_fab: debouncedSearchTerm }),
        ...(selectedFsmega !== 'all' && { fsmega: parseInt(selectedFsmega) }),
        ...(selectedFsfam !== 'all' && { fsfam: parseInt(selectedFsfam) }),
        ...(selectedFssfa !== 'all' && { fssfa: parseInt(selectedFssfa) }),
        ...(selectedStrategiq !== 'all' && { strategiq: parseInt(selectedStrategiq) })
      };
      
      const mappingsResult = await mappingApi.getMappings(filters, currentPage, itemsPerPage);

      setMappings(mappingsResult.data);
      setTotalCount(mappingsResult.count);
      
    } catch (error) {
      console.error('Erreur chargement mappings:', error);
      toast.error('Erreur lors du chargement des mappings');
    } finally {
      setTableLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSegment, selectedMarque, debouncedSearchTerm, itemsPerPage, selectedFsmega, selectedFsfam, selectedFssfa, selectedStrategiq]);

  // Charger les options de filtre une seule fois quand on ouvre l'onglet mappings
  useEffect(() => {
    if (activeTab === 'mappings' && segments.length === 0) {
      fetchFilterOptions();
    }
  }, [activeTab, segments.length]);

  // Charger seulement les données quand les filtres/page changent
  useEffect(() => {
    if (activeTab === 'mappings' && !filtersLoading) {
      fetchMappings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedSegment, selectedMarque, debouncedSearchTerm, currentPage, itemsPerPage, selectedFsmega, selectedFsfam, selectedFssfa, selectedStrategiq, filtersLoading]);

  // Gestionnaires pour le workflow d'upload (removed - dead code from deleted renderUploadTab)

  // Gestionnaires pour les mappings
  const handleCreateMapping = () => {
    setSelectedMapping(null);
    setIsModalOpen(true);
  };

  const handleViewMapping = (mapping: BrandMapping) => {
    setSelectedMapping(mapping);
    setViewOnly(true);
    setIsModalOpen(true);
  };

  const handleEditMapping = (mapping: BrandMapping) => {
    setSelectedMapping(mapping);
    setViewOnly(false);
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
            fetchMappings();
          } catch (error: unknown) {
            console.error('Erreur suppression mapping:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression';
            toast.error(errorMessage);
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
    setViewOnly(false);
    setSelectedMapping(null);
  };

  const handleModalSuccess = () => {
    fetchMappings();
  };

  // Calculs pour la pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  // Convertir les données pour SearchableSelect (mémorisé)
  const segmentOptions = useMemo(() => 
    segments.map(segment => ({
      value: segment,
      label: `Segment ${segment}`
    })), [segments]
  );

  const marqueOptions = useMemo(() => 
    marques.map(marque => ({
      value: marque,
      label: marque
    })), [marques]
  );

  const fsmegaOptions = useMemo(() => 
    fsmegas.map(fsmega => ({
      value: fsmega.toString(),
      label: fsmega.toString()
    })), [fsmegas]
  );

  const fsfamOptions = useMemo(() => 
    fsfams.map(fsfam => ({
      value: fsfam.toString(),
      label: fsfam.toString()
    })), [fsfams]
  );

  const fssfaOptions = useMemo(() => 
    fssfas.map(fssfa => ({
      value: fssfa.toString(),
      label: fssfa.toString()
    })), [fssfas]
  );

  const strategiqOptions = useMemo(() => [
    { value: '1', label: 'Stratégique uniquement' },
    { value: '0', label: 'Non stratégique uniquement' }
  ], []);

  

  // Rendu du contenu selon l'onglet actif
  const renderTabContent = () => {
    switch (activeTab) {
      case 'mappings':
        return renderMappingsTab();
      case 'cir-browser':
        return <CirClassificationBrowser />;
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SearchableSelect
                value={selectedSegment}
                onValueChange={setSelectedSegment}
                options={segmentOptions}
                placeholder="Tous les segments"
                allOptionLabel="Tous les segments"
                loading={filtersLoading}
              />

              <SearchableSelect
                value={selectedMarque}
                onValueChange={setSelectedMarque}
                options={marqueOptions}
                placeholder="Toutes les marques"
                allOptionLabel="Toutes les marques"
                loading={filtersLoading}
              />

              <SearchableSelect
                value={selectedStrategiq}
                onValueChange={setSelectedStrategiq}
                options={strategiqOptions}
                placeholder="Tous (stratégique)"
                allOptionLabel="Tous (stratégique)"
                loading={filtersLoading}
              />

              {/* Source filter removed per request */}
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
                  <SearchableSelect
                    value={selectedFsmega}
                    onValueChange={setSelectedFsmega}
                    options={fsmegaOptions.sort((a, b) => parseInt(a.value) - parseInt(b.value))}
                    placeholder="Toutes"
                    allOptionLabel="Toutes"
                    loading={filtersLoading}
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Famille (FSFAM)
                  </label>
                  <SearchableSelect
                    value={selectedFsfam}
                    onValueChange={setSelectedFsfam}
                    options={fsfamOptions.sort((a, b) => parseInt(a.value) - parseInt(b.value))}
                    placeholder="Toutes"
                    allOptionLabel="Toutes"
                    loading={filtersLoading}
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Sous Famille (FSSFA)
                  </label>
                  <SearchableSelect
                    value={selectedFssfa}
                    onValueChange={setSelectedFssfa}
                    options={fssfaOptions.sort((a, b) => parseInt(a.value) - parseInt(b.value))}
                    placeholder="Toutes"
                    allOptionLabel="Toutes"
                    loading={filtersLoading}
                    className="text-sm"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedSegment('all');
                      setSelectedMarque('all');
                      setSelectedFsmega('all');
                      setSelectedFsfam('all');
                      setSelectedFssfa('all');
                      setSelectedStrategiq('all');
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
            {canManageMappings() && (
              <Button
                onClick={handleCreateMapping}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau mapping</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <MappingTable
            mappings={mappings}
            loading={tableLoading}
            searchTerm={searchTerm}
            selectedSegment={selectedSegment}
            selectedMarque={selectedMarque}
            deleteLoading={deleteLoading}
            onView={handleViewMapping}
            onEdit={handleEditMapping}
            onDelete={handleDeleteMapping}
          />
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


  // Dead code removed: renderUploadTab was unused and loading state

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
        <div>
          <Link to="/imports/new" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <Upload className="w-4 h-4 mr-2" />
            Importer
          </Link>
        </div>
      </div>

      {/* Navigation par onglets */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {visibleTabs.map((tab) => {
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
        viewOnly={viewOnly}
      />
    </div>
  );
};
