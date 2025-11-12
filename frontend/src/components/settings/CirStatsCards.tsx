import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Database, FileSpreadsheet, Shield, Layers } from 'lucide-react';

interface CirStatsCardsProps {
  stats: {
    total_classifications: number;
    total_segments: number;
    total_segment_links: number;
    classification_history: number;
    segment_history: number;
  };
  loading?: boolean;
}

const formatter = (value: number): string => value.toLocaleString('fr-FR');

export const CirStatsCards: React.FC<CirStatsCardsProps> = ({ stats, loading }) => {
  const cards = [
    {
      label: 'Classifications',
      value: formatter(stats.total_classifications),
      icon: Database,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: 'Segments',
      value: formatter(stats.total_segments),
      icon: FileSpreadsheet,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      label: 'Liens segments',
      value: formatter(stats.total_segment_links),
      icon: Layers,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      label: 'Historique',
      value: formatter(stats.classification_history + stats.segment_history),
      icon: Shield,
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className={`${card.bg} border-0 shadow-sm`}>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium text-gray-600">{card.label}</p>
              <p className={`text-2xl font-semibold ${card.color}`}>
                {loading ? '...' : card.value}
              </p>
            </div>
            <card.icon className={`w-8 h-8 ${card.color}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

