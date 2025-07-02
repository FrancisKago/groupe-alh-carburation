import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Fuel, Eye, EyeOff, UserPlus, Settings, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface LoginForm {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const { signIn } = useAuth();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setEmailNotConfirmed(false);
    
    try {
      await signIn(data.email, data.password);
      toast.success('Connexion réussie');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Check if the error is due to unconfirmed email
      if (error.message && error.message.includes('Email not confirmed')) {
        setEmailNotConfirmed(true);
        toast.error('Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte de réception.');
      } else {
        toast.error(error.message || 'Erreur de connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center">
            <Fuel className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Groupe ALH
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Gestion des consommations de carburant
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          {emailNotConfirmed && (
            <div className="mb-6 bg-warning-50 border border-warning-200 rounded-lg p-4">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-warning-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-warning-800">
                    Email non confirmé
                  </h3>
                  <p className="mt-1 text-sm text-warning-700">
                    Vous devez confirmer votre adresse email avant de pouvoir vous connecter. 
                    Vérifiez votre boîte de réception et cliquez sur le lien de confirmation.
                  </p>
                  <p className="mt-2 text-xs text-warning-600">
                    Si vous ne trouvez pas l'email, vérifiez vos spams ou utilisez les comptes de démonstration ci-dessous.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connexion...
                  </div>
                ) : (
                  'Se connecter'
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                to="/register"
                className="flex-1 btn-secondary text-center"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Créer un compte
              </Link>
              <Link
                to="/setup-demo"
                className="flex-1 btn-secondary text-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configuration démo
              </Link>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Comptes de démonstration (prêts à utiliser) :
              </p>
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <p><strong>Admin:</strong> admin@alh.com / admin123</p>
                <p><strong>Chauffeur:</strong> chauffeur@alh.com / chauffeur123</p>
                <p><strong>Superviseur:</strong> superviseur@alh.com / superviseur123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;