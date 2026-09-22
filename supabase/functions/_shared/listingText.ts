/**
 * Własny opis zaimportowanego ogłoszenia — zamiast kopii cudzego.
 *
 * Wcześniej import przepisywał opis z Otomoto 1:1. To jest cudzy utwór,
 * a jego republikacja to naruszenie; przeredagowanie tego samego tekstu
 * niczego nie naprawia, bo wierna przeróbka jest opracowaniem (utworem
 * zależnym), którego rozpowszechnianie również wymaga zgody autora.
 *
 * Dlatego nie dotykamy cudzych zdań. Bierzemy z ogłoszenia FAKTY — marka,
 * model, rocznik, przebieg, rata, odstępne, liczba rat — i z nich składamy
 * własne zdanie. Fakty nie podlegają prawu autorskiemu, a tekst wychodzi
 * unikalny, więc nie jest to też duplicate content dla Google.
 *
 * Krótki fragment oryginału zostaje dostępny wyłącznie jako oznaczony cytat
 * z podaniem źródła (art. 29 pr. aut.), nigdy jako treść ogłoszenia.
 */

export type ListingFacts = {
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  mileage?: number | null;
  gearbox?: string | null;
  location?: string | null;
  monthlyPayment?: number | null;
  transferFee?: number | null;
  remainingInstallments?: number | null;
  totalInstallments?: number | null;
  buyoutPrice?: number | null;
  remainingIsDerived?: boolean;
};

/** Maksymalna długość cytatu z oryginału. Krótko, bo to cytat, nie treść. */
export const MAX_EXCERPT_LENGTH = 280;

const money = (value: number): string => `${Math.round(value).toLocaleString('pl-PL')} zł`;

/**
 * Polska odmiana słowa „rata" — bez tego opis czyta się jak wygenerowany
 * automatem, a to pierwsza rzecz, po której widać sklejkę.
 */
function ratyLabel(count: number): string {
  if (count === 1) return 'rata';
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 12 && lastTwo <= 14) return 'rat';
  return last >= 2 && last <= 4 ? 'raty' : 'rat';
}

/** Zdanie o pojeździe: co to jest i w jakim jest stanie. */
function vehicleSentence(facts: ListingFacts): string {
  const name = [facts.brand, facts.model].filter(Boolean).join(' ').trim();
  const parts: string[] = [];

  if (name && facts.year) parts.push(`${name} z ${facts.year} roku`);
  else if (name) parts.push(name);
  else if (facts.year) parts.push(`pojazd z ${facts.year} roku`);

  if (facts.mileage) parts.push(`przebieg ${facts.mileage.toLocaleString('pl-PL')} km`);
  if (facts.gearbox) parts.push(`skrzynia ${facts.gearbox.toLowerCase()}`);
  if (facts.location) parts.push(`lokalizacja: ${facts.location}`);

  return parts.length > 0 ? `${parts.join(', ')}.` : '';
}

/** Zdanie o warunkach cesji — to po nie ludzie tu przychodzą. */
function cesjaSentence(facts: ListingFacts): string {
  const parts: string[] = [];

  if (facts.monthlyPayment != null) parts.push(`rata ${money(facts.monthlyPayment)} miesięcznie`);

  if (facts.transferFee != null) {
    parts.push(facts.transferFee > 0 ? `odstępne ${money(facts.transferFee)}` : 'bez odstępnego');
  }

  if (facts.remainingInstallments != null) {
    const count = facts.remainingInstallments;
    // „16 z 16 rat" to nie jest informacja, tylko mylący szum: tak wygląda
    // zapis, gdy łącznej liczby rat nie udało się ustalić i podstawiono
    // liczbę pozostałych. Czytelnik zrozumiałby to jako umowę, która od
    // początku miała 16 rat. Podajemy całość tylko wtedy, gdy ją znamy.
    const total = facts.totalInstallments;
    const suffix = total != null && total > count ? ` z ${total}` : '';
    parts.push(`do końca umowy ${count}${suffix} ${ratyLabel(count)}`);
  }

  if (facts.buyoutPrice != null && facts.buyoutPrice > 0) {
    parts.push(`wykup ${money(facts.buyoutPrice)}`);
  }

  if (parts.length === 0) return '';

  const sentence = `Warunki przejęcia: ${parts.join(', ')}.`;
  return facts.remainingIsDerived
    ? `${sentence} Liczbę pozostałych rat wyliczono z podanej w ogłoszeniu daty zakończenia umowy.`
    : sentence;
}

