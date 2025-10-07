import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Target,
  Database,
  Filter,
  Download
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { mappingApi } from '../../lib/supabaseClient';

interface AnalyticsData {
  totalMappings: number;
  strategicMappings: number;
  totalMarques: number;
  segmentDistribution: { segment: string; count: number }[];
  marqueDistribution: { marque: string; count: number }[];
  cirClassification: { fsmega: number; count: number }[];
  sourceTypeDistribution: { source_type: string; count: number }[];
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

export const MappingAnalyticsTab: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Récupérer toutes les données de mapping pour les analyses
      const allMappings = await mappingApi.getAllBrandCategoryMappings();
      
      // Calculer les statistiques
      const totalMappings = allMappings.length;
      const strategicMappings = allMappings.filter(m => m.strategiq === 1).length;
      
      // Compter le nombre total de marques uniques
      const totalMarques = new Set(allMappings.map(m => m.marque)).size;
      
      // Distribution par segment
      const segmentCounts = allMappings.reduce((acc, mapping) => {
        acc[mapping.segment] = (acc[mapping.segment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const segmentDistribution = Object.entries(segmentCounts)
        .map(([segment, count]) => ({ segment, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Distribution par marque (top 50)
      const marqueCounts = allMappings.reduce((acc, mapping) => {
        acc[mapping.marque] = (acc[mapping.marque] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const marqueDistribution = Object.entries(marqueCounts)
        .map(([marque, count]) => ({ marque, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50); // Afficher plus de marques

      // Distribution par classification CIR (FSMEGA)
      const cirCounts = allMappings.reduce((acc, mapping) => {
        if (mapping.fsmega) {
          acc[mapping.fsmega] = (acc[mapping.fsmega] || 0) + 1;
        }
        return acc;
      }, {} as Record<number, number>);
      
      const cirClassification = Object.entries(cirCounts)
        .map(([fsmega, count]) => ({ fsmega: parseInt(fsmega), count: count as number }))
        .sort((a, b) => a.fsmega - b.fsmega);

      // Distribution par type de source
      const sourceTypeCounts = allMappings.reduce((acc, mapping) => {
        const sourceType = mapping.source_type || 'initial_load';
        acc[sourceType] = (acc[sourceType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const sourceTypeDistribution = Object.entries(sourceTypeCounts)
        .map(([source_type, count]) => ({ source_type, count: count as number }));

      setAnalytics({
        totalMappings,
        strategicMappings,
        totalMarques,
        segmentDistribution,
        marqueDistribution,
        cirClassification,
        sourceTypeDistribution
      });

    } catch (error) {
      console.error('Erreur chargement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSourceTypeLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'excel_upload':
        return 'Import Excel';
      case 'manual_edit':
        return 'Saisie manuelle';
      case 'api_import':
        return 'Import API';
      case 'initial_load':
        return 'Chargement initial';
      default:
        return sourceType;
    }
  };

  const getSourceTypeColor = (sourceType: string) => {
    switch (sourceType) {
      case 'excel_upload':
        return 'bg-blue-500';
      case 'manual_edit':
        return 'bg-green-500';
      case 'api_import':
        return 'bg-purple-500';
      case 'initial_load':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cir-red"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Impossible de charger les analyses</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Analyses et Statistiques
          </h2>
          <p className="text-gray-600">
            Vue d'ensemble des données de mapping et tendances
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="1y">1 an</option>
          </select>
          
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Exporter</span>
          </Button>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total mappings</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalMappings.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Stratégiques</p>
                <p className="text-2xl font-bold text-green-600">{analytics.strategicMappings}</p>
                <p className="text-xs text-gray-500">
                  {((analytics.strategicMappings / analytics.totalMappings) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total marques</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.totalMarques}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Filter className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Classifications CIR</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.cirClassification.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 gap-6">
        {/* Distribution par marque - Pleine largeur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="w-5 h-5" />
              <span>Top 50 Marques</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {analytics.marqueDistribution.map((item, index) => (
                <motion.div
                  key={item.marque}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full" />
                    <span className="text-sm font-medium text-gray-900 truncate max-w-40">
                      {item.marque}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full"
                        style={{ 
                          width: `${(item.count / analytics.marqueDistribution[0].count) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques secondaires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classification CIR */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Classification CIR (FSMEGA)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.cirClassification.slice(0, 10).map((item, index) => (
                <motion.div
                  key={item.fsmega}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3"
                >
                  <div className="w-12 text-sm font-mono font-medium text-gray-600">
                    {item.fsmega}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(item.count / Math.max(...analytics.cirClassification.map(c => c.count))) * 100}%` 
                      }}
                    />
                  </div>
                  <div className="w-12 text-sm font-medium text-gray-900 text-right">
                    {item.count}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribution par source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Sources de données</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.sourceTypeDistribution.map((item, index) => (
                <motion.div
                  key={item.source_type}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${getSourceTypeColor(item.source_type)}`} />
                    <span className="font-medium text-gray-900">
                      {getSourceTypeLabel(item.source_type)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {item.count.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {((item.count / analytics.totalMappings) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};