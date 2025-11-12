import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { CirStatsCards } from './CirStatsCards';
import { CirLogsTable } from './CirLogsTable';
import { cirAdminApi, type CirStats } from '../../lib/api/cirAdmin';
import { toast } from 'sonner';
import { Upload, Shield, FileSpreadsheet } from 'lucide-react';

interface CirSettingsPageProps {
  onOpenWizard?: () => void;
}

type ActionButton = {
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick: () => Promise<unknown>;
  variant?: 'primary' | 'danger';
};

export const CirSettingsPage: React.FC<CirSettingsPageProps> = ({ onOpenWizard }) => {
  const [stats, setStats] = useState<CirStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [logs, setLogs] = useState<{ type: string; description: string; date: string; user?: string | null; }[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const data = await cirAdminApi.fetchCirStats();
      setStats(data);
    } catch (error) {
      toast.error('Impossible de charger les statistiques', { description: String(error) });
    } finally {
      setStatsLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const entries = await cirAdminApi.fetchRecentActivity?.(20);
      setLogs(entries ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
    void loadLogs();
  }, []);

  const handleAction = async (label: string, action: () => Promise<unknown>) => {
    setActionLoading((prev) => ({ ...prev, [label]: true }));
    try {
      await action();
      toast.success(`${label} effectué`);
      await loadStats();
      await loadLogs();
    } catch (error) {
      toast.error(`Action "${label}" échouée`, { description: String(error) });
    } finally {
      setActionLoading((prev) => ({ ...prev, [label]: false }));
    }
  };

  const classificationActions: ActionButton[] = [
    {
      label: 'Exporter classifications',
      description: 'Télécharger le CSV complet',
      icon: FileSpreadsheet,
      onClick: async () => {
        const blob = await cirAdminApi.exportClassifications();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cir_classifications_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    },
    {
      label: 'Importer classifications',
      description: 'Ouvre l’assistant d’import',
      icon: Upload,
      onClick: async () => {
        if (onOpenWizard) onOpenWizard();
      }
    },
    {
      label: 'Purger classifications',
      description: 'Supprime toutes les lignes',
      icon: Shield,
      onClick: () => cirAdminApi.purgeClassifications(),
      variant: 'danger'
    }
  ];

  const segmentActions: ActionButton[] = [
    {
      label: 'Exporter segments',
      description: 'Télécharger le CSV complet',
      icon: FileSpreadsheet,
      onClick: async () => {
        const blob = await cirAdminApi.exportSegments();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cir_segments_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    },
    {
      label: 'Importer segments',
      description: 'Ouvre l’assistant d’import',
      icon: Upload,
      onClick: async () => {
        if (onOpenWizard) onOpenWizard();
      }
    },
    {
      label: 'Purger segments',
      description: 'Supprime mapping & historique segment',
      icon: Shield,
      onClick: () => cirAdminApi.purgeSegments(),
      variant: 'danger'
    }
  ];

  const historyActions: ActionButton[] = [
    {
      label: 'Purger historique',
      description: 'Supprime tous les journaux',
      icon: Shield,
      onClick: () => cirAdminApi.purgeHistory(),
      variant: 'danger'
    }
  ];

  return (
    <div className="space-y-6">
      <CirStatsCards
        stats={{
          total_classifications: stats?.total_classifications ?? 0,
          total_segments: stats?.total_segments ?? 0,
          total_segment_links: stats?.total_segment_links ?? 0,
          classification_history: stats?.classification_history ?? 0,
          segment_history: stats?.segment_history ?? 0
        }}
        loading={statsLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Classifications CIR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {classificationActions.map((action) => (
              <div key={action.label} className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{action.label}</p>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
                <Button
                  variant={action.variant === 'danger' ? 'outline' : 'secondary'}
                  className={action.variant === 'danger' ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}
                  onClick={() => void handleAction(action.label, action.onClick)}
                  loading={actionLoading[action.label]}
                >
                  <action.icon className="w-4 h-4 mr-2" />
                  {action.label}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segments tarifaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {segmentActions.map((action) => (
              <div key={action.label} className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{action.label}</p>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
                <Button
                  variant={action.variant === 'danger' ? 'outline' : 'secondary'}
                  className={action.variant === 'danger' ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}
                  onClick={() => void handleAction(action.label, action.onClick)}
                  loading={actionLoading[action.label]}
                >
                  <action.icon className="w-4 h-4 mr-2" />
                  {action.label}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-yellow-200 bg-yellow-50">
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium text-yellow-800">Purge complète</p>
            <p className="text-sm text-yellow-700">
              Actions sensibles : purger classifications/segments/historique. Confirme chaque action.
            </p>
          </div>
          <div className="flex gap-2">
            {historyActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => void handleAction(action.label, action.onClick)}
                loading={actionLoading[action.label]}
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <CirLogsTable logs={logs} loading={logsLoading} />
    </div>
  );
};
