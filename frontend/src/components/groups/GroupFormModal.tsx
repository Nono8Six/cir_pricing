import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { toast } from 'sonner';
import { api } from '../../lib/api';

interface Group {
  id?: string;
  name: string;
}

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: Group | null;
  onSuccess: () => void;
}

export const GroupFormModal: React.FC<GroupFormModalProps> = ({
  isOpen,
  onClose,
  group,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Group>({
    name: ''
  });

  // Initialiser le formulaire avec les données du groupe
  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name
      });
    } else {
      setFormData({
        name: ''
      });
    }
  }, [group, isOpen]);

  const handleInputChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Le nom du groupement est requis');
      return false;
    }

    if (formData.name.trim().length < 2) {
      toast.error('Le nom du groupement doit contenir au moins 2 caractères');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const groupData = {
        name: formData.name.trim()
      };

      if (group?.id) {
        // Modification
        await api.updateGroup(group.id, groupData);
        toast.success('Groupement modifié avec succès');
      } else {
        // Création
        await api.createGroup(groupData);
        toast.success('Groupement créé avec succès');
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error('Erreur sauvegarde groupement:', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';
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
          className="relative w-full max-w-md mx-4"
        >
          <Card className="shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {group?.id ? 'Modifier le groupement' : 'Nouveau groupement'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nom du groupement */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du groupement *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                    placeholder="Ex: Groupement Nord, Réseau Sud-Est..."
                    required
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le nom doit être unique et contenir au moins 2 caractères
                  </p>
                </div>

                {/* Boutons d'action */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
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
                    {group?.id ? 'Modifier' : 'Créer'}
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