/*
  # Align import_batches.dataset_type with CIR datasets

  - Older environments still had the original CHECK (values like 'mapping'/'classification')
  - Drop and recreate the constraint so only 'cir_classification' or 'cir_segment' are allowed
  - Permit NULL to keep legacy rows valid
*/

-- First, drop the old constraint to allow data migration
ALTER TABLE public.import_batches
  DROP CONSTRAINT IF EXISTS import_batches_dataset_type_check;

-- Then migrate existing data to new values
UPDATE public.import_batches
SET dataset_type = 'cir_classification'
WHERE dataset_type = 'classification';

UPDATE public.import_batches
SET dataset_type = NULL
WHERE dataset_type = 'mapping';

-- Finally, add the new constraint
ALTER TABLE public.import_batches
  ADD CONSTRAINT import_batches_dataset_type_check
  CHECK (
    dataset_type IS NULL
    OR dataset_type IN ('cir_classification', 'cir_segment')
  );
