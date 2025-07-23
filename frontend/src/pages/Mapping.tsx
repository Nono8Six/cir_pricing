import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MappingModal } from '../components/mapping/MappingModal';
import { ExcelUploadZone } from '../components/mapping/ExcelUploadZone';
import { ParseResultSummary } from '../components/mapping/ParseResultSummary';
import { toast } from 'sonner';
import { mappingApi } from '../lib/supabaseClient';
import { useDebounce } from '../hooks/useDebounce';
import { ParseResult } from '../lib/schemas';

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
}

export const Mapping: React.FC = () => {
  const [mappings, setMappings] = useState<BrandMapping[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [selectedMarque, setSelectedMarque] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<BrandMapping | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [segments, setSegments] = useState<string[]>([]);
  const [marques, setMarques] = useState<string[]>([]);
  
  // Search states for autocomplete
  const [segmentSearch, setSegmentSearch] = useState('');
  const [marqueSearch, setMarqueSearch] = useState('');
  const [fsmegaSearch, setFsmegaSearch] = useState('');
  const [fsfamSearch, setFsfamSearch] = useState('');
  const [fssfaSearch, setFssfaSearch] = useState('');
  
  // Dropdown open states
  const [segmentDropdownOpen, setSegmentDropdownOpen] = useState(false);
  const [marqueDropdownOpen, setMarqueDropdownOpen] = useState(false);
  const [fsmegaDropdownOpen, setFsmegaDropdownOpen] = useState(false);
  const [fsfamDropdownOpen, setFsfamDropdownOpen] = useState(false);
  const [fssfaDropdownOpen, setFssfaDropdownOpen] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Advanced CIR filters
  const [selectedFsmega, setSelectedFsmega] = useState<string>('all');
  const [selectedFsfam, setSelectedFsfam] = useState<string>('all');
  const [selectedFssfa, setSelectedFssfa] = useState<string>('all');
  const [selectedStrategiq, setSelectedStrategiq] = useState<string>('all');
  const [fsmegas, setFsmegas] = useState<number[]>([]);
  const [fsfams, setFsfams] = useState<number[]>([]);
  const [fssfas, setFssfas] = useState<number[]>([]);

  // Total counts for dashboard (unfiltered)
  const [totalSegments, setTotalSegments] = useState(0);
  const [totalMarques, setTotalMarques] = useState(0);
  const [totalStrategiques, setTotalStrategiques] = useState(0);

  // États pour le nouveau workflow d'upload
  const [uploadPhase, setUploadPhase] = useState<'upload' | 'analyze' | 'preview' | 'apply'>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Charger les données
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
        ...(selectedStrategiq !== 'all' && { strategiq: parseInt(selectedStrategiq) })
      };
      
      const [mappingsResult, allSegmentsData, allMarquesData, allFsmegasData, allFsfamsData, allFssfasData, totalSegmentsCount, totalMarquesCount, totalStrategiquesCount] = await Promise.all([
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

        // Set total counts for dashboard (real database totals)
        setTotalSegments(totalSegmentsCount);
        setTotalMarques(totalMarquesCount);
        setTotalStrategiques(totalStrategiquesCount);
      } catch (error) {
        console.error('❌ Error in fetchData:', error);
        console.error('Erreur chargement mappings:', error);
        toast.error('Erreur lors du chargement des mappings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [selectedSegment, selectedMarque, debouncedSearchTerm, itemsPerPage, selectedFsmega, selectedFsfam, selectedFssfa, selectedStrategiq]);

  useEffect(() => {
    setSegmentSearch(selectedSegment === 'all' ? '' : selectedSegment);
  }, [selectedSegment]);

  useEffect(() => {
    setMarqueSearch(selectedMarque === 'all' ? '' : selectedMarque);
  }, [selectedMarque]);

  useEffect(() => {
    fetchData();
  }, [selectedSegment, selectedMarque, debouncedSearchTerm, currentPage, itemsPerPage, selectedFsmega, selectedFsfam, selectedFssfa, selectedStrategiq]);

  // Filter functions for autocomplete
  const getFilteredSegments = () => {
    if (!segmentSearch) return segments;
    return segments.filter(segment =>
      segment.toLowerCase().includes(segmentSearch.toLowerCase())
    );
  };

  const getFilteredMarques = () => {
    if (!marqueSearch) return marques;
    return marques.filter(marque =>
      marque.toLowerCase().includes(marqueSearch.toLowerCase())
    );
  };

  const getFilteredFsmegas = () => {
    if (!fsmegaSearch) return fsmegas;
    return fsmegas.filter(fsmega =>
      fsmega.toString().includes(fsmegaSearch)
    );
  };

  const getFilteredFsfams = () => {
    if (!fsfamSearch) return fsfams;
    return fsfams.filter(fsfam =>
      fsfam.toString().includes(fsfamSearch)
    );
  };

  const getFilteredFssfas = () => {
    if (!fssfaSearch) return fssfas;
    return fssfas.filter(fssfa =>
      fssfa.toString().includes(fssfaSearch)
    );
  };

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  // Gestionnaires pour le nouveau workflow
  const handleParseComplete = (result: ParseResult, file: File) => {
    setParseResult(result);
    setUploadedFile(file);
    setUploadPhase('analyze');
  };

  const handleParseError = (error: string) => {
    toast.error(error);
  };

  const handleContinueToPreview = () => {
    setUploadPhase('preview');
  };

  const handleRetryUpload = () => {
    setUploadPhase('upload');
    setParseResult(null);
    setUploadedFile(null);
  };

  // Ouvrir le modal pour créer un mapping
  const handleCreateMapping = () => {
    setSelectedMapping(null);
    setIsModalOpen(true);
  };

  // Ouvrir le modal pour modifier un mapping
  const handleEditMapping = (mapping: BrandMapping) => {
    setSelectedMapping(mapping);
    setIsModalOpen(true);
  };

  // Supprimer un mapping
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

  // Fermer le modal
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMapping(null);
  };

  const handleModalSuccess = () => {
    fetchData();
  };

  if (loading) {
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
            Gestion des mappings entre familles fabricant et classifications CIR
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleCreateMapping}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau mapping</span>
          </Button>
        </div>
      </div>

      {/* Nouveau workflow d'upload en phases */}
      {uploadPhase !== 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5" />
              <span>Import Excel - Phase {uploadPhase === 'analyze' ? '1' : uploadPhase === 'preview' ? '2' : '3'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploadPhase === 'analyze' && parseResult && uploadedFile && (
              <ParseResultSummary
                result={parseResult}
                filename={uploadedFile.name}
                onContinue={handleContinueToPreview}
                onRetry={handleRetryUpload}
              />
            )}
            {uploadPhase === 'preview' && (
              <div className="text-center py-8">
                <p className="text-gray-500">Phase Preview - En cours de développement</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Première ligne : Recherche + Items per page */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Recherche par CAT_FAB */}
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

              {/* Items per page selector */}
              <div>
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
            </div>

            {/* Deuxième ligne : Filtres de base */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Filtre par segment */}
              <div className="relative">
                <input
                  type="text"
                  value={segmentSearch}
                  onChange={(e) => {
                    setSegmentSearch(e.target.value);
                    setSegmentDropdownOpen(true);
                  }}
                  onFocus={() => setSegmentDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setSegmentDropdownOpen(false), 200)}
                  placeholder="Rechercher un segment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                />
                {segmentDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div
                      onClick={() => {
                        setSelectedSegment('all');
                        setSegmentSearch('');
                        setSegmentDropdownOpen(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b"
                    >
                      Tous les segments
                    </div>
                    {getFilteredSegments().map(segment => (
                      <div
                        key={segment}
                        onClick={() => {
                          setSelectedSegment(segment);
                          setSegmentSearch(segment);
                          setSegmentDropdownOpen(false);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        {segment}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Filtre par marque */}
              <div className="relative">
                <input
                  type="text"
                  value={marqueSearch}
                  onChange={(e) => {
                    setMarqueSearch(e.target.value);
                    setMarqueDropdownOpen(true);
                  }}
                  onFocus={() => setMarqueDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setMarqueDropdownOpen(false), 200)}
                  placeholder="Rechercher une marque..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                />
                {marqueDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div
                      onClick={() => {
                        setSelectedMarque('all');
                        setMarqueSearch('');
                        setMarqueDropdownOpen(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b"
                    >
                      Toutes les marques
                    </div>
                    {getFilteredMarques().map(marque => (
                      <div
                        key={marque}
                        onClick={() => {
                          setSelectedMarque(marque);
                          setMarqueSearch(marque);
                          setMarqueDropdownOpen(false);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        {marque}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Filtre stratégique */}
              <select
                value={selectedStrategiq}
                onChange={(e) => setSelectedStrategiq(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
              >
                <option value="all">Tous (stratégique)</option>
                <option value="1">Stratégique uniquement</option>
                <option value="0">Non stratégique uniquement</option>
              </select>
            </div>

            {/* Troisième ligne : Filtres CIR avancés */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filtres Classification CIR
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Filtre FSMEGA (Méga Famille) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Méga Famille (FSMEGA)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fsmegaSearch}
                      onChange={(e) => {
                        setFsmegaSearch(e.target.value);
                        setFsmegaDropdownOpen(true);
                      }}
                      onFocus={() => setFsmegaDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setFsmegaDropdownOpen(false), 200)}
                      placeholder="Rechercher..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                    />
                    {fsmegaDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div
                          onClick={() => {
                            setSelectedFsmega('all');
                            setFsmegaSearch('');
                            setFsmegaDropdownOpen(false);
                          }}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b"
                        >
                          Toutes
                        </div>
                        {getFilteredFsmegas().sort((a, b) => a - b).map(fsmega => (
                          <div
                            key={fsmega}
                            onClick={() => {
                              setSelectedFsmega(fsmega.toString());
                              setFsmegaSearch(fsmega.toString());
                              setFsmegaDropdownOpen(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            {fsmega}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Filtre FSFAM (Famille) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Famille (FSFAM)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fsfamSearch}
                      onChange={(e) => {
                        setFsfamSearch(e.target.value);
                        setFsfamDropdownOpen(true);
                      }}
                      onFocus={() => setFsfamDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setFsfamDropdownOpen(false), 200)}
                      placeholder="Rechercher..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                    />
                    {fsfamDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div
                          onClick={() => {
                            setSelectedFsfam('all');
                            setFsfamSearch('');
                            setFsfamDropdownOpen(false);
                          }}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b"
                        >
                          Toutes
                        </div>
                        {getFilteredFsfams().sort((a, b) => a - b).map(fsfam => (
                          <div
                            key={fsfam}
                            onClick={() => {
                              setSelectedFsfam(fsfam.toString());
                              setFsfamSearch(fsfam.toString());
                              setFsfamDropdownOpen(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            {fsfam}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Filtre FSSFA (Sous Famille) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Sous Famille (FSSFA)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fssfaSearch}
                      onChange={(e) => {
                        setFssfaSearch(e.target.value);
                        setFssfaDropdownOpen(true);
                      }}
                      onFocus={() => setFssfaDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setFssfaDropdownOpen(false), 200)}
                      placeholder="Rechercher..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                    />
                    {fssfaDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div
                          onClick={() => {
                            setSelectedFssfa('all');
                            setFssfaSearch('');
                            setFssfaDropdownOpen(false);
                          }}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b"
                        >
                          Toutes
                        </div>
                        {getFilteredFssfas().sort((a, b) => a - b).map(fssfa => (
                          <div
                            key={fssfa}
                            onClick={() => {
                              setSelectedFssfa(fssfa.toString());
                              setFssfaSearch(fssfa.toString());
                              setFssfaDropdownOpen(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            {fssfa}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reset filtres */}
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
                      setSegmentSearch('');
                      setMarqueSearch('');
                      setFsmegaSearch('');
                      setFsfamSearch('');
                      setFssfaSearch('');
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
      {uploadPhase === 'upload' && (
        <>
          {/* Zone d'upload */}
          <ExcelUploadZone
            onParseComplete={handleParseComplete}
            onError={handleParseError}
            loading={loading}
          />
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5" />
            <span>Mappings Segments ({totalCount})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {mappings.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">
                Aucun mapping trouvé
              </p>
              <p className="text-sm text-gray-400 mb-4">
                Uploadez le fichier SEGMENTS TARIFAIRES.xlsx pour commencer
              </p>
              <ExcelUploadZone
                onParseComplete={handleParseComplete}
                onError={handleParseError}
                loading={loading}
              />
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

      {/* Modal de création/modification */}
      <MappingModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        mapping={selectedMapping}
        onSuccess={handleModalSuccess}
      />

      {/* 
        Futur : Gemma IA pour parse tarifs fournisseurs (headers 'Tarif','Remise', dates, remises catégories).
        Intégration prévue :
        - Parse automatique des fichiers tarifs avec headers variables
        - Classification automatique des références produits via ce mapping
        - Gestion des milliers de fournisseurs avec formats hétérogènes
        - Pricing adaptatif basé sur les classifications CIR
      */}
    </div>
  );
};