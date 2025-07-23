/*
  # Allow admin deletion of brand_mapping_history records

  1. Ensure RLS is enabled
    - `brand_mapping_history` table should have row level security enabled

  2. Add delete policy for admins
    - Only authenticated users with role 'admin' in profiles can delete
*/

-- Ensure RLS is enabled on brand_mapping_history
ALTER TABLE IF EXISTS brand_mapping_history ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to delete history records
CREATE POLICY "Admins can delete mapping history"
  ON brand_mapping_history
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
