# 🔧 Ajustements Plan 0.4 - Analyse de Cohérence RLS & Fonctions
**Date** : 2025-11-10
**Contexte** : Suite à l'étape 0.3 (durcissement RLS), analyse des incohérences détectées

---

## 🚨 Problèmes Identifiés

### 1. **Incohérence dans les RLS Policies**

**Problème** : Après l'étape 0.3, certaines policies utilisent `private.is_admin()` et `private.can_manage_pricing()`, mais d'autres tables utilisent encore des requêtes inline.

#### Tables avec RLS **COHÉRENTES** (utilisent `private.*` functions) ✅
- `clients` : Utilise `private.is_admin()` et `private.can_manage_pricing()`
- `groups` : Utilise `private.is_admin()`
- `cir_classifications` : Utilise `private.is_admin()`
- `prices` : Utilise `private.can_manage_pricing()` et `private.is_admin()`
- `brand_category_mappings` : Utilise `private.is_admin()` et `private.can_manage_pricing()`

#### Tables avec RLS **INCOHÉRENTES** (requêtes inline) ❌
- **`brand_mapping_history`** :
  ```sql
  -- Policy "Admins can delete mapping history"
  qual: "(EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))"

  -- DEVRAIT ÊTRE :
  qual: "private.is_admin()"
  ```

- **`import_batches`** :
  ```sql
  -- Policy "Admins can manage all import batches"
  qual: "(EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))"

  -- DEVRAIT ÊTRE :
  qual: "private.is_admin()"
  ```

- **`profiles`** :
  ```sql
  -- Policies utilisent : "(( SELECT auth.uid() AS uid) = id)"
  -- Acceptable car pas de logique de rôle, mais pourrait être simplifié en : "(auth.uid() = id)"
  ```

**Impact** : Incohérence dans le code, duplication de logique, plus difficile à maintenir.

---

### 2. **Nombre de Fonctions à Corriger (Étape 0.4)**

**Problème** : Le plan indique **18 fonctions** à fixer, mais l'audit réel montre **20 fonctions** au total.

#### Décompte Réel des Fonctions

| Schema | Fonction | Security Type | search_path | À Fixer ? |
|--------|----------|---------------|-------------|-----------|
| **private** | `is_admin` | DEFINER | ❌ NO | ✅ OUI |
| **private** | `can_manage_pricing` | DEFINER | ❌ NO | ✅ OUI |
| **public** | `audit_brand_mapping_changes` | DEFINER | ❌ NO | ✅ OUI |
| **public** | `audit_brand_mapping_insert` | DEFINER | ❌ NO | ✅ OUI |
| **public** | `clear_audit_context` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `get_all_unique_fsfams` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `get_all_unique_fsmegas` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `get_all_unique_fssfas` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `get_all_unique_marques` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `get_all_unique_segments` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `get_classifications_by_codes` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `get_mappings_by_keys` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `get_total_marques_count` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `get_total_segments_count` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `get_total_strategiques_count` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `set_change_reason` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `set_current_batch_id` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `update_updated_at_column` | INVOKER | ❌ NO | ✅ OUI |
| **public** | `rollback_import_batch` | DEFINER | ✅ YES | ❌ NON (déjà OK) |
| **public** | `update_client_contacts` | DEFINER | ✅ YES | ❌ NON (déjà OK) |

**Total à fixer : 18 fonctions** (le plan était correct !)
**Total ignoré : 2 fonctions** (déjà corrigées)

---

### 3. **Contrainte Manquante sur `profiles.role`**

**Problème** : La colonne `profiles.role` accepte n'importe quelle valeur texte (ou NULL).

**État actuel** :
```sql
role text NULL
-- Pas de contrainte CHECK
```

**Devrait être** :
```sql
role text NULL CHECK (role IS NULL OR role IN ('admin', 'commercial'))
```

**Rôles valides** :
- `'admin'` : Administrateurs (tous les droits)
- `'commercial'` : Commerciaux (gestion pricing, clients)
- `NULL` : Viewers (lecture seule uniquement)

**Impact** :
- Risque d'incohérence de données (typos, valeurs invalides)
- Pas de garantie au niveau DB que seuls les rôles valides existent

---

## ✅ Ajustements Recommandés au Plan

### **Nouvelle Étape 0.3.7 : Uniformiser les RLS Policies Restantes**

