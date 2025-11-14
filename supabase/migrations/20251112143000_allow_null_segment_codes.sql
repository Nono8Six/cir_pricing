/*
  # Permit NULL fsmega/fsfam/fssfa in brand_category_mappings

  CIR imports doivent pouvoir stocker des mappings partiels (segment connu mais codes CIR absent).
  On retire donc les contraintes NOT NULL sur fsmega, fsfam, fssfa pour accepter les valeurs nulles.
*/

ALTER TABLE public.brand_category_mappings
  ALTER COLUMN fsmega DROP NOT NULL,
  ALTER COLUMN fsfam DROP NOT NULL,
  ALTER COLUMN fssfa DROP NOT NULL;
