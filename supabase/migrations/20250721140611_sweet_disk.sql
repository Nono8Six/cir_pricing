/*
  # Fix RLS infinite recursion on profiles table

  1. Problem
    - Current RLS policies on profiles table cause infinite recursion
    - Error: "infinite recursion detected in policy for relation profiles"
    - This blocks all profile fetching operations

  2. Solution
    - Drop all existing problematic RLS policies on profiles table
    - Create simple, non-recursive RLS policies
    - Ensure policies use auth.uid() directly without complex joins

  3. New Policies
    - Users can read their own profile: auth.uid() = id
    - Users can update their own profile: auth.uid() = id  
    - Users can insert their own profile: auth.uid() = id
    - Admins can manage all profiles: role = 'admin'
*/

-- Drop all existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive SELECT policy
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create simple UPDATE policy
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create simple INSERT policy
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create admin policy for all operations (non-recursive)
CREATE POLICY "Admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );