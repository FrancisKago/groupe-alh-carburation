import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, User, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User as UserType, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    role: 'chauffeur' as UserRole,
    actif: true,
    mot_de_passe: ''
  });
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('*')
        .order('nom');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        const updateData: any = {
          nom: formData.nom,
          email: formData.email,
          role: formData.role,
          actif: formData.actif
        };

        // Only update password if provided
        if (formData.mot_de_passe) {
          updateData.mot_de_passe = formData.mot_de_passe; // In real app, hash this
        }

        const { error } = await supabase
          .from('utilisateurs')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;
        toast.success('Utilisateur modifié avec succès');
      } else {
        const { error } = await supabase
          .from('utilisateurs')
          .insert({
            ...formData,
            mot_de_passe: formData.mot_de_passe // In real app, hash this
          });

        if (error) throw error;
        toast.success('Utilisateur créé avec succès');
      }

      // Log action
      await supabase.rpc('log_action', {
        user_id: currentUser?.id,
        action_text: editingUser ? 'Modification utilisateur' : 'Création utilisateur',
        details_text: `Email: ${formData.email}, Rôle: ${formData.role}`
      });

      setShowModal(false);
      setEditingUser(null);
      setFormData({ nom: '', email: '', role: 'chauffeur', actif: true, mot_de_passe: '' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      nom: user.nom,
      email: user.email,
      role: user.role,
      actif: user.actif,
      mot_de_passe: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (user: UserType) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.nom} ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('utilisateurs')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_action', {
        user_id: currentUser?.id,
        action_text: 'Suppression utilisateur',
        details_text: `Email: ${user.email}, Rôle: ${user.role}`
      });

      toast.success('Utilisateur supprimé avec succès');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      admin: { label: 'Administrateur', class: 'badge-danger' },
      directeur: { label: 'Directeur', class: 'badge-warning' },
      superviseur: { label: 'Superviseur', class: 'badge-info' },
      pompiste: { label: 'Pompiste', class: 'badge-success' },
      chauffeur: { label: 'Chauffeur', class: 'badge-gray' }
    };

    const config = roleConfig[role];
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'directeur';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Accès non autorisé</h3>
        <p className="mt-1 text-sm text-gray-500">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="text-gray-600">Gérer les comptes utilisateurs et leurs permissions</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ nom: '', email: '', role: 'chauffeur', actif: true, mot_de_passe: '' });
            setShowModal(true);
          }}
          className="btn-primary mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvel utilisateur
        </button>
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
                  placeholder="Rechercher par nom ou email..."
                  className="input pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                className="input"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
              >
                <option value="all">Tous les rôles</option>
                <option value="admin">Administrateur</option>
                <option value="directeur">Directeur</option>
                <option value="superviseur">Superviseur</option>
                <option value="pompiste">Pompiste</option>
                <option value="chauffeur">Chauffeur</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-content p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date création
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.nom}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${user.actif ? 'badge-success' : 'badge-gray'}`}>
                        {user.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.date_creation).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(user)}
                            className="text-danger-600 hover:text-danger-900"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun utilisateur</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || roleFilter !== 'all' 
                  ? 'Aucun utilisateur ne correspond aux critères de recherche.'
                  : 'Commencez par créer un nouvel utilisateur.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    className="input mt-1"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    placeholder="Ex: Jean Dupont"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    className="input mt-1"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ex: jean.dupont@alh.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mot de passe {editingUser ? '(laisser vide pour ne pas changer)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    className="input mt-1"
                    value={formData.mot_de_passe}
                    onChange={(e) => setFormData({ ...formData, mot_de_passe: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rôle *
                  </label>
                  <select
                    required
                    className="input mt-1"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  >
                    <option value="chauffeur">Chauffeur</option>
                    <option value="pompiste">Pompiste</option>
                    <option value="superviseur">Superviseur</option>
                    <option value="directeur">Directeur</option>
                    {currentUser?.role === 'admin' && (
                      <option value="admin">Administrateur</option>
                    )}
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
                    Compte actif
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
                    {editingUser ? 'Modifier' : 'Créer'}
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

export default Users;