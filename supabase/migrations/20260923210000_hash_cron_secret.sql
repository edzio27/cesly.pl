/*
  # Przesyłaj skrót sekretu, nie sam sekret

  Diagnoza z Vaulta: sekret ma 22 znaki, nie ma białych znaków na brzegach,
  ale NIE składa się wyłącznie z drukowalnych znaków ASCII. Nagłówek HTTP nie
  przenosi takiego znaku w nienaruszonej postaci — baza wysyła jedną wartość,
  funkcja brzegowa odbiera inną i porównanie słusznie zawodzi. Przycinanie
  białych znaków tego nie naprawia, bo problem jest w środku wartości.

  Zamiast wymagać, żeby sekret nadawał się do nagłówka, wysyłamy jego skrót
  SHA-256 zapisany szesnastkowo. Taki ciąg to zawsze 64 znaki z zakresu 0-9a-f,
  więc przenosi się bez zmian niezależnie od tego, co jest w sekrecie. Znika
  cała klasa usterek „sekret wygląda dobrze, a i tak nie działa", bez zmuszania
  nikogo do generowania go w konkretny sposób.

  Przy okazji do nagłówka nie trafia już sama tajna wartość, tylko jej skrót.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.cron_secret_matches(candidate text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  secret text;
  expected text;
BEGIN
  IF candidate IS NULL OR btrim(candidate) = '' THEN
    RETURN false;
  END IF;

  SELECT btrim(decrypted_secret) INTO secret
  FROM vault.decrypted_secrets
  WHERE name = 'cesly_cron_secret'
  ORDER BY created_at DESC
  LIMIT 1;

  IF secret IS NULL OR secret = '' THEN
    RETURN false;
  END IF;

  expected := encode(extensions.digest(secret, 'sha256'), 'hex');

  -- Akceptujemy też surowy sekret: gdy ktoś zawoła funkcję ręcznie do testu,
  -- nie powinien musieć liczyć skrótu w głowie.
  RETURN lower(btrim(candidate)) = expected OR btrim(candidate) = secret;
END;
$$;

REVOKE ALL ON FUNCTION public.cron_secret_matches(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_secret_matches(text) TO service_role;

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
      -- Skrót, nie sam sekret: 64 znaki 0-9a-f przechodzą przez nagłówek
      -- bez zmian, cokolwiek siedzi w wartości oryginalnej.
      'x-cron-secret', encode(extensions.digest(secret, 'sha256'), 'hex')
    ),
    body := jsonb_build_object('maxPages', 2, 'maxDetails', 12)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_cesly_import() FROM PUBLIC, anon, authenticated;
