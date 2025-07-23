import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';
import { BrandMappingSchema, ValidationError, ParseResult, DEFAULT_COLUMN_MAPPINGS, ColumnMapping } from '../../lib/schemas';

export interface ExcelParseOptions {
  sheetName?: string;
  skipEmptyRows?: boolean;
  maxErrors?: number;
}

export interface HeaderDetectionResult {
  mapping: ColumnMapping;
  unmappedHeaders: string[];
  confidence: number;
}

/**
 * Détecte automatiquement les colonnes en utilisant fuzzy matching
 */
export function detectColumnMapping(headers: string[]): HeaderDetectionResult {
  const mapping: ColumnMapping = {};
  const unmappedHeaders: string[] = [];
  let totalMatches = 0;

  // Configuration Fuse.js pour le fuzzy matching
  const fuseOptions = {
    threshold: 0.3, // Plus strict = correspondance plus exacte
    distance: 100,
    includeScore: true
  };

  for (const header of headers) {
    let bestMatch: { field: string; score: number } | null = null;

    // Chercher la meilleure correspondance pour chaque champ
    for (const [field, variations] of Object.entries(DEFAULT_COLUMN_MAPPINGS)) {
      const fuse = new Fuse(variations, fuseOptions);
      const results = fuse.search(header);

      if (results.length > 0 && results[0].score !== undefined) {
        const score = 1 - results[0].score; // Inverser le score (plus haut = meilleur)
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { field, score };
        }
      }
    }

    if (bestMatch && bestMatch.score > 0.7) { // Seuil de confiance
      mapping[header] = bestMatch.field;
      totalMatches++;
    } else {
      unmappedHeaders.push(header);
    }
  }

  const confidence = totalMatches / Object.keys(DEFAULT_COLUMN_MAPPINGS).length;

  return {
    mapping,
    unmappedHeaders,
    confidence
  };
}

/**
 * Parse un fichier Excel avec détection automatique des colonnes
 */
export async function parseExcelFile(
  file: File, 
  options: ExcelParseOptions = {}
): Promise<ParseResult> {
  const {
    sheetName,
    skipEmptyRows = true,
    maxErrors = 10000
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Déterminer quelle feuille utiliser
        let targetSheetName = sheetName;
        if (!targetSheetName) {
          // Chercher 'RequeteAs400' en priorité, sinon prendre la première feuille
          targetSheetName = workbook.SheetNames.find(name => 
            name.toLowerCase().includes('requeteas400') || 
            name.toLowerCase().includes('requete')
          ) || workbook.SheetNames[0];
        }

        if (!workbook.SheetNames.includes(targetSheetName)) {
          reject(new Error(`Feuille '${targetSheetName}' non trouvée. Feuilles disponibles: ${workbook.SheetNames.join(', ')}`));
          return;
        }

        const worksheet = workbook.Sheets[targetSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: null,
          blankrows: !skipEmptyRows
        });

        if (jsonData.length < 2) {
          reject(new Error('Le fichier Excel ne contient pas assez de données (minimum 2 lignes avec en-têtes)'));
          return;
        }

        // Extraire les en-têtes et détecter le mapping
        const headers = jsonData[0] as string[];
        const headerDetection = detectColumnMapping(headers);

        if (headerDetection.confidence < 0.5) {
          reject(new Error(
            `Confiance de détection des colonnes trop faible (${Math.round(headerDetection.confidence * 100)}%). ` +
            `Colonnes non mappées: ${headerDetection.unmappedHeaders.join(', ')}`
          ));
          return;
        }

        // Parser les données ligne par ligne
        const result = parseDataRows(
          jsonData.slice(1), // Ignorer la ligne d'en-têtes
          headers,
          headerDetection.mapping,
          maxErrors
        );

        resolve(result);

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse les lignes de données avec validation Zod
 */
function parseDataRows(
  rows: any[][],
  headers: string[],
  columnMapping: ColumnMapping,
  maxErrors: number
): ParseResult {
  const data: any[] = [];
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];
  let validLines = 0;
  let skippedLines = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNumber = i + 2; // +2 car on a ignoré la ligne d'en-têtes et les index commencent à 0

    // Ignorer les lignes complètement vides
    if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
      skippedLines++;
      continue;
    }

    try {
      // Construire l'objet à partir du mapping des colonnes
      const rowData: any = {};
      
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const fieldName = columnMapping[header];
        
        if (fieldName) {
          let value = row[j];
          
          // Nettoyage et conversion des valeurs
          if (typeof value === 'string') {
            value = value.trim();
            if (value === '') value = null;
          }
          
          // Conversion des nombres pour les champs numériques
          if (['strategiq', 'fsmega', 'fsfam', 'fssfa'].includes(fieldName) && value !== null) {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              value = Math.floor(numValue); // Convertir en entier
            }
          }
          
          rowData[fieldName] = value;
        }
      }

      // Validation avec Zod
      const validationResult = BrandMappingSchema.safeParse(rowData);

      if (validationResult.success) {
        data.push(validationResult.data);
        validLines++;
        
        // Ajouter des infos pour les valeurs par défaut utilisées
        const originalData = rowData;
        const processedData = validationResult.data;
        
        Object.keys(processedData).forEach(key => {
          if (originalData[key] === null || originalData[key] === undefined) {
            if (processedData[key] !== null && processedData[key] !== undefined) {
              info.push({
                line: lineNumber,
                column: key,
                field: key,
                value: originalData[key],
                expected: String(processedData[key]),
                message: `Valeur par défaut appliquée: ${processedData[key]}`,
                level: 'INFO'
              });
            }
          }
        });

      } else {
        // Traiter les erreurs de validation
        validationResult.error.errors.forEach(error => {
          const field = error.path.join('.');
          const isRequired = error.code === 'invalid_type' && error.message.includes('Required');
          
          errors.push({
            line: lineNumber,
            column: field,
            field: field,
            value: rowData[field],
            expected: getExpectedValue(field, error),
            message: error.message,
            level: isRequired ? 'BLOCKING' : 'WARNING',
            suggestion: getSuggestion(field, rowData[field], error)
          });
        });

        if (errors.filter(e => e.level === 'BLOCKING').length === 0) {
          // Si pas d'erreurs bloquantes, essayer d'appliquer les corrections automatiques
          const correctedData = applyCorrections(rowData);
          const retryResult = BrandMappingSchema.safeParse(correctedData);
          
          if (retryResult.success) {
            data.push(retryResult.data);
            validLines++;
            
            warnings.push({
              line: lineNumber,
              column: 'auto-correction',
              field: 'multiple',
              value: 'données corrigées',
              message: 'Ligne corrigée automatiquement',
              level: 'WARNING'
            });
          } else {
            skippedLines++;
          }
        } else {
          skippedLines++;
        }
      }

    } catch (error) {
      errors.push({
        line: lineNumber,
        column: 'parsing',
        field: 'row',
        value: row,
        message: `Erreur de parsing: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        level: 'BLOCKING'
      });
      skippedLines++;
    }

    // Arrêter si trop d'erreurs
    if (errors.length >= maxErrors) {
      errors.push({
        line: lineNumber,
        column: 'system',
        field: 'limit',
        value: maxErrors,
        message: `Limite d'erreurs atteinte (${maxErrors}). Parsing arrêté.`,
        level: 'BLOCKING'
      });
      break;
    }
  }

  return {
    data,
    errors,
    warnings,
    info,
    totalLines: rows.length,
    validLines,
    skippedLines
  };
}

/**
 * Obtient la valeur attendue pour un champ en erreur
 */
function getExpectedValue(field: string, error: any): string {
  switch (field) {
    case 'strategiq':
      return '0 ou 1';
    case 'fsmega':
    case 'fsfam':
    case 'fssfa':
      return 'nombre entier entre 1 et 999';
    default:
      return error.expected || 'valeur valide';
  }
}

/**
 * Génère une suggestion de correction
 */
function getSuggestion(field: string, value: any, error: any): string | undefined {
  if (value === null || value === undefined || value === '') {
    return 'Remplir ce champ obligatoire';
  }

  switch (field) {
    case 'strategiq':
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower.includes('oui') || lower.includes('yes') || lower.includes('true')) {
          return 'Remplacer par 1';
        }
        if (lower.includes('non') || lower.includes('no') || lower.includes('false')) {
          return 'Remplacer par 0';
        }
      }
      return 'Utiliser 0 (non stratégique) ou 1 (stratégique)';
    
    case 'fsmega':
    case 'fsfam':
    case 'fssfa':
      if (typeof value === 'string' && !isNaN(Number(value))) {
        return `Convertir "${value}" en nombre`;
      }
      if (typeof value === 'number' && value <= 0) {
        return 'Utiliser une valeur supérieure à 0';
      }
      return 'Utiliser un nombre entier entre 1 et 999';
    
    default:
      return undefined;
  }
}

/**
 * Applique des corrections automatiques simples
 */
function applyCorrections(data: any): any {
  const corrected = { ...data };

  // Corrections pour strategiq
  if (corrected.strategiq !== null && corrected.strategiq !== undefined) {
    if (typeof corrected.strategiq === 'string') {
      const lower = corrected.strategiq.toLowerCase();
      if (lower.includes('oui') || lower.includes('yes') || lower.includes('true')) {
        corrected.strategiq = 1;
      } else if (lower.includes('non') || lower.includes('no') || lower.includes('false')) {
        corrected.strategiq = 0;
      }
    }
  }

  // Corrections pour les champs numériques
  ['fsmega', 'fsfam', 'fssfa'].forEach(field => {
    if (corrected[field] !== null && corrected[field] !== undefined) {
      if (typeof corrected[field] === 'string' && !isNaN(Number(corrected[field]))) {
        corrected[field] = Math.floor(Number(corrected[field]));
      }
      if (typeof corrected[field] === 'number' && corrected[field] <= 0) {
        corrected[field] = field === 'fsmega' ? 1 : 99; // Valeurs par défaut
      }
    }
  });

  return corrected;
}