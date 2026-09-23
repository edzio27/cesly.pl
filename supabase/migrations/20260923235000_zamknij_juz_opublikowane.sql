/*
  # Domknij wpisy w kolejce, które są już na stronie

  Odsiewanie przy imporcie porównywało nowe oferty wyłącznie z kolejką.
  Po opublikowaniu ogłoszenia i skasowaniu jego wpisu z kolejki znikała
  pamięć o nim, więc kolejny import przynosił je z powrotem — jako świeżą
  propozycję czegoś, co od dawna wisi na stronie. Do moderacji trafiło tak
  dziewięć ogłoszeń.

  Funkcja brzegowa sprawdza już oba miejsca. Tu porządkujemy to, co zdążyło
  wpaść wcześniej: wpisy wskazujące na opublikowane ogłoszenie dostają status
  `published` i dowiązanie do niego.

  Świadomie NIE kasujemy tych wierszy. Skasowany wpis to właśnie ta utrata
  pamięci, która wywołała problem — zostawiony działa jak zapora przed
  ponownym zaimportowaniem.
*/

UPDATE public.scraped_listings s
SET status = 'published',
    listing_id = l.id,
    processed_at = now()
FROM public.listings l
WHERE l.source_url = s.external_id
  AND s.status = 'pending';
