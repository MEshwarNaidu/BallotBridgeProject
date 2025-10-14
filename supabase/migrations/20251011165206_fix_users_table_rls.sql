/*
  # Fix Users Table RLS Policies

  ## Overview
  This migration fixes the infinite recursion issue in the users table RLS policies.
  
  ## Changes
  1. Drop the existing "Admin can view all users" policy that causes infinite recursion
  2. Create a simpler policy structure that avoids recursive checks
  
  ## Security
  - Users can still view their own profile
  - Users can update their own profile (but not their role)
  - New users can be created during signup
  - Admin access is handled separately through application logic
*/

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admin can view all users" ON users;

-- Create a new policy that allows authenticated users to read user records
-- without recursive checks (admin checks will be done in application layer)
CREATE POLICY "Authenticated users can view user profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);