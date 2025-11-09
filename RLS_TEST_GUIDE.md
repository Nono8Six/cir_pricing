# Guide de Test RLS Policies - CIR Pricing

## 📋 Vue d'ensemble

Ce guide documente les procédures de test pour vérifier que les policies RLS (Row Level Security) fonctionnent correctement avec différents rôles utilisateur.

**Date de création** : 2025-11-09
**Étape du plan** : 0.3.6
**Tables concernées** : clients, groups, cir_classifications

---

## ✅ État actuel des policies (PRODUCTION)

### Table `clients`
| Action | Policy | Autorisé pour |
|--------|--------|---------------|
| SELECT | `Authenticated users can read clients` | Tous les utilisateurs authentifiés |
| INSERT | `Admins and commercial can create clients` | Admin OU Commercial |
| UPDATE | `Admins and commercial can update clients` | Admin OU Commercial |
| DELETE | `Only admins can delete clients` | Admin seulement |

### Table `groups`
| Action | Policy | Autorisé pour |
|--------|--------|---------------|
| SELECT | `authenticated_users_can_read_groups` | Tous les utilisateurs authentifiés |
| INSERT | `Admins can create groups` | Admin seulement |
| UPDATE | `Admins can update groups` | Admin seulement |
| DELETE | `Admins can delete groups` | Admin seulement |

### Table `cir_classifications`
| Action | Policy | Autorisé pour |
|--------|--------|---------------|
| SELECT | `Authenticated users can read classifications` | Tous les utilisateurs authentifiés |
| INSERT | `Admins can insert classifications` | Admin seulement |
| UPDATE | `Admins can update classifications` | Admin seulement |
| DELETE | `Admins can delete classifications` | Admin seulement |

---

## 🧪 Procédure de test

### Prérequis

1. **Créer 3 utilisateurs de test** (via Supabase Dashboard → Authentication → Users)
   - `test-viewer@example.com` : rôle = NULL (aucun rôle)
   - `test-commercial@example.com` : rôle = 'commercial'
   - `test-admin@example.com` : rôle = 'admin'

2. **Assigner les rôles** (via Supabase Dashboard → Database → Table Editor → profiles)
   ```sql
   -- Créer les profils avec les bons rôles
   INSERT INTO public.profiles (id, email, role)
   VALUES
     ('<uuid-viewer>', 'test-viewer@example.com', NULL),
     ('<uuid-commercial>', 'test-commercial@example.com', 'commercial'),
     ('<uuid-admin>', 'test-admin@example.com', 'admin');
   ```

---

## 📝 Test 1 : Utilisateur VIEWER (role = NULL)

### Se connecter
- Email : `test-viewer@example.com`
- Mot de passe : (celui créé lors de la création)

### Tests attendus

#### ✅ Table `clients` - Lecture AUTORISÉE
```
Action : Aller sur la page "Clients"
Résultat attendu : ✅ La liste des clients s'affiche
```

#### ❌ Table `clients` - Création BLOQUÉE
```
Action : Cliquer sur "Nouveau client", remplir le formulaire, valider
Résultat attendu : ❌ Erreur "new row violates row-level security policy"
Message UI : "Vous n'avez pas les permissions pour créer un client"
```

#### ❌ Table `clients` - Modification BLOQUÉE
```
Action : Cliquer sur "Modifier" un client existant, modifier des champs, valider
Résultat attendu : ❌ Erreur RLS
Message UI : "Vous n'avez pas les permissions pour modifier ce client"
```

#### ❌ Table `clients` - Suppression BLOQUÉE
```
Action : Cliquer sur "Supprimer" un client
Résultat attendu : ❌ Erreur RLS
Message UI : "Vous n'avez pas les permissions pour supprimer ce client"
```

#### ✅ Table `groups` - Lecture AUTORISÉE
```
Action : Aller sur la page "Groupes"
Résultat attendu : ✅ La liste des groupes s'affiche
```

#### ❌ Table `groups` - Toute modification BLOQUÉE
```
Action : Tenter de créer/modifier/supprimer un groupe
Résultat attendu : ❌ Toutes les opérations échouent avec erreur RLS
```

