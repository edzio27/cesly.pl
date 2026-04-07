/*
  # Analytics Tracking System

  1. New Tables
    - `page_views`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, nullable, foreign key to listings)
      - `page_type` (text) - 'home', 'listing', 'profile', etc.
      - `ip_hash` (text) - hashed IP address for privacy
      - `user_agent` (text, nullable)
      - `view_date` (date) - date of the view for deduplication
      - `created_at` (timestamp)
    
    - `listing_clicks`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, foreign key to listings)
      - `ip_hash` (text) - hashed IP address for privacy
      - `click_type` (text) - 'card', 'detail_view', 'contact', etc.
      - `click_date` (date) - date of the click for deduplication
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Public can insert analytics (anonymous tracking)
    - Only authenticated users can read their own listing analytics
    - Admin/listing owners can view analytics for their listings

  3. Notes
    - IP addresses are hashed for privacy (SHA-256)
    - Unique constraint on ip_hash + listing_id + date prevents F5 spam
    - Analytics are aggregated by day to prevent duplicate views
*/

-- Create page_views table
CREATE TABLE IF NOT EXISTS page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  page_type text NOT NULL,
  ip_hash text NOT NULL,
  user_agent text,
  view_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create listing_clicks table
CREATE TABLE IF NOT EXISTS listing_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  ip_hash text NOT NULL,
  click_type text NOT NULL DEFAULT 'card',
  click_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_views_listing_id ON page_views(listing_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_ip_hash ON page_views(ip_hash);
CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(view_date);
CREATE INDEX IF NOT EXISTS idx_listing_clicks_listing_id ON listing_clicks(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_clicks_created_at ON listing_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_listing_clicks_date ON listing_clicks(click_date);

-- Unique constraint to prevent duplicate views within same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_page_view_per_day 
  ON page_views(listing_id, ip_hash, view_date)
  WHERE listing_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_click_per_day 
  ON listing_clicks(listing_id, ip_hash, click_type, click_date);

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_clicks ENABLE ROW LEVEL SECURITY;

-- Policies for page_views
CREATE POLICY "Anyone can insert page views"
  ON page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view analytics for their listings"
  ON page_views FOR SELECT
  TO authenticated
  USING (
    listing_id IS NULL OR
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = page_views.listing_id
      AND listings.user_id = auth.uid()
    )
  );

-- Policies for listing_clicks
CREATE POLICY "Anyone can insert listing clicks"
  ON listing_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view clicks for their listings"
  ON listing_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_clicks.listing_id
      AND listings.user_id = auth.uid()
    )
  );

-- Add views_count and clicks_count to listings table for quick access
ALTER TABLE listings 
  ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks_count integer DEFAULT 0;

-- Function to update listing stats
CREATE OR REPLACE FUNCTION update_listing_stats()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'page_views' AND NEW.listing_id IS NOT NULL THEN
    UPDATE listings 
    SET views_count = (
      SELECT COUNT(DISTINCT ip_hash) 
      FROM page_views 
      WHERE listing_id = NEW.listing_id
    )
    WHERE id = NEW.listing_id;
  ELSIF TG_TABLE_NAME = 'listing_clicks' THEN
    UPDATE listings 
    SET clicks_count = (
      SELECT COUNT(DISTINCT ip_hash) 
      FROM listing_clicks 
      WHERE listing_id = NEW.listing_id
    )
    WHERE id = NEW.listing_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to update stats
DROP TRIGGER IF EXISTS update_listing_views_trigger ON page_views;
CREATE TRIGGER update_listing_views_trigger
  AFTER INSERT ON page_views
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_stats();

DROP TRIGGER IF EXISTS update_listing_clicks_trigger ON listing_clicks;
CREATE TRIGGER update_listing_clicks_trigger
  AFTER INSERT ON listing_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_stats();