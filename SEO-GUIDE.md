# Przewodnik SEO dla Cesly.pl

## Zaimplementowane usprawnienia SEO

### 1. Meta tagi i struktura HTML
- ✅ Tytuł strony zoptymalizowany pod frazy kluczowe
- ✅ Meta description z naturalnymi frazami
- ✅ Keywords meta tag z 10 najważniejszymi frazami
- ✅ Canonical URLs
- ✅ Open Graph dla social media (Facebook, LinkedIn)
- ✅ Twitter Cards
- ✅ Proper language and geo tags (lang="pl", geo.region="PL")

### 2. Schema.org Structured Data
- ✅ WebSite schema z search action
- ✅ Organization schema z logo
- ✅ ItemList dla listy ogłoszeń
- ✅ Product schema dla pojedynczych ogłoszeń
- ✅ Dynamiczne generowanie structured data dla każdego ogłoszenia

### 3. Robots & Sitemap
- ✅ robots.txt z dostępem dla wszystkich crawlerów AI (GPTBot, ClaudeBot, PerplexityBot, YouBot, etc.)
- ✅ Dynamiczny sitemap.xml generowany automatycznie z bazy danych
- ✅ Sitemap dostępny pod: https://nuvafrdwxbzxyowrtnxp.supabase.co/functions/v1/sitemap
- ✅ `https://cesly.pl/sitemap.xml` przekierowuje (rewrite w `vercel.json`) do tej samej dynamicznej funkcji —
  usunięto statyczny plik `public/sitemap.xml`, który zawierał wyłącznie stronę główną i był sprzeczny z tym,
  co widział crawler wczytujący sitemap z `robots.txt`.

### 3b. Renderowanie treści dla botów bez JS (naprawione)
Aplikacja to SPA (Vite + React) — treść ogłoszeń ładuje się dopiero po wykonaniu JS. GPTBot, ClaudeBot,
PerplexityBot i w dużej mierze Bingbot nie wykonują JS, więc bez dodatkowej obsługi nigdy nie zobaczyłyby
realnej treści strony ogłoszenia (opis, cena, przebieg, zdjęcia).

Rozwiązanie:
- `vercel.json` rewrite'uje żądania `/listing/:id` do funkcji Supabase `og-meta` **tylko wtedy, gdy nagłówek
  `User-Agent` pasuje do listy botów** (warunek `has`). Zwykli użytkownicy trafiają normalnie do `index.html`
  i aplikacji React (ścieżka `/listing/:id` jest tam poprawnie parsowana).
- Funkcja `og-meta` renderuje pełną, statyczną treść ogłoszenia (tytuł, cenę, tabelę parametrów, galerię
  zdjęć, pełny opis) razem ze structured data `Product`, zamiast — jak wcześniej — przekierowywać każdego
  (także realnych użytkowników) na zepsuty adres z hashem (`#/listing/{id}`), którego aplikacja nigdy nie
  parsowała. To wcześniej powodowało, że każdy udostępniony link do ogłoszenia lądował realnemu użytkownikowi
  na stronie głównej zamiast na ogłoszeniu.
- Usunięto martwy plik `public/listing.html` (nieużywany, zastąpiony przez powyższy mechanizm).

### 4. Treści SEO
- ✅ Sekcja H1 z frazami kluczowymi na stronie głównej
- ✅ Naturalne użycie fraz: "cesja leasingu", "przejęcie umowy leasingowej", "odstąpienie leasingu"
- ✅ Sekcja edukacyjna wyjaśniająca czym jest cesja leasingu (`HomePage.tsx`, sekcja "Czym jest cesja leasingu?")
- ✅ Lista korzyści z przejęcia leasingu
- ✅ Sekcja "popularne wyszukiwania" z klikalnymi frazami (filtrują listę po marce)
- ✅ FAQ ze structured data `FAQPage` (schema.org)

