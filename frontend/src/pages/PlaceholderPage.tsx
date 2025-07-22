import React from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Construction } from 'lucide-react';

export const PlaceholderPage: React.FC = () => {
  const location = useLocation();
  const pageName = location.pathname.replace('/', '').replace(/[-_]/g, ' ');
  const capitalizedPageName = pageName.charAt(0).toUpperCase() + pageName.slice(1);

  // Ne pas afficher le placeholder pour la page clients
  if (location.pathname === '/clients') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {capitalizedPageName}
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Cette page est en cours de développement
        </p>
      </div>

      {/* Placeholder Content */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gray-100 rounded-full">
              <Construction className="w-12 h-12 text-gray-400" />
            </div>
          </div>
          <CardTitle className="text-xl">Page en Construction</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">
            La page <strong>{capitalizedPageName}</strong> est actuellement en développement.
          </p>
          <p className="text-sm text-gray-500">
            Cette fonctionnalité sera bientôt disponible. En attendant, vous pouvez utiliser le calculateur de prix et la gestion des clients depuis le menu.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};