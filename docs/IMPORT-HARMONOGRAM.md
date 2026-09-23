# Import ofert na harmonogramie

Kolejka moderacji napełnia się sama, bez klikania „Run Scraper". **Nic nie
trafia na stronę automatycznie** — harmonogram wykonuje wyłącznie pobieranie,
publikacja pozostaje decyzją człowieka w panelu.

## Dlaczego osobny sekret, a nie klucz serwisowy

`pg_cron` nie ma sesji użytkownika, więc nie przejdzie normalnej kontroli
(`auth.getUser`). Zamiast dawać mu klucz serwisowy — który otwiera całą bazę —
funkcja przyjmuje nagłówek `x-cron-secret` z osobnym sekretem. Gdyby wyciekł,
pozwala jedynie uruchomić import.

Dopóki `CRON_SECRET` nie jest ustawiony, ta ścieżka jest **wyłączona**:
zmienna pusta oznacza, że żaden nagłówek nie zostanie uznany za prawidłowy.

## 1. Ustaw sekret

Wygeneruj losową wartość i zapisz ją w sekretach projektu. Nie wklejaj tu
niczego, co już gdzieś służy jako hasło czy klucz — to ma być nowy, losowy ciąg.

```bash
openssl rand -hex 32
npx supabase secrets set CRON_SECRET=<wygenerowana-wartość> --project-ref nuvafrdwxbzxyowrtnxp
```

## 2. Zaplanuj zadanie

W Supabase → SQL Editor. Rozszerzenia `pg_cron` i `pg_net` wystarczy włączyć raz.

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'cesly-import-cesji',
  '0 7,13,19 * * *',          -- 7:00, 13:00 i 19:00 UTC
  $$
  select net.http_post(
    url := 'https://nuvafrdwxbzxyowrtnxp.supabase.co/functions/v1/scrape-listings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<ta-sama-wartość-co-w-CRON_SECRET>'
    ),
    body := jsonb_build_object('maxPages', 2, 'maxDetails', 12)
  );
  $$
);
```

### Dlaczego trzy razy dziennie po 12 ofert

Jeden przebieg pobiera stronę wyników plus po jednej stronie każdej oferty,
z odstępem 1,5 s — to mieści się w limicie czasu funkcji brzegowej i nie
generuje skoków ruchu na Otomoto. Trzy przebiegi to ~36 ofert dziennie,
czyli po kilku dniach cała bieżąca podaż. Częściej nie ma sensu: nowych cesji
przybywa kilkanaście dziennie, a odsiewanie i tak pominie znane ogłoszenia.

## 3. Sprawdź, czy działa

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

## Uruchomienie: wykonaj migrację

Formularz nie zadziała, dopóki tabela nie istnieje — zgłoszenie kończy się
wtedy komunikatem „Nie udało się wysłać". Wklej do SQL Editora treść pliku
`supabase/migrations/20260923100000_add_leads.sql`.

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
