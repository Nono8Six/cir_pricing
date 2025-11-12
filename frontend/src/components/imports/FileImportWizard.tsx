import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import {
  cirAdminApi,
  computeDiff,
  getExistingClassificationsMap,
  getExistingSegmentsMap,
  applyClassificationImport,
  applySegmentImport,
  type DiffSummary,
  type PreparedClassificationImport,
  type PreparedSegmentImport,
  type MappingTemplate
} from '../../lib/api/cirAdmin';
import {
  CIR_CLASSIFICATION_COLUMN_MAPPINGS,
  DEFAULT_COLUMN_MAPPINGS,
  type BrandMappingOutput,
  type CirClassificationOutput
} from '../../lib/schemas';

type DatasetType = 'cir_classification' | 'cir_segment';

interface WorkbookData {
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'number';
}

const CLASSIFICATION_FIELDS: FieldDefinition[] = [
  { key: 'fsmega_code', label: 'Code FSMEGA', required: true, type: 'number' },
  { key: 'fsmega_designation', label: 'Désignation FSMEGA', required: true, type: 'text' },
  { key: 'fsfam_code', label: 'Code FSFAM', required: true, type: 'number' },
  { key: 'fsfam_designation', label: 'Désignation FSFAM', required: true, type: 'text' },
  { key: 'fssfa_code', label: 'Code FSSFA', required: true, type: 'number' },
  { key: 'fssfa_designation', label: 'Désignation FSSFA', required: true, type: 'text' },
  { key: 'combined_code', label: 'Code combiné (1 10 10)', required: true, type: 'text' },
  { key: 'combined_designation', label: 'Désignation combinée', required: true, type: 'text' }
];

const SEGMENT_FIELDS: FieldDefinition[] = [
  { key: 'segment', label: 'Segment', required: true, type: 'text' },
  { key: 'marque', label: 'Marque', required: true, type: 'text' },
  { key: 'cat_fab', label: 'Catégorie fabricant', required: true, type: 'text' },
  { key: 'cat_fab_l', label: 'Description catégorie', required: false, type: 'text' },
  { key: 'strategiq', label: 'Stratégique (0/1)', required: true, type: 'number' },
  { key: 'codif_fair', label: 'Code FAIR', required: false, type: 'text' },
  { key: 'fsmega', label: 'FSMEGA', required: true, type: 'number' },
  { key: 'fsfam', label: 'FSFAM', required: true, type: 'number' },
  { key: 'fssfa', label: 'FSSFA', required: true, type: 'number' },
  { key: 'classif_cir', label: 'Code CIR combiné', required: false, type: 'text' }
];

const SEGMENT_VARIATIONS: Record<string, string[]> = {
  ...DEFAULT_COLUMN_MAPPINGS,
  classif_cir: ['CLASSIFCIR', 'CLASSIF_CIR', 'CLASSIF CIR', 'CODE CIR', 'CIR CODE']
};

const STEPS = [
  { key: 0, label: 'Dataset & Template' },
  { key: 1, label: 'Fichier' },
  { key: 2, label: 'Colonnes' },
  { key: 3, label: 'Analyse & Import' }
] as const;

type Step = typeof STEPS[number]['key'];

const normalize = (value?: string | number | null) =>
  (value ?? '').toString().trim().toLowerCase();

const parseNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const isClassificationEqual = (a: CirClassificationOutput, b: CirClassificationOutput): boolean => (
  a.fsmega_code === b.fsmega_code &&
  a.fsmega_designation === b.fsmega_designation &&
  a.fsfam_code === b.fsfam_code &&
  a.fsfam_designation === b.fsfam_designation &&
  a.fssfa_code === b.fssfa_code &&
  a.fssfa_designation === b.fssfa_designation &&
  (a.combined_designation ?? '') === (b.combined_designation ?? '')
);

const isSegmentEqual = (a: BrandMappingOutput, b: BrandMappingOutput): boolean => (
  a.segment === b.segment &&
  a.marque === b.marque &&
  a.cat_fab === b.cat_fab &&
  (a.cat_fab_l ?? '') === (b.cat_fab_l ?? '') &&
  a.strategiq === b.strategiq &&
  (a.codif_fair ?? '') === (b.codif_fair ?? '') &&
  a.fsmega === b.fsmega &&
  a.fsfam === b.fsfam &&
  a.fssfa === b.fssfa &&
  ((a as Record<string, unknown>).classif_cir ?? '') === ((b as Record<string, unknown>).classif_cir ?? '')
);

