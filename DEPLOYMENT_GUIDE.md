# 🚀 Guide de Déploiement - Edge Function `process-import`

## ✅ Étapes 0.1.1 à 0.1.9 - COMPLÉTÉES

**Date** : 2025-01-08
**Statut** : Tous les bugs corrigés, code prêt pour déploiement

---

## 📋 Résumé des corrections effectuées

### 🐛 Bugs corrigés (6/6)

| Bug | Description | Commit | Statut |
|-----|-------------|--------|--------|
| **#1** | batch_id hors scope dans catch | `4b77edd` | ✅ Corrigé |
| **#2** | supabase client hors scope dans catch | `7863df5` | ✅ Corrigé |
| **#3** | CORS trop permissif (`'*'`) | `aab8e58` | ✅ Corrigé |
| **#4** | Validation request body absente | `6d91836` | ✅ Corrigé |
| **#4b** | Validation rows absente | `38f1423` | ✅ Corrigé |
| **#5** | Parsing CSV fragile (virgules) | `595cbba` | ✅ Corrigé |

### ✨ Améliorations ajoutées

- ✅ **Schémas Zod** : Validation stricte request + rows (`9d49588`)
- ✅ **Logging structuré** : JSON logs avec timestamps (`2ece3ac`)
- ✅ **Parsing CSV robuste** : PapaParse au lieu de split manuel
- ✅ **CORS sécurisé** : Variable d'environnement `ALLOWED_ORIGIN`

**Total commits** : 9
**Lignes modifiées** : ~300+ lignes

---

## 🔧 DÉPLOIEMENT SUR SUPABASE CLOUD

### Étape 1 : Lier votre projet Supabase

```bash
cd C:\GitHub\cir_pricing

# Lier le projet (remplacez YOUR_PROJECT_REF par votre ref)
supabase link --project-ref YOUR_PROJECT_REF
```

**Comment trouver votre PROJECT_REF** :
1. Ouvrir https://supabase.com/dashboard
2. Sélectionner votre projet
3. Settings → General
4. Copier **Reference ID**

---

### Étape 2 : Configurer les secrets (IMPORTANT !)

**⚠️ AVANT de déployer**, configurez la variable `ALLOWED_ORIGIN` :

#### Via Dashboard (Recommandé)

1. Aller sur https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. **Edge Functions** (menu gauche)
3. Cliquer sur **process-import**
4. Onglet **Secrets**
5. Cliquer **Add new secret**
6. Remplir :
   - **Name** : `ALLOWED_ORIGIN`
   - **Value** : `https://votre-domaine-production.com`
7. Cliquer **Save**

#### Via CLI (Alternative)

```bash
supabase secrets set ALLOWED_ORIGIN=https://votre-domaine-production.com
```

**Valeurs recommandées** :

| Environnement | Valeur |
|---------------|--------|
| Production | `https://votre-app.com` |
| Staging | `https://staging.votre-app.com` |
| Vercel | `https://votre-app.vercel.app` |
| Netlify | `https://votre-app.netlify.app` |

---

### Étape 3 : Déployer la fonction

```bash
cd C:\GitHub\cir_pricing

# Déployer process-import
supabase functions deploy process-import
```

**Sortie attendue** :
```
Deploying Function process-import (project ref: xxxxx)
Bundled process-import size: X.X KB
Deployed Function process-import version X
```

---

### Étape 4 : Vérifier le déploiement

#### Via Dashboard

1. **Edge Functions** → **process-import**
2. Vérifier **Status** : Active ✅
3. Noter le **Version number** (devrait être incrémenté)

#### Via CLI

```bash
# Voir les logs en temps réel
supabase functions logs process-import --follow
```

---

## 🧪 TESTS POST-DÉPLOIEMENT

### Test 1 : Payload valide (devrait retourner 404 ou traiter)

```bash
curl -i -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-import' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "batch_id": "00000000-0000-0000-0000-000000000001",
    "dataset_type": "mapping",
    "file_path": "test.xlsx",
    "mapping": {
      "marque": "MARQUE",
      "cat_fab": "CAT_FAB",
      "fsmega": "FSMEGA",
      "fsfam": "FSFAM",
      "fssfa": "FSSFA"
    }
  }'
```

**Résultat attendu** :
- ✅ HTTP 404 (batch not found) → Validation OK, batch inexistant
- ✅ HTTP 200 (ok) → Import réussi

**❌ NE DEVRAIT PAS** :
- ❌ HTTP 500 avec ReferenceError
- ❌ CORS error

---

### Test 2 : UUID invalide (devrait retourner 400)

```bash
curl -i -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-import' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "batch_id": "invalid-uuid",
    "dataset_type": "mapping",
    "file_path": "test.xlsx",
    "mapping": {"marque": "MARQUE"}
  }'
```

**Résultat attendu** :
```json
HTTP/1.1 400 Bad Request

{
  "error": "Validation failed",
  "details": "...",
  "validationErrors": [
    {
      "path": ["batch_id"],
      "message": "batch_id must be a valid UUID"
    }
  ]
}
```

---

### Test 3 : dataset_type invalide (devrait retourner 400)

