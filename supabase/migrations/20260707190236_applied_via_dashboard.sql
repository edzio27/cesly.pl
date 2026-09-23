/*
  # Zaślepka historii migracji — bez zmian w schemacie

  Ta wersja figuruje w historii migracji bazy produkcyjnej, ale nie ma dla niej
  pliku w repozytorium: zmianę wykonano bezpośrednio w panelu Supabase, a nie
  przez `supabase db push`. Bez tego pliku CLI odmawia wypchnięcia czegokolwiek
  ("Remote migration versions not found in local migrations directory").

  Zamiast kasować wpis z historii (co CLI proponuje jako `repair --status
  reverted`) zostawiamy go i dokumentujemy lukę. Skutki tamtej zmiany są już
  w bazie; plik jest pusty celowo i NIE odtwarza jej treści.

  Wniosek na przyszłość: historia migracji tego projektu jest niepełna, bo
  część zmian szła przez panel. Odtworzenie bazy od zera z samych migracji
  nie da dzisiejszego schematu — przed taką próbą zrób `supabase db pull`.
*/

SELECT 1;
