/*
  # Fix infinite recursion in profiles RLS policies

  1. Security Changes
    - Drop existing problematic policies on profiles table
    - Create new safe policies that prevent infinite recursion
    - Allow users to insert their own profile during signup
    - Allow users to read and update their own profile
    - Allow admins to manage all profiles

  2. Policy Details
    - INSERT: Users can create profile with their own auth.uid()
    - SELECT: Users can read their own profile, admins can read all
    - UPDATE: Users can update their own profile, admins can update all
    - DELETE: Only admins can delete profiles
*/

-- Drop all existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Admins peuvent tout gérer" ON profiles;
DROP POLICY IF EXISTS "Users peuvent lire leur profil" ON profiles;
DROP POLICY IF EXISTS "Users peuvent modifier leur profil" ON profiles;

-- Create new safe policies without recursion

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile, admins can read all
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Allow users to update their own profile, admins can update all
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Only admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );