/*
  # Harmonogram importu ofert cesji

  1. Rozszerzenia
    - `pg_cron` — uruchamianie zadań wg harmonogramu
    - `pg_net` — wywołanie HTTP do funkcji brzegowej

  2. Zadanie `cesly-import-cesji`
    - trzy razy dziennie pobiera nowe oferty do KOLEJKI MODERACJI
    - nic nie trafia na stronę automatycznie; publikacja pozostaje decyzją człowieka

  3. Sekret
    - wartość NIE jest w tym pliku i nie ma jej w repozytorium
    - zadanie czyta ją z Vaulta pod nazwą `cesly_cron_secret`
    - dopóki sekret nie istnieje, zadanie kończy się bez wywołania HTTP —
      zamiast wysyłać pusty nagłówek, który funkcja i tak by odrzuciła
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

/*
  Wywołanie opakowane w funkcję, żeby logika „brak sekretu = nie dzwoń"
  była w jednym miejscu, a definicja zadania pozostała czytelna.
*/
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

/* Funkcja dotyka sekretu — nikt poza harmonogramem nie ma prawa jej wołać. */
REVOKE ALL ON FUNCTION public.run_cesly_import() FROM PUBLIC, anon, authenticated;

/*
  Jeden przebieg to strona wyników plus po jednej stronie każdej z 12 ofert,
  z odstępem 1,5 s — mieści się w limicie czasu funkcji brzegowej i nie
  generuje skoków ruchu na Otomoto. Trzy przebiegi dziennie (~36 ofert)
  z zapasem pokrywają napływ nowych cesji.
*/
SELECT cron.unschedule('cesly-import-cesji')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cesly-import-cesji');

SELECT cron.schedule(
  'cesly-import-cesji',
  '0 7,13,19 * * *',
  $job$ SELECT public.run_cesly_import(); $job$
);
