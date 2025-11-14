/*
  # Migration: 20251112_fix_rls

  Objectif
  - Supprimer l'exposition RLS via le rôle `public`.
  - Forcer toutes les policies sensibles à cibler les rôles `authenticated`
    (les Edge Functions utilisent `service_role` qui bypass RLS).
  - Conserver les predicates `private.is_admin()` / ownership existants.
*/

BEGIN;

-- Brand mapping staging ------------------------------------------------------
DROP POLICY IF EXISTS "brand mapping import admin only"
  ON public.brand_mapping_import_rows;

CREATE POLICY "brand mapping import admin only"
  ON public.brand_mapping_import_rows
  FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- Classification history -----------------------------------------------------
DROP POLICY IF EXISTS "classification history readable by admins"
  ON public.cir_classification_history;
CREATE POLICY "classification history readable by admins"
  ON public.cir_classification_history
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "classification history insert (function only)"
  ON public.cir_classification_history;
CREATE POLICY "classification history insert (function only)"
  ON public.cir_classification_history
  FOR INSERT
  TO authenticated
  WITH CHECK (private.is_admin());

-- Classification staging -----------------------------------------------------
DROP POLICY IF EXISTS "classification import admins"
  ON public.cir_classification_import_rows;
CREATE POLICY "classification import admins"
  ON public.cir_classification_import_rows
  FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- Segment history ------------------------------------------------------------
DROP POLICY IF EXISTS "segment history readable by admin"
  ON public.cir_segment_history;
CREATE POLICY "segment history readable by admin"
  ON public.cir_segment_history
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "segment history insert (function only)"
  ON public.cir_segment_history;
CREATE POLICY "segment history insert (function only)"
  ON public.cir_segment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (private.is_admin());

-- Segment entities / links ---------------------------------------------------
DROP POLICY IF EXISTS "segments readable by admin"
  ON public.cir_segments;
CREATE POLICY "segments readable by admin"
  ON public.cir_segments
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "segments write admin only"
  ON public.cir_segments;
CREATE POLICY "segments write admin only"
  ON public.cir_segments
  FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "segment links readable by admin"
  ON public.cir_segment_links;
CREATE POLICY "segment links readable by admin"
  ON public.cir_segment_links
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "segment links write admin only"
  ON public.cir_segment_links;
CREATE POLICY "segment links write admin only"
  ON public.cir_segment_links
  FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- Mapping templates ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can read default/system or own templates"
  ON public.mapping_templates;
CREATE POLICY "Users can read default/system or own templates"
  ON public.mapping_templates
  FOR SELECT
  TO authenticated
  USING (
    is_system = true
    OR is_default = true
    OR created_by = auth.uid()
    OR private.is_admin()
  );

DROP POLICY IF EXISTS "Users can insert own templates"
  ON public.mapping_templates;
CREATE POLICY "Users can insert own templates"
  ON public.mapping_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (created_by = auth.uid())
    OR private.is_admin()
  );

DROP POLICY IF EXISTS "Users can update own templates"
  ON public.mapping_templates;
CREATE POLICY "Users can update own templates"
  ON public.mapping_templates
  FOR UPDATE
  TO authenticated
  USING (
    (created_by = auth.uid() AND is_system = false)
    OR private.is_admin()
  )
  WITH CHECK (
    (created_by = auth.uid() AND is_system = false)
    OR private.is_admin()
  );

DROP POLICY IF EXISTS "Users can delete own templates"
  ON public.mapping_templates;
CREATE POLICY "Users can delete own templates"
  ON public.mapping_templates
  FOR DELETE
  TO authenticated
  USING (
    (created_by = auth.uid() AND is_system = false)
    OR private.is_admin()
  );

COMMIT;
