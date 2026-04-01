/*
  # Add custom contact fields to listings

  1. Changes
    - Add `custom_contact_name` (text, nullable) - Custom contact person name
    - Add `custom_contact_phone` (text, nullable) - Custom contact phone number
    - Add `custom_contact_email` (text, nullable) - Custom contact email
    
  2. Purpose
    - Allow administrators to specify custom contact information for listings
    - When custom contact is provided, it will be displayed instead of the listing owner's contact
    - Useful when admin adds listings on behalf of other sellers
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'custom_contact_name'
  ) THEN
    ALTER TABLE listings ADD COLUMN custom_contact_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'custom_contact_phone'
  ) THEN
    ALTER TABLE listings ADD COLUMN custom_contact_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'custom_contact_email'
  ) THEN
    ALTER TABLE listings ADD COLUMN custom_contact_email text;
  END IF;
END $$;