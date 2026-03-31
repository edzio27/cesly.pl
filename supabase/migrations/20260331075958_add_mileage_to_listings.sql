/*
  # Add mileage field to listings table

  1. Changes
    - Add `mileage` column to `listings` table to store vehicle mileage in kilometers
    - Column is optional (nullable) as existing listings may not have this data
  
  2. Notes
    - Mileage is stored as integer representing kilometers
    - Existing listings will have NULL mileage until updated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'mileage'
  ) THEN
    ALTER TABLE listings ADD COLUMN mileage INTEGER;
  END IF;
END $$;