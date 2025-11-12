/*
  # Add archiving capabilities to mapping_templates

  ## Why
  - The admin UI needs a way to "archive" templates instead of deleting them
  - Archived templates must remain traceable (to keep history and diff context)
  - Archived templates should be filterable quickly
*/

BEGIN;

ALTER TABLE public.mapping_templates
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_mapping_templates_archived
  ON public.mapping_templates(is_archived)
  WHERE is_archived = true;

COMMIT;
