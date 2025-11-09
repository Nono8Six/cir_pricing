# Bugs identifiés dans `supabase/functions/process-import/index.ts`
## Date : 2025-01-08
## Étape 0.1.1 - Analyse détaillée

---

## 🐛 Bug #1 : Variable `batch_id` hors scope dans le catch

**Localisation (avant correctif du 2025-01-08)** : destructuring du corps de requête dans le `try` (`const { batch_id, ... } = await req.json()`) et mise à jour `import_batches` dans le `catch`.

**Problème** :
```typescript
// Ligne 17 - Dans le try block
const { batch_id, dataset_type, file_path, mapping } = await req.json();

// Ligne 93 - Dans le catch block
if (typeof batch_id === 'string') {  // ❌ batch_id n'est pas accessible ici
  await supa.from('import_batches').update({ status: 'failed' }).eq('id', batch_id);
}
```

**Impact** : Si une erreur survient, le code du catch ne peut pas mettre à jour le statut du batch à 'failed' car `batch_id` n'est pas dans le scope du catch.

**Solution** : Déclarer `let batchId: string | null = null;` avant le try, puis assigner `batchId = batch_id;` après destructuring.

---

## 🐛 Bug #2 : Variable `supa` hors scope dans le catch

**Localisation (avant correctif du 2025-01-08)** : initialisation de `supa` à l'intérieur du `try` (lecture des secrets `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`) et utilisation du client dans le `catch`.

**Problème** :
```typescript
// Lignes 18-20 - Dans le try block
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

// Ligne 95 - Dans le catch block
await supa.from('import_batches')...  // ❌ supa n'est pas accessible ici
```

**Impact** : Le client Supabase n'est pas accessible dans le catch, donc impossible de mettre à jour le statut en cas d'erreur.

**Solution** : Créer le client Supabase AVANT `Deno.serve()`, en dehors du handler de requête. Renommer `supa` → `supabase` pour clarté.

---

## 🐛 Bug #3 : CORS trop permissif

**Localisation (avant correctif du 2025-01-08)** : objet `corsHeaders` déclaré en haut de `supabase/functions/process-import/index.ts`.

**Problème** :
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ❌ Accepte n'importe quel domaine
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Impact** : N'importe quel site web peut appeler cette Edge Function, risque de CSRF et d'abus.

**Solution** : Restreindre à votre domaine :
```typescript
'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://your-domain.com'
```

---

## 🐛 Bug #4 : Aucune validation du request body

**Localisation (avant correctif du 2025-01-08)** : destructuring direct du `req.json()` dans le `try` sans validation préalable.

**Problème** :
```typescript
const { batch_id, dataset_type, file_path, mapping } = await req.json();
// ❌ Pas de validation : batch_id pourrait être undefined, dataset_type invalide, etc.
```

**Impact** :
- Données malformées peuvent causer des erreurs silencieuses
- Pas de vérification de type (batch_id UUID, dataset_type enum, etc.)
- Pas de message d'erreur clair pour l'utilisateur

**Solution** : Créer schémas Zod et valider :
```typescript
const ProcessImportRequestSchema = z.object({
  batch_id: z.string().uuid(),
  dataset_type: z.enum(['mapping', 'classification']),
  file_path: z.string().min(1),
  mapping: z.record(z.string())
});

const validated = ProcessImportRequestSchema.parse(jsonData);
```

---

## 🐛 Bug #5 : Parsing CSV ne gère pas les virgules dans les valeurs

**Localisation (avant correctif du 2025-01-08)** : fonction de parsing CSV artisanale (split sur `;` ou `,`) lors de la lecture du fichier Storage.

**Problème** :
```typescript
const headers = headerLine.split(';').length > 1 ? headerLine.split(';') : headerLine.split(',');
for (const line of rest) {
  const cols = (line.split(';').length > 1 ? line.split(';') : line.split(',')).map(s => s.trim());
  // ❌ Ne gère pas les quotes : "Paris, France" sera split en ["Paris", " France"]
}
```

**Impact** : Fichiers CSV avec des valeurs contenant des virgules ou point-virgules (ex: adresses, descriptions) seront mal parsés.

**Solution** : Utiliser une bibliothèque robuste comme `papaparse` :
```typescript
import Papa from 'npm:papaparse';
const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
rows = parsed.data;
```

---

## 📋 Résumé des bugs confirmés

✅ Bug #1 : `batch_id` hors scope
✅ Bug #2 : `supa` hors scope
✅ Bug #3 : CORS permissif
✅ Bug #4 : Validation absente
✅ Bug #5 : Parsing CSV fragile

---

## 🔧 Prochaines étapes

Les étapes 0.1.2 à 0.1.10 du plan corrigeront ces bugs systématiquement.
