import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fuel, Users, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface DemoUser {
  email: string;
  password: string;
  nom: string;
  role: 'admin' | 'chauffeur' | 'superviseur' | 'directeur' | 'pompiste';
}

const demoUsers: DemoUser[] = [
  {
    email: 'admin@alh.com',
    password: 'admin123',
    nom: 'Administrateur Système',
    role: 'admin'
  },
  {
    email: 'chauffeur@alh.com',
    password: 'chauffeur123',
    nom: 'Jean Martin',
    role: 'chauffeur'
  },
  {
    email: 'superviseur@alh.com',
    password: 'superviseur123',
    nom: 'Marie Dubois',
    role: 'superviseur'
  },
  {
    email: 'directeur@alh.com',
    password: 'directeur123',
    nom: 'Pierre Durand',
    role: 'directeur'
  },
  {
    email: 'pompiste@alh.com',
    password: 'pompiste123',
    nom: 'Ahmed Pompiste',
    role: 'pompiste'
  }
];

const SetupDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [rateLimitHit, setRateLimitHit] = useState(false);
  const navigate = useNavigate();

  const createDemoUsers = async () => {
    setLoading(true);
    setCreatedUsers([]);
    setErrors([]);
    setCurrentUserIndex(0);
    setRateLimitHit(false);

    for (let i = 0; i < demoUsers.length; i++) {
      const user = demoUsers[i];
      setCurrentUserIndex(i);

      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: user.email,
          password: user.password,
        });

        if (authError) {
          // If user already exists, try to get existing user
          if (authError.message.includes('already registered')) {
            setErrors(prev => [...prev, `${user.email}: Utilisateur déjà existant`]);
            continue;
          }
          // Handle rate limit error specifically
          if (authError.message.includes('rate limit') || 
              authError.message.includes('over_email_send_rate_limit') ||
              authError.message.includes('email rate limit exceeded')) {
            setRateLimitHit(true);
            setErrors(prev => [...prev, `${user.email}: Limite de taux d'email atteinte`]);
            toast.error('Limite de taux atteinte. Processus arrêté. Utilisez les comptes existants ou réessayez plus tard.');
            break; // Stop the process instead of continuing
          }
          throw authError;
        }

        if (authData.user) {
          // Create user profile
          const { error: profileError } = await supabase
            .from('utilisateurs')
            .upsert({
              id: authData.user.id,
              nom: user.nom,
              email: user.email,
              role: user.role,
              actif: true
            }, {
              onConflict: 'email'
            });

          if (profileError) throw profileError;

          setCreatedUsers(prev => [...prev, user.email]);
          toast.success(`Utilisateur ${user.email} créé`);
        }
      } catch (error: any) {
        console.error(`Error creating user ${user.email}:`, error);
        setErrors(prev => [...prev, `${user.email}: ${error.message}`]);
        
        // If it's a rate limit error, stop the process
        if (error.message.includes('rate limit') || 
            error.message.includes('over_email_send_rate_limit') ||
            error.message.includes('email rate limit exceeded')) {
          setRateLimitHit(true);
          toast.error('Limite de taux atteinte. Processus arrêté.');
          break;
        }
      }

      // Increased delay to 6 seconds to better avoid rate limits
      if (i < demoUsers.length - 1) { // Don't wait after the last user
        await new Promise(resolve => setTimeout(resolve, 6000));
      }
    }

    setLoading(false);
    setCurrentUserIndex(0);
    
    if (createdUsers.length > 0) {
      toast.success(`${createdUsers.length} utilisateurs créés avec succès`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center">
            <Fuel className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Configuration des utilisateurs de démonstration
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Créer les comptes utilisateurs pour tester l'application
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-primary-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Utilisateurs à créer
              </h3>
            </div>

            {rateLimitHit && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-warning-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-warning-800">
                      Limite de taux atteinte
                    </h3>
                    <p className="mt-1 text-sm text-warning-700">
                      Le processus de création a été arrêté en raison de la limite de taux d'email de Supabase. 
                      Vous pouvez utiliser les comptes déjà créés ou attendre quelques minutes avant de réessayer.
                    </p>
                    <p className="mt-2 text-xs text-warning-600">
                      Les comptes listés ci-dessous avec une coche verte sont prêts à être utilisés.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-blue-800">
                    Création en cours... ({currentUserIndex + 1}/{demoUsers.length})
                  </span>
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  Utilisateur actuel: {demoUsers[currentUserIndex]?.email}
                </div>
                <div className="mt-1 text-xs text-blue-500">
                  Délai de 6 secondes entre chaque création pour éviter les limites de taux
                </div>
              </div>
            )}

            <div className="space-y-3">
              {demoUsers.map((user, index) => (
                <div key={user.email} className={`flex items-center justify-between p-3 rounded-lg ${
                  loading && index === currentUserIndex 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-gray-50'
                }`}>
                  <div>
                    <div className="font-medium text-gray-900">{user.nom}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    <div className="text-xs text-gray-400 capitalize">{user.role}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {loading && index === currentUserIndex && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                    {createdUsers.includes(user.email) && (
                      <CheckCircle className="h-5 w-5 text-success-500" />
                    )}
                    {errors.some(error => error.includes(user.email)) && (
                      <AlertCircle className="h-5 w-5 text-warning-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {errors.length > 0 && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-warning-800 mb-2">Avertissements:</h4>
                <ul className="text-sm text-warning-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
                {rateLimitHit && (
                  <p className="mt-2 text-xs text-warning-600">
                    Les comptes avec des erreurs de limite de taux peuvent être réessayés plus tard, 
                    ou vous pouvez utiliser les comptes déjà créés.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={createDemoUsers}
                disabled={loading}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Création en cours...
                  </div>
                ) : (
                  'Créer les utilisateurs de démonstration'
                )}
              </button>
              
              <button
                onClick={() => navigate('/login')}
                className="btn-secondary"
                disabled={loading}
              >
                Aller à la connexion
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Cette opération créera les comptes utilisateurs nécessaires pour tester toutes les fonctionnalités de l'application.
                <br />
                <span className="text-warning-600">Note: Un délai de 6 secondes est appliqué entre chaque création pour éviter les limites de taux.</span>
              </p>
              <p className="mt-2 text-xs text-gray-400">
                Si vous rencontrez des limites de taux, les comptes déjà créés restent utilisables.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupDemo;