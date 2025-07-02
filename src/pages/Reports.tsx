import React, { useEffect, useState } from 'react';
import { 
  Download, 
  Calendar, 
  Filter,
  BarChart3,
  TrendingUp,
  Fuel,
  Car,
  AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [reportData, setReportData] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Fetch fuel requests in date range
      const { data: demandes, error: demandesError } = await supabase
        .from('demandes_carburant')
        .select(`
          *,
          utilisateur:utilisateurs(nom, role),
          vehicule:vehicules(
            immatriculation,
            type_vehicule:types_vehicules(libelle)
          )
        `)
        .gte('date_demande', dateRange.start)
        .lte('date_demande', dateRange.end)
        .order('date_demande');

      if (demandesError) throw demandesError;

      // Process data for charts
      const processedData = processReportData(demandes || []);
      setReportData(processedData);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  };

  const processReportData = (demandes: any[]) => {
    // Consumption by day
    const consumptionByDay = demandes
      .filter(d => d.statut !== 'rejete')
      .reduce((acc, demande) => {
        const date = format(new Date(demande.date_demande), 'dd/MM');
        const quantity = demande.quantite_servie || demande.quantite_demandee;
        
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += quantity;
        return acc;
      }, {});

    const dailyConsumption = Object.entries(consumptionByDay).map(([date, quantity]) => ({
      date,
      quantite: quantity
    }));

    // Consumption by vehicle type
    const consumptionByType = demandes
      .filter(d => d.statut !== 'rejete')
      .reduce((acc, demande) => {
        const type = demande.vehicule?.type_vehicule?.libelle || 'Inconnu';
        const quantity = demande.quantite_servie || demande.quantite_demandee;
        
        if (!acc[type]) {
          acc[type] = 0;
        }
        acc[type] += quantity;
        return acc;
      }, {});

    const typeConsumption = Object.entries(consumptionByType).map(([type, quantity]) => ({
      type,
      quantite: quantity
    }));

    // Status distribution
    const statusDistribution = demandes.reduce((acc, demande) => {
      const status = demande.statut;
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status]++;
      return acc;
    }, {});

    const statusData = Object.entries(statusDistribution).map(([status, count]) => ({
      status: getStatusLabel(status),
      count
    }));

    // Top consumers (vehicles)
    const vehicleConsumption = demandes
      .filter(d => d.statut !== 'rejete')
      .reduce((acc, demande) => {
        const vehicle = demande.vehicule?.immatriculation || 'Inconnu';
        const quantity = demande.quantite_servie || demande.quantite_demandee;
        
        if (!acc[vehicle]) {
          acc[vehicle] = 0;
        }
        acc[vehicle] += quantity;
        return acc;
      }, {});

    const topVehicles = Object.entries(vehicleConsumption)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([vehicle, quantity]) => ({
        vehicule: vehicle,
        consommation: quantity
      }));

    // Calculate totals
    const totalRequests = demandes.length;
    const totalConsumption = demandes
      .filter(d => d.statut !== 'rejete')
      .reduce((sum, d) => sum + (d.quantite_servie || d.quantite_demandee), 0);
    const pendingRequests = demandes.filter(d => d.statut === 'en_attente').length;
    const rejectedRequests = demandes.filter(d => d.statut === 'rejete').length;

    return {
      dailyConsumption,
      typeConsumption,
      statusData,
      topVehicles,
      totals: {
        totalRequests,
        totalConsumption,
        pendingRequests,
        rejectedRequests
      }
    };
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'en_attente': 'En attente',
      'valide_superviseur': 'Validé superviseur',
      'valide_pompiste': 'Validé pompiste',
      'valide_dg': 'Validé DG',
      'rejete': 'Rejeté'
    };
    return labels[status] || status;
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const csvData = [
      ['Période', `${dateRange.start} au ${dateRange.end}`],
      [''],
      ['Résumé'],
      ['Total demandes', reportData.totals.totalRequests],
      ['Consommation totale (L)', reportData.totals.totalConsumption],
      ['Demandes en attente', reportData.totals.pendingRequests],
      ['Demandes rejetées', reportData.totals.rejectedRequests],
      [''],
      ['Top véhicules consommateurs'],
      ['Véhicule', 'Consommation (L)'],
      ...reportData.topVehicles.map((v: any) => [v.vehicule, v.consommation])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rapport_carburant_${dateRange.start}_${dateRange.end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
          <h1 className="text-2xl font-bold text-gray-900">Rapports et analyses</h1>
          <p className="text-gray-600">Analyse des consommations et tendances</p>
        </div>
        <button
          onClick={exportToCSV}
          className="btn-primary mt-4 sm:mt-0"
        >
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début
              </label>
              <input
                type="date"
                className="input"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                className="input"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setDateRange({
                  start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                  end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
                })}
                className="btn-secondary"
              >
                Ce mois
              </button>
              <button
                onClick={() => setDateRange({
                  start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
                  end: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
                })}
                className="btn-secondary"
              >
                Mois dernier
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total demandes</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.totals.totalRequests}</p>
                  </div>
                  <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Consommation totale</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.totals.totalConsumption}L</p>
                  </div>
                  <div className="h-12 w-12 bg-success-100 rounded-lg flex items-center justify-center">
                    <Fuel className="h-6 w-6 text-success-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">En attente</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.totals.pendingRequests}</p>
                  </div>
                  <div className="h-12 w-12 bg-warning-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-warning-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Rejetées</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.totals.rejectedRequests}</p>
                  </div>
                  <div className="h-12 w-12 bg-danger-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-danger-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Consumption */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Consommation quotidienne</h3>
              </div>
              <div className="card-content">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.dailyConsumption}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}L`, 'Consommation']} />
                    <Line type="monotone" dataKey="quantite" stroke="#2563eb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Répartition par statut</h3>
              </div>
              <div className="card-content">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {reportData.statusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Consumption by Type */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Consommation par type de véhicule</h3>
              </div>
              <div className="card-content">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.typeConsumption}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}L`, 'Consommation']} />
                    <Bar dataKey="quantite" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Vehicles */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Top véhicules consommateurs</h3>
              </div>
              <div className="card-content">
                <div className="space-y-4">
                  {reportData.topVehicles.slice(0, 5).map((vehicle: any, index: number) => (
                    <div key={vehicle.vehicule} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-600">{index + 1}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Car className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{vehicle.vehicule}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{vehicle.consommation}L</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;