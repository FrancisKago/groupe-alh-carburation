import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Car, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Vehicule, TypeVehicule } from '../types';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Vehicles: React.FC = () => {
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [typesVehicules, setTypesVehicules] = useState<TypeVehicule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicule, setEditingVehicule] = useState<Vehicule | null>(null);
  const [formData, setFormData] = useState({
    immatriculation: '',
    id_type: '',
    actif: true
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchVehicules();
    fetchTypesVehicules();
  }, []);

  const fetchVehicules = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicules')
        .select(`
          *,
          type_vehicule:types_vehicules(*)
        `)
        .order('immatriculation');

      if (error) throw error;
      setVehicules(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Erreur lors du chargement des véhicules');
    } finally {
      setLoading(false);
    }
  };

  const fetchTypesVehicules = async () => {
    try {
      const { data, error } = await supabase
        .from('types_vehicules')
        .select('*')
        .order('libelle');

      if (error) throw error;
      setTypesVehicules(data || []);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingVehicule) {
        const { error } = await supabase
          .from('vehicules')
          .update(formData)
          .eq('id', editingVehicule.id);

        if (error) throw error;
        toast.success('Véhicule modifié avec succès');
      } else {
        const { error } = await supabase
          .from('vehicules')
          .insert(formData);

        if (error) throw error;
        toast.success('Véhicule créé avec succès');
      }

      // Log action
      await supabase.rpc('log_action', {
        user_id: user?.id,
        action_text: editingVehicule ? 'Modification véhicule' : 'Création véhicule',
        details_text: `Immatriculation: ${formData.immatriculation}`
      });

      setShowModal(false);
      setEditingVehicule(null);
      setFormData({ immatriculation: '', id_type: '', actif: true });
      fetchVehicules();
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (vehicule: Vehicule) => {
    setEditingVehicule(vehicule);
    setFormData({
      immatriculation: vehicule.immatriculation,
      id_type: vehicule.id_type,
      actif: vehicule.actif
    });
    setShowModal(true);
  };

  const handleDelete = async (vehicule: Vehicule) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le véhicule ${vehicule.immatriculation} ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('vehicules')
        .delete()
        .eq('id', vehicule.id);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_action', {
        user_id: user?.id,
        action_text: 'Suppression véhicule',
        details_text: `Immatriculation: ${vehicule.immatriculation}`
      });

      toast.success('Véhicule supprimé avec succès');
      fetchVehicules();
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const filteredVehicules = vehicules.filter(vehicule =>
    vehicule.immatriculation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicule.type_vehicule?.libelle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManage = user?.role === 'admin' || user?.role === 'directeur';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des véhicules</h1>
          <p className="text-gray-600">Gérer la flotte de véhicules et engins</p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditingVehicule(null);
              setFormData({ immatriculation: '', id_type: '', actif: true });
              setShowModal(true);
            }}
            className="btn-primary mt-4 sm:mt-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau véhicule
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-content">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher par immatriculation ou type..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicules.map((vehicule) => (
          <div key={vehicule.id} className="card">
            <div className="card-content">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Car className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {vehicule.immatriculation}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {vehicule.type_vehicule?.libelle}
                    </p>
                  </div>
                </div>
                <span className={`badge ${vehicule.actif ? 'badge-success' : 'badge-gray'}`}>
                  {vehicule.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Seuil consommation:</span>
                  <span className="font-medium">
                    {vehicule.type_vehicule?.seuil_conso_par_km}L/km
                  </span>
                </div>
              </div>

              {canManage && (
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => handleEdit(vehicule)}
                    className="text-primary-600 hover:text-primary-900"
                    title="Modifier"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(vehicule)}
                    className="text-danger-600 hover:text-danger-900"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredVehicules.length === 0 && (
        <div className="text-center py-12">
          <Car className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun véhicule</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? 'Aucun véhicule ne correspond à votre recherche.'
              : 'Commencez par ajouter un véhicule à la flotte.'
            }
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingVehicule ? 'Modifier le véhicule' : 'Nouveau véhicule'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Immatriculation *
                  </label>
                  <input
                    type="text"
                    required
                    className="input mt-1"
                    value={formData.immatriculation}
                    onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                    placeholder="Ex: ALH-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type de véhicule *
                  </label>
                  <select
                    required
                    className="input mt-1"
                    value={formData.id_type}
                    onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
                  >
                    <option value="">Sélectionner un type</option>
                    {typesVehicules.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.libelle} ({type.seuil_conso_par_km}L/km)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="actif"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={formData.actif}
                    onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                  />
                  <label htmlFor="actif" className="ml-2 block text-sm text-gray-900">
                    Véhicule actif
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary"
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingVehicule ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicles;