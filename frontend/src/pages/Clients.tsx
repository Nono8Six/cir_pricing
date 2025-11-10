import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Building,
  MapPin,
  Filter
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ClientFormModal } from '../components/clients/ClientFormModal';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Contact {
  name: string;
  email: string;
  phone: string;
}

interface Group {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  siret?: string;
  cir_account_number?: string;
  group_id?: string;
  agency?: string;
  contacts?: Contact[];
  groups?: Group;
  created_at: string;
  updated_at: string;
}

export const Clients: React.FC = () => {
  const { canManageClients, canDeleteClients } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Charger les données
  const fetchData = async () => {
    try {
      setLoading(true);
      const [clientsData, groupsData] = await Promise.all([
        api.getClients(),
        api.getGroups()
      ]);
      
      setClients(clientsData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrer les clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = searchTerm === '' || 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.siret?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cir_account_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = selectedGroup === 'all' || client.group_id === selectedGroup;
    
    return matchesSearch && matchesGroup;
  });

  // Ouvrir le modal pour créer un client
  const handleCreateClient = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  // Ouvrir le modal pour modifier un client
  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  // Supprimer un client
  const handleDeleteClient = async (client: Client) => {
    toast(`Supprimer le client "${client.name}" ?`, {
      description: "Cette action est irréversible.",
      action: {
        label: "Supprimer",
        onClick: async () => {
          try {
            setDeleteLoading(client.id);
            await api.deleteClient(client.id);
            toast.success('Client supprimé avec succès');
            fetchData();
          } catch (error: unknown) {
            console.error('Erreur suppression client:', error);
            const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
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
    setSelectedClient(null);
  };

  const handleModalSuccess = () => {
    fetchData();
  };

  // Formater l'adresse
  const formatAddress = (client: Client) => {
    const parts = [client.address, client.city, client.zip, client.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  // Formater les contacts
  const formatContacts = (contacts?: Contact[]) => {
    if (!contacts || contacts.length === 0) return '-';
    return contacts.map(contact => contact.name).join(', ');
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
            Gestion des Clients
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Gérez vos clients et leurs informations commerciales
          </p>
        </div>
        {canManageClients() && (
          <Button
            onClick={handleCreateClient}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau client</span>
          </Button>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total clients</p>
                <p className="text-xl font-bold text-gray-900">{clients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Building className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Groupements</p>
                <p className="text-xl font-bold text-gray-900">{groups.length}</p>
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
                <p className="text-sm text-gray-600">Résultats filtrés</p>
                <p className="text-xl font-bold text-gray-900">{filteredClients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, SIRET ou compte CIR..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
              />
            </div>

            {/* Filtre par groupe */}
            <div className="sm:w-64">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
              >
                <option value="all">Tous les groupements</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table des clients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Liste des clients ({filteredClients.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">
                {searchTerm || selectedGroup !== 'all'
                  ? 'Aucun client ne correspond aux critères de recherche'
                  : 'Aucun client enregistré'
                }
              </p>
              {!searchTerm && selectedGroup === 'all' && canManageClients() && (
                <Button onClick={handleCreateClient} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer le premier client
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Adresse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SIRET
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compte CIR
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Groupement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacts
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client, index) => (
                    <motion.tr
                      key={client.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-cir-red flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {client.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-400 mr-1 flex-shrink-0" />
                            {formatAddress(client)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.siret || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.cir_account_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.groups ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {client.groups.name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.agency || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {formatContacts(client.contacts)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {canManageClients() && (
                            <button
                              onClick={() => handleEditClient(client)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteClients() && (
                            <button
                              onClick={() => handleDeleteClient(client)}
                              disabled={deleteLoading === client.id}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Supprimer"
                            >
                              {deleteLoading === client.id ? (
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {!canManageClients() && !canDeleteClients() && (
                            <span className="text-xs text-gray-400">Lecture seule</span>
                          )}
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
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        client={selectedClient}
        onSuccess={handleModalSuccess}
      />

      {/* Commentaire pour évolutivité future */}
      {/* 
        Futur : Parsing IA Gemma pour fichiers tarif (headers variés, remises/dates), 
        imports Excel mapping, prix par fournisseur avec validité/obsolescence.
        
        Intégration prévue :
        - Import/export Excel des clients
        - Synchronisation avec fichiers tarifaires fournisseurs
        - Classification automatique via brand_category_mappings
        - Historique des modifications avec audit trail
      */}
    </div>
  );
};