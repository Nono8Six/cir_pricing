# CIR Pricing – Audit complet (février 2025)

## 1) Executive Summary
- **Ce qui fonctionne aujourd’hui** : TypeScript strict et ESLint passent (`npm run type-check`, `npm run lint`). La build Vite (`npm run build`) se termine avec avertissement de taille. Les schémas d’import Excel utilisent déjà Zod côté client (par ex. `frontend/src/schemas/imports/mappingSchema.ts:1-38`).  
- **Risques clés** : clés Supabase publiques commitées (`.env`), RLS relâchée sur toutes les tables métiers (`supabase/migrations/20250721145117_pink_pebble.sql:1-45`, `20250721145301_wooden_waterfall.sql:1-41`), pipeline d’import qui écrit directement depuis le navigateur avec la clé `anon` (`frontend/src/components/imports/FileImportWizard.tsx:331-470`). Edge Function `process-import` manque de validation/robustesse (`supabase/functions/process-import/index.ts:17-103`).  
- **Top 10 problèmes (sévérité × impact)** :  
  1. Secrets Supabase publiés (`.env`:1-11) – tout appel anonyme est compromis.  
  2. RLS “authentifié = tout” sur `clients`, `groups`, `brand_category_mappings`, `cir_classifications` (migrations citées).  
  3. `import_batches` ne contient pas les colonnes attendues (cf. `frontend/src/types/database.types.ts:248-282` vs `supabase/migrations/20250723090501_light_field.sql:1-61`).  
  4. Wizard d’import applique les diff directement depuis le client (lignes 331-470) sans validation serveur et masque les erreurs (`ValidationReport.tsx:13-27`).  
  5. `process-import` compile du CSV sans schéma et peut bricker les batches (fuite de `batch_id`, `supa` en cas d’erreur).  
  6. Migrations `20250721121600_crimson_field.sql:208-316` injectent des données factices, en contradiction avec “zero mock data”.  
  7. Dashboards affichent des métriques codées en dur (ex. `frontend/src/components/dashboard/StatsCards.tsx:6-37`, `MarginDistribution.tsx:18-43`).  
  8. Absence totale de React Query : `Clients.tsx:43-110`, `GroupsPage.tsx:26-93`, `Mapping.tsx:75-208` multiplient les requêtes et rendent l’invalidation impossible.  
  9. Formulaires complexes (clients, groupes, mapping) utilisent des validations maison (`ClientFormModal.tsx:137-206`) au lieu de RHF+Zod → divergences front/back.  
  10. Vulnérabilité connue `xlsx@0.18.5` (résultat `npm audit --production`) : lecture fichier non fiable côté client et dans l’Edge Function.
- **Confiance / inconnues** : Confiance moyenne (analyse basée sur fichiers locaux, pas sur un dump réel). Non couvert : état des Edge Functions déployées, policies effectives sur l’instance Supabase.  

## 2) Repository Inventory
| Dossier | LOC approx. | Fichiers principaux | Finalité |
|---------|-------------|---------------------|---------|
| `.` | ~23 k | TS/TSX (62), SQL (27), JSON (8), autres | Workspace npm, docs, scripts |
| `frontend/` | ~13 k | TS (14), TSX (46), JS (3), JSON (3), CSS (1) | App React/Vite |
| `frontend/src/components/` | ~8 k | TSX majoritaire | UI (dashboards, mapping, imports, auth) |
| `frontend/src/pages/` | ~1.8 k | 9 pages TSX | Routes et wrappers |
| `frontend/src/lib/` | ~1.5 k | 6 fichiers TS | Supabase client, env, parsers |
| `frontend/src/components/imports/` | ~1.2 k | Wizard & utilitaires import | Flux CSV/XLSX |
| `frontend/src/components/mapping/` | ~3.7 k | Tabs analytics/history/settings | Pilotage mapping CIR |
| `supabase/` | ~1.8 k | SQL (17), Edge TS (2) | Migrations + functions |

**Fichiers générés ou volumineux** : `frontend/dist/`, `node_modules/`, `frontend/.vite/`, `supabase/.temp/`, `tmp/ts-strict.log`, copies Excel (`Classification_produits_2024*.xlsx`) et `frontend/public/Classification_produits_2024.xlsx`.  
**Package managers** : npm (workspace, `package.json`), pnpm déclaré mais non configuré (`pnpm -v` warning). TypeScript 5.3 côté front (`frontend/package.json`).  

