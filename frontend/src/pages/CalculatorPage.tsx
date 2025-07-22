import React from 'react';
import { MarginCalculator } from '../components/calculator/MarginCalculator';

export const CalculatorPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Calculateur de Prix et Marge
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Outil de calcul automatique avec comparaison intelligente des prix d'achat
        </p>
      </div>

      {/* Calculator */}
      <MarginCalculator />
    </div>
  );
};