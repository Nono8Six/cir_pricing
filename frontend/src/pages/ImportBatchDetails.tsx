import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { supabase } from '../lib/api';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';
import type { Tables } from '../types/database.types';

type Batch = Tables<'import_batches'>;

export const ImportBatchDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [historyCount, setHistoryCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      const { data } = await supabase.from('import_batches').select('*').eq('id', id).single();
      setBatch(data || null);
      const { count } = await supabase
        .from('brand_mapping_history')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', id);
      setHistoryCount(count ?? null);
      setLoading(false);
    };
    if (id) {
      void load();
    }
    // Realtime subscription (si publication active)
    const channel = supabase
      .channel('import-batch-details')
      .on('postgres_changes', { schema: 'public', table: 'import_batches', event: '*', filter: `id=eq.${id}` }, (payload) => {
        const row = (payload.new || payload.old) as Batch | null;
        if (row && row.id === id) {
          setBatch((prev) => (prev ? { ...prev, ...row } : row));
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id]);

  const handleRollback = async (): Promise<void> => {
    if (!id || !batch) return;
    if (batch.status !== 'completed') {
      toast.error('Rollback indisponible: le lot doit être au statut completed');
      return;
    }
    const ok = window.confirm('Confirmer le rollback de ce lot ? Cette action remettra l\'état précédent.');
    if (!ok) return;
    try {
      const { error } = await supabase.rpc('rollback_import_batch', { p_batch_id: id });
      if (error) throw error;
      toast.success('Rollback lancé avec succès');
      // Refresh
      const { data } = await supabase.from('import_batches').select('*').eq('id', id).single();
      setBatch(data || null);
      const { count } = await supabase
        .from('brand_mapping_history')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', id);
      setHistoryCount(count ?? null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors du rollback';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Détail du lot</h1>
          <p className="text-sm sm:text-base text-gray-600">Statut, métriques et audit</p>
        </div>
        <Link to="/imports/history" className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour à l'historique
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span>Informations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !batch ? (
            <div className="text-gray-500">Chargement…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">ID:</span> <span className="font-mono">{batch.id}</span></div>
              <div><span className="text-gray-500">Fichier:</span> <span className="font-medium">{batch.filename}</span></div>
              <div><span className="text-gray-500">Date:</span> {new Date(batch.timestamp).toLocaleString()}</div>
              <div><span className="text-gray-500">Type:</span> {batch.dataset_type || '-'}</div>
              <div><span className="text-gray-500">Statut:</span> {batch.status}</div>
              <div><span className="text-gray-500">Utilisateur:</span> {batch.user_id}</div>
              <div><span className="text-gray-500">Créés:</span> {batch.created_count ?? 0}</div>
              <div><span className="text-gray-500">MàJ:</span> {batch.updated_count ?? 0}</div>
              <div><span className="text-gray-500">Ignorés:</span> {batch.skipped_count ?? 0}</div>
              <div><span className="text-gray-500">Audit (mappings):</span> {historyCount ?? 0}</div>
              <div className="sm:col-span-2">
                <span className="text-gray-500 mr-2">Progression:</span>
                {batch.total_lines ? (
                  <>
                    <span className="text-gray-800 font-medium">{Math.min(100, Math.round(((batch.processed_lines ?? 0) / Math.max(1, batch.total_lines)) * 100))}%</span>
                    <div className="h-2 bg-gray-200 rounded mt-2">
                      <div className="h-2 bg-cir-red rounded" style={{ width: `${Math.min(100, Math.round(((batch.processed_lines ?? 0) / Math.max(1, batch.total_lines)) * 100))}%` }} />
                    </div>
                  </>
                ) : (
                  <span className="text-gray-800 font-medium">{batch.processed_lines ?? 0}</span>
                )}
              </div>
              <div className="sm:col-span-2 mt-2">
                <Button
                  variant={batch.status === 'completed' ? 'outline' : 'ghost'}
                  onClick={handleRollback}
                  disabled={batch.status !== 'completed'}
                >
                  Rollback ce lot
                </Button>
                {batch.status !== 'completed' && (
                  <span className="ml-2 text-xs text-gray-500">Disponible uniquement pour les lots en statut completed</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportBatchDetails;
