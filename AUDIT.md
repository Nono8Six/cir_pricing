# Audit Technique & Roadmap de Refactoring – CIR Pricing

> Objectif : plateforme production-ready sans données factices, sécurisée, typée et performante.
> Chaque tâche doit être validée avec preuve (commit, test, capture).

---

## 📋 LÉGENDE DES PRIORITÉS

- **P0** : Critique – Bloque la production ou pose un risque sécurité majeur
- **P1** : Urgent – Nécessaire pour fonctionnalités core et qualité code
- **P2** : Important – Améliore l'expérience dev et la maintenabilité
- **P3** : Nice-to-have – Optimisations futures

**Estimation totale réaliste : 4-6 semaines**

---

## PHASE 1 – FONDATIONS CRITIQUES (Semaine 1-2)

### 1. 🔒 Sécurité des Secrets & Configuration [P0] ✅

**Problème** : `.env` commis avec clés Supabase en clair, violation sécurité majeure.

- [x] **P0** ~~Révoquer immédiatement `VITE_SUPABASE_ANON_KEY` exposée~~ → **N/A** (jamais commitée, régénérée manuellement)
- [x] **P0** ~~Générer nouveau couple URL/clé~~ → **Fait manuellement**
- [x] **P0** Vérifier que `.env*` est bien dans `.gitignore` → **Confirmé ligne 25** ✓
- [x] **P0** ~~Nettoyer l'historique git avec BFG~~ → **N/A** (vérifié: 0 commits .env dans historique)
- [x] **P1** Documenter procédure rotation clés → **SECRETS_ROTATION.md créé** ✓
- [x] **P1** Validation env vars avec Zod → **frontend/src/lib/env.ts créé** ✓
- [x] **P1** Créer template .env → **.env.example créé** ✓
- [x] **P1** Migrer api.ts vers env validé → **frontend/src/lib/api.ts mis à jour** ✓

**Durée réelle** : 15 min (vs estimée 2-3h car pas de nettoyage git requis)
**Commit** : `3b70a79` - feat: implement Phase 1 security hardening [P0]

---

### 2. ⚙️ Configuration TypeScript Stricte [P0]

**Problème** : `strict: false`, `noUnusedLocals: false` → violations massives de CLAUDE.md

- [ ] **P0** Activer dans `frontend/tsconfig.json` :
  ```json
  {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
  ```
- [ ] **P0** Corriger toutes les erreurs TypeScript révélées (estimation : 50-100 erreurs)
- [ ] **P0** Supprimer **tous** les `@ts-nocheck` (10 fichiers identifiés) :
  - `excelParser.ts`
  - `Mapping.tsx`
  - `CirClassificationUploadTab.tsx`
  - `AuthContext.tsx`
  - `Button.tsx`
  - `MappingPreviewTable.tsx`
  - `MappingSettingsTab.tsx`
  - `MappingAnalyticsTab.tsx`
  - `MappingHistoryTab.tsx`
  - `ImportHistoryDashboard.tsx`
- [ ] **P1** Ajouter types de retour explicites à toutes fonctions exportées
- [ ] **P1** Remplacer tous les `any` par types appropriés ou `unknown` avec validation

**Durée estimée** : 3-4 jours

---

### 3. 📦 Installation Dépendances Manquantes [P0]

**Problème** : react-query et react-hook-form **absents** du package.json mais requis par CLAUDE.md

- [ ] **P0** Installer dépendances core :
  ```bash
  cd frontend
  npm install @tanstack/react-query @tanstack/react-query-devtools
  npm install react-hook-form @hookform/resolvers
  ```
- [ ] **P0** Configurer QueryClientProvider dans `main.tsx` :
  ```typescript
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5 * 60 * 1000, retry: 1 }
    }
  });

  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
  ```
- [ ] **P1** Ajouter React Query DevTools en mode dev uniquement

**Durée estimée** : 1 heure

---

### 4. 🧹 Nettoyage du Code [P1] ✅

- [x] **P1** Supprimer **tous** les `console.log` et `console.debug` → **28 suppressions** ✓
  - `excelParser.ts` : 16 logs avec emojis 📊
  - `DiffPreview.tsx` : 2 logs debug
  - `FileImportWizard.tsx` : 3 logs + 2 debug
  - `ColumnMapper.tsx` : 2 debug
  - `utils.ts` : 2 debug
  - `FileImportWizard.tsx` : 1 debug validation
- [x] **P1** Garder `console.error`/`console.warn` pour tracking production → **Conservés** ✓
- [ ] **P2** Supprimer imports inutilisés (ESLint `--fix`)
- [ ] **P2** Formatter tout le code (`prettier --write src/`)

**Durée réelle** : 20 min
**Commit** : `39366b9` - chore: remove all console.log and console.debug statements [P1]

---

## PHASE 2 – BACKEND & SÉCURITÉ (Semaine 2-3)

### 5. 🔐 Sécurité Supabase & Optimisation RLS [P0]

**Problème** : 20 advisors sécurité + 34 advisors performance détectés

#### 5.1 Sécurité Fonctions SQL
- [ ] **P0** Ajouter `SECURITY DEFINER` + `search_path` immutable à **18 fonctions** :
  ```sql
  -- Exemple pour get_total_segments_count
  CREATE OR REPLACE FUNCTION public.get_total_segments_count()
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT COUNT(DISTINCT segment)::integer FROM brand_category_mappings;
  $$;
  ```
- [ ] **P0** Appliquer à toutes les fonctions listées par advisor

#### 5.2 Optimisation RLS Policies
- [ ] **P1** Optimiser 6 policies RLS avec re-évaluation `auth.*()` :
  ```sql
  -- AVANT (lent)
  CREATE POLICY "Users can read" ON import_batches
    FOR SELECT USING (auth.uid() = user_id);

  -- APRÈS (rapide)
  CREATE POLICY "Users can read" ON import_batches
    FOR SELECT USING ((SELECT auth.uid()) = user_id);
  ```
  - `brand_mapping_history` : 2 policies
  - `import_batches` : 4 policies

#### 5.3 Consolidation Policies Multiples
- [ ] **P1** Fusionner policies permissives multiples (6 tables concernées) :
  ```sql
  -- Exemple brand_category_mappings : 2 policies SELECT → 1 seule
  DROP POLICY "Admins can manage brand mappings" ON brand_category_mappings;
  DROP POLICY "Authenticated users can read brand mappings" ON brand_category_mappings;

  CREATE POLICY "Users can read brand mappings" ON brand_category_mappings
    FOR SELECT USING (
      auth.role() = 'authenticated' -- tous peuvent lire
    );

  CREATE POLICY "Privileged users manage brand mappings" ON brand_category_mappings
    FOR ALL USING (private.is_admin() OR private.can_manage_pricing());
  ```

#### 5.4 Index & Maintenance
- [ ] **P2** Supprimer index dupliqué `idx_clients_group` (garder `idx_clients_group_id`)
- [ ] **P3** Analyser usage des 27 index inutilisés (attendre données réelles avant suppression)

#### 5.5 Supabase Platform
- [ ] **P1** Activer "Leaked Password Protection" dans Auth Settings
- [ ] **P2** Réduire Auth OTP expiry à < 1h (Settings → Auth → Email)
- [ ] **P2** Planifier upgrade Postgres vers version sans CVE (Dashboard → Database → Upgrade)

**Durée estimée** : 2-3 jours

---

### 6. 🏗️ Architecture Backend & Edge Functions [P1]

**Problème** : `process-import` a client Supabase dans try/catch (hors scope en cas d'erreur)

- [ ] **P1** Refactorer `supabase/functions/process-import/index.ts` :
  ```typescript
  import { createClient } from '@supabase/supabase-js';

  // ✅ Initialiser AVANT Deno.serve
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  Deno.serve(async (req) => {
    try {
      const { batch_id } = await req.json();
      // utiliser 'supabase' ici
    } catch (err) {
      // 'supabase' accessible ici pour update status
      await supabase.from('import_batches')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', batch_id);
    }
  });
  ```
- [ ] **P1** Ajouter validation Zod du request body :
  ```typescript
  const requestSchema = z.object({
    batch_id: z.string().uuid(),
    dataset_type: z.enum(['mapping', 'classification']),
    file_path: z.string(),
    mapping: z.record(z.string())
  });
  ```
- [ ] **P1** Structurer réponses JSON avec schéma cohérent :
  ```typescript
  type SuccessResponse = { success: true; data: { processed: number } };
  type ErrorResponse = { success: false; error: string; code?: string };
  ```
- [ ] **P2** Ajouter throttling configurable (env var `MAX_BATCH_SIZE`, `MAX_CONCURRENCY`)
- [ ] **P3** Support imports CSV volumineux (streaming via Storage)

**Durée estimée** : 1-2 jours

---

### 7. 🗄️ Nettoyage & Gouvernance des Données [P1]

- [ ] **P1** Vérifier qu'aucune migration ne contient de `INSERT` hardcodé (audit fait : OK ✓)
- [ ] **P1** Créer script seed idempotent `supabase/seed/dev-data.sql` :
  ```sql
  -- Utiliser ON CONFLICT pour idempotence
  INSERT INTO groups (id, name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Groupe Test A'),
    ('00000000-0000-0000-0000-000000000002', 'Groupe Test B')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO clients (id, name, siret, group_id) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Client Demo 1', '12345678901234', '00000000-0000-0000-0000-000000000001')
  ON CONFLICT (id) DO NOTHING;
  ```
- [ ] **P2** Documenter stratégie seed data (dev vs staging vs prod)
- [ ] **P3** Configurer job cron Supabase pour purge `import_batches` > 180 jours
- [ ] **P3** Ajouter soft delete sur tables critiques (colonne `deleted_at`, policies adaptées)

**Durée estimée** : 1 jour

---

## PHASE 3 – FRONTEND & FEATURES (Semaine 3-4)

### 8. ⚛️ Migration Frontend vers React Query & React Hook Form [P0]

#### 8.1 Couche API Centralisée
- [ ] **P0** Créer `src/lib/api/` avec modules par entité :
  ```typescript
  // src/lib/api/clients.ts
  import { supabase } from '../supabase';
  import { z } from 'zod';

  const clientSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    siret: z.string().nullable(),
    group_id: z.string().uuid().nullable(),
    created_at: z.string(),
    updated_at: z.string()
  });

  export type Client = z.infer<typeof clientSchema>;

  export async function fetchClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');

    if (error) throw new Error(`Failed to fetch clients: ${error.message}`);
    return z.array(clientSchema).parse(data);
  }

  export async function createClient(input: Omit<Client, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('clients')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to create client: ${error.message}`);
    return clientSchema.parse(data);
  }
  ```
- [ ] **P0** Créer modules pour : `clients.ts`, `groups.ts`, `prices.ts`, `mappings.ts`, `classifications.ts`

#### 8.2 Hooks React Query
- [ ] **P0** Créer hooks personnalisés `src/hooks/` :
  ```typescript
  // src/hooks/useClients.ts
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
  import { fetchClients, createClient } from '../lib/api/clients';

  export function useClients() {
    return useQuery({
      queryKey: ['clients'],
      queryFn: fetchClients
    });
  }

  export function useCreateClient() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: createClient,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      }
    });
  }
  ```

#### 8.3 Migration Composants
- [ ] **P1** Migrer `Clients.tsx` vers useClients hook (supprimer useState + useEffect)
- [ ] **P1** Migrer `GroupsPage.tsx` vers useGroups hook
- [ ] **P1** Migrer `DashboardPage.tsx` vers useStats hook (voir section 10)
- [ ] **P1** Migrer `Mapping.tsx` vers useMappings hook

#### 8.4 Formulaires avec React Hook Form
- [ ] **P1** Refactorer `ClientFormModal.tsx` :
  ```typescript
  import { useForm } from 'react-hook-form';
  import { zodResolver } from '@hookform/resolvers/zod';
  import { z } from 'zod';

  const clientFormSchema = z.object({
    name: z.string().min(1, 'Nom requis'),
    siret: z.string().length(14, 'SIRET 14 chiffres').optional(),
    group_id: z.string().uuid().nullable()
  });

  type ClientFormData = z.infer<typeof clientFormSchema>;

  function ClientFormModal() {
    const { register, handleSubmit, formState: { errors } } = useForm<ClientFormData>({
      resolver: zodResolver(clientFormSchema)
    });

    const createMutation = useCreateClient();

    const onSubmit = (data: ClientFormData) => {
      createMutation.mutate(data);
    };

    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <input {...register('name')} />
        {errors.name && <span>{errors.name.message}</span>}
      </form>
    );
  }
  ```
- [ ] **P1** Refactorer `GroupFormModal.tsx` avec react-hook-form + zod
- [ ] **P1** Refactorer `MappingModal.tsx` avec react-hook-form + zod

**Durée estimée** : 4-5 jours

---

### 9. 📊 Dashboard & Analytics Réels [P0]

**Problème** : Toutes les stats sont hardcodées à "0" (StatsCards, MarginDistribution, RecentPrices)

#### 9.1 RPCs Supabase pour Agrégats
- [ ] **P0** Créer `supabase/migrations/YYYYMMDDHHMMSS_dashboard_rpcs.sql` :
  ```sql
  -- Stats globales
  CREATE OR REPLACE FUNCTION get_dashboard_stats()
  RETURNS JSON
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT json_build_object(
      'total_clients', (SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL),
      'total_prices', (SELECT COUNT(*) FROM prices WHERE active = true),
      'avg_margin_pct', (SELECT ROUND(AVG(margin_pct)::numeric, 2) FROM prices WHERE active = true AND margin_pct IS NOT NULL)
    );
  $$;

  -- Distribution des marges
  CREATE OR REPLACE FUNCTION get_margin_distribution()
  RETURNS JSON
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT json_build_object(
      'low', (SELECT COUNT(*) FROM prices WHERE active = true AND margin_pct < 15),
      'medium', (SELECT COUNT(*) FROM prices WHERE active = true AND margin_pct BETWEEN 15 AND 30),
      'high', (SELECT COUNT(*) FROM prices WHERE active = true AND margin_pct > 30)
    );
  $$;

  -- Prix récents
  CREATE OR REPLACE FUNCTION get_recent_prices(limit_count INT DEFAULT 10)
  RETURNS TABLE (
    id UUID,
    client_name TEXT,
    reference TEXT,
    price_ht NUMERIC,
    margin_pct NUMERIC,
    created_at TIMESTAMPTZ
  )
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT
      p.id,
      c.name as client_name,
      p.reference,
      p.price_ht,
      p.margin_pct,
      p.created_at
    FROM prices p
    LEFT JOIN clients c ON p.client_id = c.id
    WHERE p.active = true
    ORDER BY p.created_at DESC
    LIMIT limit_count;
  $$;
  ```

#### 9.2 Migration Composants Dashboard
- [ ] **P0** Créer `src/lib/api/dashboard.ts` :
  ```typescript
  export async function fetchDashboardStats() {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (error) throw error;
    return data;
  }

  export async function fetchMarginDistribution() {
    const { data, error } = await supabase.rpc('get_margin_distribution');
    if (error) throw error;
    return data;
  }

  export async function fetchRecentPrices(limit = 10) {
    const { data, error } = await supabase.rpc('get_recent_prices', { limit_count: limit });
    if (error) throw error;
    return data;
  }
  ```

- [ ] **P0** Refactorer `StatsCards.tsx` :
  ```typescript
  import { useQuery } from '@tanstack/react-query';
  import { fetchDashboardStats } from '../../lib/api/dashboard';

  export const StatsCards: React.FC = () => {
    const { data: stats, isLoading } = useQuery({
      queryKey: ['dashboard', 'stats'],
      queryFn: fetchDashboardStats
    });

    if (isLoading) return <StatsCardsSkeleton />;

    return (
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardContent>
            <p>Clients Actifs</p>
            <p className="text-3xl font-bold">{stats?.total_clients ?? 0}</p>
          </CardContent>
        </Card>
        {/* ... */}
      </div>
    );
  };
  ```

- [ ] **P0** Refactorer `MarginDistribution.tsx` avec `useQuery` + RPC
- [ ] **P0** Refactorer `RecentPrices.tsx` avec `useQuery` + RPC
- [ ] **P1** Ajouter composants Skeleton pour loading states
- [ ] **P1** Ajouter ErrorBoundary pour erreurs runtime
- [ ] **P2** Ajouter graphique évolution marges (recharts) avec données réelles

**Durée estimée** : 2-3 jours

---

### 10. 📤 Flux d'Import – Qualité & Résilience [P1]

**Problème** : Diff factice injecté, pas de validation côté client, pas de dry-run

#### 10.1 Validation Côté Client
- [ ] **P1** Améliorer validation dans `excelParser.ts` :
  ```typescript
  export function parseExcelFile(file: File): Promise<ParseResult> {
    // ... parsing ...

    const validationErrors: ValidationError[] = [];

    for (const [index, row] of rows.entries()) {
      const result = rowSchema.safeParse(row);
      if (!result.success) {
        validationErrors.push({
          row: index + 2, // +2 pour header + index 0-based
          field: result.error.issues[0].path[0],
          message: result.error.issues[0].message,
          value: row[result.error.issues[0].path[0]]
        });
      }
    }

    if (validationErrors.length > 0) {
      return {
        success: false,
        errors: validationErrors,
        stats: { total: rows.length, valid: 0, invalid: validationErrors.length }
      };
    }

    return {
      success: true,
      data: validRows,
      stats: { total: rows.length, valid: validRows.length, invalid: 0 }
    };
  }
  ```

- [ ] **P1** Afficher erreurs détaillées dans UI avant upload :
  ```typescript
  // Si parseResult.success === false
  <Card>
    <CardHeader>
      <CardTitle className="text-red-600">⚠️ {parseResult.errors.length} erreurs détectées</CardTitle>
    </CardHeader>
    <CardContent>
      <Button onClick={() => downloadErrorsCSV(parseResult.errors)}>
        Télécharger rapport d'erreurs (CSV)
      </Button>
      <Table>
        {parseResult.errors.map(err => (
          <tr>
            <td>Ligne {err.row}</td>
            <td>{err.field}</td>
            <td>{err.message}</td>
            <td>{err.value}</td>
          </tr>
        ))}
      </Table>
    </CardContent>
  </Card>
  ```

#### 10.2 Dry-Run & Diff Réel
- [ ] **P0** Créer RPC `preview_import_diff` dans Supabase :
  ```sql
  CREATE OR REPLACE FUNCTION preview_import_diff(
    dataset_type TEXT,
    import_data JSONB
  )
  RETURNS JSON
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
  DECLARE
    result JSON;
    create_count INT := 0;
    update_count INT := 0;
    conflict_count INT := 0;
    unchanged_count INT := 0;
  BEGIN
    -- Logique de comparaison avec données existantes
    -- Retourner { diff: {...}, items: [...] }

    RETURN result;
  END;
  $$;
  ```

- [ ] **P0** Supprimer injection diff factice dans `DiffPreview.tsx` (lignes 16-21) :
  ```typescript
  // ❌ SUPPRIMER
  useEffect(() => {
    if (!diff) {
      onSetDiff({ unchanged: 0, create: 0, update: 0, conflict: 0 });
    }
  }, []);
  ```

- [ ] **P0** Appeler RPC dry-run avant upload :
  ```typescript
  const { data: diffPreview } = await supabase.rpc('preview_import_diff', {
    dataset_type: 'mapping',
    import_data: validatedRows
  });

  setDiff(diffPreview.diff);
  setDiffItems(diffPreview.items);
  ```

#### 10.3 Améliorations UX
- [ ] **P1** Ajouter étape confirmation explicite (modal résumé avant import)
- [ ] **P2** Stocker rapports import dans `storage.imports-reports/` (JSON)
- [ ] **P3** Notification email/Slack en cas d'échec (via Supabase Edge Function + webhook)

**Durée estimée** : 3-4 jours

---

### 11. 🎨 UX, Design System & Accessibilité (shadcn/ui) [P2]

**Objectif** : Harmoniser UI avec shadcn/ui, composants réutilisables, dark mode

#### 11.1 Migration vers shadcn/ui
- [ ] **P2** Installer shadcn/ui CLI :
  ```bash
  npx shadcn-ui@latest init
  ```
- [ ] **P2** Configurer `components.json` :
  ```json
  {
    "style": "default",
    "rsc": false,
    "tsx": true,
    "tailwind": {
      "config": "tailwind.config.js",
      "css": "src/index.css",
      "baseColor": "slate",
      "cssVariables": true
    },
    "aliases": {
      "components": "@/components",
      "utils": "@/lib/utils"
    }
  }
  ```

- [ ] **P2** Installer composants shadcn nécessaires :
  ```bash
  npx shadcn-ui@latest add button card input label select dialog toast skeleton alert table
  ```

- [ ] **P2** Migrer composants custom vers shadcn :
  - Remplacer `src/components/ui/Button.tsx` par shadcn Button
  - Remplacer `src/components/ui/Card.tsx` par shadcn Card
  - Utiliser shadcn Dialog pour modals
  - Utiliser shadcn Toast (sonner) pour notifications

#### 11.2 Palette & Tokens
- [ ] **P2** Définir palette dans `tailwind.config.js` :
  ```javascript
  module.exports = {
    theme: {
      extend: {
        colors: {
          border: "hsl(var(--border))",
          input: "hsl(var(--input))",
          ring: "hsl(var(--ring))",
          background: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          primary: {
            DEFAULT: "hsl(var(--primary))",
            foreground: "hsl(var(--primary-foreground))",
          },
          // ... shadcn default palette
        },
      },
    },
  };
  ```

- [ ] **P2** Ajouter CSS variables dans `src/index.css` (généré par shadcn init)

#### 11.3 Dark Mode
- [ ] **P2** Installer next-themes :
  ```bash
  npm install next-themes
  ```
- [ ] **P2** Configurer ThemeProvider :
  ```typescript
  // src/components/theme-provider.tsx
  import { ThemeProvider as NextThemesProvider } from "next-themes"

  export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </NextThemesProvider>
    )
  }
  ```
- [ ] **P2** Ajouter toggle dark mode dans Navbar
- [ ] **P2** Tester tous les composants en mode sombre

#### 11.4 Composants Manquants
- [ ] **P2** Ajouter Skeleton pour loading states (déjà dans shadcn)
- [ ] **P2** Standardiser Toast notifications (remplacer sonner custom si besoin)
- [ ] **P3** Créer Storybook pour documentation composants (optionnel)

#### 11.5 Accessibilité
- [ ] **P3** Ajouter labels ARIA sur composants interactifs
- [ ] **P3** Tester navigation clavier (Tab, Enter, Esc)
- [ ] **P3** Vérifier contraste couleurs (WCAG AA minimum)

**Durée estimée** : 3-4 jours

---

## PHASE 4 – QUALITÉ & OPTIMISATION (Semaine 5-6)

### 12. ⚡ Performance & Observabilité [P2]

#### 12.1 Error Tracking
- [ ] **P2** Installer Sentry :
  ```bash
  npm install @sentry/react @sentry/tracing
  ```
- [ ] **P2** Configurer dans `main.tsx` :
  ```typescript
  import * as Sentry from "@sentry/react";

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [new Sentry.BrowserTracing()],
    tracesSampleRate: 0.1,
    environment: import.meta.env.MODE
  });
  ```

#### 12.2 Analytics & Monitoring
- [ ] **P2** Ajouter web-vitals reporting :
  ```typescript
  import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

  function sendToAnalytics(metric: Metric) {
    // Envoyer à analytics backend
  }

  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  // ...
  ```

- [ ] **P3** Configurer Supabase logs monitoring (Dashboard → Logs)
- [ ] **P3** Ajouter alertes Supabase (CPU > 80%, Storage > 90%)

#### 12.3 Optimisations Build
- [ ] **P2** Activer code splitting dans Vite :
  ```typescript
  // vite.config.ts
  export default defineConfig({
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            ui: ['lucide-react', 'recharts']
          }
        }
      }
    }
  });
  ```
- [ ] **P3** Lazy load routes non-critiques :
  ```typescript
  const Mapping = lazy(() => import('./pages/Mapping'));
  ```

**Durée estimée** : 2-3 jours

---

### 13. 🧪 Tests & Assurance Qualité [P3]

**Note** : Section allégée – tests à implémenter progressivement, pas de couverture 80% requise immédiatement

#### 13.1 Setup Test Infrastructure
- [ ] **P3** Installer Vitest + React Testing Library :
  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
  ```
- [ ] **P3** Configurer `vitest.config.ts` :
  ```typescript
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react';

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts']
    }
  });
  ```

#### 13.2 Tests Prioritaires
- [ ] **P3** Tests unitaires hooks :
  - `useClients.test.ts`
  - `useDebounce.test.ts`
- [ ] **P3** Tests composants critiques :
  - `ClientFormModal.test.tsx` (validation Zod)
  - `DiffPreview.test.tsx` (filtres, pagination)
- [ ] **P3** Tests utilitaires :
  - `excelParser.test.ts` (parsing, détection headers)
  - `cirDataTransformer.test.ts`

#### 13.3 E2E Tests (Optionnel)
- [ ] **P3** Installer Playwright :
  ```bash
  npm install -D @playwright/test
  npx playwright install
  ```
- [ ] **P3** Tests parcours critiques :
  - Login + navigation
  - Création client
  - Import Excel + diff preview

**Durée estimée** : 3-5 jours (progressif)

---

## 📈 ROADMAP VISUELLE

```
SEMAINE 1-2 : FONDATIONS 🔥
├─ Sécurité secrets (P0)
├─ TypeScript strict (P0)
├─ Install react-query (P0)
└─ Nettoyage code (P1)

SEMAINE 2-3 : BACKEND 🔒
├─ Optimisation RLS (P0)
├─ Refactor Edge Functions (P1)
└─ Seed data (P1)

SEMAINE 3-4 : FRONTEND 🎯
├─ Migration react-query (P0)
├─ Dashboard données réelles (P0)
├─ Flux import + dry-run (P1)
└─ React Hook Form (P1)

SEMAINE 4-5 : UX 🎨
├─ Migration shadcn/ui (P2)
├─ Dark mode (P2)
└─ Accessibilité (P3)

SEMAINE 5-6 : QUALITÉ ⚡
├─ Sentry + monitoring (P2)
├─ Performance (P2)
└─ Tests (P3, progressif)
```

---

## ✅ CRITÈRES DE VALIDATION

Chaque tâche complétée doit inclure :

1. **Code** : Commit git avec message descriptif
2. **Tests** : Validation manuelle (screenshots) ou automatisée (tests passent)
3. **Documentation** : Commentaires JSDoc ou README mis à jour si changement d'API
4. **Review** : Type-check + lint passent (`npm run type-check && npm run lint`)

**Progression** : Cocher `[x]` chaque tâche terminée, ajouter lien commit ou note.

---

**Dernière mise à jour** : 2025-02-10
**Statut global** : 0% → Démarrage Phase 1
