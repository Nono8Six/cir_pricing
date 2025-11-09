# 🤖 Prompt Template pour Remédiation CIR Pricing

## Template à Copier-Coller

```
Exécute l'étape 0.3.5 du fichier PLAN_REMEDIATION_DETAILLE.md.

Instructions :
1. Lis attentivement l'étape et ses sous-tâches
2. Exécute TOUTES les actions demandées (code, migrations SQL, configurations, tests) (n'hésite pas a utiliser tous tes outils et MCP pour réaliser cet étape.)
3. Coche la case [ ] → [x] dans le fichier PLAN_REMEDIATION_DETAILLE.md
4. Remplis le compte rendu avec :
   - Date du jour
   - Durée estimée de l'étape
   - Résultat (tous les sous-points cochés)
   - Notes/problèmes rencontrés
5. Si l'étape génère du code : fais un commit Git avec message conventionnel
6. Montre-moi un résumé de ce qui a été fait, et si possible dit moi comment tester cette correction
7. Demande-moi validation AVANT de passer à l'étape suivante

```

---

## Exemples d'Utilisation

### Exemple 1 - Phase 0 (Sécurité)
```
Exécute l'étape 0.1.1 du fichier PLAN_REMEDIATION_DETAILLE.md.

Instructions :
1. Lis attentivement l'étape et ses sous-tâches
2. Exécute TOUTES les actions demandées (code, migrations SQL, configurations, tests)
3. Coche la case [ ] → [x] dans le fichier PLAN_REMEDIATION_DETAILLE.md
4. Remplis le compte rendu avec :
   - Date du jour
   - Durée estimée de l'étape
   - Résultat (tous les sous-points cochés)
   - Notes/problèmes rencontrés
5. Si l'étape génère du code : fais un commit Git avec message conventionnel
6. Montre-moi un résumé de ce qui a été fait
7. Demande-moi validation AVANT de passer à l'étape suivante

Numéro d'étape : 0.1.1

GO !
```

### Exemple 2 - Phase 1 (React Query)
```
Exécute l'étape 1.1.1 du fichier PLAN_REMEDIATION_DETAILLE.md.

Instructions :
1. Lis attentivement l'étape et ses sous-tâches
2. Exécute TOUTES les actions demandées (code, migrations SQL, configurations, tests)
3. Coche la case [ ] → [x] dans le fichier PLAN_REMEDIATION_DETAILLE.md
4. Remplis le compte rendu avec :
   - Date du jour
   - Durée estimée de l'étape
   - Résultat (tous les sous-points cochés)
   - Notes/problèmes rencontrés
5. Si l'étape génère du code : fais un commit Git avec message conventionnel
6. Montre-moi un résumé de ce qui a été fait
7. Demande-moi validation AVANT de passer à l'étape suivante

Numéro d'étape : 1.1.1

GO !
```

### Exemple 3 - Sauter plusieurs étapes déjà faites
```
Exécute l'étape 2.3.4 du fichier PLAN_REMEDIATION_DETAILLE.md.

Instructions :
1. Lis attentivement l'étape et ses sous-tâches
2. Exécute TOUTES les actions demandées (code, migrations SQL, configurations, tests)
3. Coche la case [ ] → [x] dans le fichier PLAN_REMEDIATION_DETAILLE.md
4. Remplis le compte rendu avec :
   - Date du jour
   - Durée estimée de l'étape
   - Résultat (tous les sous-points cochés)
   - Notes/problèmes rencontrés
5. Si l'étape génère du code : fais un commit Git avec message conventionnel
6. Montre-moi un résumé de ce qui a été fait
7. Demande-moi validation AVANT de passer à l'étape suivante

Numéro d'étape : 2.3.4

GO !
```

---

## Workflow Recommandé

### Étape par Étape
1. **Copier le template** ci-dessus
2. **Remplacer** `[REMPLACER_ICI]` par le numéro (ex: `0.1.1`)
3. **Coller** dans une nouvelle conversation Claude
4. **L'IA exécute** l'étape complètement
5. **Vous validez** : "OK, continue" ou "Attends, il y a un problème avec X"
6. **Répéter** avec l'étape suivante

### En Batch (plusieurs étapes d'affilée)
Si plusieurs étapes sont simples et vont ensemble :
```
Exécute les étapes 0.1.1 à 0.1.3 du fichier PLAN_REMEDIATION_DETAILLE.md.

Instructions :
[... mêmes instructions ...]

Numéros d'étapes : 0.1.1, 0.1.2, 0.1.3

Fais-les séquentiellement et demande-moi validation après CHAQUE étape.

GO !
```

### Reprendre après interruption
```
Je reprends le plan de remédiation. Vérifie dans PLAN_REMEDIATION_DETAILLE.md quelle est la dernière étape cochée [x], puis exécute la suivante.

Instructions :
[... mêmes instructions ...]

GO !
```

---

## Notes Importantes

- **Une étape à la fois** : Ne pas demander plusieurs étapes non-reliées en même temps
- **Validation obligatoire** : Toujours attendre votre "OK" avant que l'IA continue
- **Compte rendu obligatoire** : L'IA DOIT remplir le compte rendu dans le fichier
- **Commits atomiques** : Un commit par étape (ou groupe d'étapes cohérentes)
- **Tests requis** : Si l'étape demande des tests, l'IA doit les exécuter

---

## Raccourcis Utiles

### Prompt Ultra-Court (si vous êtes pressé)
```
Étape [NUMERO] du plan. GO !
```

### Demander un résumé
```
Résume les 10 dernières étapes complétées dans PLAN_REMEDIATION_DETAILLE.md avec leurs comptes rendus.
```

### Vérifier progression
```
Quel % du PLAN_REMEDIATION_DETAILLE.md est complété ? Donne un résumé par phase.
```

---

## 🎯 Template Prêt à Copier (VERSION FINALE)

**Copiez tout le bloc ci-dessous, changez juste le numéro d'étape :**

```
Exécute l'étape [NUMERO] du fichier PLAN_REMEDIATION_DETAILLE.md.

Instructions :
1. Lis attentivement l'étape et ses sous-tâches
2. Exécute TOUTES les actions demandées (code, migrations SQL, configurations, tests)
3. Coche la case [ ] → [x] dans le fichier PLAN_REMEDIATION_DETAILLE.md
4. Remplis le compte rendu avec :
   - Date du jour
   - Durée estimée de l'étape
   - Résultat (tous les sous-points cochés)
   - Notes/problèmes rencontrés
5. Si l'étape génère du code : fais un commit Git avec message conventionnel
6. Montre-moi un résumé de ce qui a été fait
7. Demande-moi validation AVANT de passer à l'étape suivante

Numéro d'étape : [REMPLACER_ICI]

GO !
```

---

**Fichier créé le** : 2025-01-31
**Projet** : CIR Pricing - Plan de Remédiation Détaillé
**Utilisation** : Copier-coller le template, changer le numéro, GO !
