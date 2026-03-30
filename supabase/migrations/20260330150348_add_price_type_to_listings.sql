/*
  # Add price type field to listings

  1. Changes
    - Add `price_type` column to listings table (netto/brutto)
    - Set default value to 'brutto'
    - Add check constraint to ensure valid values

  2. Notes
    - This allows users to specify if prices are net or gross amounts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'price_type'
  ) THEN
    ALTER TABLE listings ADD COLUMN price_type text DEFAULT 'brutto' NOT NULL;
    ALTER TABLE listings ADD CONSTRAINT price_type_check CHECK (price_type IN ('netto', 'brutto'));
  END IF;
END $$;
