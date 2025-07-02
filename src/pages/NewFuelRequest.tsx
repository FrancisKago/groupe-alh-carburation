import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Upload, X, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Vehicule } from '../types';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface FuelRequestForm {
  id_vehicule: string;
  km_compteur: number;
  site: string;
  mission: string;
  quantite_demandee: number;
  raison: string;
}

const NewFuelRequest: React.FC = () => {
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FuelRequestForm>();

  const selectedVehiculeId = watch('id_vehicule');

  useEffect(() => {
    fetchVehicules();
  }, []);

  const fetchVehicules = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicules')
        .select(`
          *,
          type_vehicule:types_vehicules(libelle, seuil_conso_par_km)
        `)
        .eq('actif', true)
        .order('immatriculation');

      if (error) throw error;
      setVehicules(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Erreur lors du chargement des véhicules');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB max
      
      if (!isValidType) {
        toast.error(`${file.name}: Type de fichier non supporté`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name}: Fichier trop volumineux (max 5MB)`);
        return false;
      }
      return true;
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (demandeId: string) => {
    const uploadPromises = uploadedFiles.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${demandeId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('justificatifs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('justificatifs')
        .getPublicUrl(fileName);

      return {
        id_demande: demandeId,
        url_fichier: publicUrl,
        nom_fichier: file.name,
        type_fichier: file.type,
        taille_fichier: file.size
      };
    });

    const justificatifs = await Promise.all(uploadPromises);
    
    const { error } = await supabase
      .from('justificatifs')
      .insert(justificatifs);

    if (error) throw error;
  };

  const onSubmit = async (data: FuelRequestForm) => {
    if (!user) return;

    setLoading(true);
    try {
      // Create fuel request
      const { data: demande, error: demandeError } = await supabase
        .from('demandes_carburant')
        .insert({
          ...data,
          id_utilisateur: user.id,
          statut: 'en_attente'
        })
        .select()
        .single();

      if (demandeError) throw demandeError;

      // Upload files if any
      if (uploadedFiles.length > 0) {
        await uploadFiles(demande.id);
      }

      // Log action
      await supabase.rpc('log_action', {
        user_id: user.id,
        action_text: 'Création demande carburant',
        details_text: `Véhicule: ${data.id_vehicule}, Quantité: ${data.quantite_demandee}L`
      });

      toast.success('Demande créée avec succès');
      navigate('/fuel-requests');
    } catch (error) {
      console.error('Error creating fuel request:', error);
      toast.error('Erreur lors de la création de la demande');
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicule = vehicules.find(v => v.id === selectedVehiculeId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/fuel-requests')}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle demande de carburant</h1>
          <p className="text-gray-600">Créer une nouvelle demande de carburant pour un véhicule</p>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <div className="card-content">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Vehicle Selection */}
            <div>
              <label htmlFor="id_vehicule" className="block text-sm font-medium text-gray-700">
                Véhicule *
              </label>
              <select
                {...register('id_vehicule', { required: 'Le véhicule est requis' })}
                className="input mt-1"
              >
                <option value="">Sélectionner un véhicule</option>
                {vehicules.map((vehicule) => (
                  <option key={vehicule.id} value={vehicule.id}>
                    {vehicule.immatriculation} - {vehicule.type_vehicule?.libelle}
                  </option>
                ))}
              </select>
              {errors.id_vehicule && (
                <p className="mt-1 text-sm text-danger-600">{errors.id_vehicule.message}</p>
              )}
              {selectedVehicule && (
                <p className="mt-1 text-sm text-gray-500">
                  Seuil de consommation: {selectedVehicule.type_vehicule?.seuil_conso_par_km}L/km
                </p>
              )}
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="km_compteur" className="block text-sm font-medium text-gray-700">
                  Kilométrage compteur *
                </label>
                <input
                  type="number"
                  {...register('km_compteur', { 
                    required: 'Le kilométrage est requis',
                    min: { value: 0, message: 'Le kilométrage doit être positif' }
                  })}
                  className="input mt-1"
                  placeholder="Ex: 125000"
                />
                {errors.km_compteur && (
                  <p className="mt-1 text-sm text-danger-600">{errors.km_compteur.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="quantite_demandee" className="block text-sm font-medium text-gray-700">
                  Quantité demandée (L) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('quantite_demandee', { 
                    required: 'La quantité est requise',
                    min: { value: 0.01, message: 'La quantité doit être positive' }
                  })}
                  className="input mt-1"
                  placeholder="Ex: 50.00"
                />
                {errors.quantite_demandee && (
                  <p className="mt-1 text-sm text-danger-600">{errors.quantite_demandee.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="site" className="block text-sm font-medium text-gray-700">
                  Site *
                </label>
                <input
                  type="text"
                  {...register('site', { required: 'Le site est requis' })}
                  className="input mt-1"
                  placeholder="Ex: Chantier Nord"
                />
                {errors.site && (
                  <p className="mt-1 text-sm text-danger-600">{errors.site.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="mission" className="block text-sm font-medium text-gray-700">
                  Mission *
                </label>
                <input
                  type="text"
                  {...register('mission', { required: 'La mission est requise' })}
                  className="input mt-1"
                  placeholder="Ex: Transport matériaux"
                />
                {errors.mission && (
                  <p className="mt-1 text-sm text-danger-600">{errors.mission.message}</p>
                )}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="raison" className="block text-sm font-medium text-gray-700">
                Raison de la demande *
              </label>
              <textarea
                {...register('raison', { required: 'La raison est requise' })}
                rows={3}
                className="input mt-1"
                placeholder="Expliquez la raison de cette demande de carburant..."
              />
              {errors.raison && (
                <p className="mt-1 text-sm text-danger-600">{errors.raison.message}</p>
              )}
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Justificatifs (optionnel)
              </label>
              <div className="mt-1">
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Télécharger des fichiers</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          multiple
                          accept="image/jpeg,image/png,application/pdf"
                          onChange={handleFileUpload}
                        />
                      </label>
                      <p className="pl-1">ou glisser-déposer</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, PDF jusqu'à 5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Fichiers sélectionnés:</h4>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-danger-600 hover:text-danger-900"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/fuel-requests')}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Création...
                  </div>
                ) : (
                  'Créer la demande'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewFuelRequest;