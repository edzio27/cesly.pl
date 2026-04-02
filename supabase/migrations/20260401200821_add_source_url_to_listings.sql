/*
  # Add source_url column to listings table

  1. Changes
    - Add `source_url` column to `listings` table to store the original Facebook post URL
    - This allows users to track where scraped listings came from
    - The column is optional (nullable) since not all listings are scraped from external sources
  
  2. Notes
    - Existing listings will have NULL for source_url
    - Future scraped listings will have the Facebook post URL stored here
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE listings ADD COLUMN source_url text;
  END IF;
END $$;