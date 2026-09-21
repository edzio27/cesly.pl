/**
 * Wyciąganie ekonomii cesji z opisu ogłoszenia.
 *
 * Filtry Cesly opierają się na racie, odstępnym i liczbie pozostałych rat,
 * a kolumny te są NOT NULL — bez tych trzech liczb zaimportowane ogłoszenie
 * jest bezużyteczne i nie da się go nawet zapisać. W ogłoszeniach nie ma ich
 * w żadnym polu strukturalnym: siedzą w wolnym tekście opisu, za to zapisane
 * w kilkunastu powtarzalnych wariantach („odstępne 55 tys zł", „pozostało
 * 8 rat po 1590 zł", „rata miesięczna 1 590,00 zł netto").
 *
 * Parser jest deterministyczny i celowo nie korzysta z modelu językowego.
 * Funkcja `analyze-listing-input` robi to samo lepiej, ale zależy od salda
 * konta Anthropic — gdy się wyczerpie, zwraca same nulle i cicho wyłącza
 * import. To ma działać zawsze; AI jest wzbogaceniem, nie fundamentem.
 *
 * Zasada naczelna: nigdy nie zgadujemy. Jeśli liczby nie ma wprost w tekście,
 * zwracamy null i ogłoszenie trafia do kolejki jako niekompletne.
 */

export type CesjaEconomics = {
  monthlyPayment: number | null;
  transferFee: number | null;
  remainingInstallments: number | null;
  totalInstallments: number | null;
  buyoutPrice: number | null;
  /**
   * True, gdy liczby rat nie było wprost, a wyliczyliśmy ją z podanej daty
   * końca umowy. Wartość jest wtedy przybliżeniem (pełne miesiące do tej daty)
   * i osoba zatwierdzająca ogłoszenie musi ją zobaczyć jako wyliczoną.
   */
  remainingIsDerived: boolean;
};

export const EMPTY_ECONOMICS: CesjaEconomics = {
  monthlyPayment: null,
  transferFee: null,
  remainingInstallments: null,
  totalInstallments: null,
  buyoutPrice: null,
  remainingIsDerived: false,
};

/** Czy tekst w ogóle mówi o cesji — pierwsze sito przy imporcie. */
export function mentionsCesja(text: string): boolean {
  return /cesj|przej[ęe]ci\w*\s+leasing|przejm[ęe]\s+leasing|odst[ąa]pi\w*\s+leasing|oddam\s+leasing/i.test(
    text,
  );
}

/**
 * Normalizacja polskiego zapisu kwoty: „55 000", „55.000", „55,5 tys",
 * „55tyś", twarde i niełamliwe spacje. Zwraca null dla czegokolwiek,
 * czego nie rozumiemy — lepiej brak danych niż zła liczba.
 */
function toNumber(raw: string, unit?: string): number | null {
  // Apostrof jako separator tysięcy („1'560,26") jest w polskich ogłoszeniach
  // motoryzacyjnych częsty — bez jego usunięcia Number() zwraca NaN.
  let cleaned = raw.replace(/[\s\u00a0\u202f\u0027\u2018\u2019]/g, '');

  // Kropka bywa separatorem tysięcy („55.000"), a przecinek dziesiętnym
  // („55,5"). Kropkę traktujemy jako tysiące tylko przy dokładnie trzech
  // cyfrach po niej, bo „1.5 tys" to jednak półtora tysiąca.
  if (/^\d+\.\d{3}$/.test(cleaned)) cleaned = cleaned.replace('.', '');
  cleaned = cleaned.replace(',', '.');

  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;

  const multiplier = unit && /tys|tyś|^k$/i.test(unit) ? 1000 : 1;
  return value * multiplier;
}

/** Pierwsze dopasowanie, które przejdzie walidację zakresu. */
function firstMatch(
  text: string,
  patterns: RegExp[],
  validate: (value: number) => boolean,
  groupOffset = 0,
): number | null {
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const value = toNumber(match[1 + groupOffset], match[2 + groupOffset]);
      if (value != null && validate(value)) return value;
      if (!pattern.global) break;
    }
  }
  return null;
}

const AMOUNT = String.raw`([\d\s\u00a0.,\u0027\u2019]{1,14}?)\s*(tys\.?|tyś\.?|k)?\s*(?:z[łl]|PLN)`;

/**
 * Wariant bez wymaganej waluty — mnóstwo ogłoszeń pisze „Odstępne leasingu
 * 38100 netto" albo „Bieżąca rata netto 1797,92". Używamy go WYŁĄCZNIE
 * w wzorcach zakotwiczonych na mocnym słowie kluczowym (odstępne, rata,
 * wykup) — bez tej kotwicy łapałby pierwszą lepszą liczbę z opisu.
 */
