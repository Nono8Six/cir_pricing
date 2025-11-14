/*
  # Migration: 20251112_prices_history_rls

  Objectif :
  - Retirer les policies `ALL` sur `public.prices` pour garantir des règles explicites par verbe SQL.
  - Restreindre `public.brand_mapping_history` aux rôles `authenticated` possédant `private.is_admin()`
    et s'assurer que l'écriture n'est possible qu'avec le flag `app.writing_to_history`.
*/

BEGIN;

-- Prices ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Commercial users can manage prices"
  ON public.prices;

CREATE POLICY "Commercial users can insert prices"
  ON public.prices
  FOR INSERT
  TO authenticated
  WITH CHECK (private.can_manage_pricing());

CREATE POLICY "Commercial users can update prices"
  ON public.prices
  FOR UPDATE
  TO authenticated
  USING (private.can_manage_pricing())
  WITH CHECK (private.can_manage_pricing());

DROP POLICY IF EXISTS "Admins can delete prices"
  ON public.prices;

CREATE POLICY "Admins can delete prices"
  ON public.prices
  FOR DELETE
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "Authenticated users can read prices"
  ON public.prices;

CREATE POLICY "Authenticated users can read prices"
  ON public.prices
  FOR SELECT
  TO authenticated
  USING (true);

-- Brand mapping history ------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read mapping history"
  ON public.brand_mapping_history;

CREATE POLICY "Admins can read mapping history"
  ON public.brand_mapping_history
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "Only system can write to mapping history"
  ON public.brand_mapping_history;

CREATE POLICY "Only admin system can insert mapping history"
  ON public.brand_mapping_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_admin()
    AND current_setting('app.writing_to_history'::text, true) = 'true'
  );

DROP POLICY IF EXISTS "Admins can delete mapping history"
  ON public.brand_mapping_history;

CREATE POLICY "Admins can delete mapping history"
  ON public.brand_mapping_history
  FOR DELETE
  TO authenticated
  USING (private.is_admin());

COMMIT;
