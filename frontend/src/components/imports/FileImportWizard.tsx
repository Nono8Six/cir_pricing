import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Upload, CheckCircle2, FileSpreadsheet, GitMerge } from 'lucide-react';
import { ColumnMapper } from './ColumnMapper';
import { ValidationReport } from './ValidationReport';
import { DiffPreview } from './DiffPreview';
import * as XLSX from 'xlsx';
import { guessMapping } from './utils';
import { mappingRowSchema, requiredMappingFields } from '../../schemas/imports/mappingSchema';
import { classificationRowSchema, requiredClassificationFields } from '../../schemas/imports/classificationSchema';
import { mappingApi, cirClassificationApi } from '../../lib/supabaseClient';
import { supabase } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type DatasetType = 'mapping' | 'classification';

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5; // Type, File, Columns, Validation, Diff, Apply

type Draft = {
  datasetType?: DatasetType;
  fileName?: string;
  fileSize?: number;
  // Columns mapping is intentionally loose at this stage (skeleton)
  columns?: Record<string, string>;
  // Placeholder summaries to display in steps (populated in later phases)
  validation?: { errors: number; warnings: number };
  diff?: { unchanged: number; create: number; update: number; conflict: number };
  step?: WizardStep;
};

const DRAFT_KEY = 'import-wizard-draft';

function loadDraft(): Draft | undefined {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as Draft;
  } catch {
    return undefined;
  }
}

