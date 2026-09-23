/*
  # Deterministyczny wybór sekretu z Vaulta

  Obie funkcje czytały sekret przez `LIMIT 1` BEZ sortowania. Dopóki wpis jest
  jeden, działa to poprawnie — ale `vault.create_secret` wywołane drugi raz
  z tą samą nazwą tworzy DRUGI wpis, nie nadpisuje pierwszego. Wtedy każde
  z zapytań mogło trafić na inny wiersz: `run_cesly_import` wysyłałby jedną
  wartość, a `cron_secret_matches` porównywał z drugą — i nic by się nie
  zgadzało, mimo że „sekret jest ustawiony".

  Obie funkcje biorą teraz NAJNOWSZY wpis o tej nazwie. Dzięki temu powtórne
  `create_secret` zachowuje się jak rotacja, zamiast cicho psuć harmonogram.
*/

CREATE OR REPLACE FUNCTION public.cron_secret_matches(candidate text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  secret text;
BEGIN
  IF candidate IS NULL OR candidate = '' THEN
    RETURN false;
  END IF;

  SELECT decrypted_secret INTO secret
  FROM vault.decrypted_secrets
  WHERE name = 'cesly_cron_secret'
  ORDER BY created_at DESC
  LIMIT 1;

  IF secret IS NULL OR secret = '' THEN
    RETURN false;
  END IF;

  RETURN secret = candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.cron_secret_matches(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_secret_matches(text) TO service_role;

CREATE OR REPLACE FUNCTION public.run_cesly_import()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE
  secret text;
BEGIN
  SELECT decrypted_secret INTO secret
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
    body := jsonb_build_object('maxPages', 2, 'maxDetails', 12)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_cesly_import() FROM PUBLIC, anon, authenticated;