## 3) Compliance avec CLAUDE.md
| Règle | Statut | Évidence | Remédiation (sans code) |
|-------|--------|----------|-------------------------|
| Zéro hardcoded data | Échec | Compteurs dashboards (`StatsCards.tsx:6-37`, `MarginDistribution.tsx:24-43`, `RecentPrices.tsx:13-32`) | Remplacer par states issus de queries ou placeholders explicites “connecter vos données” |
| Zéro mock data | Échec | Migrations insèrent clients/mappings/prix démo (`supabase/migrations/20250721121600_crimson_field.sql:208-316`) | Déplacer ces seeds vers `supabase/seed` et idempotence via `ON CONFLICT` |
| Zéro duplication | Échec | `ImportHistoryDashboard.tsx` et `MappingHistoryTab.tsx` dupliquent la logique Supabase (plus de 200 lignes identiques) | Extraire un hook partagé (ex. `useImportHistory`) |
| 100 % type safety | Partiel | Edge function `process-import` utilise `any[]` et assertions `!` (`supabase/functions/process-import/index.ts:17-67`) | Introduire schémas Zod côté Deno et types explicites |
| 100 % validation | Échec | `ValidationReport.tsx:13-27` force un état “0 erreur” via `useEffect`, bypassant Zod | Retirer ce `useEffect`, rendre la progression conditionnelle au résultat `safeParse` |
| React Query obligatoire | Échec | Aucun `QueryClientProvider`, pages chargent via `useEffect` (ex. `frontend/src/pages/Clients.tsx:43-110`) | Installer React Query et convertir les fetchs/mutations |
| RHF + Zod pour formulaires | Échec | `ClientFormModal.tsx` et `GroupFormModal.tsx` reposent sur `useState` + validations manuelles | Migrer vers `react-hook-form` + `zodResolver` pour aligner front/back |
| Sécurité / RLS stricte | Échec | Migrations `20250721145117` et `20250721145301` laissent `USING (true)` pour toutes les opérations sur `groups` et `clients` | Réintroduire des policies basées sur `profiles.role` |
| Env validé partout | Partiel | `frontend/src/lib/env.ts` couvre Vite, mais Edge functions lisent `Deno.env.get` sans validation (`supabase/functions/process-import/index.ts:17-22`) | Ajouter un module partagé d’environnement côté Deno |

## 4) Frontend Audit
- **React Query** : aucun provider. Les pages `Clients.tsx`, `GroupsPage.tsx`, `Mapping.tsx`, `ImportsHistory.tsx` montent des `useEffect` manuels. Conséquence : rafraîchissements multiples, pas d’invalidation après mutation, pas de cache offline.
- **Accès données** : nombreux appels Supabase directement dans les composants (`MappingSettingsTab.tsx:91-243`, `MappingHistoryTab.tsx:105-229`, `ImportBatchDetails.tsx:21-78`). Ils contourent l’API centralisée et rendent la validation impossible.
- **Formulaires** : `ClientFormModal.tsx:137-206` gère la validation via toast + regex. `MappingModal.tsx` et `LoginForm.tsx` font de même → erreurs non uniformisées.
- **Validation Zod** : existe pour les imports mais pas pour les données serveur (aucun `schema.parse` à la sortie de `mappingApi`). `env.ts` console.error + throw, mais Edge/Node absent.
- **TypeScript** : strict actif. Restent : assertions `!` (`frontend/src/utils/cirDataTransformer.ts:66`, `frontend/src/main.tsx:8`), `unknown` non contrôlé dans l’Edge function.
- **UI/UX** : `SearchableSelect.tsx` sans attribut a11y (`role`, `aria-expanded`), navigation clavier limitée. `Navbar.tsx:17-36` manque `aria-label` sur le toggler. Couleurs conformes, mais focus states parfois absents.
- **Performance** : bundle unique ~1.05 MB (build log). Pas de `lazy()` sur les pages (`App.tsx:45-75`). `MappingAnalyticsTab.tsx:42-116` charge toute la table pour agréger côté client. Aucun `React.Suspense`.
- **Logging** : usage généralisé de `console.error` pour afficher des messages utilisateurs (ex. `Mapping.tsx:108-187`). Aucun logger différencié ni capture côté serveur. Certaines promesses non attendues (`FileImportWizard.tsx`).

## 5) API / Library Layer
- Deux modules (`frontend/src/lib/api.ts` et `frontend/src/lib/supabaseClient.ts`) exposent des fonctions qui accèdent directement à Supabase, sans validation ni erreurs typées. `api.ts` pour clients/groupes, `supabaseClient` pour mapping/imports.
- Aucun concept d’erreurs métier (`DatabaseError`, `ValidationError`). Les composants catchent `unknown` et affichent `error.message`.
- `frontend/src/lib/schemas.ts` ne contient que deux entités (BrandMapping, CirClassification). Clients, groupes, import batches, prices n’y figurent pas → validation partielle.

