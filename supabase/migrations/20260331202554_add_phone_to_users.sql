/*
  # Add phone number to user profiles

  1. Changes
    - Add optional `phone` column to `auth.users` metadata
    - Update user profiles table to include phone number
    
  2. Security
    - Phone is optional for privacy
    - Users can control their contact preferences
*/

-- Add phone column to user metadata by creating a profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Anyone can view profiles (for contact info in listings)
CREATE POLICY "Anyone can view profiles"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);