/*
  # CIR history & segments

  ## Includes
  - cir_classification_history (+ trigger)
  - cir_segments & cir_segment_links with indexes
  - cir_segment_history (+ triggers)
  - import_batches metadata (dataset_type, template_id, diff_summary)
*/

-- 1. cir_classification_history --------------------------------------------
CREATE TABLE IF NOT EXISTS public.cir_classification_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combined_code text NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cir_classification_history_code
  ON public.cir_classification_history(combined_code);

ALTER TABLE public.cir_classification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classification history readable by admins"
  ON public.cir_classification_history
  FOR SELECT
  USING (private.is_admin());

CREATE POLICY "classification history insert (function only)"
  ON public.cir_classification_history
  FOR INSERT
  WITH CHECK (private.is_admin());

-- Trigger function
CREATE OR REPLACE FUNCTION public.audit_cir_classifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.cir_classification_history (combined_code, change_type, old_data, changed_by, batch_id)
    VALUES (OLD.combined_code, 'DELETE', to_jsonb(OLD), actor, current_setting('cir.current_batch', true)::uuid);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.cir_classification_history (combined_code, change_type, old_data, new_data, changed_by, batch_id)
    VALUES (NEW.combined_code, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), actor, current_setting('cir.current_batch', true)::uuid);
    RETURN NEW;
  ELSE -- INSERT
    INSERT INTO public.cir_classification_history (combined_code, change_type, new_data, changed_by, batch_id)
    VALUES (NEW.combined_code, 'INSERT', to_jsonb(NEW), actor, current_setting('cir.current_batch', true)::uuid);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS audit_cir_classifications_trigger ON public.cir_classifications;
CREATE TRIGGER audit_cir_classifications_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.cir_classifications
  FOR EACH ROW EXECUTE FUNCTION public.audit_cir_classifications();

-- 2. cir_segments & links ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cir_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cir_segment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid NOT NULL REFERENCES public.cir_segments(id) ON DELETE CASCADE,
  combined_code text NOT NULL REFERENCES public.cir_classifications(combined_code) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(segment_id, combined_code)
);

CREATE INDEX IF NOT EXISTS idx_cir_segments_active ON public.cir_segments(active);
CREATE INDEX IF NOT EXISTS idx_cir_segment_links_segment ON public.cir_segment_links(segment_id);
CREATE INDEX IF NOT EXISTS idx_cir_segment_links_code ON public.cir_segment_links(combined_code);

CREATE TRIGGER set_timestamp_cir_segments
  BEFORE UPDATE ON public.cir_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for segments
ALTER TABLE public.cir_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cir_segment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "segments readable by admin"
  ON public.cir_segments
  FOR SELECT
  USING (private.is_admin());

CREATE POLICY "segment links readable by admin"
  ON public.cir_segment_links
  FOR SELECT
  USING (private.is_admin());

CREATE POLICY "segments write admin only"
  ON public.cir_segments
  FOR ALL
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY "segment links write admin only"
  ON public.cir_segment_links
  FOR ALL
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 3. cir_segment_history ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cir_segment_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid,
  change_type text NOT NULL CHECK (change_type IN ('INSERT','UPDATE','DELETE','LINK_ADD','LINK_REMOVE')),
  old_data jsonb,
  new_data jsonb,
  link_change jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cir_segment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "segment history readable by admin"
  ON public.cir_segment_history
  FOR SELECT
  USING (private.is_admin());

CREATE POLICY "segment history insert (function only)"
  ON public.cir_segment_history
  FOR INSERT
  WITH CHECK (private.is_admin());

CREATE OR REPLACE FUNCTION public.audit_cir_segments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.cir_segment_history (segment_id, change_type, old_data, changed_by, batch_id)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD), actor, current_setting('cir.current_batch', true)::uuid);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.cir_segment_history (segment_id, change_type, old_data, new_data, changed_by, batch_id)
    VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), actor, current_setting('cir.current_batch', true)::uuid);
    RETURN NEW;
  ELSE
    INSERT INTO public.cir_segment_history (segment_id, change_type, new_data, changed_by, batch_id)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW), actor, current_setting('cir.current_batch', true)::uuid);
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_cir_segment_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.cir_segment_history (segment_id, change_type, link_change, changed_by, batch_id)
    VALUES (OLD.segment_id, 'LINK_REMOVE', jsonb_build_object('combined_code', OLD.combined_code), actor, current_setting('cir.current_batch', true)::uuid);
    RETURN OLD;
  ELSE
    INSERT INTO public.cir_segment_history (segment_id, change_type, link_change, changed_by, batch_id)
    VALUES (NEW.segment_id, 'LINK_ADD', jsonb_build_object('combined_code', NEW.combined_code), actor, current_setting('cir.current_batch', true)::uuid);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS audit_cir_segments_trigger ON public.cir_segments;
CREATE TRIGGER audit_cir_segments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.cir_segments
  FOR EACH ROW EXECUTE FUNCTION public.audit_cir_segments();

DROP TRIGGER IF EXISTS audit_cir_segment_links_trigger ON public.cir_segment_links;
CREATE TRIGGER audit_cir_segment_links_trigger
  AFTER INSERT OR DELETE ON public.cir_segment_links
  FOR EACH ROW EXECUTE FUNCTION public.audit_cir_segment_links();

-- 4. import_batches metadata ------------------------------------------------
ALTER TABLE public.import_batches
  ADD COLUMN IF NOT EXISTS dataset_type text CHECK (dataset_type IN ('cir_classification','cir_segment')),
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.mapping_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS diff_summary jsonb;

CREATE INDEX IF NOT EXISTS idx_import_batches_dataset_type
  ON public.import_batches(dataset_type, created_at DESC);

