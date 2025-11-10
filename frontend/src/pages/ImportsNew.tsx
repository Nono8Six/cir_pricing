import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Upload, History } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { FileImportWizard } from '../components/imports/FileImportWizard';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const ImportsNew: React.FC = () => {
  const { canManageImports, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Rediriger si non-admin (une fois le chargement terminé)
    if (!loading && !canManageImports()) {
      toast.error('Accès non autorisé', {
        description: 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.'
      });
      navigate('/dashboard', { replace: true });
    }
  }, [canManageImports, loading, navigate]);

  // Afficher un loader pendant la vérification
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cir-red"></div>
      </div>
    );
  }

  // Ne rien afficher si pas autorisé (la redirection est en cours)
  if (!canManageImports()) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Import Center</h1>
          <p className="text-sm sm:text-base text-gray-600">Assistant d'import unifié pour Mappings et Classifications</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-700">
          <Upload className="w-4 h-4" />
          <span className="text-sm">Assistant d'import unifié</span>
        </div>
        <Link to="/imports/history" className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900">
          <History className="w-4 h-4 mr-1" /> Historique des imports
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assistant d'import</CardTitle>
        </CardHeader>
        <CardContent>
          <FileImportWizard />
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportsNew;
