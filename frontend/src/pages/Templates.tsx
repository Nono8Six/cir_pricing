import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Copy, RefreshCw, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  cirAdminApi,
  type DatasetType,
  type DiffSummary,
  type MappingTemplate
} from '../lib/api/cirAdmin';
import { useAuth } from '../context/AuthContext';

type TemplateStatusFilter = 'active' | 'archived' | 'all';

interface TemplateFormState {
  name: string;
  description: string;
  mapping: string;
  transforms: string;
  isDefault: boolean;
}

const DATASET_LABELS: Record<DatasetType, string> = {
  cir_classification: 'Classifications CIR',
  cir_segment: 'Segments tarifaires CIR'
};

const STATUS_LABELS: Record<TemplateStatusFilter, string> = {
  active: 'Actifs',
  archived: 'Archivés',
  all: 'Tous'
};

const getInitialFormState = (): TemplateFormState => ({
  name: '',
  description: '',
  mapping: '{\n}',
  transforms: '',
  isDefault: false
});

const formatDiff = (diff?: DiffSummary | null): string => {
  if (!diff) return 'Diff inconnue';
  return `+${diff.added} / ~${diff.updated} / -${diff.removed}`;
};

export const TemplatesPage: React.FC = () => {
  const { canManageMappings } = useAuth();
  const hasAccess = canManageMappings();

  const [datasetType, setDatasetType] = useState<DatasetType>('cir_classification');
  const [statusFilter, setStatusFilter] = useState<TemplateStatusFilter>('active');
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionTemplateId, setActionTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MappingTemplate | null>(null);
  const [formState, setFormState] = useState<TemplateFormState>(() => getInitialFormState());
  const [searchTerm, setSearchTerm] = useState('');

  const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cirAdminApi.listTemplates(datasetType, { includeArchived: true });
      setTemplates(data);
    } catch (error) {
      toast.error('Impossible de charger les templates', {
        description: errorMessage(error)
      });
    } finally {
      setLoading(false);
    }
  }, [datasetType]);

  useEffect(() => {
    if (hasAccess) {
      void loadTemplates();
    }
  }, [hasAccess, loadTemplates]);

  useEffect(() => {
    // Reset form whenever the dataset changes
    setSelectedTemplate(null);
    setFormState(getInitialFormState());
    setStatusFilter('active');
  }, [datasetType]);

  const stats = useMemo(() => {
    const active = templates.filter((tpl) => !tpl.is_archived).length;
    const archived = templates.filter((tpl) => tpl.is_archived).length;
    const defaults = templates.filter((tpl) => tpl.is_default).length;
    return {
      total: templates.length,
      active,
      archived,
      defaults
    };
  }, [templates]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      if (statusFilter === 'active' && template.is_archived) return false;
      if (statusFilter === 'archived' && !template.is_archived) return false;

      if (!normalizedSearch) return true;
      return (
        template.name.toLowerCase().includes(normalizedSearch) ||
        (template.description ?? '').toLowerCase().includes(normalizedSearch)
      );
    });
  }, [templates, statusFilter, normalizedSearch]);

  const resetForm = () => {
    setSelectedTemplate(null);
    setFormState(getInitialFormState());
  };

  const startEdit = (template: MappingTemplate) => {
    setSelectedTemplate(template);
    setFormState({
      name: template.name,
      description: template.description ?? '',
      mapping: JSON.stringify(template.mapping ?? {}, null, 2),
      transforms: template.transforms ? JSON.stringify(template.transforms, null, 2) : '',
      isDefault: template.is_default
    });
    if (template.dataset_type !== datasetType) {
      setDatasetType(template.dataset_type);
    }
  };

  const startDuplicate = (template: MappingTemplate) => {
    setSelectedTemplate(null);
    setDatasetType(template.dataset_type);
    setStatusFilter('active');
    setFormState({
      name: `${template.name} (copie)`,
      description: template.description ?? '',
      mapping: JSON.stringify(template.mapping ?? {}, null, 2),
      transforms: template.transforms ? JSON.stringify(template.transforms, null, 2) : '',
      isDefault: false
    });
    toast.success('Template prêt à être dupliqué', {
      description: 'Modifiez le nom puis enregistrez pour créer la copie.'
    });
  };

  const parseMapping = (): Record<string, string> | null => {
    try {
      const parsed = JSON.parse(formState.mapping || '{}');
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error('Le mapping doit être un objet JSON { colonne_excel: colonne_cible }');
      }
      const normalized: Record<string, string> = {};
      Object.entries(parsed).forEach(([key, value]) => {
        normalized[String(key)] = value === undefined || value === null ? '' : String(value);
      });
      return normalized;
    } catch (error) {
      toast.error('Mapping JSON invalide', { description: errorMessage(error) });
      return null;
    }
  };

  const parseTransforms = (): Record<string, unknown> | null => {
    if (!formState.transforms.trim()) return null;
    try {
      const parsed = JSON.parse(formState.transforms);
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error('Les transforms doivent être un objet JSON');
      }
      return parsed as Record<string, unknown>;
    } catch (error) {
      toast.error('Transforms JSON invalides', { description: errorMessage(error) });
      return null;
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!formState.name.trim()) {
      toast.error('Le nom du template est obligatoire');
      return;
    }

    const mapping = parseMapping();
    if (!mapping) return;
    const transforms = parseTransforms();
    if (formState.transforms.trim() && !transforms) return;

    const payload = {
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      datasetType,
      mapping,
      transforms,
      isDefault: formState.isDefault
    };

    try {
      setSaving(true);
      if (selectedTemplate) {
        if (selectedTemplate.is_system) {
          toast.error('Ce template système est en lecture seule.');
          return;
        }
        if (selectedTemplate.is_archived) {
          toast.error('Restaurez le template avant de le modifier.');
          return;
        }
        await cirAdminApi.updateTemplate(selectedTemplate.id, {
          name: payload.name,
          description: payload.description ?? null,
          mapping: payload.mapping,
          transforms: payload.transforms ?? null,
          is_default: payload.isDefault
        });
        toast.success('Template mis à jour');
      } else {
        const createPayload: Parameters<(typeof cirAdminApi)['createTemplate']>[0] = {
          name: payload.name,
          datasetType: payload.datasetType,
          mapping: payload.mapping,
          transforms: payload.transforms ?? null,
          isDefault: payload.isDefault
        };

        if (payload.description) {
          createPayload.description = payload.description;
        }

        await cirAdminApi.createTemplate(createPayload);
        toast.success('Template créé');
      }
      resetForm();
      await loadTemplates();
    } catch (error) {
      toast.error('Impossible d’enregistrer le template', {
        description: errorMessage(error)
      });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (template: MappingTemplate) => {
    if (!confirm(`Archiver le template "${template.name}" ?`)) {
      return;
    }

    try {
      setActionTemplateId(template.id);
      await cirAdminApi.archiveTemplate(template.id);
      toast.success('Template archivé');
      if (selectedTemplate?.id === template.id) {
        resetForm();
      }
      await loadTemplates();
    } catch (error) {
      toast.error('Impossible d’archiver le template', {
        description: errorMessage(error)
      });
    } finally {
      setActionTemplateId(null);
    }
  };

  const handleRestore = async (template: MappingTemplate) => {
    try {
      setActionTemplateId(template.id);
      await cirAdminApi.restoreTemplate(template.id);
      toast.success('Template restauré');
      await loadTemplates();
    } catch (error) {
      toast.error('Impossible de restaurer le template', {
        description: errorMessage(error)
      });
    } finally {
      setActionTemplateId(null);
    }
  };

  if (!hasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accès non autorisé</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Vous devez disposer du rôle administrateur ou responsable pour gérer les templates
            d&apos;import CIR.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formLocked = selectedTemplate?.is_system || selectedTemplate?.is_archived;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des templates d&apos;import CIR</h1>
        <p className="text-sm text-gray-600">
          Créez, dupliquez et archivez les mappings Excel → colonnes CIR. Toutes les données sont
          stockées dans Supabase (table <code>mapping_templates</code>).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-2 rounded-lg bg-white p-1 shadow-sm border border-gray-200">
          {(Object.keys(DATASET_LABELS) as DatasetType[]).map((key) => (
            <Button
              key={key}
              variant={datasetType === key ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setDatasetType(key)}
            >
              {DATASET_LABELS[key]}
            </Button>
          ))}
        </div>

        <div className="inline-flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {(Object.keys(STATUS_LABELS) as TemplateStatusFilter[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                statusFilter === status
                  ? 'bg-cir-red text-white shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Rechercher un template…"
          className="min-w-[200px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-cir-red focus:outline-none focus:ring-2 focus:ring-cir-red/20"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        <Button variant="outline" size="sm" onClick={() => loadTemplates()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Templates actifs</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Archivé</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.archived}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Par défaut</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.defaults}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Total</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr,1fr]">
        <Card>
          <CardHeader className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Templates {DATASET_LABELS[datasetType]}</CardTitle>
              <p className="text-sm text-gray-500">
                {filteredTemplates.length} template(s) •{' '}
                {statusFilter === 'active'
                  ? 'affichage actifs uniquement'
                  : statusFilter === 'archived'
                    ? 'affichage archivés uniquement'
                    : 'affichage complet'}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={resetForm}>
              Nouveau template
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm text-gray-500">Chargement des templates…</p>}
            {!loading && filteredTemplates.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                Aucun template pour ce filtre. Créez-en un ou changez les filtres ci-dessus.
              </div>
            )}

            {!loading &&
              filteredTemplates.map((template) => {
                const isSelected = selectedTemplate?.id === template.id;
                const mappingSize = Object.keys(template.mapping ?? {}).length;
                const lastBatch = template.last_used_batch;

                return (
                  <div
                    key={template.id}
                    className={`rounded-xl border p-4 transition ${
                      isSelected
                        ? 'border-cir-red shadow-lg shadow-cir-red/10 bg-white'
                        : 'border-gray-200 bg-white hover:border-cir-red/60'
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-gray-900">{template.name}</p>
                          {template.is_system && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                              Système
                            </span>
                          )}
                          {template.is_default && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              Par défaut
                            </span>
                          )}
                          {template.is_archived && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              Archivé
                            </span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-600">{template.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Version {template.template_version} • {mappingSize} colonne(s) mappée(s){' '}
                          • MAJ {format(new Date(template.updated_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                        {lastBatch ? (
                          <p className="text-xs text-gray-500">
                            Dernier import : {lastBatch.filename} (
                            {format(new Date(lastBatch.created_at), 'dd/MM/yyyy HH:mm')}) —{' '}
                            {formatDiff(lastBatch.diff_summary)}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400">Jamais utilisé dans un import.</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startDuplicate(template)}
                          disabled={actionTemplateId === template.id}
                        >
                          <Copy className="mr-1.5 h-4 w-4" />
                          Dupliquer
                        </Button>
                        {!template.is_system && !template.is_archived && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(template)}
                            disabled={actionTemplateId === template.id}
                          >
                            Modifier
                          </Button>
                        )}
                        {!template.is_system && !template.is_archived && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleArchive(template)}
                            disabled={actionTemplateId === template.id}
                          >
                            <Archive className="mr-1.5 h-4 w-4" />
                            Archiver
                          </Button>
                        )}
                        {template.is_archived && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleRestore(template)}
                            disabled={actionTemplateId === template.id}
                          >
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            Restaurer
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedTemplate ? 'Modifier le template' : 'Nouveau template'}</CardTitle>
            {selectedTemplate && (
              <p className="text-xs text-gray-500">
                {selectedTemplate.is_system && 'Template système (lecture seule). '}
                {selectedTemplate.is_archived && 'Template archivé, restaurer pour modifier.'}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cir-red focus:outline-none focus:ring-2 focus:ring-cir-red/20"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cir-red focus:outline-none focus:ring-2 focus:ring-cir-red/20"
                rows={2}
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mapping JSON</label>
              <textarea
                className="font-mono text-xs w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-cir-red focus:outline-none focus:ring-2 focus:ring-cir-red/20"
                rows={10}
                value={formState.mapping}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, mapping: event.target.value }))
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                Exemple : {'{ "SEGMENT": "segment", "MARQUE": "marque" }'}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Transforms (optionnel)
              </label>
              <textarea
                className="font-mono text-xs w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-cir-red focus:outline-none focus:ring-2 focus:ring-cir-red/20"
                rows={6}
                value={formState.transforms}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, transforms: event.target.value }))
                }
                placeholder={'{ "fsmega": "Number" }'}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-cir-red focus:ring-cir-red/30"
                checked={formState.isDefault}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, isDefault: event.target.checked }))
                }
              />
              Définir comme template par défaut pour ce dataset
            </label>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => void handleCreateOrUpdate()}
                loading={saving}
                disabled={formLocked}
              >
                {selectedTemplate ? 'Mettre à jour' : 'Créer le template'}
              </Button>
              <Button variant="ghost" onClick={resetForm} disabled={saving}>
                Réinitialiser le formulaire
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