function saveDraft(d: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // ignore
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export const FileImportWizard: React.FC = () => {
  const draft = loadDraft();
  const navigate = useNavigate();
  const [datasetType, setDatasetType] = useState<DatasetType | undefined>(draft?.datasetType);
  const [fileName, setFileName] = useState<string | undefined>(draft?.fileName);
  const [fileSize, setFileSize] = useState<number | undefined>(draft?.fileSize);
  const [columns, setColumns] = useState<Record<string, string>>(draft?.columns || {});
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [errorsCsv, setErrorsCsv] = useState<string | null>(null);
  const [examples, setExamples] = useState<{ total: number; sample: any[] } | undefined>(undefined);
  const [applyLoading, setApplyLoading] = useState(false);
  const [resolutions, setResolutions] = useState<Record<string, { action: 'keep' | 'replace' | 'merge'; fieldChoices?: Record<string, 'existing' | 'import'> }>>({});
  const { user } = useAuth();
  const [fileObj, setFileObj] = useState<File | null>(null); // not persisted
  const [diffRows, setDiffRows] = useState<any[]>([]);
  const [validation, setValidation] = useState<Draft['validation']>(draft?.validation);
  const [diff, setDiff] = useState<Draft['diff']>(draft?.diff);
  const [step, setStep] = useState<WizardStep>(draft?.step ?? 0);

  // Persist draft on any relevant change
  useEffect(() => {
    saveDraft({ datasetType, fileName, fileSize, columns, validation, diff, step });
  }, [datasetType, fileName, fileSize, columns, validation, diff, step]);

  // Re-guess mapping when dataset type changes and headers already loaded
  useEffect(() => {
    if (datasetType && headers.length) {
      const guessed = guessMapping(headers, datasetType);
      setColumns((prev) => ({ ...guessed, ...prev }));
    }
  }, [datasetType]);

  const steps = useMemo(
    () => [
      { key: 0 as WizardStep, label: 'Type' },
      { key: 1 as WizardStep, label: 'Fichier' },
      { key: 2 as WizardStep, label: 'Colonnes' },
      { key: 3 as WizardStep, label: 'Validation' },
      { key: 4 as WizardStep, label: 'Diff & Conflits' },
      { key: 5 as WizardStep, label: 'Appliquer' },
    ],
    []
  );

  const canNext = useMemo(() => {
    if (step === 0) return !!datasetType;
    if (step === 1) return !!fileName;
    if (step === 2) {
      // required fields must be mapped
      const required = datasetType === 'classification' ? requiredClassificationFields : requiredMappingFields;
      return required.every((f) => columns[f.key as string]);
    }
    if (step === 3) {
      return (validation?.errors ?? 0) === 0;
    }
    if (step === 4) return !!diff; // Step 4: Diff & Conflicts
    if (step === 5) return true; // Step 5: Apply - always allow finish
    // Steps 2..5 are placeholders; allow navigation for now
    return true;
  }, [datasetType, fileName, step, columns, validation]);

  const goNext = () => {
    if (step === 5) {
      // Finish wizard - clean up and redirect to imports history
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (e) {
        console.warn('Could not clear draft:', e);
      }
      navigate('/imports/history');
      return;
    }
    setStep((s) => (s < 5 ? ((s + 1) as WizardStep) : s));
  };
  const goPrev = () => setStep((s) => (s > 0 ? ((s - 1) as WizardStep) : s));

  const resetWizard = () => {
    setDatasetType(undefined);
    setFileName(undefined);
    setFileSize(undefined);
    setColumns({});
    setValidation(undefined);
    setDiff(undefined);
    setStep(0);
    clearDraft();
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center overflow-x-auto">
            {steps.map((s, idx) => {
              const isActive = s.key === step;
              const isDone = s.key < step;
              return (
                <div key={s.key} className={`flex items-center flex-1 min-w-[160px] px-4 py-3 border-b ${isActive ? 'border-cir-red' : 'border-gray-200'}`}>
                  <div className={`flex items-center ${isActive ? 'text-cir-red' : 'text-gray-600'}`}>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                    ) : s.key === 1 ? (
                      <Upload className="w-4 h-4 mr-2" />
                    ) : s.key === 2 ? (
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                    ) : s.key === 4 ? (
                      <GitMerge className="w-4 h-4 mr-2" />
                    ) : (
                      <div className="w-4 h-4 mr-2 rounded-full border border-current" />
                    )}
                    <span className="text-sm font-medium">{idx + 1}. {s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step content */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Choisir le type de données</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                variant={datasetType === 'mapping' ? 'primary' : 'outline'}
                onClick={() => setDatasetType('mapping')}
              >
                Mappings segments
              </Button>
              <Button
                variant={datasetType === 'classification' ? 'primary' : 'outline'}
                onClick={() => setDatasetType('classification')}
              >
                Classifications CIR
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Importer un fichier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setFileObj(f);
                  setFileName(f.name);
                  setFileSize(f.size);
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const data = new Uint8Array(ev.target?.result as ArrayBuffer);
                    const wb = XLSX.read(data, { type: 'array' });
                    const sheetName = wb.SheetNames[0];
                    const ws = wb.Sheets[sheetName];
                    // Extract headers from first row for robustness
                    const rowsArray = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
                    const hdrRow = (rowsArray[0] || []).map((x) => String(x ?? '').trim()).filter(Boolean);
                    const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
                    setRawRows(json as any[]);
                    setHeaders(hdrRow);
                    if (datasetType) {
                      const guessed = guessMapping(hdrRow, datasetType);
                      setColumns((prev) => ({ ...guessed, ...prev }));
                    }
                    setExamples({ total: (json as any[]).length, sample: (json as any[]).slice(0, 5) });
                  };
                  reader.readAsArrayBuffer(f);
                }}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              {fileName && (
                <div className="text-sm text-gray-600">Sélectionné: {fileName} {fileSize ? `(${Math.round(fileSize/1024)} Ko)` : ''}</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <ColumnMapper
          datasetType={datasetType}
          columns={columns}
          headers={headers}
          onChange={setColumns}
        />
      )}

      {step === 3 && (
        <ValidationReport
          validation={validation}
          onSetValidation={setValidation}
          errorsCsv={errorsCsv}
          examples={examples}
        />
      )}

      {step === 4 && (
        <DiffPreview
          diff={diff}
          onSetDiff={setDiff}
          items={diffRows}
          datasetType={datasetType}
          resolutions={resolutions}
          onResolveChange={(key, res) => setResolutions((prev) => ({ ...prev, [key]: res }))}
          onBulkResolve={(status, action) => {
            const next = { ...resolutions } as any;
            diffRows.filter(r => r.status === status).forEach(r => {
              next[r.key] = { action };
            });
            setResolutions(next);
          }}
        />
      )}

      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Appliquer les changements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-700">
              <div>Type: <span className="font-medium">{datasetType || '—'}</span></div>
              <div>Fichier: <span className="font-medium">{fileName || '—'}</span></div>
              <div>Validation: <span className="font-medium">{validation ? `${validation.errors} erreurs, ${validation.warnings} avertissements` : '—'}</span></div>
              <div>Diff: <span className="font-medium">{diff ? `new ${diff.create}, update ${diff.update}, conflicts ${diff.conflict}, unchanged ${diff.unchanged}` : '—'}</span></div>
              <div className="text-gray-500">Choisissez le mode d'import :</div>
            </div>
            
            <div className="mt-4 space-y-4">
              {/* Import mode selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Import direct (recommandé pour &lt;1000 lignes)
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Traitement immédiat dans le navigateur</li>
                    <li>• Résout automatiquement les conflits selon vos choix</li>
                    <li>• Audit détaillé de chaque modification</li>
                    <li>• ⚠️ Peut ralentir sur gros fichiers</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Import en arrière-plan (pour gros volumes)
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Traitement asynchrone sur le serveur</li>
                    <li>• Progression visible en temps réel</li>
                    <li>• Idéal pour fichiers volumineux (&gt;1000 lignes)</li>
                    <li>• ⚠️ Les conflits seront remplacés automatiquement</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={async () => {
                if (!datasetType || !fileName) {
                  console.error('❌ Missing datasetType or fileName');
                  toast.error('Données manquantes pour l\'import');
                  return;
                }
                if (!diff) {
                  console.error('❌ Missing diff data');
                  toast.error('Pas de données de différence calculées');
                  return;
                }
                try {
                  setApplyLoading(true);
                  const batchStats = {
                    total_lines: rawRows.length,
                    processed_lines: 0,
                    error_lines: validation?.errors || 0,
                    warnings: [],
                    comment: 'Import Center Wizard'
                  } as any;
                  const batch = await mappingApi.createImportBatch(fileName, user?.id || '', batchStats);

                  await supabase.rpc('set_current_batch_id', { batch_uuid: batch.id });
                  await supabase.rpc('set_change_reason', { reason: batch.id });

                  const getRes = (key: string) => resolutions[key] || { action: 'replace' as const };
                  let created = 0, updated = 0, skipped = 0;

                  if (datasetType === 'mapping') {
                    const creates: any[] = [];
                    const updates: any[] = [];
                    for (const it of diffRows) {
                      const res = getRes(it.key);
                      if (it.status === 'unchanged') { skipped++; continue; }
                      if (it.status === 'create') {
                        if (res.action === 'keep') { skipped++; continue; }
                        const after = { ...it.after };
                        creates.push({ ...after, created_by: user?.id, source_type: 'excel_upload', batch_id: batch.id });
                        created++;
                        continue;
                      }
                      if (res.action === 'keep') { skipped++; continue; }
                      let finalRow = { ...it.before, ...it.after };
                      if (res.action === 'merge' && res.fieldChoices) {
                        finalRow = { ...it.before };
                        for (const f of it.changedFields || []) {
                          finalRow[f] = res.fieldChoices[f] === 'existing' ? it.before?.[f] : it.after?.[f];
                        }
                      }
                      updates.push({ ...finalRow, batch_id: batch.id, source_type: 'excel_upload' });
                      updated++;
                    }
                    if (creates.length) {
                      const chunk = 500;
                      for (let i = 0; i < creates.length; i += chunk) {
                        const slice = creates.slice(i, i + chunk);
                        const { error } = await supabase.from('brand_category_mappings').insert(slice);
                        if (error) throw error;
                      }
                    }
                    if (updates.length) {
                      for (const u of updates) {
                        const updateFields = { ...u } as any;
                        delete updateFields.id;
                        delete updateFields.classif_cir; // Generated column
                        delete updateFields.natural_key; // Generated column
                        await supabase
                          .from('brand_category_mappings')
                          .update(updateFields)
                          .eq('marque', u.marque)
                          .eq('cat_fab', u.cat_fab);
                      }
                    }
                  } else if (datasetType === 'classification') {
                    const creates: any[] = [];
                    const updates: any[] = [];
                    for (const it of diffRows) {
                      const res = getRes(it.key);
                      if (it.status === 'unchanged') { skipped++; continue; }
                      if (it.status === 'create') {
                        if (res.action === 'keep') { skipped++; continue; }
                        creates.push(it.after);
                        created++;
                      } else {
                        if (res.action === 'keep') { skipped++; continue; }
                        let finalRow = { ...it.before, ...it.after };
                        if (res.action === 'merge' && res.fieldChoices) {
                          finalRow = { ...it.before };
                          for (const f of it.changedFields || []) {
                            finalRow[f] = res.fieldChoices[f] === 'existing' ? it.before?.[f] : it.after?.[f];
                          }
                        }
                        updates.push(finalRow);
                        updated++;
                      }
                    }
                    if (creates.length) {
                      const chunk = 500;
                      for (let i = 0; i < creates.length; i += chunk) {
                        const slice = creates.slice(i, i + chunk);
                        const { error } = await supabase.from('cir_classifications').insert(slice);
                        if (error) throw error;
                      }
                    }
                    if (updates.length) {
                      for (const u of updates) {
                        const upd: any = { ...u };
                        delete upd.id;
                        await supabase
                          .from('cir_classifications')
                          .update(upd)
                          .eq('combined_code', u.combined_code);
                      }
                    }
                  }

                  await supabase.rpc('clear_audit_context');
                  await supabase
                    .from('import_batches')
                    .update({
                      dataset_type: datasetType,
                      created_count: created,
                      updated_count: updated,
                      skipped_count: skipped,
                      processed_lines: created + updated + skipped,
                      status: 'completed'
                    })
                    .eq('id', batch.id);

                  toast.success(`Import appliqué: ${created} créés, ${updated} mis à jour, ${skipped} ignorés`);
                } catch (e: any) {
                  console.error(e);
                  toast.error(e?.message || 'Erreur application import');
                } finally {
                  setApplyLoading(false);
                }
              }} loading={applyLoading} disabled={!datasetType || !fileName || !diff}>
                🚀 Import direct ({rawRows.length} lignes)
              </Button>

              <Button variant="outline" onClick={async () => {
                if (!datasetType || !fileObj || !fileName) {
                  toast.error('Sélectionne un type et un fichier');
                  return;
                }
                try {
                  setApplyLoading(true);
                  // 1) Upload dans Storage
                  const key = `uploads/${Date.now()}_${fileName}`;
                  const { error: upErr } = await supabase.storage.from('imports').upload(key, fileObj, { upsert: true });
                  if (upErr) throw upErr;

                  // 2) Créer le lot
                  const batchStats: any = {
                    total_lines: rawRows.length,
                    processed_lines: 0,
                    error_lines: validation?.errors || 0,
                    warnings: [],
                    comment: 'Async import via wizard',
                    dataset_type: datasetType,
                    file_url: key,
                    mapping: columns
                  };
                  const batch = await mappingApi.createImportBatch(fileName, user?.id || '', batchStats);

                  // 3) Appeler la function Edge
                  const { error: fnErr } = await supabase.functions.invoke('process-import', {
                    body: {
                      batch_id: batch.id,
                      dataset_type: datasetType,
                      file_path: key,
                      mapping: columns
                    }
                  });
                  if (fnErr) throw fnErr;

                  toast.success('Import asynchrone lancé');
                  navigate(`/imports/history/${batch.id}`);
                } catch (e: any) {
                  console.error(e);
                  toast.error(e?.message || 'Erreur lancement import asynchrone');
                } finally {
                  setApplyLoading(false);
                }
              }} disabled={!datasetType || !fileObj}>⏱️ Import en arrière-plan</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={resetWizard}>Réinitialiser l'assistant</Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={goPrev} disabled={step === 0}>Précédent</Button>
          <Button onClick={() => {
            if (step === 2) {
              // Run validation when leaving mapping step
              const schema = datasetType === 'classification' ? classificationRowSchema : mappingRowSchema;
              const mapped = rawRows.map((r) => {
                const o: any = {};
                Object.entries(columns).forEach(([field, header]) => {
                  if (!header) return;
                  o[field] = (r as any)[header];
                });
                return o;
              });
              const failures: Array<{ row: number; field: string; message: string; value: any }> = [];
              mapped.forEach((row, idx) => {
                const res = schema.safeParse(row);
                if (!res.success) {
                  res.error.issues.forEach((iss) => {
                    failures.push({ row: idx + 2, field: (iss.path[0] as string) || '', message: iss.message, value: (row as any)[iss.path[0] as string] });
                  });
                }
              });
              const warnCount = 0;
              setValidation({ errors: failures.length, warnings: warnCount });
              if (failures.length) {
                // create CSV data URL
                const header = 'row,field,message,value\n';
                const csv = header + failures.map(f => `${f.row},${f.field},"${String(f.message).replace(/"/g,'')}","${String(f.value ?? '').toString().replace(/"/g,'')}"`).join('\n');
                const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
                setErrorsCsv(url);
              } else {
                setErrorsCsv(null);
              }
            }
            if (step === 3) {
              // Compute diff before entering step 4
              (async () => {
                const schema = datasetType === 'classification' ? classificationRowSchema : mappingRowSchema;
                const mapped = rawRows.map((r) => {
                  const obj: any = {};
                  Object.entries(columns).forEach(([field, header]) => {
                    if (!header) return;
                    obj[field] = (r as any)[header];
                  });
                  return obj;
                });

                // Validate rows and transform
                const valid: any[] = [];
                mapped.forEach((row) => {
                  const res = schema.safeParse(row);
                  if (res.success) valid.push(res.data);
                });

                if (datasetType === 'mapping') {
                  // Create natural keys
                  const keys = Array.from(new Set(valid.map(v => `${String(v.marque).toLowerCase()}|${String(v.cat_fab).toUpperCase()}`)));
                  const batchSize = 1000;
                  const existing: any[] = [];
                  for (let i = 0; i < keys.length; i += batchSize) {
                    const slice = keys.slice(i, i + batchSize);
                    const part = await mappingApi.getMappingsByKeys(slice);
                    existing.push(...(part || []));
                  }
                  const mapExisting = new Map(existing.map((e) => [e.natural_key ?? `${String(e.marque).toLowerCase()}|${String(e.cat_fab).toUpperCase()}`, e]));
                  const sensitive = ['segment','marque','cat_fab','strategiq','fsmega','fsfam','fssfa'];
                  const nonSensitive = ['cat_fab_l','codif_fair'];
                  const counts = { unchanged: 0, create: 0, update: 0, conflict: 0 };
                  const rows: any[] = [];
                  for (const v of valid) {
                    const key = `${String(v.marque).toLowerCase()}|${String(v.cat_fab).toUpperCase()}`;
                    const before = mapExisting.get(key);
                    if (!before) {
                      counts.create++;
                      rows.push({ key, status: 'create', before: null, after: v });
                      continue;
                    }
                    // compare fields
                    const changedFields: string[] = [];
                    for (const f of [...sensitive, ...nonSensitive]) {
                      if (String(before[f] ?? '') !== String((v as any)[f] ?? '')) changedFields.push(f);
                    }
                    const sensChanged = changedFields.some((f) => sensitive.includes(f));
                    const nonSensChanged = changedFields.some((f) => nonSensitive.includes(f));
                    if (!sensChanged && !nonSensChanged) {
                      counts.unchanged++;
                      rows.push({ key, status: 'unchanged', before, after: v, changedFields });
                    } else if (sensChanged) {
                      counts.conflict++;
                      rows.push({ key, status: 'conflict', before, after: v, changedFields, sensitiveChanged: true });
                    } else {
                      counts.update++;
                      rows.push({ key, status: 'update', before, after: v, changedFields });
                    }
                  }
                  setDiff(counts);
                  setDiffRows(rows);
                } else if (datasetType === 'classification') {
                  const codes = Array.from(new Set(valid.map(v => String(v.combined_code))));
                  const batchSize = 1000;
                  const existing: any[] = [];
                  for (let i = 0; i < codes.length; i += batchSize) {
                    const slice = codes.slice(i, i + batchSize);
                    const part = await cirClassificationApi.getByCodes(slice);
                    existing.push(...(part || []));
                  }
                  const mapExisting = new Map(existing.map((e) => [e.combined_code, e]));
                  const counts = { unchanged: 0, create: 0, update: 0, conflict: 0 };
                  const rows: any[] = [];
                  for (const v of valid) {
                    const before = mapExisting.get(String(v.combined_code));
                    if (!before) {
                      counts.create++;
                      rows.push({ key: v.combined_code, status: 'create', before: null, after: v });
                      continue;
                    }
                    const fields = ['fsmega_code','fsmega_designation','fsfam_code','fsfam_designation','fssfa_code','fssfa_designation','combined_code'];
                    const changedFields: string[] = fields.filter((f) => String(before[f] ?? '') !== String((v as any)[f] ?? ''));
                    if (changedFields.length === 0) {
                      counts.unchanged++;
                      rows.push({ key: v.combined_code, status: 'unchanged', before, after: v, changedFields });
                    } else {
                      // No conflict concept here yet → mark as update
                      counts.update++;
                      rows.push({ key: v.combined_code, status: 'update', before, after: v, changedFields });
                    }
                  }
                  setDiff(counts);
                  setDiffRows(rows);
                }
              })().finally(() => {
                // nothing
              });
            }
            goNext();
          }} disabled={!canNext}>{step === 5 ? 'Terminer' : 'Suivant'}</Button>
        </div>
      </div>
    </div>
  );
};

export default FileImportWizard;
