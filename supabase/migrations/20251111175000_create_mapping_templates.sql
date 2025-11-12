/*
  # Create mapping_templates table

  ## Why
  - Store reusable column mappings for CIR imports (classifications & segments)
  - Support future transforms + template versioning
  - Enforce RLS so every admin/user can manage their own templates while system defaults remain read-only
*/

CREATE TABLE IF NOT EXISTS public.mapping_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  dataset_type text NOT NULL CHECK (dataset_type IN ('cir_classification', 'cir_segment')),
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  transforms jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  template_version integer NOT NULL DEFAULT 1,
  last_used_batch uuid REFERENCES public.import_batches(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mapping_templates_dataset_type
  ON public.mapping_templates(dataset_type);

CREATE INDEX IF NOT EXISTS idx_mapping_templates_default
  ON public.mapping_templates(is_default)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_mapping_templates_created_by
  ON public.mapping_templates(created_by);

CREATE TRIGGER set_timestamp_mapping_templates
  BEFORE UPDATE ON public.mapping_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.mapping_templates ENABLE ROW LEVEL SECURITY;

-- Read default/system templates + own templates
CREATE POLICY "Users can read default/system or own templates"
  ON public.mapping_templates
  FOR SELECT
  USING (
    is_system = true
    OR is_default = true
    OR created_by = auth.uid()
    OR private.is_admin()
  );

-- Insert: only author (created_by = auth.uid())
CREATE POLICY "Users can insert own templates"
  ON public.mapping_templates
  FOR INSERT
  WITH CHECK (
    (created_by = auth.uid())
    OR private.is_admin()
  );

-- Update: only author, non-system
CREATE POLICY "Users can update own templates"
  ON public.mapping_templates
  FOR UPDATE
  USING (
    (created_by = auth.uid() AND is_system = false)
    OR private.is_admin()
  )
  WITH CHECK (
    (created_by = auth.uid() AND is_system = false)
    OR private.is_admin()
  );

-- Delete: only author (non-system) or admin
CREATE POLICY "Users can delete own templates"
  ON public.mapping_templates
  FOR DELETE
  USING (
    (created_by = auth.uid() AND is_system = false)
    OR private.is_admin()
  );

