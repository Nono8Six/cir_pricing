import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileSpreadsheet } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { toast } from 'sonner';
import { mappingApi } from '../../lib/supabaseClient';

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

interface MappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapping?: BrandMapping | null;
  onSuccess: () => void;
}

export const MappingModal: React.FC<MappingModalProps> = ({
  isOpen,
  onClose,
  mapping,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BrandMapping>({
    segment: '',
    marque: '',
    cat_fab: '',
    cat_fab_l: '',
    strategiq: 0,
    codif_fair: '',
    fsmega: 1,
    fsfam: 99,
    fssfa: 99,
    classif_cir: ''
  });

  // Calculer CLASSIF_CIR automatiquement
  const calculateClassifCir = (fsmega: number, fsfam: number, fssfa: number): string => {
    return `${fsmega} ${fsfam} ${fssfa}`;
  };

  // Initialiser le formulaire avec les données du mapping
  useEffect(() => {
    if (mapping) {
      setFormData({
        segment: mapping.segment,
        marque: mapping.marque,
        cat_fab: mapping.cat_fab,
        cat_fab_l: mapping.cat_fab_l || '',
        strategiq: mapping.strategiq,
        codif_fair: mapping.codif_fair || '',
        fsmega: mapping.fsmega,
        fsfam: mapping.fsfam,
        fssfa: mapping.fssfa,
        classif_cir: mapping.classif_cir || calculateClassifCir(mapping.fsmega, mapping.fsfam, mapping.fssfa)
      });
    } else {
      setFormData({
        segment: '',
        marque: '',
        cat_fab: '',
        cat_fab_l: '',
        strategiq: 0,
        codif_fair: '',
        fsmega: 1,
        fsfam: 99,
        fssfa: 99,
        classif_cir: '1 99 99'
      });
    }
  }, [mapping, isOpen]);

  // Mettre à jour CLASSIF_CIR quand les valeurs changent
  useEffect(() => {
    const newClassifCir = calculateClassifCir(formData.fsmega, formData.fsfam, formData.fssfa);
    if (formData.classif_cir !== newClassifCir) {
      setFormData(prev => ({
        ...prev,
        classif_cir: newClassifCir
      }));
    }
  }, [formData.fsmega, formData.fsfam, formData.fssfa]);

  const handleInputChange = (field: keyof BrandMapping, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.segment.trim()) {
      toast.error('Le segment est requis');
      return false;
    }

    if (!formData.marque.trim()) {
      toast.error('La marque est requise');
      return false;
    }

    if (!formData.cat_fab.trim()) {
      toast.error('La catégorie fabricant est requise');
      return false;
    }

    if (formData.fsmega < 1 || formData.fsmega > 999) {
      toast.error('FSMEGA doit être entre 1 et 999');
      return false;
    }

    if (formData.fsfam < 1 || formData.fsfam > 999) {
      toast.error('FSFAM doit être entre 1 et 999');
      return false;
    }

    if (formData.fssfa < 1 || formData.fssfa > 999) {
      toast.error('FSSFA doit être entre 1 et 999');
      return false;
    }

    if (![0, 1].includes(formData.strategiq)) {
      toast.error('Stratégique doit être 0 ou 1');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const mappingData = {
        ...formData,
        // Nettoyer les champs vides
        cat_fab_l: formData.cat_fab_l?.trim() || null,
        codif_fair: formData.codif_fair?.trim() || null,
        segment: formData.segment.trim(),
        marque: formData.marque.trim(),
        cat_fab: formData.cat_fab.trim()
      };

      // Supprimer classif_cir car c'est une colonne générée par la DB
      delete mappingData.classif_cir;

      if (mapping?.id) {
        // Modification
        await mappingApi.updateMapping(mapping.id, mappingData);
        toast.success('Mapping modifié avec succès');
      } else {
        // Création
        await mappingApi.createMapping(mappingData);
        toast.success('Mapping créé avec succès');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur sauvegarde mapping:', error);
      const message = error.message || 'Erreur lors de la sauvegarde';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black bg-opacity-50"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] mx-4 overflow-hidden"
        >
          <Card className="shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {mapping?.id ? 'Modifier le mapping' : 'Nouveau mapping'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informations de base */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Segment *
                    </label>
                    <input
                      type="text"
                      value={formData.segment}
                      onChange={(e) => handleInputChange('segment', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                      placeholder="007"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marque *
                    </label>
                    <input
                      type="text"
                      value={formData.marque}
                      onChange={(e) => handleInputChange('marque', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                      placeholder="SKF"
                      required
                    />
                  </div>
                </div>

                {/* Catégorie fabricant */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catégorie Fabricant *
                    </label>
                    <input
                      type="text"
                      value={formData.cat_fab}
                      onChange={(e) => handleInputChange('cat_fab', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                      placeholder="Z16"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description Catégorie
                    </label>
                    <input
                      type="text"
                      value={formData.cat_fab_l}
                      onChange={(e) => handleInputChange('cat_fab_l', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                      placeholder="CARB (ex MSERV - MSERV)"
                    />
                  </div>
                </div>

                {/* Paramètres */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stratégique
                    </label>
                    <select
                      value={formData.strategiq}
                      onChange={(e) => handleInputChange('strategiq', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                    >
                      <option value={0}>Non (0)</option>
                      <option value={1}>Oui (1)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Code FAIR
                    </label>
                    <input
                      type="text"
                      value={formData.codif_fair}
                      onChange={(e) => handleInputChange('codif_fair', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                      placeholder="SKF_16"
                    />
                  </div>
                </div>

                {/* Classification CIR */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Classification CIR</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        FSMEGA *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={formData.fsmega}
                        onChange={(e) => handleInputChange('fsmega', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        FSFAM *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={formData.fsfam}
                        onChange={(e) => handleInputChange('fsfam', parseInt(e.target.value) || 99)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        FSSFA *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={formData.fssfa}
                        onChange={(e) => handleInputChange('fssfa', parseInt(e.target.value) || 99)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Classification CIR (auto-calculée)
                    </label>
                    <input
                      type="text"
                      value={formData.classif_cir}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Calculée automatiquement : FSMEGA FSFAM FSSFA
                    </p>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    loading={loading}
                    className="min-w-[120px]"
                  >
                    {mapping?.id ? 'Modifier' : 'Créer'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};