/*
  # Fix profiles RLS for public access

  1. Changes
    - Drop restrictive "Users can view own profile" policy for authenticated users
    - Update "Anyone can view profiles" to apply to both anonymous and authenticated users
    
  2. Purpose
    - Allow all users (logged in and not logged in) to view profile information
    - This is needed so contact information is visible on listing details without requiring login
    - Users can still only update their own profiles
*/

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;

CREATE POLICY "Anyone can view all profiles"
  ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);