/**
 * Składa opis ogłoszenia z samych faktów. Zwraca pusty ciąg, gdy nie ma
 * z czego złożyć nawet jednego zdania — wtedy ogłoszenie nie nadaje się
 * do publikacji i tak.
 */
export function buildDescription(facts: ListingFacts, sourceName = 'Otomoto'): string {
  const sentences = [vehicleSentence(facts), cesjaSentence(facts)].filter(Boolean);
  if (sentences.length === 0) return '';

  sentences.push(
    `Ogłoszenie zostało zebrane z serwisu ${sourceName} i opisane na podstawie podanych tam danych. ` +
      'Szczegóły i kontakt ze sprzedającym znajdziesz w oryginalnym ogłoszeniu.',
  );

  return sentences.join(' ');
}

/**
 * Usuwa z tekstu dane kontaktowe. Ze strukturalnych pól Otomoto nic takiego
 * nie bierzemy, ale sprzedający regularnie wpisują telefon albo e-mail
 * w treść opisu — i tą drogą trafiały nam na stronę dane osoby, która nigdy
 * nie zgodziła się na kontakt przez Cesly.
 */
export function redactPersonalData(text: string): string {
  if (!text) return '';

  return text
    // E-maile.
    .replace(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g, '[kontakt w ogłoszeniu źródłowym]')
    // Telefony w typowych polskich zapisach (3-3-3 albo 3-2-2-2), opcjonalnie
    // z prefiksem kraju. Wzorzec „dziewięć cyfr z dowolnymi separatorami"
    // byłby zbyt chciwy — zjadałby ciągi zwykłych liczb z opisu, np.
    // „2022 41 000 660 KM". Ujemne wejrzenia pilnują, żeby dopasowanie nie
    // było wycinkiem dłuższej liczby ani wielkością z jednostką.
    .replace(
      /(?<![\d,.])(?:\+?48[\s-]?)?(?:\d{3}[\s-]?\d{3}[\s-]?\d{3}|\d{3}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2})(?![\d,.])(?!\s*(?:z[łl]|PLN|km|KM|kW|Nm))/g,
      '[kontakt w ogłoszeniu źródłowym]',
    )
    // Numery zapisane nietypowo (stacjonarne 2-3-2-2 i podobne) łapiemy
    // po słowie kluczowym — kotwica na „tel"/„kontakt" pozwala poluzować
    // wymagania co do formatu bez ryzyka trafienia w zwykłą liczbę.
    .replace(
      /(?:tel\.?|telefon|kom\.?|zadzwo[ńn]|kontakt|whatsapp)\s*:?\s*(?:\+?48[\s-]?)?(?:\d[\s-]?){6,10}\d/gi,
      '[kontakt w ogłoszeniu źródłowym]',
    )
    // Adresy stron i profile — też bywają kanałem kontaktu.
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link w ogłoszeniu źródłowym]')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Krótki, oczyszczony fragment oryginału do pokazania jako cytat.
 * Ucinamy na granicy zdania, żeby nie urywać w połowie słowa.
 */
export function buildExcerpt(text: string, maxLength = MAX_EXCERPT_LENGTH): string {
  const clean = redactPersonalData(
    String(text ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  );
  if (clean.length <= maxLength) return clean;

  const cut = clean.slice(0, maxLength);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return lastStop > maxLength * 0.5 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}…`;
}

/**
 * Zapis „pozostałe / wszystkie" raty. Gdy całkowitej liczby rat nie udało się
 * ustalić, w bazie leży tam liczba pozostałych (kolumna jest NOT NULL) —
 * i wtedy „29 / 29" czyta się jak umowa, która od początku miała 29 rat.
 * W takiej sytuacji podajemy samą liczbę pozostałych.
 */
export function formatInstallments(
  remaining: number | null | undefined,
  total: number | null | undefined,
  separator = ' z ',
): string {
  if (remaining == null) return '—';
  return total != null && total > remaining ? `${remaining}${separator}${total}` : String(remaining);
}
