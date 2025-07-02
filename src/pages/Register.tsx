import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Fuel, Eye, EyeOff, ArrowLeft, AlertCircle, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types';
import toast from 'react-hot-toast';

interface RegisterForm {
  nom: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterForm>();
  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    setRateLimitError(false);
    setRegistrationSuccess(false);
    
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        // Handle rate limit error specifically
        if (authError.message.includes('rate limit') || 
            authError.message.includes('over_email_send_rate_limit') ||
            authError.message.includes('email rate limit exceeded')) {
          setRateLimitError(true);
          toast.error('Limite de taux d\'email atteinte. Veuillez réessayer dans quelques minutes.');
          return;
        }
        throw authError;
      }

      if (authData.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('utilisateurs')
          .insert({
            id: authData.user.id,
            nom: data.nom,
            email: data.email,
            role: data.role,
            actif: true
          });

        if (profileError) throw profileError;

        setUserEmail(data.email);
        setRegistrationSuccess(true);
        toast.success('Compte créé avec succès ! Vérifiez votre email pour confirmer votre compte.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle rate limit errors that might come in different formats
      if (error.message && (
          error.message.includes('rate limit') || 
          error.message.includes('over_email_send_rate_limit') ||
          error.message.includes('email rate limit exceeded')
        )) {
        setRateLimitError(true);
        toast.error('Limite de taux d\'email atteinte. Veuillez réessayer dans quelques minutes.');
      } else {
        toast.error(error.message || 'Erreur lors de la création du compte');
      }
    } finally {
      setLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-success-600 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Compte créé avec succès !
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Vérifiez votre email pour activer votre compte
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center space-y-4">
              <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-success-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-success-800">
                      Email de confirmation envoyé
                    </h3>
                    <p className="mt-1 text-sm text-success-700">
                      Un email de confirmation a été envoyé à <strong>{userEmail}</strong>.
                    </p>
                    <p className="mt-2 text-sm text-success-700">
                      Cliquez sur le lien dans l'email pour activer votre compte, 
                      puis revenez ici pour vous connecter.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>Vous ne trouvez pas l'email ?</p>
                <ul className="mt-2 text-xs text-gray-500 space-y-1">
                  <li>• Vérifiez votre dossier spam/courrier indésirable</li>
                  <li>• L'email peut prendre quelques minutes à arriver</li>
                  <li>• Assurez-vous que l'adresse email est correcte</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary"
                >
                  Aller à la page de connexion
                </button>
                
                <Link
                  to="/setup-demo"
                  className="btn-secondary text-center"
                >
                  Ou utiliser les comptes de démonstration
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center">
            <Fuel className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Créer un compte
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Système de gestion carburant ALH
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          {rateLimitError && (
            <div className="mb-6 bg-warning-50 border border-warning-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-warning-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-warning-800">
                    Limite de taux d'email atteinte
                  </h3>
                  <p className="mt-1 text-sm text-warning-700">
                    Trop de tentatives d'inscription ont été effectuées récemment. 
                    Veuillez attendre quelques minutes avant de réessayer, ou utilisez 
                    les comptes de démonstration existants pour tester l'application.
                  </p>
                  <div className="mt-3">
                    <Link
                      to="/setup-demo"
                      className="text-sm text-warning-800 underline hover:text-warning-900"
                    >
                      Voir les comptes de démonstration →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700">
                Nom complet
              </label>
              <div className="mt-1">
                <input
                  {...register('nom', {
                    required: 'Le nom est requis',
                    minLength: {
                      value: 2,
                      message: 'Le nom doit contenir au moins 2 caractères'
                    }
                  })}
                  type="text"
                  className="input"
                  placeholder="Jean Dupont"
                />
                {errors.nom && (
                  <p className="mt-1 text-sm text-danger-600">{errors.nom.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <div className="mt-1">
                <input
                  {...register('email', {
                    required: 'L\'email est requis',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Adresse email invalide'
                    }
                  })}
                  type="email"
                  className="input"
                  placeholder="votre.email@alh.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-danger-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Rôle
              </label>
              <div className="mt-1">
                <select
                  {...register('role', { required: 'Le rôle est requis' })}
                  className="input"
                >
                  <option value="">Sélectionner un rôle</option>
                  <option value="chauffeur">Chauffeur</option>
                  <option value="pompiste">Pompiste</option>
                  <option value="superviseur">Superviseur</option>
                  <option value="directeur">Directeur</option>
                  <option value="admin">Administrateur</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-danger-600">{errors.role.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password', {
                    required: 'Le mot de passe est requis',
                    minLength: {
                      value: 6,
                      message: 'Le mot de passe doit contenir au moins 6 caractères'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-danger-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('confirmPassword', {
                    required: 'La confirmation du mot de passe est requise',
                    validate: value => value === password || 'Les mots de passe ne correspondent pas'
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-danger-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || rateLimitError}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Création du compte...
                  </div>
                ) : (
                  'Créer le compte'
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center space-y-3">
            <Link
              to="/login"
              className="flex items-center justify-center text-sm text-primary-600 hover:text-primary-500"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour à la connexion
            </Link>
            
            <div className="text-xs text-gray-500">
              Pour tester l'application, vous pouvez utiliser les{' '}
              <Link to="/setup-demo" className="text-primary-600 hover:text-primary-500 underline">
                comptes de démonstration
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;