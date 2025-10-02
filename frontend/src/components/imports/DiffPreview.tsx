import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface Props {
  diff?: { unchanged: number; create: number; update: number; conflict: number };
  onSetDiff: (d: { unchanged: number; create: number; update: number; conflict: number }) => void;
  items?: Array<{ key: string; status: string; before?: any; after?: any; changedFields?: string[] }>;
  datasetType?: 'mapping' | 'classification';
  resolutions?: Record<string, { action: 'keep' | 'replace' | 'merge'; fieldChoices?: Record<string, 'existing' | 'import'> }>;
  onResolveChange?: (key: string, res: { action: 'keep' | 'replace' | 'merge'; fieldChoices?: Record<string, 'existing' | 'import'> }) => void;
  onBulkResolve?: (status: string, action: 'keep' | 'replace') => void;
}

export const DiffPreview: React.FC<Props> = ({ diff, onSetDiff, items = [], datasetType, resolutions = {}, onResolveChange, onBulkResolve }) => {
  // Placeholder: set a fake diff on first mount to enable navigation
  useEffect(() => {
    if (!diff) {
      onSetDiff({ unchanged: 0, create: 0, update: 0, conflict: 0 });
    }
  }, []);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const filtered = useMemo(() => {
    const def = items;
    const anyConflict = def.some(i => i.status === 'conflict');
    const anyUpdate = def.some(i => i.status === 'update');
    const anyCreate = def.some(i => i.status === 'create');
    
    // Auto-select the best filter based on what's available
    let autoFilter = 'all';
    if (anyConflict) autoFilter = 'conflict';
    else if (anyUpdate) autoFilter = 'update'; 
    else if (anyCreate) autoFilter = 'create';
    
    const filter = statusFilter || autoFilter;

    const result = def.filter(i => filter === 'all' ? true : i.status === filter);
    return result;
  }, [items, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const visible = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const fieldsByType = datasetType === 'classification'
    ? ['fsmega_code','fsmega_designation','fsfam_code','fsfam_designation','fssfa_code','fssfa_designation','combined_code']
    : ['segment','marque','cat_fab','cat_fab_l','strategiq','fsmega','fsfam','fssfa','codif_fair'];

  const changedFields = (it: any) => it.changedFields || fieldsByType.filter((f) => String(it.before?.[f] ?? '') !== String(it.after?.[f] ?? ''));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diff & Conflits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="p-3 rounded bg-gray-50 border">
            <div className="text-gray-500">Inchangés</div>
            <div className="text-lg font-semibold">{diff?.unchanged ?? 0}</div>
          </div>
          <div className="p-3 rounded bg-blue-50 border border-blue-100">
            <div className="text-blue-700">Créations</div>
            <div className="text-lg font-semibold text-blue-900">{diff?.create ?? 0}</div>
          </div>
          <div className="p-3 rounded bg-amber-50 border border-amber-100">
            <div className="text-amber-700">Mises à jour</div>
            <div className="text-lg font-semibold text-amber-900">{diff?.update ?? 0}</div>
          </div>
          <div className="p-3 rounded bg-red-50 border border-red-100">
            <div className="text-red-700">Conflits</div>
            <div className="text-lg font-semibold text-red-900">{diff?.conflict ?? 0}</div>
          </div>
        </div>
        {/* Outils */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="conflict">Conflits ({items.filter(i => i.status === 'conflict').length})</option>
              <option value="update">Mises à jour ({items.filter(i => i.status === 'update').length})</option>
              <option value="create">Créations ({items.filter(i => i.status === 'create').length})</option>
              <option value="all">Tous ({items.length})</option>
            </select>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value={25}>25 par page</option>
              <option value={50}>50 par page</option>
              <option value={100}>100 par page</option>
              <option value={200}>200 par page</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {onBulkResolve && (
              <>
                <Button variant="outline" size="sm" onClick={() => onBulkResolve(statusFilter === 'all' ? 'conflict' : statusFilter, 'keep')}>Tout garder (existant)</Button>
                <Button size="sm" onClick={() => onBulkResolve(statusFilter === 'all' ? 'conflict' : statusFilter, 'replace')}>Tout remplacer (import)</Button>
              </>
            )}
          </div>
        </div>
        
        {/* Pagination en haut */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div>Affichage {Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filtered.length, currentPage * pageSize)} sur {filtered.length} éléments</div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Précédent
              </Button>
              <span className="px-3 py-1 bg-gray-100 rounded">{currentPage} / {totalPages}</span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}

        {/* Tableau simple */}
        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Clé</th>
                <th className="px-3 py-2 text-left">Statut</th>
                <th className="px-3 py-2 text-left">Détails des changements</th>
                <th className="px-3 py-2 text-left">Décision</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((it) => {
                const cf = changedFields(it);
                const res = resolutions[it.key] || { action: 'replace' as const };
                return (
                  <tr key={it.key} className="border-b">
                    <td className="px-3 py-2 font-mono text-xs">{it.key}</td>
                    <td className="px-3 py-2">{it.status}</td>
                    <td className="px-3 py-2">
                      {cf.length ? (
                        <div className="space-y-2 max-w-md">
                          {cf.map((f) => (
                            <div key={f} className="p-2 bg-gray-50 rounded text-xs">
                              <div className="font-medium text-gray-700 mb-1">{f}</div>
                              <div className="grid grid-cols-1 gap-1">
                                <div className="text-red-600">Existant: <span className="font-mono bg-red-50 px-1 rounded">{String(it.before?.[f] ?? '—')}</span></div>
                                <div className="text-green-600">Import: <span className="font-mono bg-green-50 px-1 rounded">{String(it.after?.[f] ?? '—')}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1 text-xs">
                          <input type="radio" name={`res-${it.key}`} checked={res.action==='keep'} onChange={() => onResolveChange && onResolveChange(it.key, { action: 'keep' })} /> Garder
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs">
                          <input type="radio" name={`res-${it.key}`} checked={res.action==='replace'} onChange={() => onResolveChange && onResolveChange(it.key, { action: 'replace' })} /> Remplacer
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs">
                          <input type="radio" name={`res-${it.key}`} checked={res.action==='merge'} onChange={() => onResolveChange && onResolveChange(it.key, { action: 'merge', fieldChoices: res.fieldChoices || {} })} /> Fusionner
                        </label>
                      </div>
                      {res.action === 'merge' && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cf.map((f) => (
                            <div key={f} className="border rounded p-2">
                              <div className="text-xs font-medium mb-1">{f}</div>
                              <div className="text-[11px] text-gray-500 mb-1">Avant: {String(it.before?.[f] ?? '—')}</div>
                              <div className="text-[11px] text-gray-500 mb-2">Après: {String(it.after?.[f] ?? '—')}</div>
                              <div className="flex items-center gap-2 text-xs">
                                <label className="inline-flex items-center gap-1">
                                  <input type="radio" name={`merge-${it.key}-${f}`} checked={(res.fieldChoices||{})[f] !== 'import'} onChange={() => onResolveChange && onResolveChange(it.key, { action: 'merge', fieldChoices: { ...(res.fieldChoices||{}), [f]: 'existing' } })} /> Existant
                                </label>
                                <label className="inline-flex items-center gap-1">
                                  <input type="radio" name={`merge-${it.key}-${f}`} checked={(res.fieldChoices||{})[f] === 'import'} onChange={() => onResolveChange && onResolveChange(it.key, { action: 'merge', fieldChoices: { ...(res.fieldChoices||{}), [f]: 'import' } })} /> Import
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination en bas */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Précédent
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>  
                    <span className="px-2">...</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)}>{totalPages}</Button>
                  </>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiffPreview;