const DEFAULT_TEMPLATE_FIELDS: Record<DatasetType, FieldDefinition[]> = {
  cir_classification: CLASSIFICATION_FIELDS,
  cir_segment: SEGMENT_FIELDS
};

const DEFAULT_VARIATIONS: Record<DatasetType, Record<string, string[]>> = {
  cir_classification: CIR_CLASSIFICATION_COLUMN_MAPPINGS,
  cir_segment: SEGMENT_VARIATIONS
};

async function readWorkbook(file: File): Promise<WorkbookData> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    blankrows: false
  });

  const headers = ((json[0] ?? []) as (string | number | null | undefined)[])
    .map((cell) => (cell ?? '').toString().trim());

  const rows = json.slice(1) as (string | number | null | undefined)[][];
  return { headers, rows };
}

function autoMapFields(
  datasetType: DatasetType,
  headers: string[],
  templateMapping?: Record<string, string> | null
): Record<string, string> {
  if (templateMapping && Object.keys(templateMapping).length > 0) {
    return { ...templateMapping };
  }

  const fieldMap: Record<string, string> = {};
  const variations = DEFAULT_VARIATIONS[datasetType];
  const normalizedHeaders = headers.map((header) => ({
    raw: header,
    normalized: normalize(header)
  }));

  Object.entries(variations).forEach(([field, names]) => {
    const match = normalizedHeaders.find((header) =>
      names.some((name) => normalize(name) === header.normalized)
    );
    if (match) {
      fieldMap[field] = match.raw;
    }
  });

  return fieldMap;
}

function mapRowValues(
  row: (string | number | null | undefined)[],
  headers: string[],
  mapping: Record<string, string>,
  field: string
): string | number | null | undefined {
  const headerName = mapping[field];
  if (!headerName) return undefined;
  const index = headers.findIndex((header) => normalize(header) === normalize(headerName));
  if (index === -1) return undefined;
  return row[index];
}

function buildClassificationRows(
  workbook: WorkbookData,
  mapping: Record<string, string>
): { rows: CirClassificationOutput[]; info: string[]; skipped: number } {
  const rows: CirClassificationOutput[] = [];
  const info: string[] = [];
  let skipped = 0;

  workbook.rows.forEach((row, index) => {
    if (!row || row.every((cell) => cell === null || cell === undefined || cell === '')) {
      return;
    }

    const lineNumber = index + 2;
    const fsmega_code = parseNumber(mapRowValues(row, workbook.headers, mapping, 'fsmega_code'));
    const fsfam_code = parseNumber(mapRowValues(row, workbook.headers, mapping, 'fsfam_code'));
    const fssfa_code = parseNumber(mapRowValues(row, workbook.headers, mapping, 'fssfa_code'));
    const fsmega_designation = (mapRowValues(row, workbook.headers, mapping, 'fsmega_designation') ?? '').toString().trim();
    const fsfam_designation = (mapRowValues(row, workbook.headers, mapping, 'fsfam_designation') ?? '').toString().trim();
    const fssfa_designation = (mapRowValues(row, workbook.headers, mapping, 'fssfa_designation') ?? '').toString().trim();
    const combined_code = (mapRowValues(row, workbook.headers, mapping, 'combined_code') ?? '').toString().trim();
    const combined_designation = (mapRowValues(row, workbook.headers, mapping, 'combined_designation') ?? '').toString().trim();

    const missing: string[] = [];
    if (fsmega_code === null) missing.push('fsmega_code');
    if (fsfam_code === null) missing.push('fsfam_code');
    if (fssfa_code === null) missing.push('fssfa_code');
    if (!fsmega_designation) missing.push('fsmega_designation');
    if (!fsfam_designation) missing.push('fsfam_designation');
    if (!fssfa_designation) missing.push('fssfa_designation');
    if (!combined_code) missing.push('combined_code');
    if (!combined_designation) missing.push('combined_designation');

    if (missing.length > 0) {
      info.push(`Ligne ${lineNumber}: champs manquants (${missing.join(', ')})`);
      skipped++;
      return;
    }

    rows.push({
      fsmega_code: fsmega_code as number,
      fsmega_designation,
      fsfam_code: fsfam_code as number,
      fsfam_designation,
      fssfa_code: fssfa_code as number,
      fssfa_designation,
      combined_code,
      combined_designation
    });
  });

  return { rows, info, skipped };
}