### 5. Optymalizacja techniczna
- ✅ Semantyczne nagłówki (H1, H2, H3)
- ✅ Alt text dla logo
- ✅ Proper image optimization
- ✅ Mobile-friendly design (responsive)
- ✅ Fast loading times (Vite optimization)

## Najważniejsze frazy kluczowe

### Główne frazy (high volume):
1. cesja leasingu
2. przejęcie leasingu
3. cesja umowy leasingowej
4. przejęcie umowy leasingowej
5. odstąpienie leasingu

### Frazy długiego ogona (long-tail):
1. cesja leasingu BMW
2. przejęcie leasingu Audi
3. cesja leasingu samochodu
4. przejęcie rat leasingowych
5. wynajem długoterminowy cesja
6. przejęcie leasingu operacyjnego
7. cesja leasingu finansowego
8. odstąpienie leasingu auta

## Rekomendacje dodatkowe

### 1. Google Search Console
Po wdrożeniu strony na produkcję, zarejestruj ją w Google Search Console:
- Prześlij sitemap: https://nuvafrdwxbzxyowrtnxp.supabase.co/functions/v1/sitemap
- Monitoruj indeksację
- Sprawdzaj wydajność wyszukiwania
- Analizuj kliknięcia i pozycje

### 2. Content Marketing
- Regularnie dodawaj nowe ogłoszenia (fresh content)
- Rozważ dodanie bloga z poradami o cesji leasingu
- Stwórz przewodnik krok po kroku "Jak przejąć leasing?"
- Dodaj sekcję FAQ

### 3. Link Building
- Zarejestruj się w katalogach motoryzacyjnych
- Nawiąż współpracę z portalami motoryzacyjnymi
- Dodaj linki w social media
- Rozważ współpracę z leasingodawcami

### 4. Local SEO (opcjonalnie)
Jeśli oferujesz usługi w konkretnych miastach:
- Dodaj strony lokalizacyjne (np. "Cesja leasingu Warszawa")
- Zarejestruj się w Google Business Profile
- Dodaj dane kontaktowe z adresem

### 5. Performance
- Monitoruj Core Web Vitals w Google PageSpeed Insights
- Optymalizuj obrazy (WebP format)
- Włącz caching
- Rozważ CDN dla statycznych zasobów

### 6. AI Crawlers
Strona jest już zoptymalizowana pod crawlery AI:
- ChatGPT (GPTBot)
- Claude (ClaudeBot, anthropic-ai)
- Perplexity (PerplexityBot)
- You.com (YouBot)
- Cohere (cohere-ai)

## Monitoring i analityka

### Google Analytics (do dodania)
```html
<!-- Dodaj w index.html przed </head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Metryki do śledzenia:
- Liczba odwiedzin
- Współczynnik odrzuceń
- Czas na stronie
- Konwersje (kliknięcia w kontakt)
- Top landing pages
- Źródła ruchu

## Narzędzia do testowania SEO

1. **Google Rich Results Test**: https://search.google.com/test/rich-results
   - Sprawdź czy structured data są poprawne

2. **Google PageSpeed Insights**: https://pagespeed.web.dev/
   - Sprawdź wydajność strony

3. **Ahrefs/SEMrush**:
   - Analiza konkurencji
   - Badanie fraz kluczowych
   - Monitoring pozycji

4. **Screaming Frog**:
   - Techniczny audyt SEO
   - Sprawdzenie linków
   - Analiza meta tagów

## Harmonogram działań

### Miesiąc 1:
- Zarejestruj w Google Search Console
- Prześlij sitemap
- Dodaj Google Analytics
- Monitoruj indeksację

### Miesiąc 2-3:
- Analizuj pierwsze dane
- Optymalizuj na podstawie wyników
- Dodaj więcej treści
- Rozpocznij link building

### Miesiąc 4+:
- Kontynuuj content marketing
- Rozwijaj link building
- A/B testing landing pages
- Rozważ Google Ads dla szybszych rezultatów

## Dodatkowe zasoby

- Google SEO Starter Guide
- Schema.org documentation
- Google Search Central Blog
- Moz Beginner's Guide to SEO