#### ✅ Table `cir_classifications` - Lecture AUTORISÉE
```
Action : Voir les classifications dans les selects/autocomplete
Résultat attendu : ✅ Les classifications CIR sont visibles
```

---

## 📝 Test 2 : Utilisateur COMMERCIAL (role = 'commercial')

### Se connecter
- Email : `test-commercial@example.com`
- Mot de passe : (celui créé lors de la création)

### Tests attendus

#### ✅ Table `clients` - Lecture AUTORISÉE
```
Action : Aller sur la page "Clients"
Résultat attendu : ✅ La liste des clients s'affiche
```

#### ✅ Table `clients` - Création AUTORISÉE
```
Action : Cliquer sur "Nouveau client", remplir :
  - Nom : "Test Client Commercial"
  - Adresse : "123 Rue Test"
  - Ville : "Paris"
  - Code postal : "75001"
  - Valider
Résultat attendu : ✅ Le client est créé avec succès
Vérification : Le client apparaît dans la liste
```

#### ✅ Table `clients` - Modification AUTORISÉE
```
Action : Modifier le client "Test Client Commercial"
  - Changer l'adresse : "456 Rue Modifiée"
  - Valider
Résultat attendu : ✅ Le client est modifié avec succès
Vérification : L'adresse est mise à jour dans la liste
```

#### ❌ Table `clients` - Suppression BLOQUÉE
```
Action : Tenter de supprimer le client "Test Client Commercial"
Résultat attendu : ❌ Erreur RLS "Only admins can delete clients"
Message UI : "Seuls les administrateurs peuvent supprimer des clients"
```

#### ✅ Table `groups` - Lecture AUTORISÉE
```
Action : Aller sur la page "Groupes"
Résultat attendu : ✅ La liste des groupes s'affiche
```

#### ❌ Table `groups` - Toute modification BLOQUÉE
```
Action : Tenter de créer un groupe "Test Group"
Résultat attendu : ❌ Erreur RLS "Admins can create groups"
Message UI : "Seuls les administrateurs peuvent gérer les groupes"
```

#### ✅ Table `cir_classifications` - Lecture AUTORISÉE
```
Action : Utiliser les classifications pour classifier un produit
Résultat attendu : ✅ Les classifications sont accessibles
```

#### ❌ Table `cir_classifications` - Toute modification BLOQUÉE
```
Action : Tenter de créer/modifier/supprimer une classification
Résultat attendu : ❌ Toutes les opérations échouent avec erreur RLS
```

---

## 📝 Test 3 : Utilisateur ADMIN (role = 'admin')

### Se connecter
- Email : `test-admin@example.com` OU `a.ferron@cir.fr` (admin existant)
- Mot de passe : (celui du compte)

### Tests attendus

#### ✅ Table `clients` - CRUD COMPLET AUTORISÉ
```
Action : Créer un client "Test Client Admin"
Résultat attendu : ✅ Succès

Action : Modifier le client "Test Client Admin"
Résultat attendu : ✅ Succès

Action : Supprimer le client "Test Client Admin"
Résultat attendu : ✅ Succès (contrairement au commercial)
```

#### ✅ Table `groups` - CRUD COMPLET AUTORISÉ
```
Action : Créer un groupe "Test Group Admin"
Résultat attendu : ✅ Succès

Action : Modifier le groupe "Test Group Admin"
Résultat attendu : ✅ Succès

Action : Supprimer le groupe "Test Group Admin"
Résultat attendu : ✅ Succès
```

#### ✅ Table `cir_classifications` - CRUD COMPLET AUTORISÉ
```
Action : Créer une classification (si interface existe)
Résultat attendu : ✅ Succès

Action : Modifier une classification
Résultat attendu : ✅ Succès

Action : Supprimer une classification
Résultat attendu : ✅ Succès
```

---

## 🔍 Vérification SQL directe

Si vous avez accès au SQL Editor, vous pouvez tester directement :

