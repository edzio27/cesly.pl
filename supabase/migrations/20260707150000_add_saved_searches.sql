/*
  # Saved searches

  1. New Tables
    - `saved_searches`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK auth.users)
      - `name` (text)
      - `filters` (jsonb) - serialized HomePage filter state
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Full CRUD restricted to the owning user

  3. Notes
    - No automated email alerts are implemented here - that would require
      an outbound email provider (e.g. Resend/SendGrid) which this project
      doesn't have configured. This table only stores the search so the
      user can manually re-apply it from their profile.
*/

CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved searches"
  ON saved_searches FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
