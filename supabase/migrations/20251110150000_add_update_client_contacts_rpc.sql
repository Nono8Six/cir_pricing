-- Migration: Add RPC function to update client contacts
-- Created: 2025-11-10
-- Description: Allows all authenticated users to update ONLY the contacts field of clients
-- This enables viewers to manage contacts without being able to modify other client data

-- Create RPC function to update client contacts
CREATE OR REPLACE FUNCTION public.update_client_contacts(
  client_id UUID,
  new_contacts JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_row RECORD;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update only the contacts field
  UPDATE public.clients
  SET
    contacts = new_contacts,
    updated_at = NOW()
  WHERE id = client_id
  RETURNING * INTO result_row;

  -- Check if row was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  -- Return the updated contacts
  RETURN new_contacts;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_client_contacts(UUID, JSONB) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.update_client_contacts IS 'Allows all authenticated users to update client contacts only. Bypasses RLS restrictions for contacts field updates.';
