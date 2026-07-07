import { useEffect } from 'react';
import { DraftNotice } from './DraftNotice';

export default function PolitykaPrywatnosciPage() {
  useEffect(() => {
    document.title = 'Polityka Prywatności | Cesly.pl';
    const metaDesc = document.querySelector('meta[name="description"]');
    const previous = metaDesc?.getAttribute('content') ?? null;
    metaDesc?.setAttribute('content', 'Polityka prywatności serwisu Cesly.pl - informacje o przetwarzaniu danych osobowych i wykorzystaniu plików cookies.');
    return () => {
      document.title = 'Cesly.pl – Cesja leasingu i przejęcie umowy leasingowej';
      if (previous) metaDesc?.setAttribute('content', previous);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Polityka Prywatności</h1>
          <DraftNotice />

          <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900">1. Administrator danych osobowych</h2>
              <p className="mt-2">
                Administratorem danych osobowych przetwarzanych w związku z korzystaniem z serwisu Cesly.pl (dalej:
                „Serwis”) jest [UZUPEŁNIĆ: pełna nazwa podmiotu, adres siedziby, NIP, REGON]. W sprawach dotyczących
                ochrony danych osobowych można kontaktować się pod adresem e-mail [UZUPEŁNIĆ ADRES E-MAIL].
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">2. Jakie dane przetwarzamy</h2>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li><strong>Dane konta:</strong> adres e-mail, opcjonalnie numer telefonu — podawane przy rejestracji i korzystaniu z konta.</li>
                <li><strong>Dane w ogłoszeniach:</strong> treść ogłoszenia oraz dane kontaktowe podane dobrowolnie przez Użytkownika w celu umożliwienia kontaktu zainteresowanym osobom.</li>
                <li><strong>Dane analityczne:</strong> zanonimizowany (zahaszowany) adres IP oraz identyfikator przeglądarki (user agent), zbierane w celu liczenia wyświetleń i kliknięć ogłoszeń — wyłącznie za zgodą wyrażoną w banerze cookies.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">3. Cele i podstawy prawne przetwarzania</h2>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Świadczenie usług Serwisu (założenie i obsługa konta, publikacja ogłoszeń) — art. 6 ust. 1 lit. b RODO (wykonanie umowy).</li>
                <li>Statystyki oglądalności ogłoszeń — art. 6 ust. 1 lit. a RODO (zgoda wyrażona w banerze cookies).</li>
                <li>Dochodzenie i obrona przed roszczeniami — art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes administratora).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">4. Odbiorcy danych</h2>
              <p className="mt-2">
                Dane przetwarzane są przy użyciu zewnętrznych dostawców usług hostingowych i bazodanowych (Supabase)
                oraz hostingu (Vercel). [UZUPEŁNIĆ: czy dane są przekazywane poza Europejski Obszar Gospodarczy oraz
                na jakiej podstawie prawnej — np. standardowe klauzule umowne]. Dane kontaktowe podane w ogłoszeniu są
                widoczne publicznie dla osób przeglądających Serwis.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">5. Okres przechowywania danych</h2>
              <p className="mt-2">
                Dane konta i ogłoszeń przechowywane są przez czas korzystania z Serwisu oraz do momentu usunięcia
                konta przez Użytkownika lub Usługodawcę. Dane analityczne przechowywane są przez okres [UZUPEŁNIĆ, np.
                12 miesięcy] od ich zebrania.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">6. Prawa Użytkownika</h2>
              <p className="mt-2">Każdemu Użytkownikowi przysługuje prawo do:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>dostępu do swoich danych oraz otrzymania ich kopii,</li>
                <li>sprostowania (poprawiania) danych,</li>
                <li>usunięcia danych,</li>
                <li>ograniczenia przetwarzania danych,</li>
                <li>wniesienia sprzeciwu wobec przetwarzania,</li>
                <li>przenoszenia danych,</li>
                <li>wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">7. Pliki cookies</h2>
              <p className="mt-2">
                Serwis wykorzystuje pliki cookies niezbędne do jego prawidłowego działania (np. utrzymanie sesji
                logowania) oraz — wyłącznie po wyrażeniu zgody w banerze wyświetlanym przy pierwszej wizycie —
                cookies analityczne służące liczeniu wyświetleń i kliknięć ogłoszeń. Zgodę można w każdej chwili
                wycofać, czyszcząc dane przeglądarki dla tej strony.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">8. Bezpieczeństwo danych</h2>
              <p className="mt-2">
                Administrator stosuje środki techniczne i organizacyjne mające na celu zabezpieczenie danych
                osobowych Użytkowników przed nieuprawnionym dostępem, utratą lub zniszczeniem.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">9. Kontakt</h2>
              <p className="mt-2">
                W sprawach dotyczących ochrony danych osobowych można kontaktować się pod adresem e-mail
                [UZUPEŁNIĆ ADRES E-MAIL].
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
