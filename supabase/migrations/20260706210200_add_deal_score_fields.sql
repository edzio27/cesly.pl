ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS market_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS remaining_balance numeric(12,2);
