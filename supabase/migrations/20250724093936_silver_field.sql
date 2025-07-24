/*
  # Create CIR Classifications Table

  1. New Tables
    - `cir_classifications`
      - `id` (uuid, primary key)
      - `fsmega_code` (integer, not null)
      - `fsmega_designation` (text, not null)
      - `fsfam_code` (integer, not null)
      - `fsfam_designation` (text, not null)
      - `fssfa_code` (integer, not null)
      - `fssfa_designation` (text, not null)
      - `combined_code` (text, unique, not null)
      - `combined_designation` (text, not null)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `cir_classifications` table
    - Add policies for authenticated users to manage classifications

  3. Indexes
    - Unique index on fsmega_code, fsfam_code, fssfa_code combination
    - Index on combined_code for fast lookups
    - Indexes on individual codes for filtering
*/

CREATE TABLE IF NOT EXISTS cir_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fsmega_code integer NOT NULL,
  fsmega_designation text NOT NULL,
  fsfam_code integer NOT NULL,
  fsfam_designation text NOT NULL,
  fssfa_code integer NOT NULL,
  fssfa_designation text NOT NULL,
  combined_code text NOT NULL UNIQUE,
  combined_designation text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cir_classifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read classifications"
  ON cir_classifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert classifications"
  ON cir_classifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update classifications"
  ON cir_classifications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete classifications"
  ON cir_classifications
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_cir_classifications_hierarchy 
  ON cir_classifications (fsmega_code, fsfam_code, fssfa_code);

CREATE INDEX IF NOT EXISTS idx_cir_classifications_combined_code 
  ON cir_classifications (combined_code);

CREATE INDEX IF NOT EXISTS idx_cir_classifications_fsmega 
  ON cir_classifications (fsmega_code);

CREATE INDEX IF NOT EXISTS idx_cir_classifications_fsfam 
  ON cir_classifications (fsfam_code);

CREATE INDEX IF NOT EXISTS idx_cir_classifications_fssfa 
  ON cir_classifications (fssfa_code);

-- Add update trigger
CREATE TRIGGER update_cir_classifications_updated_at
  BEFORE UPDATE ON cir_classifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();