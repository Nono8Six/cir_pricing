export function normalizeHeader(h: string): string {
  return (h || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

const MAPPING_SYNONYMS: Record<string, string[]> = {
  segment: ['segment', 'seg', 'segcir', 'segmentcir'],
  marque: ['marque', 'brand', 'fabricant', 'maker', 'vendor', 'supplier', 'fournisseur'],
  cat_fab: ['catfab', 'cat_fab', 'cat', 'categorie', 'category', 'famillefabricant', 'family', 'familycode', 'productfamily', 'famille_fabricant'],
  cat_fab_l: ['description', 'libelle', 'libellel', 'designation', 'desc', 'catlibelle', 'productdescription', 'familydescription'],
  strategiq: ['strategiq', 'strategique', 'isstrategic', 'strategic', 'strat', 'strategique_flag', 'strategic_flag'],
  fsmega: ['fsmega', 'mega', 'megafamille', 'fsm', 'megacode', 'fsmegacode', 'fs_mega', 'fs_mega_code'],
  fsfam: ['fsfam', 'famille', 'fam', 'fsf', 'famillecode', 'fsfamcode', 'fs_fam', 'fs_fam_code', 'famille_code'],
  fssfa: ['fssfa', 'ssfamille', 'ssfam', 'ssf', 'sousfamille', 'ssfamillecode', 'fssfacode', 'fs_sfa', 'fs_sfa_code', 'sous_famille_code'],
  codif_fair: ['codiffair', 'codif', 'fair', 'codefair', 'codification_fair'],
};

const CLASSIF_SYNONYMS: Record<string, string[]> = {
  fsmega_code: ['fsmegacode', 'fsmega', 'megacode', 'fsm', 'fs_mega_code', 'fs_mega', 'mega', 'fsmegacode', 'codefsmega', 'code fsmega'],
  fsmega_designation: ['fsmegadesignation', 'megadesignation', 'fsmegalibelle', 'fsmegalib', 'fs_mega_designation', 'mega_designation', 'megadesignation', 'designationfsmega', 'designation fsmega'],
  fsfam_code: ['fsfamcode', 'fsfam', 'famillecode', 'fs_fam_code', 'fs_fam', 'fam', 'famille_code', 'famcode', 'codefsfam', 'code fsfam'],
  fsfam_designation: ['fsfamdesignation', 'familledesignation', 'fsfamlibelle', 'fsfamlib', 'fs_fam_designation', 'fam_designation', 'famille_designation', 'designationfsfam', 'designation fsfam'],
  fssfa_code: ['fssfacode', 'fssfa', 'sousfamillecode', 'ssf', 'fs_sfa_code', 'fs_sfa', 'sfa', 'sous_famille_code', 'sfacode', 'codefssfa', 'code fssfa'],
  fssfa_designation: ['fssfadesignation', 'sousfamilledesignation', 'fssfalibelle', 'fssfalib', 'fs_sfa_designation', 'sfa_designation', 'sous_famille_designation', 'designationfssfa', 'designation fssfa'],
  combined_code: ['combinedcode', 'codecombine', 'code', 'combined', 'code_combine', 'codecombined', 'fullcode', 'code123', 'code 123', 'code 1 2 3', 'code1&2&3', 'code 1&2&3'],
  combined_designation: ['combineddesignation', 'designationcombinee', 'libellecombine', 'combined_designation', 'designation_combinee', 'fulldesignation', 'designation123', 'designation 123', 'designation 1 2 3', 'designation1&2&3', 'designation 1&2&3'],
};

export function guessMapping(headers: string[], dataset: 'mapping' | 'classification') {
  const normHeaders = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  const dict = dataset === 'mapping' ? MAPPING_SYNONYMS : CLASSIF_SYNONYMS;
  const res: Record<string, string> = {};

  for (const key of Object.keys(dict)) {
    const candidates = dict[key].map(normalizeHeader);
    const hit = normHeaders.find((h) => candidates.includes(h.norm));
    if (hit) res[key] = hit.raw;
  }
  return res;
}

