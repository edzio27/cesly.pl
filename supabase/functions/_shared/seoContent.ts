/**
 * Treść redakcyjna strony głównej: FAQ, opis cesji, kroki procesu.
 *
 * Leży obok katalogu kategorii i z tego samego powodu — renderuje ją zarówno
 * aplikacja React, jak i funkcja `seo-page` serwująca statyczny HTML crawlerom.
 * Gdyby teksty rozjechały się między tymi dwoma miejscami, bot indeksowałby
 * inne odpowiedzi FAQ niż te, które widzi człowiek.
 */

export type FaqItem = { question: string; answer: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Czym jest cesja leasingu?',
    answer:
      'Cesja leasingu (przejęcie umowy leasingowej) to przeniesienie praw i obowiązków z dotychczasowego leasingobiorcy (cedenta) na nowego użytkownika (cesjonariusza). Nowa osoba przejmuje pozostałe raty leasingowe oraz prawo do korzystania z pojazdu, a leasingodawca musi wyrazić zgodę na taką zmianę.',
  },
  {
    question: 'Ile kosztuje cesja leasingu?',
    answer:
      'Na koszt cesji składają się dwa elementy: odstępne płacone dotychczasowemu leasingobiorcy (ustalane indywidualnie między stronami, widoczne w każdym ogłoszeniu) oraz opłata manipulacyjna pobierana przez leasingodawcę za przepisanie umowy, zwykle w wysokości kilkuset złotych.',
  },
  {
    question: 'Co oznacza „realny koszt miesięczny” w ogłoszeniach?',
    answer:
      'To rata leasingowa powiększona o odstępne rozłożone na pozostałe raty. Dzięki temu można uczciwie porównać ofertę z niską ratą i wysokim odstępnym z ofertą, w której odstępnego nie ma wcale. Sama rata bywa myląca — auto za 800 zł miesięcznie z odstępnym 30 000 zł i 20 ratami do końca kosztuje realnie 2 300 zł na miesiąc.',
  },
  {
    question: 'Czy cesja leasingu wymaga zgody leasingodawcy?',
    answer:
      'Tak. Firma leasingowa musi zweryfikować nowego leasingobiorcę (m.in. jego zdolność finansową) i formalnie wyrazić zgodę na przeniesienie umowy, zanim cesja zostanie sfinalizowana.',
  },
  {
    question: 'Jakie dokumenty są potrzebne do przejęcia leasingu?',
    answer:
      'Zazwyczaj wymagany jest wniosek o cesję złożony do leasingodawcy, dokumenty potwierdzające sytuację finansową nowego leasingobiorcy (np. dla firm: dokumenty rejestrowe i finansowe), a po akceptacji — aneks do umowy leasingowej podpisywany przez wszystkie trzy strony.',
  },
  {
    question: 'Czy przejęcie leasingu to dobry sposób na tańszy samochód?',
    answer:
      'Często tak — przejmując leasing, płacisz tylko pozostałe raty i odstępne, a nie pełną wartość pojazdu, co przy dobrze dobranej ofercie bywa tańsze niż zakup podobnego auta na rynku wtórnym lub zawarcie nowej umowy leasingowej.',
  },
];

export const HOW_IT_WORKS_STEPS: { title: string; description: string }[] = [
  {
    title: 'Znajdź ofertę',
    description:
      'Filtruj po racie, odstępnym i liczbie pozostałych rat — a jeśli chcesz oddać leasing, dodaj ogłoszenie za darmo',
  },
  { title: 'Skontaktuj się', description: 'Napisz do właściciela przez wiadomości w serwisie albo zadzwoń' },
  {
    title: 'Uzgodnij warunki',
    description: 'Z obecnym leasingobiorcą i leasingodawcą — odstępne, termin, dokumenty',
  },
  { title: 'Podpisz cesję', description: 'Leasingodawca zatwierdza, umowa i pojazd przechodzą na Ciebie' },
];

export const WHAT_IS_CESJA_HEADING = 'Czym jest cesja leasingu?';

export const WHAT_IS_CESJA_BODY =
  'Cesja leasingu, nazywana też przejęciem umowy leasingowej lub odstąpieniem leasingu, polega na ' +
  'przeniesieniu praw i obowiązków z obecnego leasingobiorcy na nowego użytkownika. Cedent (osoba ' +
  'oddająca leasing) kończy spłacanie rat, a cesjonariusz (osoba przejmująca) wchodzi w jego miejsce — ' +
  'przejmuje pozostałe raty leasingowe oraz pojazd, płacąc cedentowi ustalone odstępne. Cała ' +
  'transakcja wymaga zgody leasingodawcy.';

export const TAKEOVER_BENEFITS = [
  'Krótszy okres zobowiązania niż przy nowej umowie leasingowej',
  'Możliwość przejęcia pojazdu poniżej jego wartości rynkowej',
  'Uproszczona procedura w porównaniu z zakupem i nowym leasingiem',
  'Znana historia serwisowa i przebieg pojazdu od dotychczasowego użytkownika',
];

/**
 * H1 strony głównej. Aplikacja łamie go na dwie linie i podbija drugą kolorem,
 * statyczny render sklejają w jedno zdanie — treść pozostaje identyczna.
 */
export const HOME_HEADING_LINES = ['Wszystkie cesje leasingu', 'w jednym miejscu'];

export const HOME_HEADING = HOME_HEADING_LINES.join(' ');

export const HOME_LEAD =
  'Filtruj po racie, odstępnym i liczbie pozostałych rat — a nie po słowie „cesja” w opisie. ' +
  'Pokazujemy też realny koszt miesięczny, czyli ratę razem z rozłożonym odstępnym.';
