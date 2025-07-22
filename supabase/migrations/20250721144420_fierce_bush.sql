/*
  # Fix groups RLS permissions for commercial users

  1. Security Changes
    - Update RLS policies on `groups` table to allow commercial users to manage groups
    - Allow both admin and commercial roles to create, update, and delete groups
    - Keep read access for all authenticated users

  2. Policy Updates
    - "Admins peuvent gérer les groupes" -> "Admins et commerciaux peuvent gérer les groupes"
    - Update all management policies to include commercial role
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins peuvent gérer les groupes" ON groups;

-- Create new policies that allow both admin and commercial users
CREATE POLICY "Admins et commerciaux peuvent gérer les groupes (INSERT)"
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

CREATE POLICY "Admins et commerciaux peuvent gérer les groupes (UPDATE)"
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

CREATE POLICY "Admins et commerciaux peuvent gérer les groupes (DELETE)"
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

-- Keep the existing read policy for all authenticated users
-- "Tous peuvent lire les groupes" should already exist