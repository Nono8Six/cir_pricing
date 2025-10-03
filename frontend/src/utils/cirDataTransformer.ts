// Interfaces pour la structure hiérarchique des classifications CIR
export interface CirSubFamily {
  code: number;
  designation: string;
  combinedCode: string;
  combinedDesignation: string;
  id?: string;
}

export interface CirFamily {
  code: number;
  designation: string;
  subFamilies: CirSubFamily[];
}

export interface CirMegaFamily {
  code: number;
  designation: string;
  families: CirFamily[];
}

// Interface pour les données plates de la base de données
export interface CirClassificationFlat {
  id?: string;
  fsmega_code: number;
  fsmega_designation: string;
  fsfam_code: number;
  fsfam_designation: string;
  fssfa_code: number;
  fssfa_designation: string;
  combined_code: string;
  combined_designation: string;
}

/**
 * Transforme une liste plate de classifications CIR en structure hiérarchique
 */
export function transformCirClassificationsToHierarchy(
  flatClassifications: CirClassificationFlat[]
): CirMegaFamily[] {
  const megaFamiliesMap = new Map<number, CirMegaFamily>();

  // Parcourir toutes les classifications plates
  for (const classification of flatClassifications) {
    const {
      fsmega_code,
      fsmega_designation,
      fsfam_code,
      fsfam_designation,
      fssfa_code,
      fssfa_designation,
      combined_code,
      combined_designation,
      id
    } = classification;

    // Créer ou récupérer la méga famille
    if (!megaFamiliesMap.has(fsmega_code)) {
      megaFamiliesMap.set(fsmega_code, {
        code: fsmega_code,
        designation: fsmega_designation,
        families: []
      });
    }

    const megaFamily = megaFamiliesMap.get(fsmega_code)!;

    // Chercher ou créer la famille dans cette méga famille
    let family = megaFamily.families.find(f => f.code === fsfam_code);
    if (!family) {
      family = {
        code: fsfam_code,
        designation: fsfam_designation,
        subFamilies: []
      };
      megaFamily.families.push(family);
    }

    // Chercher ou créer la sous-famille dans cette famille
    let subFamily = family.subFamilies.find(sf => sf.code === fssfa_code);
    if (!subFamily) {
      subFamily = {
        code: fssfa_code,
        designation: fssfa_designation,
        combinedCode: combined_code,
        combinedDesignation: combined_designation,
        ...(id !== undefined && { id })
      };
      family.subFamilies.push(subFamily);
    }
  }

  // Convertir la Map en tableau et trier
  const result = Array.from(megaFamiliesMap.values());

  // Trier les méga familles par code
  result.sort((a, b) => a.code - b.code);

  // Trier les familles et sous-familles dans chaque méga famille
  result.forEach(megaFamily => {
    megaFamily.families.sort((a, b) => a.code - b.code);
    megaFamily.families.forEach(family => {
      family.subFamilies.sort((a, b) => a.code - b.code);
    });
  });

  return result;
}

/**
 * Filtre les familles d'une méga famille donnée
 */
export function getFamiliesForMegaFamily(
  hierarchy: CirMegaFamily[],
  megaFamilyCode: number
): CirFamily[] {
  const megaFamily = hierarchy.find(mf => mf.code === megaFamilyCode);
  return megaFamily ? megaFamily.families : [];
}

/**
 * Filtre les sous-familles d'une famille donnée dans une méga famille donnée
 */
export function getSubFamiliesForFamily(
  hierarchy: CirMegaFamily[],
  megaFamilyCode: number,
  familyCode: number
): CirSubFamily[] {
  const megaFamily = hierarchy.find(mf => mf.code === megaFamilyCode);
  if (!megaFamily) return [];

  const family = megaFamily.families.find(f => f.code === familyCode);
  return family ? family.subFamilies : [];
}

/**
 * Recherche une classification complète par codes
 */
export function findClassificationByCode(
  hierarchy: CirMegaFamily[],
  megaFamilyCode: number,
  familyCode: number,
  subFamilyCode: number
): {
  megaFamily: CirMegaFamily;
  family: CirFamily;
  subFamily: CirSubFamily;
} | null {
  const megaFamily = hierarchy.find(mf => mf.code === megaFamilyCode);
  if (!megaFamily) return null;

  const family = megaFamily.families.find(f => f.code === familyCode);
  if (!family) return null;

  const subFamily = family.subFamilies.find(sf => sf.code === subFamilyCode);
  if (!subFamily) return null;

  return { megaFamily, family, subFamily };
}

/**
 * Obtient des statistiques sur la hiérarchie
 */
export function getHierarchyStats(hierarchy: CirMegaFamily[]) {
  let totalFamilies = 0;
  let totalSubFamilies = 0;

  hierarchy.forEach(megaFamily => {
    totalFamilies += megaFamily.families.length;
    megaFamily.families.forEach(family => {
      totalSubFamilies += family.subFamilies.length;
    });
  });

  return {
    totalMegaFamilies: hierarchy.length,
    totalFamilies,
    totalSubFamilies,
    totalClassifications: totalSubFamilies
  };
}