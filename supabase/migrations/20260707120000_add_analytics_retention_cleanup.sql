/*
  # Analytics Data Retention (12 months)

  Polityka Prywatności zobowiązuje serwis do usuwania danych analitycznych
  (page_views, listing_clicks) po 12 miesiącach od ich zebrania. Ta migracja
  wdraża to w praktyce, żeby zapis w polityce był zgodny ze stanem faktycznym.

  1. Function
    - `cleanup_old_analytics()` usuwa wiersze z `page_views` i `listing_clicks`
      starsze niż 12 miesięcy.

  2. Scheduling
    - Włącza rozszerzenie `pg_cron` (dostępne w managed Postgresie Supabase)
      i planuje codzienne uruchomienie funkcji o 3:00 UTC.
    - Jeśli plan/projekt Supabase nie pozwala włączyć `pg_cron`, ten fragment
      migracji się nie powiedzie — funkcję `cleanup_old_analytics()` można
      wtedy wywoływać ręcznie lub z zewnętrznego harmonogramu (np. Supabase
      Cron Trigger na Edge Function, GitHub Actions cron itp.).
*/

CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM page_views WHERE created_at < now() - interval '12 months';
  DELETE FROM listing_clicks WHERE created_at < now() - interval '12 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-analytics'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-old-analytics',
      '0 3 * * *',
      'SELECT cleanup_old_analytics()'
    );
  END IF;
EXCEPTION WHEN insufficient_privilege OR feature_not_supported THEN
  RAISE NOTICE 'pg_cron unavailable on this project - schedule cleanup_old_analytics() externally (see comment above).';
END $$;
