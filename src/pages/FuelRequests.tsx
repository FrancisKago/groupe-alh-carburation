import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  Calendar,
  User,
  Car
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DemandeCarburant, StatutDemande } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const FuelRequests: React.FC = () => {
  const [demandes, setDemandes] = useState<DemandeCarburant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatutDemande | 'all'>('all');
  const [selectedDemande, setSelectedDemande] = useState<DemandeCarburant | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchDemandes();
  }, []);

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('demandes_carburant')
        .select(`
          *,
          utilisateur:utilisateurs(nom, email, role),
          vehicule:vehicules(
            immatriculation,
            type_vehicule:types_vehicules(libelle)
          ),
          justificatifs(*),
          validations(
            *,
            validateur:utilisateurs(nom, role)
          )
        `)
        .order('date_demande', { ascending: false });

      // Filter based on user role
      if (user?.role === 'chauffeur') {
        query = query.eq('id_utilisateur', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDemandes(data || []);
    } catch (error) {
      console.error('Error fetching fuel requests:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (demandeId: string, statut: 'approuve' | 'rejete', commentaire?: string) => {
    try {
      const demande = demandes.find(d => d.id === demandeId);
      if (!demande) return;

      let newStatut: StatutDemande;
      let niveauValidation: number;

      // Determine next status based on current status and user role
      if (user?.role === 'superviseur' && demande.statut === 'en_attente') {
        newStatut = statut === 'approuve' ? 'valide_superviseur' : 'rejete';
        niveauValidation = 1;
      } else if (user?.role === 'pompiste' && demande.statut === 'valide_superviseur') {
        newStatut = statut === 'approuve' ? 'valide_pompiste' : 'rejete';
        niveauValidation = 2;
      } else if (user?.role === 'directeur' && demande.statut === 'valide_pompiste') {
        newStatut = statut === 'approuve' ? 'valide_dg' : 'rejete';
        niveauValidation = 3;
      } else {
        toast.error('Action non autorisée');
        return;
      }

      // Update demande status
      const { error: updateError } = await supabase
        .from('demandes_carburant')
        .update({ statut: newStatut })
        .eq('id', demandeId);

      if (updateError) throw updateError;

      // Add validation record
      const { error: validationError } = await supabase
        .from('validations')
        .insert({
          id_demande: demandeId,
          valide_par: user?.id,
          niveau_validation: niveauValidation,
          statut_validation: statut,
          commentaire
        });

      if (validationError) throw validationError;

      // Log action
      await supabase.rpc('log_action', {
        user_id: user?.id,
        action_text: `Validation ${statut} - Niveau ${niveauValidation}`,
        details_text: `Demande ${demandeId} - ${commentaire || ''}`
      });

      toast.success(`Demande ${statut === 'approuve' ? 'approuvée' : 'rejetée'} avec succès`);
      fetchDemandes();
      setShowModal(false);
    } catch (error) {
      console.error('Error validating request:', error);
      toast.error('Erreur lors de la validation');
    }
  };

  const getStatusBadge = (statut: StatutDemande) => {
    switch (statut) {
      case 'en_attente':
        return <span className="badge badge-warning">En attente</span>;
      case 'valide_superviseur':
        return <span className="badge badge-info">Validé superviseur</span>;
      case 'valide_pompiste':
        return <span className="badge badge-info">Validé pompiste</span>;
      case 'valide_dg':
        return <span className="badge badge-success">Validé DG</span>;
      case 'rejete':
        return <span className="badge badge-danger">Rejeté</span>;
      default:
        return <span className="badge badge-gray">{statut}</span>;
    }
  };

  const canValidate = (demande: DemandeCarburant) => {
    if (!user) return false;
    
    switch (user.role) {
      case 'superviseur':
        return demande.statut === 'en_attente';
      case 'pompiste':
        return demande.statut === 'valide_superviseur';
      case 'directeur':
        return demande.statut === 'valide_pompiste';
      default:
        return false;
    }
  };

  const filteredDemandes = demandes.filter(demande => {
    const matchesSearch = 
      demande.vehicule?.immatriculation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.utilisateur?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.mission.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || demande.statut === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Demandes de carburant</h1>
          <p className="text-gray-600">Gestion des demandes de carburant de la flotte</p>
        </div>
        {user?.role === 'chauffeur' && (
          <Link
            to="/fuel-requests/new"
            className="btn-primary mt-4 sm:mt-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle demande
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher par véhicule, chauffeur, site..."
                  className="input pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatutDemande | 'all')}
              >
                <option value="all">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="valide_superviseur">Validé superviseur</option>
                <option value="valide_pompiste">Validé pompiste</option>
                <option value="valide_dg">Validé DG</option>
                <option value="rejete">Rejeté</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="card">
        <div className="card-content p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Véhicule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chauffeur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site / Mission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDemandes.map((demande) => (
                  <tr key={demande.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Car className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {demande.vehicule?.immatriculation}
                          </div>
                          <div className="text-sm text-gray-500">
                            {demande.vehicule?.type_vehicule?.libelle}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {demande.utilisateur?.nom}
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {demande.utilisateur?.role}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{demande.site}</div>
                      <div className="text-sm text-gray-500">{demande.mission}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {demande.quantite_demandee}L demandé
                      </div>
                      {demande.quantite_servie && (
                        <div className="text-sm text-gray-500">
                          {demande.quantite_servie}L servi
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(demande.statut)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(demande.date_demande), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedDemande(demande);
                            setShowModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-900"
                          title="Voir détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canValidate(demande) && (
                          <>
                            <button
                              onClick={() => handleValidation(demande.id, 'approuve')}
                              className="text-success-600 hover:text-success-900"
                              title="Approuver"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleValidation(demande.id, 'rejete')}
                              className="text-danger-600 hover:text-danger-900"
                              title="Rejeter"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredDemandes.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune demande</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Aucune demande ne correspond aux critères de recherche.'
                  : 'Commencez par créer une nouvelle demande de carburant.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedDemande && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Détails de la demande
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Véhicule</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDemande.vehicule?.immatriculation}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Chauffeur</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDemande.utilisateur?.nom}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Site</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDemande.site}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mission</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDemande.mission}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kilométrage</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDemande.km_compteur} km</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantité demandée</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDemande.quantite_demandee}L</p>
                  </div>
                  {selectedDemande.quantite_servie && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantité servie</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedDemande.quantite_servie}L</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Statut</label>
                    <div className="mt-1">{getStatusBadge(selectedDemande.statut)}</div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Raison</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedDemande.raison}</p>
                </div>

                {selectedDemande.justificatifs && selectedDemande.justificatifs.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Justificatifs</label>
                    <div className="mt-1 space-y-2">
                      {selectedDemande.justificatifs.map((justificatif) => (
                        <div key={justificatif.id} className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{justificatif.nom_fichier}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDemande.validations && selectedDemande.validations.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Historique des validations</label>
                    <div className="mt-1 space-y-2">
                      {selectedDemande.validations.map((validation) => (
                        <div key={validation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {validation.validateur?.nom}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">
                              ({validation.validateur?.role})
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-medium ${
                              validation.statut_validation === 'approuve' 
                                ? 'text-success-600' 
                                : 'text-danger-600'
                            }`}>
                              {validation.statut_validation === 'approuve' ? 'Approuvé' : 'Rejeté'}
                            </span>
                            <div className="text-xs text-gray-500">
                              {format(new Date(validation.date_validation), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {canValidate(selectedDemande) && (
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => handleValidation(selectedDemande.id, 'rejete')}
                    className="btn-danger"
                  >
                    Rejeter
                  </button>
                  <button
                    onClick={() => handleValidation(selectedDemande.id, 'approuve')}
                    className="btn-success"
                  >
                    Approuver
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelRequests;