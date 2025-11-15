# ✅ Plan de Remédiation Codex – CIR Pricing (2025‑11‑12)

> **Objectif** : livrer une plateforme CIR conforme à CLAUDE.md (zéro hardcode/mocks, 100 % validation, rôle/UX robustes) capable d’ingérer des millions de références et de piloter les imports Supabase de manière sécurisée.  
> **Environnement** : Supabase Cloud (pas de Docker). Toutes les migrations et déploiements se font via `supabase` CLI connecté au projet distant (`--project-ref <PROJECT_REF>`).  
> **Outils MCP** : `mcp.supabase.*` pour auditer/automatiser (tables, migrations, logs), `mcp.context7.*` pour docs libs.

---

## Table des matières
1. [Snapshot Audit](#snapshot-audit)
2. [Principes Directeurs](#principes-directeurs)
3. [Roadmap Synthétique](#roadmap-synthetique)
4. [Phases détaillées & opérations git/db/functions](#phases-detaillees)
   - [Phase 0 – Sécurité & Intégrité](#phase-0)
   - [Phase 1 – Pipeline Import & Data Layer](#phase-1)
   - [Phase 2 – Architecture Frontend](#phase-2)
   - [Phase 3 – Expérience Produit & UX](#phase-3)
   - [Phase 4 – Observabilité & Qualité](#phase-4)
5. [KPIs & Suivi](#kpis)
6. [Rituels & Outils](#rituels)

---

## <a id="snapshot-audit"></a>0. Snapshot Audit (références critiques)

| Risque | Localisation | Impact |
| --- | --- | --- |
| Appels Supabase bruts sans React Query/Zod | `frontend/src/pages/Clients.tsx`, `frontend/src/lib/api.ts` | Données non validées, duplication logique, non conforme CLAUDE.md. |
| Fallbacks destructeurs côté client | `frontend/src/lib/api/mappingAdminTools.ts:120-214` | Suppression de tables via anon key par simple clic viewer. |
| Imports qui tronquent les tables | `supabase/functions/import-cir-*.ts` | Perte de données totale sur import partiel. |
| Diff calculé dans le navigateur | `frontend/src/lib/api/cirAdmin.ts:204-243` | Inapplicable >100 k lignes, collisions de clés. |
| Formulaires sans RHF/Zod | `frontend/src/components/clients/ClientFormModal.tsx` | Saisie non contrôlée, casting JSON sauvage. |
| Parsing Excel bloquant | `frontend/src/lib/excelParser.ts` | UI gelée pour fichiers volumineux. |
| Migrations avec seed | `supabase/migrations/20250718*.sql` | Reset impossible, pipeline CI cassé. |
| Absence de monitoring/tests | Repo entier | Import failures silencieux, pas d’alerting. |

---

## <a id="principes-directeurs"></a>1. Principes directeurs
1. **Backend first** : diff, purge, stats exécutés en SQL/Edge Functions verrouillées.
2. **Single source of schemas** : Zod + types Supabase générés (`mcp.supabase.generate_typescript_types`).
3. **Pipeline import industrielle** : upload → validation worker → diff SQL (`EXCEPT/MERGE`) → audit → merge partiel.
4. **UX opérable** : React Query + RHF, virtualisation, flux multi-étapes, rôles respectés.
5. **Observabilité** : logs structurés, alertes Supabase, tests Vitest/Playwright, KPIs suivis.

---

## <a id="roadmap-synthetique"></a>2. Roadmap synthétique

| Phase | Priorité | Durée cible | KPI de sortie | Commit/Merge gate | Ops (db/functions) |
| --- | --- | --- | --- | --- | --- |
| **P0 – Sécurité & Intégrité** | P0 | Semaine 0‑1 | 0 fallback destructeur, Edge Functions authentifiées | PR `feat/security-hardening`, merge après revue | 2 migrations RLS, redeploy `import-*` + `process-import` |
| **P1 – Pipeline Import & Data Layer** | P0/P1 | Semaines 1‑3 | Diff SQL <3 min/100 k lignes | PR `feat/import-pipeline`, merge | 3 migrations (import_chunks, merge funcs, partitions), redeploy `process-import` |
| **P2 – Architecture Frontend** | P1 | Semaines 2‑4 | 100 % data hooks React Query + RHF | PR `feat/frontend-arch`, merge | pas de migration, mais build & smoke test |
| **P3 – XP Produit & UX** | P1/P2 | Semaines 4‑6 | Wizard import V2, CIR browser hiérarchique | PR `feat/ux-suite`, merge | éventuels RPC supplémentaires (1 migration) |
| **P4 – Observabilité & Qualité** | P2/P3 | Semaines 5‑7 | Tests e2e verts, alertes en place | PR `feat/observability`, merge | Edge `health-ping`, 1 migration métriques |

---

## <a id="phases-detaillees"></a>3. Phases détaillées & opérations

Format checklist : `ID – Description | Validation | Ops Git/DB/Functions`. Cochez chaque item (`[ ] -> [x]`) et conservez les preuves (captures MCP, logs CLI).

### <a id="phase-0"></a>Phase 0 – Sécurité & Intégrité (20 tâches)

**Objectifs**
- Éliminer tout code destructeur côté client.
- Durcir les Edge Functions (CORS, auth header, logs).
- Introduire `merge_*` SQL + RLS alignée.
- Nettoyer les migrations (seeds → fichiers `supabase/seed`).

**Checklists**

- [x] **P0.1.1** - Supprimer `fetchStatsFallback`, `cleanupHistoryFallback`, `purgeHistoryFallback`, `purgeAllDataFallback`. – 2025-11-12, 30m, OK
  - Validation : diff git + tests unitaires API admin.
  - Ops : commit `feat(security): remove client fallbacks`.
- [x] **P0.1.2** - Créer RPC/Edge `admin_mutation_guard` vérifiant `private.is_admin()`. – 2025-11-12, 1h, OK
  - Validation : `mcp.supabase.execute_sql` + tests.
  - Ops : `supabase db diff --project-ref <ref> --file supabase/migrations/20251112_guard.sql`, commit.
- [x] **P0.2.1** - Aligner CORS (`ALLOWED_ORIGIN`) sur `process-import`, `import-cir-*`. – 2025-11-12, 1h, OK
  - Validation : test `curl OPTIONS`.
  - Ops : redeploy `supabase functions deploy process-import` (et `import-cir-*`).
- [x] **P0.2.2** - Ajouter header `Authorization: Bearer ${EDGE_WEBHOOK_SECRET}` + validation côté handler. – 2025-11-12, 45m, OK
  - Validation : `supabase secrets set EDGE_WEBHOOK_SECRET=...`.
  - Ops : redeploy Edge + doc `docs/env.md`.
- [x] **P0.2.3** - Implémenter `structuredLog` avec `requestId`. – 2025-11-12, 1h, OK
  - Validation : `mcp.supabase.get_logs(functions)` montre les logs JSON.
  - Ops : redeploy Edge.
- [x] **P0.3.1** - Créer fonction SQL `merge_cir_classifications(batch_id uuid)`.
  - Validation : tests SQL `supabase/tests/import_pipeline.sql`.
  - Ops : migration `supabase/migrations/20251112_merge_classif.sql`.
- [x] **P0.3.2** – Créer `merge_brand_mappings(batch_id uuid)` + RPC `preview_diff`. – 2025-11-14, 2h, OK
  - Validation : `mcp.supabase.execute_sql` + diff summary persistant.
  - Ops : migration `supabase/migrations/20251112_merge_mappings.sql`.
- [x] **P0.4.1** – Auditer RLS (`mcp.supabase.list_tables`).
  - Validation : rapport dans `AUDIT/...`.
  - Ops : n/a.
- [x] **P0.4.2** - Migration `fix_rls` alignant toutes les policies.
  - Validation : script SQL + `mcp.supabase.execute_sql`.
  - Ops : `supabase db diff ... --file supabase/migrations/20251112_fix_rls.sql`.
- [x] **P0.4.3** - Normaliser les policies RLS `prices` + `brand_mapping_history` (split `ALL`, WITH CHECK explicites).
  - Validation : `mcp.supabase.execute_sql` listant `cmd`/`roles` (SELECT/INSERT/UPDATE/DELETE) + rapport `AUDIT/...`.
  - Ops : migration `supabase/migrations/20251112_prices_history_rls.sql`.
- [x] **P0.5.1** – Centraliser secrets (buckets, dataset) dans `supabase/config.toml` + `env.server.ts`. - 2025-11-14, 1h, OK
  - Validation : linter OK, pas de `Deno.env.get` sauvage.
  - Ops : commit `chore(config): centralize env`.
- [ ] **P0.5.2** – Documenter env dans `docs/env.md`, valider via `npm run type-check`.
  - Validation : README/doc à jour.
  - Ops : commit doc.
- [ ] **P0.6.1** – Extraire seeds vers `supabase/seed/base.sql`.
  - Validation : ancien contenu migrations nettoyé + seed idempotent.
  - Ops : `supabase db remote commit --project-ref <ref>`.
- [ ] **P0.6.2** – Créer script `npm run supabase:seed`.
  - Validation : exécution CLI OK.
  - Ops : commit script.
- [ ] **P0.7.1** – Créer `private.with_batch_context`.
  - Validation : tests set/unset.
  - Ops : migration courte.
- [ ] **P0.7.2** – Utiliser `with_batch_context` dans toutes Edge Functions.
  - Validation : diff code + tests.
  - Ops : redeploy `process-import`, `import-cir-classifications`, `import-cir-segments`.
- [ ] **P0.8.1** – Ajouter tests RLS (`supabase/tests/rls/*.sql`).
  - Validation : `supabase test run`.
  - Ops : commit tests.
- [ ] **P0.9.1** – Mettre à jour CI pour bloquer sans `npm run lint && npm run type-check`.
  - Validation : badge GitHub vert.
  - Ops : commit workflow.
- [ ] **P0.9.2** – Ajouter `deno lint`/`biome` sur Edge Functions.
  - Validation : CI output.
  - Ops : commit config.
- [ ] **P0.10.1** – Documenter procédures sécurité (`docs/ops/security.md`).
  - Validation : doc approuvée.
  - Ops : commit doc.
- [ ] **P0.10.2** – Gate : revue + merge `feat/security-hardening`.
  - Validation : checklist signée.
  - Ops : tag `v0.1.0-security`.

**Commit & merge**  
- Regrouper P0.1 → P0.5 dans PR `feat/security-hardening`.  
- P0.6 → P0.7 dans PR `chore/migrations`.  
- P0.8 → P0.10 dans PR `chore/ci-security`.  
- Merge après validation + `supabase db push --project-ref <ref>` si nécessaire. Tag `v0.1.0`.

---

### <a id="phase-1"></a>Phase 1 – Pipeline Import & Data Layer (24 tâches)

**Objectifs**
- Orchestrer les imports via `import_chunks` + queue.
- Calculer les diffs côté SQL + RPC.
- Partitionner l’historique, journaliser les métriques.

**Checklists**

- [ ] **P1.1.1** – Table `import_chunks` (status, payload) + RLS.
  - Validation : `mcp.supabase.list_tables`.
  - Ops : migration `20251113_import_chunks.sql`.
- [ ] **P1.1.2** – RPC `enqueue_import(batch_id uuid)` qui découpe & stocke les chunks.
  - Validation : tests SQL + log.
  - Ops : même migration.
- [ ] **P1.1.3** – Adapter `process-import` pour pousser des jobs (queue).
  - Validation : E2E test CLI.
  - Ops : `supabase functions deploy process-import`.
- [ ] **P1.2.1** – Vue `brand_mapping_latest` + fonction `compare_brand_mappings`.
  - Validation : `mcp.supabase.execute_sql`.
  - Ops : migration `20251113_compare_mappings.sql`.
- [ ] **P1.2.2** – RPC `get_import_diff(batch_id)` exposant `diff_summary`.
  - Validation : tests frontend (Vitest/Jest).
  - Ops : migration + update API.
- [ ] **P1.3.1** – `merge_brand_mappings_chunk(chunk jsonb)` idempotente.
  - Validation : tests SQL.
  - Ops : migration.
- [ ] **P1.3.2** – `merge_cir_classifications_chunk`.
  - Validation : tests SQL.
  - Ops : migration.
- [ ] **P1.3.3** – Gérer `created/updated/skipped` côté SQL.
  - Validation : `import_batches` mis à jour automatiquement.
  - Ops : update API.
- [ ] **P1.4.1** – Partitionner `brand_mapping_history` & `import_batches` (RANGE).
  - Validation : preuve via `mcp.supabase.execute_sql`.
  - Ops : migration `20251113_partitions.sql`.
- [ ] **P1.4.2** – Procédure `archive_history(partition text)`.
  - Validation : doc + test.
  - Ops : migration.
- [ ] **P1.5.1** – Générer types Supabase (`mcp.supabase.generate_typescript_types`).
  - Validation : `frontend/src/types/supabase.ts` à jour.
  - Ops : commit `chore(types): regenerate`.
- [ ] **P1.5.2** – Brancher les nouveaux types dans API layer.
  - Validation : `npm run type-check`.
  - Ops : commit.
- [ ] **P1.6.1** – Tests SQL `supabase/tests/import_pipeline.sql`.
  - Validation : `supabase test run`.
  - Ops : commit tests.
- [ ] **P1.6.2** – Script `scripts/run-import.sh` pour QA.
  - Validation : README snippet.
  - Ops : commit script.
- [ ] **P1.7.1** – Documentation pipeline (`docs/imports/pipeline.md`).
  - Validation : diagramme + instructions.
  - Ops : commit doc.
- [ ] **P1.7.2** – Cron Supabase "import-dispatcher" (Edge ou scheduled).
  - Validation : config `supabase/functions/import-dispatcher`.
  - Ops : deploy.
- [ ] **P1.8.1** – Table `import_metrics`.
  - Validation : migration `20251113_import_metrics.sql`.
  - Ops : appliquer migration.
- [ ] **P1.8.2** – RPC `get_import_metrics(range)`.
  - Validation : future page Analytics consomme la RPC.
  - Ops : migration.
- [ ] **P1.9.1** – Adapter API frontend (`cirAdmin.ts`) pour consommer la RPC diff.
  - Validation : diff + tests.
  - Ops : commit.
- [ ] **P1.9.2** – Supprimer `computeDiff`, `fetchExistingSegments`.
  - Validation : `npm run type-check`.
  - Ops : commit.
- [ ] **P1.10.1** – Import réel 100 k lignes (fichier `FICHIER/SEGMENTS`).
  - Validation : rapport (durée, stats) dans `AUDIT`.
  - Ops : n/a.
- [ ] **P1.10.2** – Capturer logs via `mcp.supabase.get_logs`.
  - Validation : fichier `AUDIT/logs/2025-11-13-import.txt`.
  - Ops : commit doc.
- [ ] **P1.11.1** – PR `feat/import-pipeline` + merge.
  - Validation : revue + CI.
  - Ops : tag `v0.2.0`.
- [ ] **P1.11.2** – Post-merge : `supabase db push` + redeploy `process-import`.
  - Validation : commandes exécutées/documentées.
  - Ops : doc.



---

### <a id="phase-2"></a>Phase 2 – Architecture Frontend (28 tâches)

**Objectifs**
- Appliquer React Query + RHF partout.
- Extraire un API layer typé + validations Zod.
- Virtualiser les tables lourdes.

**Checklists (extraits)**  
> NB : pour éviter une table massive, la liste est regroupée par sous-thèmes.  

#### P2.A – Base React Query & Schemas
- [ ] P2.1 – Installer `@tanstack/react-query`, créer `src/lib/react-query/client.ts`, wrapper `<App />`.  
  - **Validation** : React Query Devtools visibles en dev.  
  - **Ops** : Commit `feat(frontend): add react-query`.
- [ ] P2.2 – Créer `src/lib/schemas.ts` + générer types Supabase (dépend P1.5).  
  - **Validation** : `npm run type-check`.  
  - **Ops** : Commit `feat(frontend): add shared schemas`.

#### P2.B – Hooks & API Layer
- [ ] P2.3 – Refactor `src/lib/api/*.ts` pour utiliser Supabase client + `schema.parse`.  
- [ ] P2.4 – Créer hooks `useClients`, `useGroups`, `useMappings`, `useImportBatches`, `useTemplates`.  
- [ ] P2.5 – Mutations avec invalidations (`useCreateClient` etc.).  
  - **Validation** : couverture tests Vitest.  
  - **Ops** : Commit `feat(frontend): api hooks`.

#### P2.C – Formulaires RHF + UI
- [ ] P2.6 – Refaire `ClientFormModal`, `GroupFormModal`, `MappingModal`, `Templates` avec RHF + `zodResolver`.  
- [ ] P2.7 – Créer composants `FormField`, `ControlledInput`, `FormArray`.  
- [ ] P2.8 – Nettoyer tous les casts `as Json`.  
  - **Validation** : tests `@testing-library/react`.  
  - **Ops** : Commit `feat(frontend): rhf forms`.

#### P2.D – Tables & performances
- [ ] P2.9 – Ajouter `@tanstack/react-table` + `react-virtuoso` pour `MappingTable`, `Clients`, `ImportsHistory`.  
- [ ] P2.10 – Ajouter skeletons, Suspense, ErrorBoundary por page.  
  - **Validation** : capture Lighthouse (TTI < 2 s).  
  - **Ops** : Commit `feat(frontend): data grid virtualization`.

#### P2.E – Parsing & Upload
- [ ] P2.11 – Déplacer parsing Excel dans un WebWorker (`src/workers/excelParser.ts`).  
- [ ] P2.12 – Ajouter progress bar + chunked upload (Supabase Storage).  
  - **Validation** : test manuel fichier 10 Mo.  
  - **Ops** : Commit `feat(frontend): async import parsing`.

#### P2.F – Docs & QA
- [ ] P2.13 – Mettre à jour `docs/frontend/architecture.md`.  
- [ ] P2.14 – Demo interne + note dans `AUDIT`.  
- [ ] P2.15 – PR `feat/frontend-arch` → merge → tag `v0.3.0`.  
- [ ] P2.16 – Build `npm run build` + `npm run preview` pour QA.  

---

### <a id="phase-3"></a>Phase 3 – Expérience Produit & UX (18 tâches)

**Objectifs** : CIR Browser hiérarchique, Import Wizard V2 (diff réel), Template manager versionné, analytics temps réel.

**Highlights**
- [ ] Refonte `CirClassificationBrowser` (navigation Fsmega → Fsfam → Fssfa + recherche fuzzy).  
- [ ] `FileImportWizardV2` avec étapes + RPC `preview_diff`.  
- [ ] Notifications Realtime sur import (Supabase Realtime).  
- [ ] Template manager : versionning, defaults par dataset.  
- [ ] Page Analytics (Recharts) alimentée par `import_metrics` + `cir_stats`.  
- [ ] Accessibilité (focus visible, aria-live).  
- [ ] Tests utilisateurs internes + synthèse.  
- **Ops** : migrations éventuelles pour nouvelles RPC (utiliser `supabase db diff --project-ref <ref> --file supabase/migrations/20251114_templates.sql`).  
- **Commit/Merge** : PR `feat/ux-suite`, merge → tag `v0.4.0`.  
- **Edge Functions** : redeploy si wizard appelle nouvelles fonctions.

---

### <a id="phase-4"></a>Phase 4 – Observabilité & Qualité (16 tâches)

**Objectifs** : Couverture tests, alertes Slack, runbooks incidents.

**Checklists**
- [ ] Installer Playwright (`npx playwright install`), créer scénarios login/import/mapping.  
  - Ops : commit `test(e2e): add playwright`, CI `npx playwright test`.  
- [ ] Vitest sur utilitaires (target >80 %).  
- [ ] Edge `health-ping` + cron `*/5` min (Slack).  
- [ ] Logflare/Datadog intégrés dans Supabase (Settings → Logs).  
- [ ] Dashboards (Metabase/Grafana) sur `import_metrics`.  
- [ ] Runbooks incidents (`docs/ops/oncall.md`, `docs/ops/postmortem.md`).  
- [ ] Release SemVer + changelog (`docs/CHANGELOG.md`).  
- [ ] Gate final : PR `feat/observability`, merge, tag `v1.0.0`.  
- [ ] Post-merge : `supabase functions deploy health-ping`, `supabase db push` (s’il y a migrations).

---

## <a id="kpis"></a>4. KPIs & suivi

| KPI | Source (à collecter via MCP/CLI) | Seuil cible |
| --- | --- | --- |
| Temps import 100 k lignes | `import_metrics`, `mcp.supabase.get_logs(functions)` | ≤ 10 min (objectif 5 min) |
| Taux d’échec batch | `import_batches` | < 2 % |
| Couverture tests lib | `npm run test -- --coverage` | > 80 % |
| Scénarios e2e Playwright | `npx playwright test` | 3 scénarios verts (login/import/mapping) |
| Latence moyenne UI | React Query Devtools / Web Vitals | < 200 ms |
| Temps de résolution incident | `docs/ops/postmortem.md` | < 2 h |

Mettre à jour ces métriques à chaque sprint dans `AUDIT/12-11-25_Gemini-audit.md` (utiliser MCP pour extraire les données brutes).

---

## <a id="rituels"></a>5. Rituels & outils

- **Avant chaque PR** :  
  `npm run lint && npm run type-check && npm run test && npx playwright test`  
  + `supabase test run` pour les migrations.
- **Migrations** (Supabase Cloud) :  
  1. Générer : `supabase db diff --project-ref <PROJECT_REF> --file supabase/migrations/<timestamp>_<name>.sql`.  
  2. Revue & commit.  
  3. Appliquer après merge : `supabase db push --project-ref <PROJECT_REF>`.  
  4. Mettre à jour seeds : `supabase db remote commit --project-ref <PROJECT_REF>`.
- **Edge Functions** :  
  `supabase functions deploy <name> --project-ref <PROJECT_REF>` (process-import, import-cir-classifications, import-cir-segments, import-dispatcher, health-ping).  
  Logger les déploiements dans `AUDIT`.
- **Commits & merges** :  
  - Nommer branches `feat/…`, `chore/…`, `fix/…`.  
  - Chaque phase se termine par un tag (`v0.1.0`, `v0.2.0`, …).  
  - Merges uniquement si toutes les cases de la phase sont cochées et preuves jointes (captures, logs MCP).
- **Documentation continue** :  
  - `docs/` mis à jour en même temps que la fonctionnalité.  
  - `PLAN_REMEDIATION_DETAILLE_V2.md` mis à jour avec dates/résultats (ex. `[x] P0.1.1 – 2025-11-13, 2h, OK`).  
  - `AUDIT/*.md` pour les bilans hebdo.

---

Plan prêt à l’usage : cochez, testez, committez, migrez et déployez en suivant ces tableaux. Chaque action indique explicitement quand utiliser git, Supabase migrations ou le déploiement des Edge Functions afin de sécuriser l’avancement sur Supabase Cloud.***