## 6) Pipeline CSV/XLSX
- **Étapes actuelles** : upload local → mapping colonnes via heuristique → validation client-side (Zod) → diff calculé côté navigateur → soit import direct (écritures Supabase anonymes), soit Edge function.
- **Manquements vs cahier des charges** : pas de dry-run côté serveur, pas de `import_batches` complet (missing dataset_type, mapping, counts). Aucune confirmation/approbation côté UI avant écriture. `ValidationReport` court-circuite les erreurs. Pas de `import_batch_details` consolidé (RPC rollback manquant).
- **Recommandation** : déplacer diff + validation dans une RPC/Edge (service role), rendre l’UI purement déclarative (upload → preview → confirmation).

## 7) Supabase / Database
- **Schéma** : tables conformes (UUID, `created_at`), mais `import_batches` ne reflète pas le type de données stockées. `database.types.ts:248-282` inclut des champs absents de la table réelle.
- **RLS** : migrations `20250721145117` / `20250721145301` / `20250722052837` rendent les tables accessibles à tout utilisateur authentifié (`USING (true)`). Même `brand_category_mappings` est modifiable sans rôle.
- **Seeds** : `20250721121600_crimson_field.sql` insère des constantes pour groupes/clients/mappings/prix, ce qui viole la règle “pas de mock”. `supabase/migrations/20250718100030_sunny_oasis.sql` en contient aussi.
- **Indexation** : indexes corrects sur `prices` (`client_id, reference`, `is_active`). `brand_category_mappings` possède `idx_brand_mapping_unique` (marque/cat_fab).  
- **Scripts** : pas de commande documentée pour regénérer `database.types.ts` (seul fichier statique).

## 8) Edge Functions
- `process-import` : absence de schéma d’entrée, `mapping` utilisé tel quel, chunk uploads non vérifiés. En cas d’erreur, `batch_id` n’est pas accessible dans le `catch` → rollback échoue. Service-role exposé dans une fonction publique avec `Access-Control-Allow-Origin: *`. Aucun timeout ni journaux structurés.
- `create-profile` : accepterait n’importe quel `id` envoyé via HTTP (pas de validation, pas de protection). Devrait être invoquée côté serveur uniquement.

## 9) Secrets / Environnement
- `.env` tracké avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. Cet artefact suffit pour interroger la vraie base.
- `frontend/src/lib/env.ts` valide les variables côté client. Aucune validation côté Edge (`Deno.env.get`). Pas de séparation `.env.local`.
- `supabase/functions` lisent la clé service-role en clair.

## 10) Duplication & Dead Code
- `ImportHistoryDashboard.tsx` vs `MappingHistoryTab.tsx` répètent la même logique de fetch, filtrage, calcul de stats.
- `Mapping.tsx` contient des sections commentées “removed dead code” mais laisse des états inutilisés.
- Boutons “Import direct” et “Import en arrière-plan” co-existent alors que le second devrait suffire → confusion UX.

## 11) Lint / Format / CI
- ESLint configuré (`frontend/eslint.config.js`). Pas de Prettier ni Husky. Aucun pipeline CI documenté.
- Commandes tests non définies (README vide). Aucun coverage.

## 12) Sécurité & Privacy
- Auth routing basique : toute page après login accessible sans vérification de rôle. Pas de guard sur routes critiques (`Mapping`, `Imports`).
- Storage uploads acceptent tous fichiers `.xlsx/.xls` jusqu’à 100 MB, sans scan antivirus.
- `npm audit` signale `xlsx` vulnérable (Prototype Pollution, ReDoS).  
- `MappingSettingsTab.tsx:234-241` propose des actions destructives (delete .neq wildcard) déclenchables depuis le navigateur.

## 13) Accessibilité & i18n
- UI en français dur, pas de système i18n.  
- `SearchableSelect.tsx` manque `role="combobox"`, `aria-expanded`, etc.  
- Boutons d’action (ex. navbar hamburger) sans `aria-label`.  
- `Intl.NumberFormat` utilisé pour la monnaie (positif), mais aucune adaptation locale.

## 14) Deliverables

### 14.1 Risk Register
| Risque | Sévérité | Effort estimé | Notes |
|--------|----------|---------------|-------|
|Clés Supabase exposées|Critique|Faible|Rotation clé, purge `.env`, vérifier historique|
|RLS “auth=ALL”|Critique|Moyen|Recréer policies + tests de couverture|
|Import batches non alignés|Haute|Faible|ALTER TABLE + migration data backfill|
|Import direct client-side|Critique|Moyen|Supprimer écriture directe, tout via Edge/RPC|
|Edge `process-import` non validée|Haute|Moyen|Ajouter schémas, gestion d’erreurs, retries|
|Seeds/mocks dans migrations|Haute|Faible|Supprimer ou déplacer vers scripts seed|
|Dashboards hardcodés|Moyenne|Faible|Afficher placeholders dynamiques ou brancher sur vraies métriques|
|Absence React Query|Moyenne|Moyen|Installer provider, convertir pages critiques|
|Formulaires sans RHF+Zod|Moyenne|Moyen|Migrer modal par modal|
|Vulnérabilité `xlsx`|Haute|Moyen|Mettre à jour vers version patchée ou alternative parser|

