import React from 'react';
import { guessMapping } from './utils';
import { CheckCircle2, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { requiredMappingFields, optionalMappingFields } from '../../schemas/imports/mappingSchema';
import { requiredClassificationFields, optionalClassificationFields } from '../../schemas/imports/classificationSchema';
import { toast } from 'sonner';

interface Props {
  datasetType?: 'mapping' | 'classification';
  columns: Record<string, string>; // fieldKey -> header
  headers?: string[]; // available headers from file
  onChange: (next: Record<string, string>) => void;
}

export const ColumnMapper: React.FC<Props> = ({ datasetType, columns, headers = [], onChange }) => {
  const required = datasetType === 'classification' ? requiredClassificationFields : requiredMappingFields;
  const optional = datasetType === 'classification' ? optionalClassificationFields : optionalMappingFields;

  const setField = (field: string, header: string) => {
    const next = { ...columns, [field]: header };
    onChange(next);
  };

  // Auto-map on mount and when headers/type change: fill only missing fields
  React.useEffect(() => {
    if (!datasetType || headers.length === 0) return;
    const guessed = guessMapping(headers, datasetType);
    const next: Record<string, string> = { ...columns };
    for (const f of [...required, ...optional]) {
      const k = f.key as string;
      if (!next[k] && guessed[k]) next[k] = guessed[k];
    }
    if (JSON.stringify(next) !== JSON.stringify(columns)) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetType, headers.join('|')]);

  const matchedCount = required.filter(f => !!columns[f.key as string]).length;


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Mapping des colonnes</span>
          <span className="text-xs text-gray-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            {matchedCount}/{required.length} requis détectés
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Guidance */}
          <div className="p-4 rounded border bg-gray-50 text-sm text-gray-700">
            <div className="font-medium mb-1">Fichier attendu</div>
            {datasetType === 'mapping' ? (
              <ul className="list-disc ml-5">
                <li>Feuille 1 utilisée par défaut</li>
                <li>Colonnes requises: segment, marque, cat_fab, strategiq (0/1), fsmega, fsfam, fssfa</li>
                <li>Colonnes optionnelles: cat_fab_l (description), codif_fair</li>
                <li>cat_fab sera normalisé en majuscules</li>
              </ul>
            ) : (
              <ul className="list-disc ml-5">
                <li>Feuille 1 utilisée par défaut</li>
                <li>Colonnes requises: fsmega_code, fsmega_designation, fsfam_code, fsfam_designation, fssfa_code, fssfa_designation</li>
                <li>combined_code est optionnel (auto‑calculé si absent): "fsmega_code fsfam_code fssfa_code"</li>
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="font-medium mb-2">Associer les colonnes requises</div>
            <button type="button" onClick={() => {
              if (!datasetType) return;
              const guessed = guessMapping(headers, datasetType);
              
              const next: Record<string, string> = { ...columns };
              let detectedCount = 0;
              for (const f of [...required, ...optional]) {
                const k = f.key as string;
                if (!next[k] && guessed[k]) {
                  next[k] = guessed[k];
                  detectedCount++;
                }
              }
              
              if (JSON.stringify(next) !== JSON.stringify(columns)) {
                onChange(next);
                toast.success(`Auto-map: ${detectedCount} champ${detectedCount > 1 ? 's' : ''} détecté${detectedCount > 1 ? 's' : ''}`);
              } else {
                toast.info('Auto-map: aucune nouvelle correspondance trouvée');
              }
            }} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              <Wand2 className="w-4 h-4" /> Auto‑mapper
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {required.map((f) => (
                <div key={f.key as string}>
                  <label className="block text-xs text-gray-600 mb-1">{f.label} {f.hint ? <span className="text-gray-400">({f.hint})</span> : null}</label>
                  <SearchableSelect
                    value={columns[f.key as string] || 'all'}
                    onValueChange={(val) => setField(f.key as string, val === 'all' ? '' : val)}
                    options={headers.map(h => ({ value: h, label: h }))}
                    placeholder="Sélectionner une colonne"
                    allOptionLabel="— (aucune) —"
                    className="text-sm"
                  />
                  {!columns[f.key as string] && (
                    <div className="mt-1 text-xs text-red-600">Obligatoire</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {optional.length > 0 && (
            <div>
              <div className="font-medium mb-2">Colonnes optionnelles</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {optional.map((f) => (
                  <div key={f.key as string}>
                    <label className="block text-xs text-gray-600 mb-1">{f.label} {f.hint ? <span className="text-gray-400">({f.hint})</span> : null}</label>
                    <SearchableSelect
                      value={columns[f.key as string] || 'all'}
                      onValueChange={(val) => setField(f.key as string, val === 'all' ? '' : val)}
                      options={headers.map(h => ({ value: h, label: h }))}
                      placeholder="Sélectionner une colonne"
                      allOptionLabel="— (aucune) —"
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Résumé */}
          <div className="text-xs text-gray-500">
            Astuce: le nom des colonnes est auto‑détecté (synonymes usuels), vous pouvez corriger manuellement.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ColumnMapper;
