import React from 'react';
import { StatsCards } from '../components/dashboard/StatsCards';
import { QuickActions } from '../components/dashboard/QuickActions';
import { MarginDistribution } from '../components/dashboard/MarginDistribution';
import { RecentPrices } from '../components/dashboard/RecentPrices';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Tableau de Bord
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Vue d'ensemble de votre activité tarifaire
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