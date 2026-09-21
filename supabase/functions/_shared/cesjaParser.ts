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
   * 'netto' albo 'brutto', jeśli ogłoszenie to precyzuje przy kwocie raty.
   * Różnica to 23%, więc potraktowanie kwoty netto jak brutto zaniża realny
   * koszt o niemal jedną czwartą — a tego w ogłoszeniu nie widać.
   */
  priceType: 'netto' | 'brutto' | null;
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
  priceType: null,
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
const PAID_OF_TOTAL_PATTERN =
  /(?:sp[łl]acon\w*|op[łl]acon\w*|zap[łl]acon\w*)\s*(?:rat\w*)?\s*:?\s*(\d{1,3})\s*(?:rat\w*)?\s*(?:z|\/|na)\s*(\d{1,3})/i;

/**
 * Zapis etykietowy: „Liczba pozostałych rat 24", „Pozostałych rat: 24".
 * Odwrotna kolejność niż w zdaniu — najpierw rzeczownik, potem liczba —
 * przez co wszystkie wzorce zakładające „24 raty" go nie widziały.
 * Wymagamy członu „pozosta", bo samo „Liczba rat 48" jest dwuznaczne
 * (bywa długością całej umowy) i wolimy null niż zgadywanie.
 */
/**
 * `\w` w JavaScripcie to [A-Za-z0-9_] — polskich znaków NIE obejmuje.
 * Przez to `pozosta\w*` nie dopasowuje „pozostało" (rozbija się na „ł"),
 * co jest wyjątkowo złośliwe, bo wzorzec wygląda poprawnie i działa na
 * „pozostalo" bez ogonków.
 */
const PL = String.raw`[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]`;

const REMAINING_LABEL_PATTERNS = [
  new RegExp(String.raw`(?:liczba\s+)?(?:pozosta${PL}*|zosta${PL}*)\s+rat${PL}*\s*(?::|-|–|=)\s*(\d{1,3})`, 'gi'),
  new RegExp(String.raw`(?:liczba\s+)?pozosta[łl]ych\s+rat${PL}*\s*(?::|-|–|=)?\s*(\d{1,3})`, 'gi'),
  new RegExp(String.raw`rat${PL}*\s+pozosta[łl]${PL}*\s*(?::|-|–|=)?\s*(\d{1,3})`, 'gi'),
  new RegExp(String.raw`rat${PL}*\s+do\s+(?:ko[ńn]ca|sp[łl]aty)\s*(?::|-|–|=)?\s*(\d{1,3})`, 'gi'),
];

const REMAINING_PATTERNS = [
  // Między słowem otwierającym a liczbą potrafi stać jeszcze jedno lub dwa
  // wtrącenia: „pozostało do spłaty: 48 raty", „Do spłaty zostały 53 raty".
  new RegExp(
    String.raw`(?:pozosta${PL}*|zosta${PL}*|do\s+sp[łl]aty)(?:\s+(?:do\s+sp[łl]aty|jeszcze|zosta${PL}*|pozosta${PL}*))?\s*(?::|-|–)?\s*(\d{1,3})\s*rat`,
    'gi',
  ),
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

/**
 * Miesiące zapisane słownie — „umowa do października 2027". Kluczem jest
 * rdzeń, bo w ogłoszeniach padają różne formy (październik, października).
 */
const MONTH_STEMS: [RegExp, number][] = [
  [/^stycz/i, 1], [/^lut/i, 2], [/^mar(?:zec|ca)/i, 3], [/^kwiet/i, 4],
  [/^maj/i, 5], [/^czerw/i, 6], [/^lip/i, 7], [/^sierp/i, 8],
  [/^wrze/i, 9], [/^paździer|^pazdzier/i, 10], [/^listopad/i, 11], [/^grud/i, 12],
];

const END_DATE_WORD_PATTERN =
  /(?:do|koniec\s+umowy|umowa\s+do|ostatnia\s+rata)\s*(?::|-|–)?\s*([a-ząćęłńóśźż]{3,12})\s+(\d{4})/gi;

function monthFromWord(word: string): number | null {
  for (const [stem, month] of MONTH_STEMS) if (stem.test(word)) return month;
  return null;
}

/** Pełne miesiące od dziś do końca podanego miesiąca; null gdy data nie ma sensu. */
function monthsUntil(month: number, year: number, now: Date): number | null {
  if (month < 1 || month > 12) return null;
  const fullYear = year < 100 ? 2000 + year : year;
  const months = (fullYear - now.getFullYear()) * 12 + (month - (now.getMonth() + 1));
  return months >= 1 && months <= 180 ? months : null;
}

/** Netto/brutto rozpoznajemy tylko w sąsiedztwie raty — globalne zliczanie
 *  myliłoby się o kwoty wykupu i ceny pojazdu. */
const PRICE_TYPE_PATTERN = /rat\w*[^.]{0,45}?\b(netto|brutto)\b/i;

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

  let remaining =
    firstMatch(text, REMAINING_LABEL_PATTERNS, isInstallments) ??
    firstMatch(text, REMAINING_PATTERNS, isInstallments);
  let total = firstMatch(text, TOTAL_PATTERNS, isInstallments);

  // Kolejność ma znaczenie i kosztowała błąd: zapis „Spłacone rat: 9/48"
  // wygląda identycznie jak „9/48 rat", ale znaczy coś odwrotnego —
  // 9 rat JUŻ ZAPŁACONO, zostało 39. Wzorzec spłaconych musi więc zadziałać
  // PRZED ogólnym ułamkiem, a gdy trafi, ułamka już nie używamy.
  const paid = PAID_OF_TOTAL_PATTERN.exec(text);
  let paidMatched = false;
  if (paid) {
    const alreadyPaid = Number(paid[1]);
    const contractLength = Number(paid[2]);
    if (isInstallments(alreadyPaid) && isInstallments(contractLength) && alreadyPaid < contractLength) {
      remaining ??= contractLength - alreadyPaid;
      total ??= contractLength;
      paidMatched = true;
    }
  }

  const ratio = paidMatched ? null : RATIO_PATTERN.exec(text);

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
    END_DATE_WORD_PATTERN.lastIndex = 0;
    let wordMatch: RegExpExecArray | null;
    while ((wordMatch = END_DATE_WORD_PATTERN.exec(text)) !== null) {
      const month = monthFromWord(wordMatch[1]);
      if (month == null) continue;
      const derived = monthsUntil(month, Number(wordMatch[2]), now);
      if (derived != null) {
        remaining = derived;
        remainingIsDerived = true;
        break;
      }
    }
  }

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
    priceType: (PRICE_TYPE_PATTERN.exec(text)?.[1]?.toLowerCase() as 'netto' | 'brutto') ?? null,
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
