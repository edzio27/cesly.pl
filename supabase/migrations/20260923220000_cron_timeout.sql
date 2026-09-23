/*
  # Daj importowi czas na odpowiedź

  Po podmianie sekretu wywołania przestały być odrzucane, ale w logu pg_net
  pojawiły się wiersze z NULL w `status_code` i `content` — czyli baza nie
  doczekała odpowiedzi.

  Przyczyna nie jest błędem, tylko skutkiem tego, że wreszcie działa: dopóki
  sekret był zły, funkcja brzegowa odpowiadała 401 natychmiast i mieściła się
  w domyślnym limicie `pg_net` (5 s). Poprawne wywołanie realnie pracuje —
  strona wyników plus do dwunastu stron ofert z odstępem 1,5 s, łącznie
  25-40 sekund.

  Podnosimy limit do 90 s, z zapasem na wolniejsze odpowiedzi Otomoto.
  Sam import i tak jest ograniczony liczbą ofert na przebieg, więc czas
  wykonania nie urośnie w nieskończoność.

  Uwaga: brak odpowiedzi NIE oznaczał, że import się nie wykonał. Funkcja
  brzegowa kończy pracę niezależnie od tego, czy ktoś słucha — rekordy
  trafiały do kolejki, tylko wynik przepadał.
*/

CREATE OR REPLACE FUNCTION public.run_cesly_import()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net, extensions
AS $$
DECLARE
  secret text;
BEGIN
  SELECT btrim(decrypted_secret) INTO secret
  FROM vault.decrypted_secrets
  WHERE name = 'cesly_cron_secret'
  ORDER BY created_at DESC
  LIMIT 1;

  IF secret IS NULL OR secret = '' THEN
    RAISE NOTICE 'Pomijam import: brak sekretu cesly_cron_secret w Vault';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://nuvafrdwxbzxyowrtnxp.supabase.co/functions/v1/scrape-listings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', secret
    ),
    body := jsonb_build_object('maxPages', 2, 'maxDetails', 12),
    timeout_milliseconds := 90000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_cesly_import() FROM PUBLIC, anon, authenticated;
