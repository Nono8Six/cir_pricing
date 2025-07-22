import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Clock } from 'lucide-react';

export const RecentPrices: React.FC = () => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          <CardTitle className="text-base sm:text-lg">Prix Récents</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="text-center py-8 sm:py-12">
          <Clock className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-500 mb-2">Aucun prix enregistré</p>
          <p className="text-xs sm:text-sm text-gray-400">
            Les prix récemment calculés apparaîtront ici
          </p>
        </div>
      </CardContent>
    </Card>
  );
};