import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { toast } from 'sonner';

export const LoginForm: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || (isSignUp && !confirmPassword)) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (isSignUp && password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    
    try {
      if (isSignUp) {
        await signUp(email, password, firstName, lastName);
        toast.success('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
        setFirstName('');
        setLastName('');
      } else {
        await signIn(email, password);
        toast.success('Connexion réussie !');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : (isSignUp ? 'Erreur lors de la création du compte' : 'Erreur de connexion');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cir-blue via-white to-cir-blue flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-cir-lg">
          <CardHeader className="text-center">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="flex justify-center mb-4"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-cir-red to-cir-red-light rounded-2xl flex items-center justify-center shadow-cir">
                <span className="text-white font-bold text-xl">CIR</span>
              </div>
            </motion.div>
            <CardTitle className="text-2xl text-text">
              Pricing Management
            </CardTitle>
            <p className="text-gray-600 mt-2">
              {isSignUp ? 'Créez votre compte tarifaire' : 'Connectez-vous à votre espace tarifaire'}
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent transition-all"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Nom
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent transition-all"
                      placeholder="Dupont"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent transition-all"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent transition-all"
                    placeholder={isSignUp ? "Minimum 6 caractères" : "••••••••"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}
              <Button
                type="submit"
                loading={loading}
                className="w-full py-3"
                size="lg"
              >
                {isSignUp ? (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Créer le compte
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Se connecter
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setPassword('');
                  setConfirmPassword('');
                  setFirstName('');
                  setLastName('');
                }}
                className="text-cir-red hover:text-cir-red-dark font-medium transition-colors"
              >
                {isSignUp 
                  ? 'Déjà un compte ? Se connecter' 
                  : 'Pas de compte ? Créer un compte'
                }
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-amber-800 text-center">
                <span className="font-medium">ℹ️ Première utilisation ?</span><br />
                {isSignUp
                  ? 'Créez votre compte pour accéder au système de gestion tarifaire'
                  : 'Créez un compte ou utilisez vos identifiants existants'
                }
              </p>
            </div>

            {/* Test credentials bubble - DEV ONLY */}
            <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg shadow-md">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-xl">🧪</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900 mb-2">Comptes de test (développement)</p>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="bg-white p-2 rounded border border-amber-200">
                      <p className="font-semibold text-gray-700">👁️ Viewer (lecture seule)</p>
                      <p className="text-gray-600">test-viewer@example.com</p>
                      <p className="text-gray-600">TestViewer2025!</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-amber-200">
                      <p className="font-semibold text-gray-700">💼 Commercial (gestion clients)</p>
                      <p className="text-gray-600">test-commercial@example.com</p>
                      <p className="text-gray-600">TestCommercial2025!</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-amber-200">
                      <p className="font-semibold text-gray-700">⚡ Admin (tous droits)</p>
                      <p className="text-gray-600">test-admin@example.com</p>
                      <p className="text-gray-600">TestAdmin2025!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};