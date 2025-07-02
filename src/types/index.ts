export type UserRole = 'chauffeur' | 'pompiste' | 'superviseur' | 'directeur' | 'admin';

export interface User {
  id: string;
  nom: string;
  email: string;
  role: UserRole;
  actif: boolean;
  date_creation: string;
}

export interface TypeVehicule {
  id: string;
  libelle: string;
  seuil_conso_par_km: number;
}

export interface Vehicule {
  id: string;
  immatriculation: string;
  id_type: string;
  actif: boolean;
  type_vehicule?: TypeVehicule;
}

export type StatutDemande = 'en_attente' | 'valide_superviseur' | 'valide_pompiste' | 'valide_dg' | 'rejete';

export interface DemandeCarburant {
  id: string;
  id_utilisateur: string;
  id_vehicule: string;
  km_compteur: number;
  site: string;
  mission: string;
  quantite_demandee: number;
  quantite_servie?: number;
  raison: string;
  statut: StatutDemande;
  date_demande: string;
  utilisateur?: User;
  vehicule?: Vehicule;
  justificatifs?: Justificatif[];
  validations?: Validation[];
}

export interface Justificatif {
  id: string;
  id_demande: string;
  url_fichier: string;
  type_fichier: string;
  nom_fichier: string;
}

export type StatutValidation = 'approuve' | 'rejete';

export interface Validation {
  id: string;
  id_demande: string;
  valide_par: string;
  niveau_validation: number;
  statut_validation: StatutValidation;
  commentaire?: string;
  date_validation: string;
  validateur?: User;
}

export interface LogAction {
  id: string;
  utilisateur_id: string;
  action: string;
  date_action: string;
  details?: string;
  utilisateur?: User;
}

export interface DashboardStats {
  total_demandes: number;
  demandes_en_attente: number;
  consommation_mois: number;
  vehicules_actifs: number;
  demandes_par_statut: { statut: StatutDemande; count: number }[];
  consommation_par_jour: { date: string; quantite: number }[];
  top_vehicules: { vehicule: string; consommation: number }[];
}