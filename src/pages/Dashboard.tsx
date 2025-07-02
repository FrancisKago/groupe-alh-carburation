import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Fuel, 
  Car, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from '../lib/supabase';
import { DashboardStats } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch basic stats
      const { data: demandes, error: demandesError } = await supabase
        .from('demandes_carburant')
        .select('*');
      
      if (demandesError) throw demandesError;

      const { data: vehicules, error: vehiculesError } = await supabase
        .from('vehicules')
        .select('*')
        .eq('actif', true);
      
      if (vehiculesError) throw vehiculesError;

      // Calculate stats
      const totalDemandes = demandes?.length || 0;
      const demandesEnAttente = demandes?.filter(d => d.statut === 'en_attente').length || 0;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const consommationMois = demandes
        ?.filter(d => {
          const date = new Date(d.date_demande);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, d) => sum + (d.quantite_servie || d.quantite_demandee), 0) || 0;

      // Group by status
      const demandesParStatut = [
        { statut: 'en_attente', count: demandes?.filter(d => d.statut === 'en_attente').length || 0 },
        { statut: 'valide_superviseur', count: demandes?.filter(d => d.statut === 'valide_superviseur').length || 0 },
        { statut: 'valide_pompiste', count: demandes?.filter(d => d.statut === 'valide_pompiste').length || 0 },
        { statut: 'valide_dg', count: demandes?.filter(d => d.statut === 'valide_dg').length || 0 },
        { statut: 'rejete', count: demandes?.filter(d => d.statut === 'rejete').length || 0 },
      ];

      // Mock data for charts (in real app, this would come from proper aggregation)
      const consommationParJour = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
          quantite: Math.floor(Math.random() * 500) + 100
        };
      });

      const topVehicules = [
        { vehicule: 'ALH-001', consommation: 450 },
        { vehicule: 'ALH-002', consommation: 380 },
        { vehicule: 'ALH-003', consommation: 320 },
        { vehicule: 'ALH-004', consommation: 280 },
        { vehicule: 'ALH-005', consommation: 250 },
      ];

      setStats({
        total_demandes: totalDemandes,
        demandes_en_attente: demandesEnAttente,
        consommation_mois: consommationMois,
        vehicules_actifs: vehicules?.length || 0,
        demandes_par_statut: demandesParStatut,
        consommation_par_jour: consommationParJour,
        top_vehicules: topVehicules,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'en_attente':
        return <Clock className="h-5 w-5 text-warning-500" />;
      case 'valide_superviseur':
      case 'valide_pompiste':
      case 'valide_dg':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      case 'rejete':
        return <XCircle className="h-5 w-5 text-danger-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'en_attente':
        return 'En attente';
      case 'valide_superviseur':
        return 'Validé superviseur';
      case 'valide_pompiste':
        return 'Validé pompiste';
      case 'valide_dg':
        return 'Validé DG';
      case 'rejete':
        return 'Rejeté';
      default:
        return statut;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600">Vue d'ensemble des consommations de carburant</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total demandes</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_demandes}</p>
              </div>
              <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Fuel className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
              <span className="text-success-600">+12%</span>
              <span className="text-gray-500 ml-1">vs mois dernier</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.demandes_en_attente}</p>
              </div>
              <div className="h-12 w-12 bg-warning-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingDown className="h-4 w-4 text-danger-500 mr-1" />
              <span className="text-danger-600">-5%</span>
              <span className="text-gray-500 ml-1">vs semaine dernière</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Consommation mois</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.consommation_mois}L</p>
              </div>
              <div className="h-12 w-12 bg-success-100 rounded-lg flex items-center justify-center">
                <Fuel className="h-6 w-6 text-success-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
              <span className="text-success-600">+8%</span>
              <span className="text-gray-500 ml-1">vs mois dernier</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Véhicules actifs</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.vehicules_actifs}</p>
              </div>
              <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Car className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">Total de la flotte</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumption Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Consommation des 7 derniers jours</h3>
          </div>
          <div className="card-content">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.consommation_par_jour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}L`, 'Consommation']} />
                <Line type="monotone" dataKey="quantite" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Demandes par statut</h3>
          </div>
          <div className="card-content">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.demandes_par_statut}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="statut" />
                <YAxis />
                <Tooltip formatter={(value) => [value, 'Demandes']} />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Requests and Top Vehicles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Summary */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Résumé des statuts</h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {stats?.demandes_par_statut.map((item) => (
                <div key={item.statut} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(item.statut)}
                    <span className="text-sm font-medium text-gray-900">
                      {getStatusLabel(item.statut)}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Vehicles */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Top véhicules consommateurs</h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {stats?.top_vehicules.map((item, index) => (
                <div key={item.vehicule} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-600">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.vehicule}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{item.consommation}L</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;