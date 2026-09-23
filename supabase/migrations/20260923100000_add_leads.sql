/*
  # Zapytania o pomoc przy cesji (leady)

  1. Nowa tabela `leads`
    - zgłoszenia z formularza „potrzebujesz pomocy przy cesji?"
    - `intent` — czego dotyczy: przejęcie, oddanie leasingu albo samo finansowanie
    - `listing_id` — z którego ogłoszenia przyszło zgłoszenie (może być puste)
    - `consent_at` — moment wyrażenia zgody; bez niego nie wolno przetwarzać

  2. Bezpieczeństwo
    - wysłać zgłoszenie może każdy (także niezalogowany) — to publiczny formularz
    - CZYTAĆ mogą wyłącznie wskazani administratorzy. To są dane osobowe osób
      trzecich: gdyby polityka pozwalała na odczyt każdemu zalogowanemu, wystarczyłoby
      założyć konto, żeby pobrać kontakty wszystkich zgłaszających.
*/

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  contact text NOT NULL,
  message text,
  intent text NOT NULL CHECK (intent IN ('przejme', 'oddam', 'finansowanie')),
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  source_path text,
  consent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

/* Lista administratorów — tu dopisz kolejne adresy, jeśli ktoś ma mieć wgląd. */
CREATE OR REPLACE FUNCTION is_lead_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) IN ('eugeniusz.keptia@gmail.com');
$$;

DROP POLICY IF EXISTS "Anyone can submit a lead" ON leads;
CREATE POLICY "Anyone can submit a lead"
  ON leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can read leads" ON leads;
CREATE POLICY "Only admins can read leads"
  ON leads FOR SELECT
  TO authenticated
  USING (is_lead_admin());

DROP POLICY IF EXISTS "Only admins can update leads" ON leads;
CREATE POLICY "Only admins can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (is_lead_admin())
  WITH CHECK (is_lead_admin());

DROP POLICY IF EXISTS "Only admins can delete leads" ON leads;
CREATE POLICY "Only admins can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (is_lead_admin());
