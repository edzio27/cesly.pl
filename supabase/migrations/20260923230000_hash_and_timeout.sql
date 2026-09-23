/*
  # Skrót ORAZ limit czasu w jednej definicji

  Migracja z limitem czasu (20260923220000) przepisywała całą funkcję
  `run_cesly_import`, a pisałem ją na bazie wersji sprzed wprowadzenia skrótu.
  Efekt: podniosła limit do 90 s, ale cofnęła wysyłanie skrótu SHA-256 —
  funkcja znów nadaje surowy sekret w nagłówku.

  Działa to dziś tylko dlatego, że sekret jest już czystym szesnastkowym
  ciągiem i `cron_secret_matches` akceptuje obie postacie. Ale zabezpieczenie,
  dla którego skrót powstał — odporność na dowolną zawartość sekretu — zniknęło
  po cichu. Gdyby ktoś w przyszłości wpisał sekret z ogonkiem, wróciłby
  dokładnie ten sam, kosztowny w diagnozie błąd.

  Tu obie zmiany są razem. Wniosek na przyszłość: przy CREATE OR REPLACE
  FUNCTION migracja niesie CAŁE ciało, więc pisana z pamięci potrafi cicho
  cofnąć wcześniejszą poprawkę.
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
      -- Skrót, nie sam sekret: 64 znaki 0-9a-f przechodzą przez nagłówek
      -- bez zmian, cokolwiek siedzi w wartości oryginalnej.
      'x-cron-secret', encode(extensions.digest(secret, 'sha256'), 'hex')
    ),
    body := jsonb_build_object('maxPages', 2, 'maxDetails', 12),
    -- Poprawne wywołanie realnie pracuje 25-40 s; domyślne 5 s pg_net
    -- porzucało połączenie, zanim funkcja zdążyła odpowiedzieć.
    timeout_milliseconds := 90000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_cesly_import() FROM PUBLIC, anon, authenticated;
