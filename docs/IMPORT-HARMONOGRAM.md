# Import ofert na harmonogramie

Kolejka moderacji napełnia się sama, bez klikania „Run Scraper". **Nic nie
trafia na stronę automatycznie** — harmonogram wykonuje wyłącznie pobieranie,
publikacja pozostaje decyzją człowieka w panelu.

## Dlaczego osobny sekret, a nie klucz serwisowy

`pg_cron` nie ma sesji użytkownika, więc nie przejdzie normalnej kontroli
(`auth.getUser`). Zamiast dawać mu klucz serwisowy — który otwiera całą bazę —
funkcja przyjmuje nagłówek `x-cron-secret`. Gdyby wyciekł, pozwala jedynie
uruchomić import.

Sekret leży **wyłącznie w Vault**, pod nazwą `cesly_cron_secret`. Funkcja
brzegowa nie ma własnej kopii — pyta bazę (`cron_secret_matches`), czy nagłówek
się zgadza. Dzięki temu rotacja to jedna komenda, a nie dwie, które mogą się
rozjechać.

Dopóki sekretu nie ma w Vault, ścieżka jest **wyłączona**: porównanie zwraca
`false`, a samo zadanie w ogóle nie wykonuje wywołania HTTP.

## Co jest już zrobione

Migracjami wdrożono: rozszerzenia `pg_cron` i `pg_net`, zadanie
`cesly-import-cesji` (7:00, 13:00 i 19:00 UTC), funkcję `run_cesly_import()`
oraz `cron_secret_matches()`. Obie są odebrane rolom `anon` i `authenticated` —
sprawdzone: wywołanie z zewnątrz zwraca `permission denied`.

## Zostaje jeden krok: ustaw sekret

Wygeneruj losową wartość i zapisz ją w Vault. Nie używaj do tego niczego, co
już gdzieś służy jako hasło czy klucz — to ma być nowy, losowy ciąg.

```bash
openssl rand -hex 32
```

Potem w Supabase → SQL Editor:

```sql
select vault.create_secret('<wygenerowana-wartość>', 'cesly_cron_secret');
```

Od tej chwili harmonogram zacznie działać przy najbliższym przebiegu.

### Rotacja

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'cesly_cron_secret'),
  '<nowa-wartość>'
);
```

### Wyłączenie

Usuń sekret — bez niego zadanie nie wykonuje wywołania:

```sql
select vault.delete_secret((select id from vault.secrets where name = 'cesly_cron_secret'));
```

## Sprawdź, czy działa

Najszybciej: panel `/admin-scraping` pokazuje na górze pasek ze stanem
harmonogramu — czy zadanie jest aktywne, czy sekret jest w Vault, kiedy był
ostatni przebieg i kiedy ostatnio coś pobrano ze źródeł.

Żeby nie czekać na najbliższą godzinę z harmonogramu, można wywołać ten sam
kod ręcznie w SQL Editorze:

```sql
select public.run_cesly_import();
```

Funkcja zwraca pustkę niezależnie od wyniku (to `void`), więc efekt sprawdź
w panelu: licznik „do decyzji" powinien urosnąć w ciągu kilkunastu sekund.
Jeśli nie urósł, zajrzyj do historii przebiegów poniżej.

## Historia przebiegów

```sql
select jobid, jobname, schedule, active from cron.job;
select start_time, status, return_message
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'cesly-import-cesji')
order by start_time desc limit 5;
```

W panelu `/admin-scraping` kolejka powinna rosnąć sama, a licznik „do decyzji"
przyrastać między jednym a drugim zalogowaniem.

## Wyłączenie

```sql
select cron.unschedule('cesly-import-cesji');
```

Albo trwale: usuń `CRON_SECRET` z sekretów — bez niego funkcja odrzuci
każde wywołanie z harmonogramu.

---

# Formularz zapytań (leady)

Formularz „Potrzebujesz pomocy przy cesji?" stoi pod każdym ogłoszeniem.
Zgłoszenia lądują w tabeli `leads`, widocznej w menu administratora jako
**Zapytania** (`/leady`).

## Stan: migracja zastosowana

Tabela `leads` jest już na produkcji (`supabase db push`, 23.09.2026).
Zweryfikowane po wdrożeniu: niezalogowany może wysłać zgłoszenie, ale odczyt
zwraca mu pustą listę.

Przy okazji uporządkowana została historia migracji. Cztery lipcowe migracje
figurowały jako niezastosowane, choć ich tabele (`saved_searches`, `messages`,
`listing_reports`, `page_views`) istnieją — wykonano je przez panel. Oznaczono
je jako zastosowane (`migration repair`), żeby `db push` nie próbował ich
odtwarzać. Osierocony wpis `20260707190236` dostał plik-zaślepkę zamiast
skasowania z historii.

**Historia migracji tego projektu jest niepełna**, bo część zmian szła przez
panel. Odtworzenie bazy od zera z samych plików nie da dzisiejszego schematu.

Czytać zgłoszenia mogą **wyłącznie adresy wymienione w funkcji
`is_lead_admin()`** w tej migracji. To dane osobowe osób trzecich: gdyby
polityka pozwalała na odczyt każdemu zalogowanemu, wystarczyłoby założyć konto,
żeby pobrać kontakty wszystkich zgłaszających. Dopisując kolejnego
administratora, zmień tę funkcję.

## Zanim podłączysz partnera

W `src/config/partners.ts` stoi `FINANCING_PARTNER = null` i to celowo.
Treść zgody pod formularzem mówi wtedy wprost, że dane **nie są przekazywane
innym podmiotom** — więc dopóki partnera nie ma, nic nie wolno nikomu wysyłać.

Gdy partner się pojawi:

1. wpisz jego nazwę w `partners.ts` — wejdzie automatycznie do treści zgody;
2. dopisz go do polityki prywatności, do sekcji o odbiorcach danych;
3. dopiero zgłoszenia zebrane **po** tej zmianie wolno mu przekazywać.
   Zgody zebrane wcześniej dotyczyły kontaktu wyłącznie ze strony Cesly.
