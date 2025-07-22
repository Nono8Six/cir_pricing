import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { BarChart3 } from 'lucide-react';

export const MarginDistribution: React.FC = () => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
          <CardTitle className="text-base sm:text-lg">Distribution des Marges</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">Marge faible (&lt; 15%)</span>
            <span className="text-xs sm:text-sm font-medium text-red-600">0 produits</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-red-500 h-2 rounded-full" style={{ width: '0%' }}></div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">Marge correcte (15-30%)</span>
            <span className="text-xs sm:text-sm font-medium text-orange-600">0 produits</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-orange-500 h-2 rounded-full" style={{ width: '0%' }}></div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">Marge excellente (&gt; 30%)</span>
            <span className="text-xs sm:text-sm font-medium text-green-600">0 produits</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '0%' }}></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};