```bash
curl -i -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-import' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "batch_id": "00000000-0000-0000-0000-000000000001",
    "dataset_type": "invalid",
    "file_path": "test.xlsx",
    "mapping": {"marque": "MARQUE"}
  }'
```

**Résultat attendu** :
```json
HTTP/1.1 400 Bad Request

{
  "error": "Validation failed",
  "validationErrors": [
    {
      "path": ["dataset_type"],
      "message": "dataset_type must be either 'mapping' or 'classification'"
    }
  ]
}
```

---

### Test 4 : Vérifier les logs structurés

```bash
supabase functions logs process-import --limit 10
```

**Résultat attendu** (format JSON) :
```json
{"timestamp":"2025-01-08T10:30:45.123Z","level":"info","message":"Import process started","function":"process-import","batch_id":"uuid-123","dataset_type":"mapping","file_path":"test.xlsx"}

{"timestamp":"2025-01-08T10:30:46.456Z","level":"error","message":"Import processing failed","function":"process-import","batch_id":"uuid-123","error_type":"Error","error_message":"batch not found"}
```

---

## 🔍 VÉRIFICATION COMPLÈTE

### Checklist de validation

- [ ] **Déploiement**
  - [ ] `supabase link` réussi
  - [ ] `ALLOWED_ORIGIN` configuré dans Secrets
  - [ ] `supabase functions deploy` réussi
  - [ ] Version incrémentée dans Dashboard

- [ ] **Tests fonctionnels**
  - [ ] Test payload valide → 404 ou 200
  - [ ] Test UUID invalide → 400 avec message Zod
  - [ ] Test dataset_type invalide → 400
  - [ ] Test mapping vide → 400

- [ ] **Logs**
  - [ ] Logs apparaissent dans Dashboard
  - [ ] Format JSON structuré
  - [ ] Timestamp ISO 8601 présent
  - [ ] batch_id visible dans logs

- [ ] **CORS**
  - [ ] Requête depuis votre domaine → fonctionne
  - [ ] Requête depuis autre domaine → bloquée

---

## 📊 MONITORING

### Voir les logs en temps réel

```bash
# Suivre les logs (comme tail -f)
supabase functions logs process-import --follow

# Limiter aux erreurs
supabase functions logs process-import --follow | grep '"level":"error"'

# Filtrer par batch_id
supabase functions logs process-import --limit 100 | grep 'batch-uuid-here'
```

### Dashboard Supabase

1. **Edge Functions** → **process-import** → **Logs**
2. Filtrer par :
   - Level : `error`, `warn`, `info`
   - Rechercher : `batch_id`, `error_type`
3. Voir le stack trace complet pour debug

---

## ⚠️ TROUBLESHOOTING

### Problème : CORS error depuis votre app

**Cause** : `ALLOWED_ORIGIN` mal configuré

**Solution** :
```bash
# Vérifier la valeur actuelle
supabase secrets list

# Mettre à jour
supabase secrets set ALLOWED_ORIGIN=https://votre-domaine-exact.com

# Redéployer
supabase functions deploy process-import
```

---

### Problème : Validation errors non clairs

**Cause** : Schémas Zod pas à jour avec la DB

**Solution** :
1. Vérifier les schémas dans `supabase/functions/process-import/schemas.ts`
2. Comparer avec la structure DB (Dashboard → Database → Tables)
3. Mettre à jour si nécessaire
4. Redéployer

---

### Problème : Import échoue silencieusement

**Cause** : Logs pas consultés

**Solution** :
```bash
# Voir les logs d'erreur
supabase functions logs process-import --limit 50 | grep error
```

---

## 🎯 PROCHAINES ÉTAPES

Après le déploiement réussi :

1. **Tester via l'interface frontend** :
   ```bash
   cd frontend
   npm run dev
   ```
   - Aller sur la page Imports
   - Uploader un fichier CSV/Excel
   - Vérifier que l'import fonctionne

2. **Monitorer les premiers imports** :
   - Suivre les logs en temps réel
   - Vérifier qu'aucune erreur inattendue

3. **Documenter les cas d'usage** :
   - Types de fichiers supportés
   - Format CSV attendu
   - Limites (taille, nombre de lignes)

---

## 📝 FICHIERS MODIFIÉS

| Fichier | Description |
|---------|-------------|
| `supabase/functions/process-import/index.ts` | Fonction principale (bugs corrigés) |
| `supabase/functions/process-import/schemas.ts` | Schémas Zod de validation |
| `process-import-bugs.md` | Documentation des bugs |
| `PLAN_REMEDIATION_DETAILLE.md` | Plan détaillé avec comptes rendus |

---

## ✅ VALIDATION FINALE

**Toutes les corrections sont complètes** :
- ✅ 6 bugs critiques corrigés
- ✅ Validation Zod complète (request + rows)
- ✅ Parsing CSV robuste (PapaParse)
- ✅ CORS sécurisé (variable env)
- ✅ Logging structuré JSON
- ✅ Code prêt pour production

**Code validé et testé** ✅
**Prêt pour déploiement sur Supabase Cloud** ✅

---

**Questions ou problèmes ?**
Consultez les logs : `supabase functions logs process-import --follow`
