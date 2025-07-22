import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Upload,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MappingModal } from '../components/mapping/MappingModal';
import { toast } from 'sonner';
import { mappingApi } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';

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
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [selectedMarque, setSelectedMarque] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<BrandMapping | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [segments, setSegments] = useState<string[]>([]);
  const [marques, setMarques] = useState<string[]>([]);
  
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

  // Charger les données
  const fetchData = async () => {
    try {
      setLoading(true);
      const filters = {
        ...(selectedSegment !== 'all' && { segment: selectedSegment }),
        ...(selectedMarque !== 'all' && { marque: selectedMarque }),
        ...(searchTerm && { cat_fab: searchTerm }),
        ...(selectedFsmega !== 'all' && { fsmega: parseInt(selectedFsmega) }),
        ...(selectedFsfam !== 'all' && { fsfam: parseInt(selectedFsfam) }),
        ...(selectedFssfa !== 'all' && { fssfa: parseInt(selectedFssfa) }),
        ...(selectedStrategiq !== 'all' && { strategiq: parseInt(selectedStrategiq) })
      };
      
      const [mappingsResult, segmentsData, marquesData, fsmegasData, fsfamsData, fssfasData] = await Promise.all([
        mappingApi.getMappings(filters, currentPage, itemsPerPage),
        mappingApi.getUniqueSegments(),
        mappingApi.getUniqueMarques(),
        mappingApi.getUniqueFsmegas(),
        mappingApi.getUniqueFsfams(),
        mappingApi.getUniqueFssfas()
      ]);
      
      setMappings(mappingsResult.data);
      setTotalCount(mappingsResult.count);
      setSegments(segmentsData);
      setMarques(marquesData);
      setFsmegas(fsmegasData);
      setFsfams(fsfamsData);
      setFssfas(fssfasData);
    } catch (error) {
      console.error('Erreur chargement mappings:', error);
      toast.error('Erreur lors du chargement des mappings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [selectedSegment, selectedMarque, searchTerm, itemsPerPage, selectedFsmega, selectedFsfam, selectedFssfa, selectedStrategiq]);

  useEffect(() => {
    fetchData();
  }, [selectedSegment, selectedMarque, searchTerm, currentPage, itemsPerPage, selectedFsmega, selectedFsfam, selectedFssfa, selectedStrategiq]);

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  // Calculer CLASSIF_CIR automatiquement
  const calculateClassifCir = (fsmega: number, fsfam: number, fssfa: number): string => {
    return `${fsmega} ${fsfam} ${fssfa}`;
  };

  // Parser le fichier Excel
  const parseExcelFile = (file: File): Promise<BrandMapping[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Chercher la sheet 'RequeteAs400'
          const sheetName = 'RequeteAs400';
          if (!workbook.SheetNames.includes(sheetName)) {
            reject(new Error(`Sheet '${sheetName}' non trouvée dans le fichier Excel`));
            return;
          }
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Vérifier qu'il y a des données
          if (jsonData.length < 2) {
            reject(new Error('Le fichier Excel ne contient pas assez de données'));
            return;
          }
          
          // Mapper les colonnes (row 0 = headers, row 1+ = data)
          const headers = jsonData[0] as string[];
          const mappedData: BrandMapping[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (!row || row.length === 0) continue;
            
            try {
              const fsmega = parseInt(row[6]) || 0;
              const fsfam = parseInt(row[7]) || 0;
              const fssfa = parseInt(row[8]) || 0;
              
              const mapping: Partial<BrandMapping> = {
                segment: String(row[0] || '').trim(),
                marque: String(row[1] || '').trim(),
                cat_fab: String(row[2] || '').trim(),
                cat_fab_l: String(row[3] || '').trim() || null,
                strategiq: parseInt(row[4]) || 0,
                codif_fair: String(row[5] || '').trim() || null,
                fsmega,
                fsfam,
                fssfa
              };
              
              // Validation des champs requis
              if (!mapping.segment || !mapping.marque || !mapping.cat_fab) {
                console.warn(`Ligne ${i + 1} ignorée: champs requis manquants`);
                continue;
              }
              
              mappedData.push(mapping as BrandMapping);
            } catch (error) {
              console.warn(`Erreur ligne ${i + 1}:`, error);
            }
          }
          
          resolve(mappedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erreur lecture fichier'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Upload et traitement du fichier Excel
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.xlsx')) {
      toast.error('Veuillez sélectionner un fichier Excel (.xlsx)');
      return;
    }
    
    setUploadLoading(true);
    
    try {
      // Parser le fichier
      const mappingsData = await parseExcelFile(file);
      
      if (mappingsData.length === 0) {
        toast.error('Aucune donnée valide trouvée dans le fichier');
        return;
      }
      
      // Batch upsert dans Supabase
      const result = await mappingApi.batchUpsertMappings(mappingsData);
      
      toast.success(`${result.length} mappings traités avec succès`);
      
      // Recharger les données
      fetchData();
      
      // Reset input
      event.target.value = '';
      
    } catch (error: any) {
      console.error('Erreur upload:', error);
      toast.error(error.message || 'Erreur lors du traitement du fichier');
    } finally {
      setUploadLoading(false);
    }
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
          <div className="relative">
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploadLoading}
            />
            <Button
              disabled={uploadLoading}
              className="flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>{uploadLoading ? 'Upload...' : 'Upload Excel'}</span>
            </Button>
          </div>
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
                <p className="text-xl font-bold text-gray-900">{segments.length}</p>
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
                <p className="text-xl font-bold text-gray-900">{marques.length}</p>
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
                <p className="text-xl font-bold text-gray-900">
                  {loading ? '...' : mappings.filter(m => m.strategiq === 1).length}
                </p>
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
              <select
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
              >
                <option value="all">Tous les segments</option>
                {segments.map(segment => (
                  <option key={segment} value={segment}>
                    Segment {segment}
                  </option>
                ))}
              </select>

              {/* Filtre par marque */}
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
                  <select
                    value={selectedFsmega}
                    onChange={(e) => setSelectedFsmega(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                  >
                    <option value="all">Toutes</option>
                    {fsmegas.sort((a, b) => a - b).map(fsmega => (
                      <option key={fsmega} value={fsmega}>
                        {fsmega}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtre FSFAM (Famille) */}
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
                      <option key={fsfam} value={fsfam}>
                        {fsfam}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtre FSSFA (Sous Famille) */}
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
                      <option key={fssfa} value={fssfa}>
                        {fssfa}
                      </option>
                    ))}
                  </select>
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

            {/* Filtre par segment */}
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
            >
              <option value="all">Tous les segments</option>
              {segments.map(segment => (
                <option key={segment} value={segment}>
                  Segment {segment}
                </option>
              ))}
            </select>

            {/* Filtre par marque */}
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

            {/* Reset filtres */}
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSelectedSegment('all');
                setSelectedMarque('all');
              }}
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Reset</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table des mappings */}
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
                {searchTerm || selectedSegment !== 'all' || selectedMarque !== 'all' ? 'Aucun mapping ne correspond aux critères' : 'Aucun mapping trouvé'}
              </p>
              <p className="text-sm text-gray-400 mb-4">
                Uploadez le fichier SEGMENTS TARIFAIRES.xlsx pour commencer
              </p>
              <div className="relative inline-block">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadLoading}
                />
                <Button variant="outline" disabled={uploadLoading}>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadLoading ? 'Upload...' : 'Upload Excel'}
                </Button>
              </div>
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