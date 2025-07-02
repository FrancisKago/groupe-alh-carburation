import React, { useEffect, useState } from 'react';
import { Save, Plus, Edit, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TypeVehicule } from '../types';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const [typesVehicules, setTypesVehicules] = useState<TypeVehicule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<TypeVehicule | null>(null);
  const [formData, setFormData] = useState({
    libelle: '',
    seuil_conso_par_km: 0.08
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchTypesVehicules();
  }, []);

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
      toast.error('Erreur lors du chargement des types de véhicules');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingType) {
        const { error } = await supabase
          .from('types_vehicules')
          .update(formData)
          .eq('id', editingType.id);

        if (error) throw error;
        toast.success('Type de véhicule modifié avec succès');
      } else {
        const { error } = await supabase
          .from('types_vehicules')
          .insert(formData);

        if (error) throw error;
        toast.success('Type de véhicule créé avec succès');
      }

      // Log action
      await supabase.rpc('log_action', {
        user_id: user?.id,
        action_text: editingType ? 'Modification type véhicule' : 'Création type véhicule',
        details_text: `Libellé: ${formData.libelle}, Seuil: ${formData.seuil_conso_par_km}L/km`
      });

      setShowModal(false);
      setEditingType(null);
      setFormData({ libelle: '', seuil_conso_par_km: 0.08 });
      fetchTypesVehicules();
    } catch (error: any) {
      console.error('Error saving vehicle type:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (type: TypeVehicule) => {
    setEditingType(type);
    setFormData({
      libelle: type.libelle,
      seuil_conso_par_km: type.seuil_conso_par_km
    });
    setShowModal(true);
  };

  const handleDelete = async (type: TypeVehicule) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le type "${type.libelle}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('types_vehicules')
        .delete()
        .eq('id', type.id);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_action', {
        user_id: user?.id,
        action_text: 'Suppression type véhicule',
        details_text: `Libellé: ${type.libelle}`
      });

      toast.success('Type de véhicule supprimé avec succès');
      fetchTypesVehicules();
    } catch (error: any) {
      console.error('Error deleting vehicle type:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <SettingsIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Accès non autorisé</h3>
        <p className="mt-1 text-sm text-gray-500">
          Seuls les administrateurs peuvent accéder aux paramètres.
        </p>
      </div>
    );
  }

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres système</h1>
        <p className="text-gray-600">Configuration des types de véhicules et seuils de consommation</p>
      </div>

      {/* Vehicle Types Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Types de véhicules</h2>
            <button
              onClick={() => {
                setEditingType(null);
                setFormData({ libelle: '', seuil_conso_par_km: 0.08 });
                setShowModal(true);
              }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau type
            </button>
          </div>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Libellé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seuil de consommation
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {typesVehicules.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{type.libelle}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{type.seuil_conso_par_km} L/km</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(type)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(type)}
                          className="text-danger-600 hover:text-danger-900"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {typesVehicules.length === 0 && (
            <div className="text-center py-12">
              <SettingsIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun type de véhicule</h3>
              <p className="mt-1 text-sm text-gray-500">
                Commencez par créer un type de véhicule.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Informations système</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Version de l'application</h3>
              <p className="text-sm text-gray-900">v1.0.0</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Dernière mise à jour</h3>
              <p className="text-sm text-gray-900">Juin 2025</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Base de données</h3>
              <p className="text-sm text-gray-900">PostgreSQL (Supabase)</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Environnement</h3>
              <p className="text-sm text-gray-900">Production</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingType ? 'Modifier le type de véhicule' : 'Nouveau type de véhicule'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Libellé *
                  </label>
                  <input
                    type="text"
                    required
                    className="input mt-1"
                    value={formData.libelle}
                    onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                    placeholder="Ex: Véhicule léger"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Seuil de consommation (L/km) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="input mt-1"
                    value={formData.seuil_conso_par_km}
                    onChange={(e) => setFormData({ ...formData, seuil_conso_par_km: parseFloat(e.target.value) })}
                    placeholder="Ex: 0.08"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Consommation moyenne attendue par kilomètre
                  </p>
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
                    <Save className="h-4 w-4 mr-2" />
                    {editingType ? 'Modifier' : 'Créer'}
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

export default Settings;