### Test Viewer (role = NULL)
```sql
-- Se connecter avec l'utilisateur viewer, puis :
SELECT * FROM clients; -- ✅ DEVRAIT RÉUSSIR
INSERT INTO clients (name) VALUES ('Test'); -- ❌ DEVRAIT ÉCHOUER
```

### Test Commercial
```sql
-- Se connecter avec l'utilisateur commercial, puis :
INSERT INTO clients (name, address) VALUES ('Test', '123 Rue'); -- ✅ DEVRAIT RÉUSSIR
UPDATE clients SET name = 'Updated' WHERE name = 'Test'; -- ✅ DEVRAIT RÉUSSIR
DELETE FROM clients WHERE name = 'Test'; -- ❌ DEVRAIT ÉCHOUER
INSERT INTO groups (name) VALUES ('Test Group'); -- ❌ DEVRAIT ÉCHOUER
```

### Test Admin
```sql
-- Se connecter avec l'utilisateur admin, puis :
INSERT INTO clients (name) VALUES ('Test'); -- ✅ DEVRAIT RÉUSSIR
DELETE FROM clients WHERE name = 'Test'; -- ✅ DEVRAIT RÉUSSIR
INSERT INTO groups (name) VALUES ('Test'); -- ✅ DEVRAIT RÉUSSIR
DELETE FROM groups WHERE name = 'Test'; -- ✅ DEVRAIT RÉUSSIR
```

---

## 📊 Matrice de résultats attendus

| Table | Action | Viewer | Commercial | Admin |
|-------|--------|--------|------------|-------|
| **clients** | SELECT | ✅ | ✅ | ✅ |
| **clients** | INSERT | ❌ | ✅ | ✅ |
| **clients** | UPDATE | ❌ | ✅ | ✅ |
| **clients** | DELETE | ❌ | ❌ | ✅ |
| **groups** | SELECT | ✅ | ✅ | ✅ |
| **groups** | INSERT | ❌ | ❌ | ✅ |
| **groups** | UPDATE | ❌ | ❌ | ✅ |
| **groups** | DELETE | ❌ | ❌ | ✅ |
| **cir_classifications** | SELECT | ✅ | ✅ | ✅ |
| **cir_classifications** | INSERT | ❌ | ❌ | ✅ |
| **cir_classifications** | UPDATE | ❌ | ❌ | ✅ |
| **cir_classifications** | DELETE | ❌ | ❌ | ✅ |

**Total tests** : 36 scénarios (12 actions × 3 rôles)

---

## 🐛 Troubleshooting

### Erreur : "new row violates row-level security policy"
- ✅ **C'est normal** si l'utilisateur n'a pas les permissions
- Vérifier que le rôle est bien assigné dans la table `profiles`
- Vérifier que `auth.uid()` correspond bien à l'ID du profil

### Erreur : "User not found" ou "Invalid JWT"
- Se déconnecter et se reconnecter
- Vider le cache du navigateur
- Vérifier que l'utilisateur existe bien dans Supabase Auth

### Toutes les opérations réussissent (même pour viewer)
- ⚠️ **PROBLÈME** : Les policies ne sont pas activées
- Vérifier que RLS est bien activé : `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('clients', 'groups', 'cir_classifications');`
- Devrait afficher `rowsecurity = true` pour les 3 tables

---

## ✅ Checklist de validation

- [ ] Viewer : Peut lire, ne peut rien modifier (0/12 modifications autorisées)
- [ ] Commercial : Peut gérer clients (sauf delete), lecture seule pour le reste (8/12 modifications autorisées)
- [ ] Admin : Peut tout faire (12/12 modifications autorisées)
- [ ] Aucune erreur 500 (toutes les erreurs sont des 403 attendues)
- [ ] Messages d'erreur clairs pour l'utilisateur

---

## 📝 Notes

- Les utilisateurs de test peuvent être supprimés après validation
- En production, s'assurer que tous les utilisateurs réels ont un rôle assigné
- Les utilisateurs sans rôle (NULL) sont automatiquement en lecture seule
- Pour promouvoir un utilisateur : modifier le champ `role` dans la table `profiles`

---

**Dernière mise à jour** : 2025-11-09
**Auteur** : Claude Code
**Statut** : Prêt pour test manuel
