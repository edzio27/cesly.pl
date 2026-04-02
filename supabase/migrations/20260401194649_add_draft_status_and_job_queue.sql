/*
  # Add Draft Status and Job Queue System

  1. Changes to listings table
    - Add `status` column (draft, published, rejected)
    - Add indexes for better query performance
  
  2. New Tables
    - `scraping_jobs`
      - `id` (uuid, primary key)
      - `url` (text, Facebook URL to scrape)
      - `status` (pending, processing, completed, failed)
      - `user_id` (uuid, owner of the job)
      - `listing_id` (uuid, nullable, created listing reference)
      - `error_message` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `processed_at` (timestamp, nullable)
  
  3. Security
    - Enable RLS on `scraping_jobs` table
    - Users can only see their own jobs
    - Users can create jobs
    - Users can update their own jobs
*/

-- Add status column to listings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'status'
  ) THEN
    ALTER TABLE listings ADD COLUMN status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'rejected'));
  END IF;
END $$;

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_user_status ON listings(user_id, status);

-- Create scraping jobs table
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')) NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  error_message text,
  extracted_data jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz
);

-- Enable RLS
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scraping_jobs
CREATE POLICY "Users can view own scraping jobs"
  ON scraping_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create scraping jobs"
  ON scraping_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scraping jobs"
  ON scraping_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scraping jobs"
  ON scraping_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add indexes for job queue queries
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_user_status ON scraping_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scraping_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_scraping_jobs_updated_at_trigger ON scraping_jobs;
CREATE TRIGGER update_scraping_jobs_updated_at_trigger
  BEFORE UPDATE ON scraping_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_scraping_jobs_updated_at();