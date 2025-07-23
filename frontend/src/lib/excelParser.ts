import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';

export interface ExcelParseOptions {
  sheetName?: string;
  skipEmptyRows?: boolean;
  maxErrors?: number;
}

export interface HeaderDetectionResult {
  mapping: Record<string, string>;
  unmappedHeaders: string[];
  confidence: number;
}

export interface ParseResult {
  data: any[];
  totalLines: number;
  validLines: number;
  skippedLines: number;
  info: string[];
}

// Mapping des colonnes par défaut
const DEFAULT_COLUMN_MAPPINGS: Record<string, string[]> = {
  segment: ['SEGMENT', 'Segment', 'segment', 'SEG'],
  marque: ['MARQUE', 'Marque', 'marque', 'BRAND', 'Brand', 'brand'],
  cat_fab: ['CAT_FAB', 'Cat_Fab', 'cat_fab', 'CATEGORY', 'Category'],
  cat_fab_l: ['CAT_FAB_L', 'Cat_Fab_L', 'cat_fab_l', 'DESCRIPTION', 'Description'],
  strategiq: ['STRATEGIQ', 'Strategiq', 'strategiq', 'STRATEGIC', 'Strategic'],
  codif_fair: ['CODIF_FAIR', 'Codif_Fair', 'codif_fair', 'CODE_FAIR', 'Code_Fair'],
  fsmega: ['FSMEGA', 'Fsmega', 'fsmega', 'FS_MEGA', 'Fs_Mega'],
  fsfam: ['FSFAM', 'Fsfam', 'fsfam', 'FS_FAM', 'Fs_Fam'],
  fssfa: ['FSSFA', 'Fssfa', 'fssfa', 'FS_SFA', 'Fs_Sfa']
};

/**
 * Détecte automatiquement les colonnes en utilisant fuzzy matching
 */
export function detectColumnMapping(headers: string[]): HeaderDetectionResult {
  const mapping: Record<string, string> = {};
  const unmappedHeaders: string[] = [];
  let totalMatches = 0;

  const fuseOptions = {
    threshold: 0.3,
    distance: 100,
    includeScore: true
  };

  for (const header of headers) {
    let bestMatch: { field: string; score: number } | null = null;

    for (const [field, variations] of Object.entries(DEFAULT_COLUMN_MAPPINGS)) {
      const fuse = new Fuse(variations, fuseOptions);
      const results = fuse.search(header);

      if (results.length > 0 && results[0].score !== undefined) {
        const score = 1 - results[0].score;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { field, score };
        }
      }
    }

    if (bestMatch && bestMatch.score > 0.7) {
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
 * Parse un fichier Excel sans validation stricte
 */
export async function parseExcelFile(
  file: File, 
  options: ExcelParseOptions = {}
): Promise<ParseResult> {
  const {
    sheetName,
    skipEmptyRows = true
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

        if (headerDetection.confidence < 0.3) {
          reject(new Error(
            `Impossible de détecter les colonnes. ` +
            `Colonnes non mappées: ${headerDetection.unmappedHeaders.join(', ')}`
          ));
          return;
        }

        // Parser les données sans validation stricte
        const result = parseDataRowsSimple(
          jsonData.slice(1),
          headers,
          headerDetection.mapping
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
 * Parse les lignes de données sans validation stricte
 */
function parseDataRowsSimple(
  rows: any[][],
  headers: string[],
  columnMapping: Record<string, string>
): ParseResult {
  const data: any[] = [];
  const info: string[] = [];
  let validLines = 0;
  let skippedLines = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNumber = i + 2;

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
          
          // Nettoyage basique des valeurs
          if (typeof value === 'string') {
            value = value.trim();
            if (value === '') value = null;
          }
          
          // Conversion automatique des nombres
          if (['strategiq', 'fsmega', 'fsfam', 'fssfa'].includes(fieldName) && value !== null) {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              value = Math.floor(numValue);
            }
          }
          
          // Valeurs par défaut simples (sauf pour fsmega, fsfam, fssfa qui seront traités par l'auto-classification)
          if (value === null || value === undefined) {
            switch (fieldName) {
              case 'strategiq':
                value = 0;
                break;
              case 'country':
                value = 'France';
                break;
              // Pour fsmega, fsfam, fssfa : laisser null pour déclencher l'auto-classification
              case 'fsmega':
              case 'fsfam':
              case 'fssfa':
                value = null;
                break;
            }
          }
          
          rowData[fieldName] = value;
        }
      }

      // Vérifier seulement les champs absolument obligatoires
      if (rowData.segment && rowData.marque && rowData.cat_fab) {
        // Calculer classif_cir automatiquement (sera fait après auto-classification)
        if (rowData.fsmega && rowData.fsfam && rowData.fssfa && 
            rowData.fsmega > 0 && rowData.fsfam > 0 && rowData.fssfa > 0) {
          rowData.classif_cir = `${rowData.fsmega} ${rowData.fsfam} ${rowData.fssfa}`;
        }
        
        data.push(rowData);
        validLines++;
      } else {
        skippedLines++;
        info.push(`Ligne ${lineNumber}: Champs obligatoires manquants (segment, marque, cat_fab)`);
      }

    } catch (error) {
      skippedLines++;
      info.push(`Ligne ${lineNumber}: Erreur de parsing - ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  return {
    data,
    totalLines: rows.length,
    validLines,
    skippedLines,
    info
  };
}