// Zachłannie, nie leniwie: przy opcjonalnej walucie wariant leniwy zatrzymywał
// się na pierwszych dwóch cyfrach i z „40000 zł" robił 40.
const AMOUNT_LOOSE = String.raw`([\d\s\u00a0.,\u0027\u2019]{2,14})\s*(tys\.?|tyś\.?|k)?\s*(?:z[łl]|PLN|netto|brutto)?`;

const MONTHLY_PATTERNS = [
  new RegExp(String.raw`(?:bie[żz][ąa]ca\s+)?rat[aęy]\s*(?:miesi[ęe]czn\w*)?\s*(?:netto|brutto)?\s*(?:wynosi|to|w\s+wysoko[śs]ci|:|-|–|=)?\s*${AMOUNT_LOOSE}`, 'gi'),
  new RegExp(String.raw`\d{1,3}\s*rat\w*\s*[x×]\s*${AMOUNT_LOOSE}`, 'gi'),
  new RegExp(String.raw`rat[aęy]\s*(?:miesi[ęe]czn\w*)?\s*(?:netto|brutto)?\s*(?:wynosi|to|w\s+wysoko[śs]ci|:|-|–|=)?\s*${AMOUNT}`, 'gi'),
  new RegExp(String.raw`rat\w*\s+po\s+${AMOUNT}`, 'gi'),
  new RegExp(String.raw`po\s+${AMOUNT}\s*(?:miesi[ęe]cznie|/\s*mies|netto|brutto)`, 'gi'),
  new RegExp(String.raw`miesi[ęe]cznie\s*(?::|-|–)?\s*${AMOUNT}`, 'gi'),
  new RegExp(String.raw`${AMOUNT}\s*/\s*(?:mies|m-c|miesi)`, 'gi'),
];

const FEE_PATTERNS = [
  new RegExp(String.raw`(?:kwota\s+)?odst[ęe]pn\w*(?:\s+leasingu)?\s*(?:wynosi|to|w\s+wysoko[śs]ci|:|-|–|=)?\s*${AMOUNT_LOOSE}`, 'gi'),
  new RegExp(String.raw`odst[ęe]pn\w*\s*(?:wynosi|to|w\s+wysoko[śs]ci|:|-|–|=)?\s*${AMOUNT}`, 'gi'),
  new RegExp(String.raw`odst[ąa]pn\w*\s*(?:wynosi|to|:|-|–|=)?\s*${AMOUNT}`, 'gi'),
];

const BUYOUT_PATTERNS = [
  new RegExp(String.raw`wykup\w*\s*(?:wynosi|to|:|-|–|=)?\s*${AMOUNT_LOOSE}`, 'gi'),
];

/**
 * „Spłacone 22 raty z 60 rat" — jedyny wariant, w którym liczba pozostałych
 * rat nie pada wprost i trzeba ją odjąć. Zwracamy obie liczby naraz.
 */
const PAID_OF_TOTAL_PATTERN = /sp[łl]acon\w*\s*(\d{1,3})\s*rat\w*\s*(?:z|\/|na)\s*(\d{1,3})\s*rat/i;

const REMAINING_PATTERNS = [
  /(?:pozosta[łl]o|zosta[łl]o|pozosta[jł]\w*|do\s+sp[łl]aty)\s*(?:jeszcze\s*)?(\d{1,3})\s*rat/gi,
  /(\d{1,3})\s*rat\w*\s*(?:do\s+ko[ńn]ca|pozosta\w*|zosta\w*)/gi,
  /do\s+ko[ńn]ca\s*(?:umowy)?\s*(?::|-|–)?\s*(\d{1,3})\s*rat/gi,
];

const TOTAL_PATTERNS = [
  /(?:umowa|leasing|kontrakt)\s*(?:na|zawarty\s+na)\s*(\d{1,3})\s*(?:rat|miesi)/gi,
  /(?:z|na)\s*(\d{1,3})\s*rat\w*\s*(?:w\s+sumie|[łl][ąa]cznie|ca[łl]kowicie)/gi,
];

/** „24/48 rat" albo „24 z 48 rat" — jedno dopasowanie daje obie liczby. */
const RATIO_PATTERN = /(\d{1,3})\s*(?:\/|z|na)\s*(\d{1,3})\s*rat/i;

