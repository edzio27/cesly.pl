/*
  # Create Vehicle Leasing Marketplace Schema

  1. New Tables
    - `listings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text)
      - `description` (text)
      - `vehicle_type` (text) - car, motorcycle, boat, etc.
      - `brand` (text)
      - `model` (text)
      - `year` (integer)
      - `monthly_payment` (decimal) - wysokość raty
      - `buyout_price` (decimal) - wykup
      - `transfer_fee` (decimal) - odstępne
      - `remaining_installments` (integer) - pozostałe raty
      - `total_installments` (integer) - całkowita liczba rat
      - `images` (jsonb) - array of image URLs
      - `is_promoted` (boolean) - czy promowane
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `favorites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `listing_id` (uuid, foreign key to listings)
      - `created_at` (timestamptz)
    
    - `recent_views`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `listing_id` (uuid, foreign key to listings)
      - `viewed_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Listings: Anyone can view, only owners can insert/update/delete
    - Favorites: Users can only manage their own favorites
    - Recent views: Users can only manage their own views
*/

-- Create listings table
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  vehicle_type text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  monthly_payment decimal(10,2) NOT NULL,
  buyout_price decimal(10,2),
  transfer_fee decimal(10,2) NOT NULL,
  remaining_installments integer NOT NULL,
  total_installments integer NOT NULL,
  images jsonb DEFAULT '[]'::jsonb,
  is_promoted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Create recent_views table
CREATE TABLE IF NOT EXISTS recent_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS listings_user_id_idx ON listings(user_id);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS listings_is_promoted_idx ON listings(is_promoted);
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites(user_id);
CREATE INDEX IF NOT EXISTS favorites_listing_id_idx ON favorites(listing_id);
CREATE INDEX IF NOT EXISTS recent_views_user_id_idx ON recent_views(user_id);
CREATE INDEX IF NOT EXISTS recent_views_viewed_at_idx ON recent_views(viewed_at DESC);

-- Enable Row Level Security
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_views ENABLE ROW LEVEL SECURITY;

-- Listings policies
CREATE POLICY "Anyone can view listings"
  ON listings FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create listings"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
  ON listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
  ON listings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Recent views policies
CREATE POLICY "Users can view own recent views"
  ON recent_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add recent views"
  ON recent_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recent views"
  ON recent_views FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();