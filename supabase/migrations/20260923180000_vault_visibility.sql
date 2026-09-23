/*
  # Rozróżnienie „sekretu nie ma" od „sekret się nie zgadza"

  `cron_secret_matches` zwracała `false` w obu przypadkach: gdy sekretu nie
  udało się odczytać i gdy odczytany nie pasował do nagłówka. To są zupełnie
  różne usterki — pierwsza to problem z dostępem do Vaulta, druga z wartością —
  a diagnostyka wyglądała identycznie.

  `import_health()` pokazuje teraz jedno i drugie:
    - `secret_configured`   — czy wpis istnieje w `vault.secrets`
    - `secret_readable`     — czy da się odczytać go z `vault.decrypted_secrets`
    - `secret_length`       — długość odczytanej wartości (sama wartość NIE jest zwracana)

  Rozjazd między pierwszym a drugim oznacza problem z odszyfrowaniem lub
  uprawnieniami do widoku, nie z samą wartością.
*/

CREATE OR REPLACE FUNCTION public.import_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  result jsonb;
  last_run record;
  decrypted text;
  read_error text := NULL;
BEGIN
  IF auth.jwt() IS NOT NULL AND NOT public.is_lead_admin() THEN
    RAISE EXCEPTION 'Brak uprawnień';
  END IF;

  BEGIN
    SELECT decrypted_secret INTO decrypted
    FROM vault.decrypted_secrets
    WHERE name = 'cesly_cron_secret'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    read_error := SQLERRM;
  END;

  SELECT d.start_time, d.status, d.return_message
  INTO last_run
  FROM cron.job_run_details d
  JOIN cron.job j ON j.jobid = d.jobid
  WHERE j.jobname = 'cesly-import-cesji'
  ORDER BY d.start_time DESC
  LIMIT 1;

  SELECT jsonb_build_object(
    'scheduled', EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cesly-import-cesji' AND active),
    'secret_configured', EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cesly_cron_secret'),
    'secret_entries', (SELECT count(*) FROM vault.secrets WHERE name = 'cesly_cron_secret'),
    'secret_readable', decrypted IS NOT NULL AND decrypted <> '',
    'secret_length', coalesce(length(decrypted), 0),
    'secret_read_error', read_error,
    'last_run_at', last_run.start_time,
    'last_run_status', last_run.status,
    'last_run_message', left(coalesce(last_run.return_message, ''), 200),
    'last_source_scrape_at', (SELECT max(last_scraped_at) FROM public.scraping_sources),
    'queue_pending', (SELECT count(*) FROM public.scraped_listings WHERE status = 'pending'),
    'queue_approved', (SELECT count(*) FROM public.scraped_listings WHERE status = 'approved')
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.import_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_health() TO authenticated;