/**
 * Data końca umowy: „do 05.2027", „umowa do 05/2027", „ostatnia rata 12.2026".
 * To najczęstszy sposób, w jaki ogłoszenia podają długość pozostałego
 * zobowiązania — częściej niż wprost liczbą rat.
 */
const END_DATE_PATTERNS = [
  /(?:do|koniec\s+umowy|umowa\s+do|ostatnia\s+rata|do\s+ko[ńn]ca\s+umowy)\s*(?::|-|–)?\s*(\d{1,2})[./-](\d{4})/gi,
  /(?:do|koniec\s+umowy|umowa\s+do|ostatnia\s+rata)\s*(?::|-|–)?\s*(\d{1,2})[./-](\d{2})\b/gi,
];

/** Pełne miesiące od dziś do końca podanego miesiąca; null gdy data nie ma sensu. */
function monthsUntil(month: number, year: number, now: Date): number | null {
  if (month < 1 || month > 12) return null;
  const fullYear = year < 100 ? 2000 + year : year;
  const months = (fullYear - now.getFullYear()) * 12 + (month - (now.getMonth() + 1));
  return months >= 1 && months <= 180 ? months : null;
}

const isMonthly = (v: number) => v >= 100 && v <= 60_000;
const isFee = (v: number) => v >= 0 && v <= 900_000;
const isBuyout = (v: number) => v >= 0 && v <= 2_000_000;
const isInstallments = (v: number) => Number.isInteger(v) && v >= 1 && v <= 180;

export function parseCesjaEconomics(rawText: string, now: Date = new Date()): CesjaEconomics {
  if (!rawText) return { ...EMPTY_ECONOMICS };

  // Znaczniki HTML i encje psują dopasowania („55&nbsp;000"), więc spłaszczamy
  // tekst do czystych znaków, zanim cokolwiek policzymy.
  const text = rawText
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ');

  // „bez odstępnego" to jawna deklaracja zera i musi wygrać z liczbą, która
  // mogłaby przypadkiem stać obok słowa „odstępne" w dalszej części opisu.
  const noFee = /bez\s+odst[ęe]pn\w*|odst[ęe]pne\s*(?::|-|–)?\s*(?:0|brak|zero|-)\b/i.test(text);

  const ratio = RATIO_PATTERN.exec(text);
  let remaining = firstMatch(text, REMAINING_PATTERNS, isInstallments);
  let total = firstMatch(text, TOTAL_PATTERNS, isInstallments);

  const paid = PAID_OF_TOTAL_PATTERN.exec(text);
  if (paid) {
    const alreadyPaid = Number(paid[1]);
    const contractLength = Number(paid[2]);
    if (isInstallments(alreadyPaid) && isInstallments(contractLength) && alreadyPaid < contractLength) {
      remaining ??= contractLength - alreadyPaid;
      total ??= contractLength;
    }
  }

  if (ratio) {
    const a = Number(ratio[1]);
    const b = Number(ratio[2]);
    // Sensowne tylko wtedy, gdy pierwsza liczba jest mniejsza — inaczej to
    // przypadkowe zestawienie dwóch liczb, nie „pozostałe z całości".
    if (isInstallments(a) && isInstallments(b) && a < b) {
      remaining ??= a;
      total ??= b;
    }
  }

  // Dopiero gdy liczby rat nie podano wprost, sięgamy po datę końca umowy.
  // To nie jest zgadywanie — to arytmetyka na jawnie podanej dacie — ale wynik
  // oznaczamy jako wyliczony, bo bywa o miesiąc obok przy nieznanym dniu raty.
  let remainingIsDerived = false;
  if (remaining == null) {
    for (const pattern of END_DATE_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const derived = monthsUntil(Number(match[1]), Number(match[2]), now);
        if (derived != null) {
          remaining = derived;
          remainingIsDerived = true;
          break;
        }
      }
      if (remaining != null) break;
    }
  }

  return {
    monthlyPayment: firstMatch(text, MONTHLY_PATTERNS, isMonthly),
    transferFee: noFee ? 0 : firstMatch(text, FEE_PATTERNS, isFee),
    remainingInstallments: remaining,
    totalInstallments: total,
    buyoutPrice: firstMatch(text, BUYOUT_PATTERNS, isBuyout),
    remainingIsDerived,
  };
}

/** Czy da się z tego zrobić ogłoszenie — kolumny NOT NULL muszą być wypełnione. */
export function isPublishable(economics: CesjaEconomics): boolean {
  return (
    economics.monthlyPayment != null &&
    economics.transferFee != null &&
    economics.remainingInstallments != null
  );
}
