/*
  # Create Users Table for BallotBridge Election Platform

  ## Overview
  This migration creates the core users table to support the election platform with role-based access control for Admin, Candidate, and Voter roles.

  ## Tables Created
  
  ### `users`
  - `id` (uuid, primary key) - Unique identifier, linked to auth.users
  - `email` (text, unique, not null) - User email address
  - `role` (text, not null) - User role: 'admin', 'candidate', or 'voter'
  - `full_name` (text) - User's full name
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  
  ### Row Level Security (RLS)
  - RLS enabled on `users` table
  
  ### Policies
  1. **Users can view own profile**
     - Allows authenticated users to read their own user record
  
  2. **Users can update own profile** 
     - Allows authenticated users to update their own profile data (except role)
  
  3. **Admin can view all users**
     - Allows users with admin role to view all user records
  
  4. **System can insert new users**
     - Allows new user records to be created during signup

  ## Notes
  - The `id` field matches the `auth.users.id` from Supabase Auth
  - Role is restricted to three values: 'admin', 'candidate', 'voter'
  - Users cannot change their own role (security measure)
  - Timestamps auto-update for tracking changes
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'candidate', 'voter')),
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Admin can view all users
CREATE POLICY "Admin can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM users WHERE id = auth.uid()));

-- Policy: Allow user creation during signup
CREATE POLICY "Allow user creation"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();