import React from 'react';
import { StatsCards } from './StatsCards';
import { MarginDistribution } from './MarginDistribution';
import { RecentPrices } from './RecentPrices';
import { QuickActions } from './QuickActions';

export const Dashboard: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Gestionnaire des Prix CIR
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Enregistrement et calcul des prix pour clients et groupements
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Quick Actions */}
      <QuickActions />

      {/* Additional Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <MarginDistribution />
        <RecentPrices />
      </div>
    </div>
  );
};