### 14.2 Plan d’action
- **Quick Wins (<2 h)** : retirer `.env`, documenter les variables dans README/`.env.example`; désactiver le bouton “import direct” tant que le pipeline Edge n’est pas sûr; remplacer les indicateurs dashboards par un message “données indisponibles”.
- **Court terme (1‑2 jours)** :  
  1. Migration Supabase pour étendre `import_batches` et rétablir les policies RLS (clients, groupes, mappings, classifications).  
  2. Ajout des RPC manquantes (`get_total_segments_count`, `get_mappings_by_keys`, `rollback_import_batch`).  
  3. Refactor Edge `process-import` (validation Zod, try/catch global, journaux) et stocker toutes les métadonnées dans `import_batches`.
- **Moyen terme (1‑2 semaines)** :  
  - Introduire React Query + hooks partagés (`useClients`, `useGroups`, `useMappings`).  
  - Migrer les formulaires modaux vers RHF + Zod pour aligner la validation.  
  - Extraire un module partagé pour l’historique d’imports afin d’éliminer la duplication.
- **Fondation** : pipeline CI (lint + type-check), tests Vitest/RTL, scripts `supabase gen types` automatisés, stratégie i18n, monitoring (Sentry).

### 14.3 Top 10 actions correctives (sans code)
1. **Sécurité secrets** : retirer `.env` du repo, révoquer la clé `anon`, documenter `.env.local` sécurisé.  
2. **RLS** : réécrire les policies pour `groups`, `clients`, `brand_category_mappings`, `cir_classifications` en s’appuyant sur `profiles.role` (lecture pour tous, écriture restreinte).  
3. **Alignement `import_batches`** : créer une migration qui ajoute `dataset_type`, `file_url`, `mapping`, `created_count`, `updated_count`, `skipped_count` et met à jour les triggers.  
4. **Seeder propre** : retirer les inserts démo des migrations et, si nécessaire, fournir un script seed séparé sous `supabase/seed`.  
5. **Dashboards** : afficher un état “données non connectées” tant que les métriques ne proviennent pas d’API réelles, ou brancher sur de vrais endpoints (stats import batches, etc.).  
6. **Edge pipeline** : introduire des schémas Zod côté Deno, encapsuler `supa` dans un bloc try/catch, vérifier que `batch_id` est valide avant mise à jour, journaliser les erreurs via `console.error`.  
7. **Supprimer import direct** : désactiver temporairement le bouton “Import direct (n lignes)” et obliger le passage par l’Edge function, avec validation stricte côté serveur.  
8. **RPC manquantes** : versionner les fonctions `get_total_segments_count`, `get_total_marques_count`, `get_total_strategiques_count`, `get_mappings_by_keys`, `rollback_import_batch` afin que les écrans mapping fonctionnent sans dépendre d’un état hors repo.  
9. **React Query** : installer `@tanstack/react-query`, ajouter un `QueryClientProvider` (probablement dans `main.tsx`) et convertir les pages critiques (Clients, Groups, Mapping) en hooks (`useQuery`, `useMutation`).  
10. **Formulaires typés** : migrer `GroupFormModal`, `ClientFormModal` et `MappingModal` vers React Hook Form + `zodResolver`, en réutilisant les schémas de `frontend/src/lib/schemas.ts`.

### 14.4 Traçabilité
| Finding | Règle CLAUDE | Action |
|---------|--------------|--------|
|Dashboards hardcodés|Zéro hardcoded data|Action 5 |
|Seeds de démo|Zéro mock data|Action 4 |
|Historique dupliqué|Zéro duplication|Plan moyen terme (extraction hook) |
|Edge `process-import` non typé|100 % type safety|Action 6 |
|Validation wizard contournée|100 % validation|Action 7 |
|Absence React Query|Règle “react-query pour tout fetch”|Action 9 |
|Form modaux non RHF|Règle RHF+Zod|Action 10 |
|RLS trop permissive|Security/RLS|Action 2 |
|Secrets exposés|Security & configuration|Action 1 |
|RPC manquantes / pipeline import|Architecture guidelines (API layer + import pipeline)|Actions 3 & 8 |

---

Rapport rédigé sans extrait de code, conformément à la demande.
