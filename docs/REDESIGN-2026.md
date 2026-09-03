# Redesign 2026 — co się zmieniło

Gałąź: `feature/redesign-2026`

## System designu

| Element | Przed | Po |
| --- | --- | --- |
| Kolory | `amber`/`blue`/`orange` nadpisane globalnie na terakotę | dołożone semantyczne skale `ink-*` (granat), `accent-*` (pomarańcz), `canvas-*` (tła). Stare nadpisania **zostały**, żeby nieprzerobione ekrany (dodawanie ogłoszenia, profil, admin) nie rozjechały się kolorystycznie |
| Typografia | tylko Inter | Inter do treści + `font-display` (Plus Jakarta Sans) do nagłówków i kwot |
| Komponenty | klasy powtarzane inline | `.field`, `.btn-accent`, `.btn-ghost`, `.chip`, `.card-surface`, `.glass-dark`, `.glass-light`, `.skeleton` w `src/index.css` |
| Cienie / promienie | `shadow-md`, `shadow-lg` | `shadow-soft`/`card`/`lift`/`glow`, `rounded-3xl`, `rounded-4xl` |

## Nowe pliki

- `src/types/filters.ts` — typ `Filters`, wartości domyślne, opcje sortowania, liczenie i opisywanie aktywnych filtrów.
- `src/utils/listingMetrics.ts` — **realny koszt miesięczny** (rata + odstępne rozłożone na pozostałe raty), koszt do końca umowy, koszt z wykupem, wiek ogłoszenia, formatowanie kwot.
- `src/components/HomeHero.tsx` — hero z wyszukiwarką i przełącznikiem „Szukam cesji / Chcę oddać leasing”.
- `src/components/FilterBar.tsx` — przyklejony pasek filtrów (popovery na desktopie, bottom sheet na mobile).

## Najważniejsze zmiany funkcjonalne

1. **Wyszukiwarka pełnotekstowa** — wcześniej nie było jej wcale; teraz `q` szuka po tytule, marce, modelu i opisie.
2. **Nowe filtry** — rocznik, min. pozostałe raty, „tylko bez odstępnego”, świeżość ogłoszenia (7/30 dni), oraz zakresy odstępnego i przebiegu wyciągnięte z ukrytej sekcji „zaawansowane”.
3. **Nowe sortowania** — realny koszt/mies., koszt do końca umowy, najniższe odstępne, najlepsza cena vs rynek. Te trzy liczone są z kilku kolumn, więc dla nich rekordy sortowane są po stronie przeglądarki (limit `MAX_CLIENT_SORT_ROWS = 1000` w `HomePage.tsx` — powyżej tej liczby ogłoszeń trzeba to przenieść do widoku/kolumny w Postgresie).
4. **Aktywne filtry jako chipy** — widać, co zawęża listę, i można to zdjąć jednym kliknięciem.
5. **`status = 'published'` w zapytaniu** — wcześniej lista pokazywała też szkice i odrzucone importy.
6. **Prawdziwe liczby w hero** — liczba ogłoszeń, dodane w tym tygodniu, mediana raty, oferty bez odstępnego. Zamiast wpisanych na sztywno „+120 ogłoszeń / +500 użytkowników”.
7. **Wyróżnione oferty tylko promowane** — karuzela nie duplikuje już pierwszych ośmiu kart z siatki poniżej.
8. **Ocena okazji przekalibrowana** — stara krzywa (`ratio * 20 + 5`) dawała 10/10 już przy 25% poniżej rynku, więc prawie każde ogłoszenie miało „SUPER OKAZJA”. Teraz `ratio * 14 + 4.5`, etykiety opisowe („Świetna cena”, „Dobra cena”, „Cena rynkowa”, „Powyżej rynku”) i próg wyświetlania 7,0.
9. **Wiek ogłoszenia na kartach** — plakietka „Nowe” (≤7 dni) i „Sprawdź aktualność” (≥45 dni), a na stronie ogłoszenia pasek z pytaniem, czy cesja jest jeszcze dostępna, z gotowym zgłoszeniem „nieaktualne”.
10. **Ulubione z poziomu siatki** — serduszko na karcie, bez wchodzenia w ogłoszenie.
11. **Narzędzia admina za `VITE_ADMIN_EMAILS`** — do tej pory każdy zalogowany widział w menu „Admin”, „Masowy import” i „Statystyki”. Zmienna przyjmuje listę adresów po przecinku; **gdy nie jest ustawiona, linki są widoczne jak dotąd**, więc nic się nie zablokuje przed jej ustawieniem.
12. **Strona ogłoszenia** — przyklejony panel z ceną i kalkulacją kosztów, tabela parametrów, sekcja „Co dalej po kontakcie”, przyklejony pasek kontaktu na mobile, podobne cesje na tych samych kartach co siatka.
13. **Skeletony i pusty stan** — zamiast kręcącego się kółka i jednego zdania „Brak ofert”.

## Usunięte

- `src/components/FeaturedCarousel.tsx` — zastąpiony sekcją promowanych w `HomePage.tsx`.

## Czego świadomie nie zrobiono (wymaga migracji bazy)

- **Lokalizacja** (województwo / miasto) — najbardziej brakujący filtr w ogłoszeniach motoryzacyjnych, a w `listings` nie ma takiej kolumny.
- **Leasingodawca** (mLeasing, PKO Leasing, Alior Leasing…) — pozwoliłby filtrować po firmie i budować podstrony SEO.
- **Kto może przejąć** (firma / osoba prywatna) oraz **faktura VAT** — dla cesji to często pierwsze pytanie.
- **Alerty e-mail o nowych cesjach** — tabela + funkcja wysyłki; `saved_searches` jest gotową podstawą.
- **Automatyczne wygaszanie ogłoszeń** po X dniach z prośbą o potwierdzenie aktualności.
