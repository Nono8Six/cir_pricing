import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, User, Mail, Phone } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { toast } from 'sonner';
import { api } from '../../lib/api';

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
  id?: string;
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
}

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  onSuccess: () => void;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  client,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [formData, setFormData] = useState<Client>({
    name: '',
    address: '',
    city: '',
    zip: '',
    country: 'France',
    siret: '',
    cir_account_number: '',
    group_id: '',
    agency: '',
    contacts: []
  });

  // Charger les groupes
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await api.getGroups();
        setGroups(data);
      } catch (error) {
        console.error('Erreur chargement groupes:', error);
        toast.error('Erreur lors du chargement des groupes');
      }
    };

    if (isOpen) {
      fetchGroups();
    }
  }, [isOpen]);

  // Initialiser le formulaire avec les données du client
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        address: client.address,
        city: client.city,
        zip: client.zip,
        country: client.country,
        siret: client.siret,
        cir_account_number: client.cir_account_number,
        group_id: client.group_id,
        agency: client.agency,
        contacts: client.contacts || []
      });
    } else {
      setFormData({
        name: '',
        address: '',
        city: '',
        zip: '',
        country: 'France',
        siret: '',
        cir_account_number: '',
        group_id: '',
        agency: '',
        contacts: []
      });
    }
  }, [client, isOpen]);

  const handleInputChange = (field: keyof Client, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContactChange = (index: number, field: keyof Contact, value: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts?.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      ) || []
    }));
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...(prev.contacts || []), { name: '', email: '', phone: '' }]
    }));
  };

  const removeContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts?.filter((_, i) => i !== index) || []
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Le nom du client est requis');
      return false;
    }

    if (formData.siret && formData.siret.trim() && !/^\d{14}$/.test(formData.siret.trim())) {
      toast.error('Le SIRET doit contenir exactement 14 chiffres');
      return false;
    }

    // Validation des contacts
    if (formData.contacts) {
      for (let i = 0; i < formData.contacts.length; i++) {
        const contact = formData.contacts[i];
        if (contact.name.trim() === '' && contact.email.trim() === '' && contact.phone.trim() === '') {
          continue; // Contact vide, on l'ignore
        }
        if (!contact.name.trim()) {
          toast.error(`Le nom du contact ${i + 1} est requis`);
          return false;
        }
        if (contact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
          toast.error(`L'email du contact ${i + 1} n'est pas valide`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Nettoyer les contacts vides
      const cleanedContacts = formData.contacts?.filter(contact => 
        contact.name.trim() !== '' || contact.email.trim() !== '' || contact.phone.trim() !== ''
      ) || [];

      const clientData = {
        ...formData,
        contacts: cleanedContacts,
        // Nettoyer les champs vides
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        zip: formData.zip?.trim() || null,
        siret: formData.siret?.trim() || null,
        cir_account_number: formData.cir_account_number?.trim() || null,
        agency: formData.agency?.trim() || null,
        group_id: formData.group_id || null
      };

      if (client?.id) {
        // Modification
        await api.updateClient(client.id, clientData);
        toast.success('Client modifié avec succès');
      } else {
        // Création
        await api.createClient(clientData);
        toast.success('Client créé avec succès');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur sauvegarde client:', error);
      const message = error.response?.data?.error || 'Erreur lors de la sauvegarde';
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
          className="relative w-full max-w-4xl max-h-[90vh] mx-4 overflow-hidden"
        >
          <Card className="shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {client?.id ? 'Modifier le client' : 'Nouveau client'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informations générales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du client *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                      placeholder="Nom de l'entreprise"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Groupement
                    </label>
                    <select
                      value={formData.group_id || ''}
                      onChange={(e) => handleInputChange('group_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                    >
                      <option value="">Aucun groupement</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Adresse */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Adresse</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                      placeholder="123 Rue de la Paix"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                        placeholder="Paris"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Code postal
                      </label>
                      <input
                        type="text"
                        value={formData.zip || ''}
                        onChange={(e) => handleInputChange('zip', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                        placeholder="75001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pays
                      </label>
                      <input
                        type="text"
                        value={formData.country || ''}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                        placeholder="France"
                      />
                    </div>
                  </div>
                </div>

                {/* Informations commerciales */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Informations commerciales</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SIRET
                      </label>
                      <input
                        type="text"
                        value={formData.siret || ''}
                        onChange={(e) => handleInputChange('siret', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                        placeholder="12345678901234"
                        maxLength={14}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Compte CIR
                      </label>
                      <input
                        type="text"
                        value={formData.cir_account_number || ''}
                        onChange={(e) => handleInputChange('cir_account_number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                        placeholder="CIR001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Agence
                      </label>
                      <input
                        type="text"
                        value={formData.agency || ''}
                        onChange={(e) => handleInputChange('agency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                        placeholder="Paris"
                      />
                    </div>
                  </div>
                </div>

                {/* Contacts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Contacts</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addContact}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter un contact</span>
                    </Button>
                  </div>

                  {formData.contacts && formData.contacts.length > 0 && (
                    <div className="space-y-3">
                      {formData.contacts.map((contact, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700">
                              Contact {index + 1}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeContact(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                value={contact.name}
                                onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                                placeholder="Nom du contact"
                              />
                            </div>

                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="email"
                                value={contact.email}
                                onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                                placeholder="email@exemple.com"
                              />
                            </div>

                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="tel"
                                value={contact.phone}
                                onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
                                placeholder="01.23.45.67.89"
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {(!formData.contacts || formData.contacts.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Aucun contact ajouté</p>
                      <p className="text-sm">Cliquez sur "Ajouter un contact" pour commencer</p>
                    </div>
                  )}
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
                    {client?.id ? 'Modifier' : 'Créer'}
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