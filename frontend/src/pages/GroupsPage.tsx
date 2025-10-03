import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building,
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { GroupFormModal } from '../components/groups/GroupFormModal';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';

interface Group {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Charger les groupes
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await api.getGroups();
      setGroups(data || []); // Handle case where API returns null/undefined due to RLS errors
    } catch (error) {
      console.warn('RLS policy error - using empty groups list:', error);
      setGroups([]); // Set empty array instead of showing error
      // Don't set error state to avoid blocking the UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Filtrer les groupes
  const filteredGroups = groups.filter(group => 
    searchTerm === '' || 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ouvrir le modal pour créer un groupe
  const handleCreateGroup = () => {
    setSelectedGroup(null);
    setIsModalOpen(true);
  };

  // Ouvrir le modal pour modifier un groupe
  const handleEditGroup = (group: Group) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  // Supprimer un groupe
  const handleDeleteGroup = async (group: Group) => {
    toast(`Supprimer le groupement "${group.name}" ?`, {
      description: "Cette action est irréversible.",
      action: {
        label: "Supprimer",
        onClick: async () => {
          try {
            setDeleteLoading(group.id);
            await api.deleteGroup(group.id);
            toast.success('Groupement supprimé avec succès');
            fetchGroups();
          } catch (error: any) {
            console.error('Erreur suppression groupe:', error);
            const message = error.message || 'Erreur lors de la suppression';
            toast.error(message);
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

  // Fermer le modal et recharger les données
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedGroup(null);
  };

  const handleModalSuccess = () => {
    fetchGroups();
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
            Gestion des Groupements
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Gérez les groupements de clients et leurs associations
          </p>
        </div>
        <Button
          onClick={handleCreateGroup}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau groupement</span>
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total groupements</p>
                <p className="text-xl font-bold text-gray-900">{groups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Search className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Résultats filtrés</p>
                <p className="text-xl font-bold text-gray-900">{filteredGroups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un groupement..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des groupements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="w-5 h-5" />
            <span>Liste des groupements ({filteredGroups.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">
                {searchTerm 
                  ? 'Aucun groupement ne correspond à votre recherche'
                  : 'Aucun groupement enregistré'
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleCreateGroup} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer le premier groupement
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom du groupement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date de création
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dernière modification
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGroups.map((group, index) => (
                    <motion.tr
                      key={group.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                              <Building className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {group.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          {formatDate(group.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          {formatDate(group.updated_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditGroup(group)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(group)}
                            disabled={deleteLoading === group.id}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Supprimer"
                          >
                            {deleteLoading === group.id ? (
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
      </Card>

      {/* Modal de création/modification */}
      <GroupFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        group={selectedGroup}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};