# Mapping Admin Tools – Test Plan (0.5.10)

## Environnement
- Frontend : `npm run dev` (Vite)
- Base : instance locale/branche test avec migration `20251111153000_admin_mapping_tools.sql` appliquée
- Comptes :
  - **Admin** (profil `role = admin`) pour valider toutes les actions
  - **Non-admin** (profil `role = technico_commercial` ou `responsable`) pour vérifier le verrouillage UI

## Scénario 1 – Administrateur
1. Se connecter avec un compte admin puis ouvrir `/mapping` → onglet « Paramètres ».
2. Cliquer sur **Exporter toutes les données** et vérifier :
   - Téléchargement du CSV `mappings_export_YYYY-MM-DD.csv`
   - Toast succès avec le nombre total de lignes exportées (issue de `mappingApi.getAllBrandCategoryMappings`).
3. Cliquer sur **Nettoyer l'historique ancien** et confirmer la modale :
   - Apercevoir le spinner sur le bouton + toast succès affichant `deletedRows`.
   - Bloc « Dernière action » affiche `Nettoyage historique (> rétention)` avec le compteur renvoyé par `admin_cleanup_mapping_history`.
   - Les statistiques se rafraîchissent automatiquement (`fetchDatabaseStats`).
4. Cliquer sur **Purger TOUT l'historique** :
   - Toast succès avec le nombre total de lignes supprimées.
   - Bloc « Dernière action » = `Purge complète historique`.
5. Cliquer sur **Purger toutes les données** et confirmer :
   - Toast succès listant les trois compteurs (`deletedMappingRows`, `deletedHistoryRows`, `deletedImportBatches`).
   - Bloc « Dernière action » = `Purge totale des données mapping` avec les valeurs formatées.
6. Vérifier qu’après chaque action les cartes de statistiques utilisent les nouvelles valeurs (squelette pendant chargement, puis chiffres mis à jour).

## Scénario 2 – Non-admin
1. Se connecter avec un compte non admin.
2. Ouvrir `/mapping` → onglet « Paramètres » et constater :
   - Les boutons d’administration sont remplacés par le message « Accès restreint ».
   - Le bloc « Dernière action » n’est pas visible.
   - En cliquant sur les toggles/inputs, les actions restent désactivées.
3. Forcer un clic programmé sur les anciens handlers (ex. via DevTools ou React DevTools si disponible) doit afficher un toast « Accès refusé » (garde `assertAdminAccess`).

## Notes complémentaires
- Pour les captures d’écran, cibler :
  1. Vue admin avant action (cartes stats + boutons).
  2. Toast succès après une purge.
  3. Bloc « Dernière action » rempli.
  4. Vue non-admin (message d’accès restreint).
- Avant d’exécuter les scénarios destructifs, utiliser une base de test ou restaurer les données via les scripts d’import pour éviter toute perte en prod.
