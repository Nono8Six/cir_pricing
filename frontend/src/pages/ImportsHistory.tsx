import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { History, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../lib/api';
import { Link, useNavigate } from 'react-router-dom';
import type { Tables } from '../types/database.types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

type Batch = Tables<'import_batches'>;
type TypeFilter = 'all' | 'mapping' | 'classification';
type StatusFilter = 'all' | 'pending' | 'completed' | 'failed' | 'rolled_back';

export const ImportsHistory: React.FC = () => {
  const { canManageImports, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    // Rediriger si non-admin (une fois le chargement terminé)
    if (!authLoading && !canManageImports()) {
      toast.error('Accès non autorisé', {
        description: 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.'
      });
      navigate('/dashboard', { replace: true });
    }
  }, [canManageImports, authLoading, navigate]);

  const load = async (): Promise<void> => {
    setLoading(true);
    const { data } = await supabase
      .from('import_batches')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(200);
    setBatches(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && canManageImports()) {
      void load();
    }
  }, [authLoading, canManageImports]);

  const filtered = useMemo(() => {
    return batches.filter(b => {
      if (typeFilter !== 'all' && b.dataset_type !== typeFilter) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (query && !b.filename.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [batches, typeFilter, statusFilter, query]);

  // Afficher un loader pendant la vérification
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cir-red"></div>
      </div>
    );
  }

  // Ne rien afficher si pas autorisé (la redirection est en cours)
  if (!canManageImports()) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Historique des imports</h1>
          <p className="text-sm sm:text-base text-gray-600">Liste des lots d'import, états et métriques</p>
        </div>
        <button onClick={load} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4 mr-2" /> Rafraîchir
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>Lots récents</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Rechercher par nom de fichier..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-transparent" />
            </div>
            <select value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value as TypeFilter)} className="px-3 py-2 border border-gray-300 rounded-lg">
              <option value="all">Tous types</option>
              <option value="mapping">Mappings</option>
              <option value="classification">Classifications</option>
            </select>
            <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as StatusFilter)} className="px-3 py-2 border border-gray-300 rounded-lg">
              <option value="all">Tous statuts</option>
              <option value="pending">pending</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
              <option value="rolled_back">rolled_back</option>
            </select>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Fichier</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Statut</th>
                  <th className="px-3 py-2 text-left">Progression</th>
                  <th className="px-3 py-2 text-left">Créés</th>
                  <th className="px-3 py-2 text-left">MàJ</th>
                  <th className="px-3 py-2 text-left">Ignorés</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Chargement…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Aucun lot</td></tr>
                ) : (
                  filtered.map(b => (
                    <tr key={b.id} className="border-b">
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(b.timestamp).toLocaleString()}</td>
                      <td className="px-3 py-2">{b.filename}</td>
                      <td className="px-3 py-2">{b.dataset_type || '-'}</td>
                      <td className="px-3 py-2">{b.status}</td>
                      <td className="px-3 py-2 min-w-[120px]">
                        {b.total_lines ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 bg-gray-200 rounded w-full">
                              <div className="h-2 bg-cir-red rounded" style={{ width: `${Math.min(100, Math.round(((b.processed_lines ?? 0) / Math.max(1, b.total_lines)) * 100))}%` }} />
                            </div>
                            <span className="text-xs text-gray-600">{Math.min(100, Math.round(((b.processed_lines ?? 0) / Math.max(1, b.total_lines)) * 100))}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{b.created_count ?? 0}</td>
                      <td className="px-3 py-2">{b.updated_count ?? 0}</td>
                      <td className="px-3 py-2">{b.skipped_count ?? 0}</td>
                      <td className="px-3 py-2 text-right">
                        <Link to={"/imports/history/" + b.id} className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Détails</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportsHistory;
