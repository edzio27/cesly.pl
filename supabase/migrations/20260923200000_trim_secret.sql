/*
  # Odporność sekretu na białe znaki

  Log pg_net pokazał, że nagłówek dociera i nie zgadza się z sekretem z Vaulta,
  mimo że wpis jest tylko jeden i obie funkcje czytają ten sam wiersz. Skoro
  źródło jest wspólne, wartość musi zmieniać się w transporcie — a typową
  przyczyną jest znak biały na końcu sekretu (przełamanie linii z kopiowania
  albo spacja). Nagłówek HTTP takiego znaku nie przenosi: baza wysyła
  „abc<LF>", funkcja brzegowa dostaje „abc" i porównanie słusznie zawodzi.

  Przycinamy więc obie strony. To nie osłabia sekretu — spacja na końcu nie
  jest jego częścią w żadnym sensownym rozumieniu — a usuwa całą klasę
  usterek, których nie widać ani w Vault, ani w logu.

  `import_health()` pokazuje dodatkowo, czy sekret ma białe znaki na brzegach
  i czy jest w całości ASCII, żeby taka diagnoza nie wymagała już zgadywania.
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
  IF candidate IS NULL OR btrim(candidate) = '' THEN
    RETURN false;
  END IF;

  SELECT decrypted_secret INTO secret
  FROM vault.decrypted_secrets
  WHERE name = 'cesly_cron_secret'
  ORDER BY created_at DESC
  LIMIT 1;

  IF secret IS NULL OR btrim(secret) = '' THEN
    RETURN false;
  END IF;

  RETURN btrim(secret) = btrim(candidate);
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
    body := jsonb_build_object('maxPages', 2, 'maxDetails', 12)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_cesly_import() FROM PUBLIC, anon, authenticated;
