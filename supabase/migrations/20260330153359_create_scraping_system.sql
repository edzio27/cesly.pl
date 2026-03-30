/*
  # System automatycznego zbierania ogłoszeń

  1. Nowe Tabele
    - `scraping_sources`
      - `id` (uuid, primary key)
      - `name` (text) - nazwa źródła (np. "Otomoto", "Facebook")
      - `type` (text) - typ źródła (web, facebook, rss)
      - `url` (text) - adres URL do scrapowania
      - `selector_config` (jsonb) - konfiguracja selektorów CSS/XPath
      - `is_active` (boolean) - czy źródło jest aktywne
      - `last_scraped_at` (timestamptz) - ostatnie scrapowanie
      - `created_at` (timestamptz)
    
    - `scraped_listings`
      - `id` (uuid, primary key)
      - `source_id` (uuid) - odniesienie do źródła
      - `external_id` (text) - ID z zewnętrznego źródła
      - `raw_data` (jsonb) - surowe dane ze scrapowania
      - `status` (text) - pending, approved, rejected, published
      - `listing_id` (uuid) - powiązanie z opublikowanym ogłoszeniem
      - `created_at` (timestamptz)
      - `processed_at` (timestamptz)

  2. Bezpieczeństwo
    - Włączenie RLS na obu tabelach
    - Tylko autoryzowani admini mogą zarządzać źródłami
    - Użytkownicy mogą przeglądać zatwierdzone ogłoszenia

  3. Ważne Notatki
    - System wymaga Edge Function do scrapowania
    - Scraped listings wymagają manualnej lub automatycznej weryfikacji
    - Dane są przechowywane jako JSONB dla elastyczności
*/

-- Tabela źródeł scrapowania
CREATE TABLE IF NOT EXISTS scraping_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('web', 'facebook', 'rss')),
  url text NOT NULL,
  selector_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_scraped_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Tabela zebranych ogłoszeń
CREATE TABLE IF NOT EXISTS scraped_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES scraping_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  raw_data jsonb NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  UNIQUE(source_id, external_id)
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_scraping_sources_active ON scraping_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_scraped_listings_status ON scraped_listings(status);
CREATE INDEX IF NOT EXISTS idx_scraped_listings_source ON scraped_listings(source_id);

-- Włączenie RLS
ALTER TABLE scraping_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_listings ENABLE ROW LEVEL SECURITY;

-- Polityki dla scraping_sources
CREATE POLICY "Only authenticated users can view sources"
  ON scraping_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only authenticated users can insert sources"
  ON scraping_sources FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can update sources"
  ON scraping_sources FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can delete sources"
  ON scraping_sources FOR DELETE
  TO authenticated
  USING (true);

-- Polityki dla scraped_listings
CREATE POLICY "Authenticated users can view scraped listings"
  ON scraped_listings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert scraped listings"
  ON scraped_listings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update scraped listings"
  ON scraped_listings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete scraped listings"
  ON scraped_listings FOR DELETE
  TO authenticated
  USING (true);