À ajouter **AVANT** l'étape 0.4.1 :

#### Étape 0.3.7 : Uniformiser RLS policies pour brand_mapping_history et import_batches

**Objectif** : Remplacer les requêtes inline par `private.is_admin()` pour cohérence.

**Actions** :
- [ ] Créer migration `20251110170000_uniformize_remaining_rls_policies.sql`
- [ ] **brand_mapping_history** : Remplacer policy "Admins can delete mapping history"
  ```sql
  DROP POLICY IF EXISTS "Admins can delete mapping history" ON public.brand_mapping_history;

  CREATE POLICY "Admins can delete mapping history"
  ON public.brand_mapping_history
  FOR DELETE
  TO authenticated
  USING (private.is_admin());
  ```

- [ ] **import_batches** : Remplacer policy "Admins can manage all import batches"
  ```sql
  DROP POLICY IF EXISTS "Admins can manage all import batches" ON public.import_batches;

  CREATE POLICY "Admins can manage all import batches"
  ON public.import_batches
  FOR ALL
  TO authenticated
  USING (private.is_admin());
  ```

- [ ] Appliquer la migration
- [ ] Vérifier que toutes les policies utilisent désormais `private.*` functions

**Durée estimée** : 10 minutes

---

### **Nouvelle Étape 0.3.8 : Ajouter contrainte CHECK sur profiles.role**

À ajouter **AVANT** l'étape 0.4.1 :

#### Étape 0.3.8 : Contraindre les valeurs de profiles.role

**Objectif** : Garantir que seuls les rôles valides peuvent être insérés.

**Rôles valides** :
- `'admin'` : Tous les droits
- `'commercial'` : Gestion pricing et clients
- `NULL` : Viewers (lecture seule)

**Actions** :
- [ ] Créer migration `20251110180000_add_role_check_constraint.sql`
- [ ] Ajouter contrainte CHECK :
  ```sql
  ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IS NULL OR role IN ('admin', 'commercial'));
  ```

- [ ] Vérifier les données existantes (aucune valeur invalide ne doit exister)
- [ ] Appliquer la migration

**Durée estimée** : 5 minutes

---

### **Mise à Jour Étape 0.4.1 à 0.4.7 : Liste des Fonctions**

**Ajustement** : Le plan est correct (18 fonctions), mais il faut clarifier que 2 fonctions sont **déjà OK** et doivent être ignorées.

**Ajouter une note dans l'étape 0.4.1** :

```markdown
⚠️ **Note Importante** :
- Total fonctions dans la base : 20
- Déjà corrigées (search_path défini) : 2 (rollback_import_batch, update_client_contacts)
- À corriger dans cette étape : 18 fonctions
```

---

## 🎯 Plan d'Action Recommandé

### Option A : Corriger TOUT Maintenant (Recommandé)
1. **Étape 0.3.7** : Uniformiser RLS policies restantes (10 min)
2. **Étape 0.3.8** : Ajouter contrainte CHECK role (5 min)
3. **Étape 0.4.1** : Créer fichier migration search_path ✅ **FAIT**
4. **Étape 0.4.2 à 0.4.7** : Ajouter ALTER FUNCTION
5. **Étape 0.4.8** : Appliquer migration

**Avantage** : Cohérence totale, pas de dette technique

### Option B : Continuer Étape 0.4, Corriger RLS Plus Tard
1. **Étape 0.4.1 à 0.4.8** : Compléter le fix search_path
2. **Phase 1** : Ajouter étapes 0.3.7 et 0.3.8

**Avantage** : Suit l'ordre du plan existant

---

## 📊 Résumé des Corrections

| Correction | Priorité | Durée | Impact Sécurité |
|------------|----------|-------|-----------------|
| Uniformiser RLS policies | P0 | 10 min | Moyen (cohérence) |
| Contrainte CHECK role | P1 | 5 min | Faible (prévention) |
| Fix search_path 18 fonctions | P0 | 30 min | **Élevé** (vulnérabilité) |

**Recommandation finale** : **Option A** - Tout corriger maintenant pour cohérence maximale.

---

## 🔗 Références

- Étape 0.3 : RLS Hardening (complétée)
- Audit Supabase Advisors : 21 warnings sécurité (dont 18 search_path)
- CLAUDE.md : Principe "100% Validation" et "Secure by Default"