function buildSegmentRows(
  workbook: WorkbookData,
  mapping: Record<string, string>
): { rows: BrandMappingOutput[]; info: string[]; skipped: number } {
  const rows: BrandMappingOutput[] = [];
  const info: string[] = [];
  let skipped = 0;

  workbook.rows.forEach((row, index) => {
    if (!row || row.every((cell) => cell === null || cell === undefined || cell === '')) {
      return;
    }

    const lineNumber = index + 2;
    const segment = (mapRowValues(row, workbook.headers, mapping, 'segment') ?? '').toString().trim();
    const marque = (mapRowValues(row, workbook.headers, mapping, 'marque') ?? '').toString().trim();
    const cat_fab = (mapRowValues(row, workbook.headers, mapping, 'cat_fab') ?? '').toString().trim();
    const cat_fab_l = (mapRowValues(row, workbook.headers, mapping, 'cat_fab_l') ?? '').toString().trim() || null;
    const strategiq = parseNumber(mapRowValues(row, workbook.headers, mapping, 'strategiq')) ?? 0;
    const codif_fair = (mapRowValues(row, workbook.headers, mapping, 'codif_fair') ?? '').toString().trim() || null;
    const fsmega = parseNumber(mapRowValues(row, workbook.headers, mapping, 'fsmega'));
    const fsfam = parseNumber(mapRowValues(row, workbook.headers, mapping, 'fsfam'));
    const fssfa = parseNumber(mapRowValues(row, workbook.headers, mapping, 'fssfa'));
    const classif_cir = (mapRowValues(row, workbook.headers, mapping, 'classif_cir') ?? '').toString().trim() || null;

    const missing: string[] = [];
    if (!segment) missing.push('segment');
    if (!marque) missing.push('marque');
    if (!cat_fab) missing.push('cat_fab');
    if (fsmega === null) missing.push('fsmega');
    if (fsfam === null) missing.push('fsfam');
    if (fssfa === null) missing.push('fssfa');

    if (missing.length > 0) {
      info.push(`Ligne ${lineNumber}: champs manquants (${missing.join(', ')})`);
      skipped++;
      return;
    }

    rows.push({
      segment,
      marque,
      cat_fab,
      cat_fab_l,
      strategiq,
      codif_fair,
      fsmega: fsmega as number,
      fsfam: fsfam as number,
      fssfa: fssfa as number,
      classif_cir: classif_cir ?? `${fsmega} ${fsfam} ${fssfa}`
    } as BrandMappingOutput);
  });

  return { rows, info, skipped };
}

