/*
  # Add function to get user email

  1. New Functions
    - `get_user_email(user_id uuid)` - Returns user email from auth.users
    
  2. Security
    - Function is accessible to authenticated and anonymous users
    - Only returns email, no sensitive data
*/

CREATE OR REPLACE FUNCTION get_user_email(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_email;
END;
$$;