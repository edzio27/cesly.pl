/*
  # Report listing feature

  1. New Tables
    - `listing_reports`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, FK listings)
      - `reporter_id` (uuid, nullable FK auth.users) - null for anonymous reports
      - `reason` (text)
      - `message` (text, nullable)
      - `status` (text) - 'nowe', 'rozpatrzone', 'odrzucone'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Anyone (anonymous or authenticated) can submit a report
    - No public SELECT policy - only reviewable via the Supabase dashboard
      (service role bypasses RLS), keeping reports private from other users
      and from the reported listing's owner
*/

CREATE TABLE IF NOT EXISTS listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'nowe',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_reports_listing_id ON listing_reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_reports_status ON listing_reports(status);

ALTER TABLE listing_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a report"
  ON listing_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
