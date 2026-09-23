/*
  # Weryfikacja sekretu harmonogramu po stronie bazy

  Sekret harmonogramu żyje w Vault i TYLKO tam. Wcześniejszy układ wymagał tej
  samej wartości w dwóch miejscach — w Vault (dla zadania cron) i w zmiennej
  CRON_SECRET funkcji brzegowej. Rozjazd między kopiami kończyłby się cichym
  401 przy każdym przebiegu i trudnym do namierzenia „harmonogram nie działa".

  Funkcja brzegowa pyta teraz bazę, czy podany nagłówek zgadza się z sekretem.
  Rotacja sekretu to jedna komenda zamiast dwóch.
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
  LIMIT 1;

  -- Brak sekretu = ścieżka harmonogramu wyłączona, nie „wpuszczaj wszystkich".
  IF secret IS NULL OR secret = '' THEN
    RETURN false;
  END IF;

  RETURN secret = candidate;
END;
$$;

/*
  Wywołać może wyłącznie rola serwisowa, czyli funkcja brzegowa. Gdyby mógł
  anon, byłaby to wyrocznia do zgadywania sekretu po jednym znaku.
*/
REVOKE ALL ON FUNCTION public.cron_secret_matches(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_secret_matches(text) TO service_role;
