/*
  # Jednorazowe uruchomienie importu (akcja, nie zmiana schematu)

  Wyjątek od reguły: ta migracja nic nie zmienia w strukturze bazy, tylko
  wywołuje import raz, żeby zweryfikować poprawkę odsiewania na świeżych
  danych, nie czekając na przebieg z harmonogramu.

  Jest bezpieczna do powtórzenia w innym środowisku: bez sekretu
  `cesly_cron_secret` w Vault `run_cesly_import()` kończy się natychmiast,
  nie wykonując żadnego wywołania.
*/

SELECT public.run_cesly_import();
