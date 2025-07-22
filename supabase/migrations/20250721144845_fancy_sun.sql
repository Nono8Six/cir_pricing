/*
  # Fix groups RLS policies for commercial users

  1. Security Changes
    - Drop existing restrictive policies on groups table
    - Create new policies allowing admin and commercial users to manage groups
    - Ensure authenticated users can read groups

  2. Policy Details
    - SELECT: All authenticated users can read groups
    - INSERT: Admin and commercial users can create groups
    - UPDATE: Admin and commercial users can modify groups  
    - DELETE: Admin and commercial users can delete groups
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins et commerciaux peuvent gérer les groupes (DELETE)" ON groups;
DROP POLICY IF EXISTS "Admins et commerciaux peuvent gérer les groupes (INSERT)" ON groups;
DROP POLICY IF EXISTS "Admins et commerciaux peuvent gérer les groupes (UPDATE)" ON groups;
DROP POLICY IF EXISTS "Tous peuvent lire les groupes" ON groups;

-- Create new policies that work with direct Supabase access
CREATE POLICY "Allow authenticated users to read groups"
  ON groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin and commercial to insert groups"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'commercial')
    )
  );

CREATE POLICY "Allow admin and commercial to update groups"
  ON groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'commercial')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'commercial')
    )
  );

CREATE POLICY "Allow admin and commercial to delete groups"
  ON groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'commercial')
    )
  );