/*
  # Podgląd stanu importu

  „Czy harmonogram działa?" było dotąd pytaniem bez odpowiedzi z poziomu
  aplikacji — historia przebiegów leży w `cron.job_run_details`, do którego
  aplikacja nie ma dostępu, a stan kolejki wymagał liczenia ręcznie.

  Funkcja zwraca jedną paczkę: kiedy był ostatni przebieg, czy się udał,
  kiedy ostatnio pobierano ze źródeł i ile ogłoszeń czeka na decyzję.

  Dostęp tylko dla administratorów — to informacja operacyjna o działaniu
  serwisu, nie coś do pokazywania odwiedzającym.
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
BEGIN
  IF NOT public.is_lead_admin() THEN
    RAISE EXCEPTION 'Brak uprawnień';
  END IF;

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
