/*
  # Allow "processing" status in import_batches

  Edge Functions update batches with status='processing'. Older constraint only
  allowed pending/completed/failed/rolled_back, causing inserts/updates to fail.
*/

ALTER TABLE public.import_batches
  DROP CONSTRAINT IF EXISTS import_batches_status_check;

ALTER TABLE public.import_batches
  ADD CONSTRAINT import_batches_status_check
  CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'rolled_back')
  );