export const FileImportWizard: React.FC = () => {
  const [step, setStep] = useState<Step>(0);
  const [datasetType, setDatasetType] = useState<DatasetType | null>(null);
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [workbookData, setWorkbookData] = useState<WorkbookData | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [prepared, setPrepared] = useState<PreparedClassificationImport | PreparedSegmentImport | null>(null);
  const [diffSummary, setDiffSummary] = useState<DiffSummary | null>(null);
  const [infoMessages, setInfoMessages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    if (!datasetType) {
      setTemplates([]);
      setSelectedTemplateId(null);
      setFieldMapping({});
      return;
    }

    setLoadingTemplates(true);
    cirAdminApi
      .listTemplates(datasetType)
      .then((data) => setTemplates(data))
      .catch((error) => toast.error('Impossible de charger les templates', { description: String(error) }))
      .finally(() => setLoadingTemplates(false));
  }, [datasetType]);

  const currentFields = useMemo(() => {
    if (!datasetType) return [];
    return DEFAULT_TEMPLATE_FIELDS[datasetType];
  }, [datasetType]);

  const handleDatasetSelect = (type: DatasetType) => {
    setDatasetType(type);
    setSelectedTemplateId(null);
    setFieldMapping({});
    setHeaders([]);
    setWorkbookData(null);
    setFile(null);
    setPrepared(null);
    setDiffSummary(null);
    setInfoMessages([]);
    setStep(0);
  };

  const handleTemplateChange = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((tpl) => tpl.id === templateId);
    if (template) {
      setFieldMapping({ ...template.mapping });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setPrepared(null);
    setDiffSummary(null);
    setInfoMessages([]);

    try {
      const workbook = await readWorkbook(selectedFile);
      setWorkbookData(workbook);
      setHeaders(workbook.headers);

      if (datasetType) {
        const autoMapping = autoMapFields(datasetType, workbook.headers, fieldMapping);
        setFieldMapping(autoMapping);
      }

      toast.success('Fichier chargé', { description: `${selectedFile.name} (${selectedFile.size} octets)` });
    } catch (error) {
      toast.error('Lecture du fichier impossible', { description: String(error) });
    }
  };

  const validateMapping = (): string[] => {
    if (!datasetType) return [];
    const missing: string[] = [];
    DEFAULT_TEMPLATE_FIELDS[datasetType].forEach((field) => {
      if (field.required && !fieldMapping[field.key]) {
        missing.push(field.label);
      }
    });
    return missing;
  };

  const runAnalysis = async () => {
    if (!datasetType || !file || !workbookData) return;
    const mappingIssues = validateMapping();
    if (mappingIssues.length > 0) {
      toast.error('Champs obligatoires non mappés', { description: mappingIssues.join(', ') });
      return;
    }

    setIsAnalyzing(true);
    try {
      let rows: CirClassificationOutput[] | BrandMappingOutput[] = [];
      let info: string[] = [];
      let skipped = 0;

      if (datasetType === 'cir_classification') {
        const result = buildClassificationRows(workbookData, fieldMapping);
        rows = result.rows;
        info = result.info;
        skipped = result.skipped;

        const existing = await getExistingClassificationsMap();
        const diff = computeDiff(rows, existing, (row) => row.combined_code, isClassificationEqual);

        const preparedData: PreparedClassificationImport = {
          file,
          rows,
          diffSummary: diff,
          info,
          totalLines: workbookData.rows.length,
          skippedLines: skipped,
          mapping: fieldMapping,
          templateId: selectedTemplateId
        };

        setPrepared(preparedData);
        setDiffSummary(diff);
        setInfoMessages(info);
      } else {
        const result = buildSegmentRows(workbookData, fieldMapping);
        rows = result.rows;
        info = result.info;
        skipped = result.skipped;

        const existing = await getExistingSegmentsMap();
        const diff = computeDiff(rows, existing, (row) => row.segment, isSegmentEqual);

        const preparedData: PreparedSegmentImport = {
          file,
          rows,
          diffSummary: diff,
          info,
          totalLines: workbookData.rows.length,
          skippedLines: skipped,
          mapping: fieldMapping,
          templateId: selectedTemplateId
        };

        setPrepared(preparedData);
        setDiffSummary(diff);
        setInfoMessages(info);
      }

      setStep(3);
      toast.success('Analyse terminée', { description: 'Diff calculé, prêt à importer.' });
    } catch (error) {
      toast.error('Analyse impossible', { description: String(error) });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyImport = async () => {
    if (!prepared || !datasetType) return;
    setIsApplying(true);
    try {
      const result = datasetType === 'cir_classification'
        ? await applyClassificationImport(prepared as PreparedClassificationImport, { templateId: selectedTemplateId })
        : await applySegmentImport(prepared as PreparedSegmentImport, { templateId: selectedTemplateId });

      toast.success('Import appliqué', { description: `Batch ${result.batchId}` });
      setPrepared(null);
      setDiffSummary(null);
      setInfoMessages([]);
      setFile(null);
      setWorkbookData(null);
      setHeaders([]);
      setStep(0);
    } catch (error) {
      toast.error('Import impossible', { description: String(error) });
    } finally {
      setIsApplying(false);
    }
  };

  const saveTemplate = async () => {
    if (!datasetType) {
      toast.error('Sélectionnez un dataset avant de créer un template');
      return;
    }
    if (!templateName.trim()) {
      toast.error('Nom du template requis');
      return;
    }

    setSavingTemplate(true);
    try {
      const payload: {
        name: string;
        datasetType: DatasetType;
        mapping: Record<string, string>;
        description?: string;
        isDefault: boolean;
      } = {
        name: templateName.trim(),
        datasetType,
        mapping: fieldMapping,
        isDefault: false
      };

      if (templateDescription.trim()) {
        payload.description = templateDescription.trim();
      }

      await cirAdminApi.createTemplate(payload);

      toast.success('Template enregistré');
      setTemplateName('');
      setTemplateDescription('');
      const updated = await cirAdminApi.listTemplates(datasetType);
      setTemplates(updated);
    } catch (error) {
      toast.error('Impossible de sauvegarder le template', { description: String(error) });
    } finally {
      setSavingTemplate(false);
    }
  };

  const mappingComplete = useMemo(() => validateMapping().length === 0, [fieldMapping, datasetType]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assistant d'import CIR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            {STEPS.map((s) => (
              <div key={s.key} className={`flex-1 border-b-2 pb-1 text-center text-sm ${step === s.key ? 'border-cir-red text-cir-red font-semibold' : 'border-gray-200 text-gray-500'}`}>
                {s.label}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Sélection du dataset</p>
                <div className="flex gap-3">
                  <Button
                    variant={datasetType === 'cir_classification' ? 'primary' : 'outline'}
                    onClick={() => handleDatasetSelect('cir_classification')}
                  >
                    Classifications CIR
                  </Button>
                  <Button
                    variant={datasetType === 'cir_segment' ? 'primary' : 'outline'}
                    onClick={() => handleDatasetSelect('cir_segment')}
                  >
                    Segments tarifaires
                  </Button>
                </div>
              </div>

              {datasetType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template existant</label>
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={selectedTemplateId ?? ''}
                    onChange={(e) => handleTemplateChange(e.target.value || null)}
                    disabled={loadingTemplates}
                  >
                    <option value="">Aucun template</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id as string} value={tpl.id as string}>
                        {tpl.name as string}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(1)}
                  disabled={!datasetType}
                >
                  Continuer
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fichier Excel</label>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                {file && (
                  <p className="text-sm text-gray-500 mt-2">
                    {file.name} — {(file.size / 1024).toFixed(1)} Ko
                  </p>
                )}
              </div>

              {headers.length > 0 && (
                <div className="text-sm text-gray-600">
                  Colonnes détectées : {headers.join(', ')}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)}>Retour</Button>
                <Button onClick={() => setStep(2)} disabled={!file || headers.length === 0}>
                  Continuer
                </Button>
              </div>
            </div>
          )}

          {step === 2 && datasetType && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Associer les colonnes</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (workbookData) {
                      const auto = autoMapFields(datasetType, workbookData.headers, selectedTemplateId ? fieldMapping : undefined);
                      setFieldMapping(auto);
                    }
                  }}
                  disabled={!workbookData}
                >
                  Re-détecter automatiquement
                </Button>
              </div>

              <div className="space-y-3">
                {currentFields.map((field) => (
                  <div key={field.key} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {field.label} {field.required && <span className="text-cir-red">*</span>}
                    </span>
                    <select
                      className="border rounded-md px-3 py-2"
                      value={fieldMapping[field.key] ?? ''}
                      onChange={(e) => setFieldMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    >
                      <option value="">— Sélectionner —</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header || '(colonne vide)'}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="border rounded-md p-4 space-y-2">
                <p className="text-sm font-semibold">Enregistrer comme template</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    className="border rounded-md px-3 py-2"
                    placeholder="Nom du template"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                  <input
                    className="border rounded-md px-3 py-2"
                    placeholder="Description (optionnelle)"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                  />
                </div>
                <Button onClick={saveTemplate} disabled={!templateName.trim() || !mappingComplete || savingTemplate}>
                  Sauvegarder ce mapping
                </Button>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
                <Button onClick={runAnalysis} disabled={!mappingComplete || isAnalyzing}>
                  {isAnalyzing ? 'Analyse en cours...' : 'Analyser et comparer'}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && prepared && diffSummary && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm text-blue-700">Ajouts</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-bold text-blue-900">{diffSummary.added}</CardContent>
                </Card>
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm text-yellow-700">Mises à jour</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-bold text-yellow-900">{diffSummary.updated}</CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm text-red-700">Supprimés</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-bold text-red-900">{diffSummary.removed}</CardContent>
                </Card>
                <Card className="bg-gray-50 border-gray-200">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm text-gray-700">Identiques</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-bold text-gray-900">{diffSummary.unchanged}</CardContent>
                </Card>
              </div>

              {infoMessages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-gray-700">Infos / avertissements</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-48 overflow-auto text-sm text-gray-600 space-y-1">
                    {infoMessages.map((msg, index) => (
                      <div key={index}>• {msg}</div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>Retour</Button>
                <Button onClick={applyImport} disabled={isApplying}>
                  {isApplying ? 'Import en cours...' : 'Appliquer l’import'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
