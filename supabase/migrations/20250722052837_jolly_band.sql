/*
  # Enable RLS for brand_category_mappings table

  1. Security
    - Enable RLS on `brand_category_mappings` table
    - Add policy for authenticated users to read mappings
    - Add policy for authenticated users to write mappings
    - Ensure proper access control for mapping management

  2. Notes
    - All authenticated users can read mappings (needed for classification)
    - All authenticated users can write mappings (for Excel uploads and CRUD)
    - Future: Could be restricted to admin role only for write operations
*/

-- Enable RLS on brand_category_mappings table
ALTER TABLE brand_category_mappings ENABLE ROW LEVEL SECURITY;

-- Policy for reading mappings (all authenticated users)
CREATE POLICY "Authenticated users can read brand mappings"
  ON brand_category_mappings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for inserting mappings (all authenticated users)
CREATE POLICY "Authenticated users can insert brand mappings"
  ON brand_category_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy for updating mappings (all authenticated users)
CREATE POLICY "Authenticated users can update brand mappings"
  ON brand_category_mappings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for deleting mappings (all authenticated users)
CREATE POLICY "Authenticated users can delete brand mappings"
  ON brand_category_mappings
  FOR DELETE
  TO authenticated
  USING (true);