/*
  # Fix RLS Infinite Recursion on Profiles Table

  This migration resolves the critical RLS issue causing infinite recursion
  when accessing the profiles table. The problem was caused by the 
  "Admins can manage all profiles" policy which created a recursive loop.

  ## Changes Made:
  1. Remove all existing problematic RLS policies
  2. Create simple, non-recursive policies for user profile access
  3. Admin operations should be handled via backend with service_role key

  ## Security Impact:
  - Users can only access their own profile via RLS
  - Admin operations moved to backend for better security
  - Eliminates RLS recursion completely
*/

-- IMPORTANT: Backup your database before running this migration!

-- Step 1: Disable RLS temporarily for safe policy changes
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies to ensure clean slate
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Step 3: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive RLS policies

-- Policy 1: Allow authenticated users to read their own profile
-- This is essential for login and role determination
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Allow authenticated users to insert their own profile
-- Used during user registration
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy 3: Allow authenticated users to update their own profile
-- Users can modify their own profile information
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Note: Admin operations (viewing all profiles, managing other users)
-- should be handled via backend API using service_role key to bypass RLS.
-- This prevents RLS recursion and provides better security architecture.

-- Verify policies are created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;