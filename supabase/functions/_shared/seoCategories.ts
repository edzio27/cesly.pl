/**
 * Katalog stron kategorii, czyli adresów `/cesja-leasingu/<slug>`.
 *
 * Jeden plik obsługuje oba światy: aplikację React (przez re-eksport w
 * `src/data/seoCategories.ts`) i funkcję brzegową `seo-page`, która renderuje
 * te same strony statycznie dla crawlerów. Gdyby katalog istniał w dwóch
 * kopiach, bot i użytkownik prędzej czy później zobaczyliby inną listę ofert —
 * a to już jest cloaking, nie dynamic rendering.
 *
 * Kategoria opisuje filtr deklaratywnie (`CategoryQuery`), bo ten sam filtr
 * musi dać się wyrazić na trzy sposoby: jako zapytanie do Postgresa (strona
 * kategorii), jako predykat w pamięci (zliczanie ofert do sitemapy) i jako
 * stan filtrów w aplikacji (nawigacja po stronie klienta).
 */

export type CategoryGroup = 'brand' | 'vehicle' | 'deal';

export type CategoryQuery = {
  /** Dopasowanie `ilike %wzorzec%` do kolumny `brand`. */
  brandIlike?: string;
  vehicleType?: string;
  maxMonthlyPayment?: number;
  /** Tylko oferty bez odstępnego (`transfer_fee <= 0`). */
  noTransferFee?: boolean;
  maxRemainingInstallments?: number;
};

export type SeoCategory = {
  slug: string;
  /** Treść H1 i rdzeń znacznika <title>. */
  heading: string;
  /** Krótka etykieta do linków wewnętrznych i okruszków. */
  label: string;
  /** Akapit wstępny — to on odróżnia stronę od pozostałych kategorii. */
  lead: string;
  query: CategoryQuery;
  group: CategoryGroup;
};

/**
 * Marki widywane w cesjach w Polsce. `match` podajemy tam, gdzie import
 * z Facebooka i Otomoto zapisał markę w dwóch pisowniach — wzorzec musi
 * złapać obie, bo inaczej połowa ofert wypadnie ze strony kategorii.
 */
const BRANDS: { label: string; slug: string; match?: string }[] = [
  { label: 'BMW', slug: 'bmw' },
  { label: 'Audi', slug: 'audi' },
  { label: 'Mercedes-Benz', slug: 'mercedes-benz', match: 'Mercedes' },
  { label: 'Volkswagen', slug: 'volkswagen' },
  { label: 'Škoda', slug: 'skoda', match: 'koda' },
  { label: 'Toyota', slug: 'toyota' },
  { label: 'Volvo', slug: 'volvo' },
  { label: 'Kia', slug: 'kia' },
  { label: 'Hyundai', slug: 'hyundai' },
  { label: 'Ford', slug: 'ford' },
  { label: 'Opel', slug: 'opel' },
  { label: 'Renault', slug: 'renault' },
  { label: 'Peugeot', slug: 'peugeot' },
  { label: 'Citroën', slug: 'citroen', match: 'itro' },
  { label: 'Mazda', slug: 'mazda' },
  { label: 'Nissan', slug: 'nissan' },
  { label: 'Tesla', slug: 'tesla' },
  { label: 'Porsche', slug: 'porsche' },
  { label: 'Lexus', slug: 'lexus' },
  { label: 'Seat', slug: 'seat' },
  { label: 'Cupra', slug: 'cupra' },
  { label: 'Fiat', slug: 'fiat' },
  { label: 'Jeep', slug: 'jeep' },
  { label: 'Dacia', slug: 'dacia' },
  { label: 'Mini', slug: 'mini' },
  { label: 'Land Rover', slug: 'land-rover' },
  { label: 'Jaguar', slug: 'jaguar' },
  { label: 'Mitsubishi', slug: 'mitsubishi' },
  { label: 'Suzuki', slug: 'suzuki' },
  { label: 'Honda', slug: 'honda' },
  { label: 'Subaru', slug: 'subaru' },
  { label: 'Alfa Romeo', slug: 'alfa-romeo' },
];

const BRAND_CATEGORIES: SeoCategory[] = BRANDS.map(({ label, slug, match }) => ({
  slug: `${slug}`,
  heading: `Cesja leasingu ${label}`,
  label: `Cesja leasingu ${label}`,
  lead:
    `Aktualne oferty przejęcia leasingu ${label} od osób, które chcą oddać umowę przed jej końcem. ` +
    `Przy każdej ofercie widać ratę, odstępne i liczbę pozostałych rat, więc od razu wiadomo, ` +
    `ile naprawdę kosztuje wejście w umowę — a nie tylko jak niska jest sama rata.`,
  query: { brandIlike: match ?? label },
  group: 'brand',
}));

const VEHICLE_CATEGORIES: SeoCategory[] = [
  {
    slug: 'samochody',
    heading: 'Cesja leasingu samochodu',
    label: 'Samochody',
    lead:
      'Wszystkie cesje leasingu samochodów osobowych i dostawczych zebrane w jednym miejscu. ' +
      'To najliczniejsza kategoria na Cesly — od aut kompaktowych po segment premium, ' +
      'z umowami na różnym etapie spłaty.',
    query: { vehicleType: 'samochód' },
    group: 'vehicle',
  },
  {
    slug: 'motocykle',
    heading: 'Cesja leasingu motocykla',
    label: 'Motocykle',
    lead:
      'Przejęcie leasingu motocykla to nisza, w której ofert jest mało, a sezonowość widać gołym okiem — ' +
      'najwięcej umów zmienia właściciela jesienią, gdy kończy się sezon. ' +
      'Poniżej wszystko, co obecnie czeka na cesjonariusza.',
    query: { vehicleType: 'motocykl' },
    group: 'vehicle',
  },
  {
    slug: 'lodzie',
    heading: 'Cesja leasingu łodzi',
    label: 'Łodzie',
    lead:
      'Leasing jednostek pływających trafia do cesji najczęściej wtedy, gdy koszty utrzymania ' +
      'przewyższą realne użycie. Ofert jest niewiele, ale odstępne bywa w nich wyraźnie niższe ' +
      'niż przy samochodach o podobnej wartości.',
    query: { vehicleType: 'łódź' },
    group: 'vehicle',
  },
];

const DEAL_CATEGORIES: SeoCategory[] = [
  {
    slug: 'bez-odstepnego',
    heading: 'Cesja leasingu bez odstępnego',
    label: 'Bez odstępnego',
    lead:
      'Oferty, w których obecny leasingobiorca nie żąda żadnej dopłaty za przekazanie umowy — ' +
      'przejmujesz wyłącznie pozostałe raty. Takie cesje pojawiają się zwykle wtedy, gdy komuś ' +
      'pilnie zależy na wyjściu z umowy, więc znikają szybciej niż pozostałe.',
    query: { noTransferFee: true },
    group: 'deal',
  },
  {
    slug: 'rata-do-1000-zl',
    heading: 'Cesja leasingu z ratą do 1 000 zł',
    label: 'Rata do 1 000 zł',
    lead:
      'Umowy z miesięczną ratą nieprzekraczającą 1 000 zł. Warto patrzeć nie tylko na samą ratę, ' +
      'ale i na odstępne rozłożone na pozostałe miesiące — niska rata przy wysokim odstępnym ' +
      'potrafi wyjść drożej niż oferta z ratą dwukrotnie wyższą.',
    query: { maxMonthlyPayment: 1000 },
    group: 'deal',
  },
  {
    slug: 'rata-do-2000-zl',
    heading: 'Cesja leasingu z ratą do 2 000 zł',
    label: 'Rata do 2 000 zł',
    lead:
      'Przedział, w którym mieści się większość cesji samochodów osobowych — od kompaktów ' +
      'po dobrze wyposażone auta klasy średniej. Poniżej wszystkie aktualne umowy ' +
      'z ratą do 2 000 zł miesięcznie.',
    query: { maxMonthlyPayment: 2000 },
    group: 'deal',
  },
  {
    slug: 'krotkie-umowy',
    heading: 'Cesja leasingu z krótką umową — do 12 rat',
    label: 'Krótkie umowy (do 12 rat)',
    lead:
      'Umowy, w których do końca zostało najwyżej dwanaście rat. Najkrótsze zobowiązanie, ' +
      'jakie można wziąć na siebie w leasingu — dobre dla kogoś, kto chce korzystać z pojazdu ' +
      'przez rok i nie wiązać się na dłużej, albo liczy na wykup po niskiej cenie.',
    query: { maxRemainingInstallments: 12 },
    group: 'deal',
  },
  {
    slug: 'konczace-sie-umowy',
    heading: 'Cesja leasingu z umową przed wykupem — do 6 rat',
    label: 'Przed wykupem (do 6 rat)',
    lead:
      'Umowy na finiszu: do końca zostało maksymalnie sześć rat, więc po ich spłacie ' +
      'od razu otwiera się opcja wykupu. Przy takich ofertach kluczowa jest nie rata, ' +
      'lecz kwota wykupu zestawiona z wartością rynkową pojazdu.',
    query: { maxRemainingInstallments: 6 },
    group: 'deal',
  },
];

export const SEO_CATEGORIES: SeoCategory[] = [
  ...VEHICLE_CATEGORIES,
  ...DEAL_CATEGORIES,
  ...BRAND_CATEGORIES,
];

export const CATEGORY_PATH_PREFIX = '/cesja-leasingu/';

export function categoryUrl(category: SeoCategory): string {
  return `${CATEGORY_PATH_PREFIX}${category.slug}`;
}

export function findCategory(slug: string | null | undefined): SeoCategory | null {
  if (!slug) return null;
  const normalised = slug.trim().toLowerCase().replace(/\/+$/, '');
  return SEO_CATEGORIES.find((category) => category.slug === normalised) ?? null;
}

/** Wyciąga slug z `/cesja-leasingu/bmw`; zwraca null dla każdej innej ścieżki. */
export function parseCategorySlug(path: string): string | null {
  if (!path.startsWith(CATEGORY_PATH_PREFIX)) return null;
  const slug = path.slice(CATEGORY_PATH_PREFIX.length).split('?')[0].split('#')[0];
  return slug || null;
}

/** Minimalny kształt wiersza potrzebny do zliczenia ofert w kategorii. */
export type CountableListing = {
  brand?: string | null;
  vehicle_type?: string | null;
  monthly_payment?: number | null;
  transfer_fee?: number | null;
  remaining_installments?: number | null;
};

export function matchesCategory(listing: CountableListing, query: CategoryQuery): boolean {
  if (query.brandIlike) {
    const brand = (listing.brand ?? '').toLowerCase();
    if (!brand.includes(query.brandIlike.toLowerCase())) return false;
  }
  if (query.vehicleType && listing.vehicle_type !== query.vehicleType) return false;
  if (query.maxMonthlyPayment != null && Number(listing.monthly_payment ?? 0) > query.maxMonthlyPayment) {
    return false;
  }
  if (query.noTransferFee && Number(listing.transfer_fee ?? 0) > 0) return false;
  if (
    query.maxRemainingInstallments != null &&
    Number(listing.remaining_installments ?? 0) > query.maxRemainingInstallments
  ) {
    return false;
  }
  return true;
}

/**
 * Strukturalny opis buildera zapytań supabase-js — dzięki niemu ten plik nie
 * musi importować biblioteki i nadal działa po stronie przeglądarki.
 */
type FilterableQuery<T> = {
  eq(column: string, value: unknown): T;
  lte(column: string, value: unknown): T;
  ilike(column: string, pattern: string): T;
};

export function applyCategoryQuery<T extends FilterableQuery<T>>(builder: T, query: CategoryQuery): T {
  let next = builder;
  if (query.brandIlike) next = next.ilike('brand', `%${query.brandIlike}%`);
  if (query.vehicleType) next = next.eq('vehicle_type', query.vehicleType);
  if (query.maxMonthlyPayment != null) next = next.lte('monthly_payment', query.maxMonthlyPayment);
  if (query.noTransferFee) next = next.lte('transfer_fee', 0);
  if (query.maxRemainingInstallments != null) {
    next = next.lte('remaining_installments', query.maxRemainingInstallments);
  }
  return next;
}

/** Przekłada kategorię na stan filtrów aplikacji (`src/types/filters.ts`). */
export function categoryToFilters(category: SeoCategory): Record<string, string> {
  const { query } = category;
  const filters: Record<string, string> = {};
  if (query.brandIlike) filters.brand = query.brandIlike;
  if (query.vehicleType) filters.vehicleType = query.vehicleType;
  if (query.maxMonthlyPayment != null) filters.maxMonthlyPayment = String(query.maxMonthlyPayment);
  if (query.noTransferFee) filters.noTransferFee = '1';
  if (query.maxRemainingInstallments != null) {
    filters.maxRemainingInstallments = String(query.maxRemainingInstallments);
  }
  return filters;
}

/**
 * Próg indeksowania. Strona kategorii bez ofert to dla Google thin content,
 * a przy 37 ogłoszeniach większość z 40 kategorii byłaby pusta. Dlatego do
 * sitemapy i linkowania wewnętrznego trafiają wyłącznie kategorie, które mają
 * co najmniej tyle ofert; reszta istnieje pod adresem, ale z `noindex` —
 * i sama się „włącza”, gdy przybędzie ogłoszeń.
 */
export const MIN_LISTINGS_TO_INDEX = 3;

export function indexableCategories(listings: CountableListing[]): { category: SeoCategory; count: number }[] {
  return SEO_CATEGORIES.map((category) => ({
    category,
    count: listings.filter((listing) => matchesCategory(listing, category.query)).length,
  })).filter(
    (entry) =>
      entry.count >= MIN_LISTINGS_TO_INDEX &&
      // Kategoria obejmująca całą bazę to strona główna pod innym adresem —
      // dokładnie ta sama lista ofert. Dziś dotyczy to `samochody`, bo nie ma
      // jeszcze ani jednego motocykla; gdy się pojawi, kategoria włączy się sama.
      entry.count < listings.length,
  );
}
