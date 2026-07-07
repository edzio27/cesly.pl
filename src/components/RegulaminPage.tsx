import { useEffect } from 'react';
import { DraftNotice } from './DraftNotice';

export default function RegulaminPage() {
  useEffect(() => {
    document.title = 'Regulamin | Cesly.pl';
    const metaDesc = document.querySelector('meta[name="description"]');
    const previous = metaDesc?.getAttribute('content') ?? null;
    metaDesc?.setAttribute('content', 'Regulamin korzystania z serwisu Cesly.pl - platformy ogłoszeń cesji i przejęcia leasingu samochodów.');
    return () => {
      document.title = 'Cesly.pl – Cesja leasingu i przejęcie umowy leasingowej';
      if (previous) metaDesc?.setAttribute('content', previous);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Regulamin serwisu Cesly.pl</h1>
          <DraftNotice />

          <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900">§1. Postanowienia ogólne</h2>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Niniejszy Regulamin określa zasady korzystania z serwisu internetowego Cesly.pl (dalej: „Serwis”), dostępnego pod adresem cesly.pl.</li>
                <li>Usługodawcą i administratorem Serwisu jest EloPomelo Eugeniusz Keptia, ul. Kłodzka 32/9, 50-536 Wrocław, NIP: 6572799496, adres e-mail: eugeniusz.keptia@gmail.com (dalej: „Usługodawca”).</li>
                <li>Serwis jest platformą ogłoszeniową umożliwiającą Użytkownikom publikowanie i przeglądanie ogłoszeń dotyczących cesji (przejęcia) umów leasingowych pojazdów.</li>
                <li>Użytkownikiem jest każda osoba fizyczna, prawna lub jednostka organizacyjna korzystająca z Serwisu.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">§2. Rodzaj i zakres usług</h2>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Serwis udostępnia Użytkownikom narzędzie do publikowania ogłoszeń o chęci dokonania cesji leasingu oraz do przeglądania i wyszukiwania takich ogłoszeń.</li>
                <li>Usługodawca nie jest stroną umów leasingowych ani umów cesji zawieranych między Użytkownikami, nie pośredniczy w płatnościach i nie gwarantuje zawarcia ani wykonania transakcji między Użytkownikami.</li>
                <li>Wszelkie ustalenia dotyczące warunków cesji, odstępnego oraz zgody leasingodawcy na przeniesienie umowy leasingu leżą wyłącznie w gestii stron transakcji oraz właściwego leasingodawcy.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">§3. Konto Użytkownika</h2>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Dodawanie ogłoszeń wymaga założenia konta w Serwisie przy użyciu adresu e-mail i hasła.</li>
                <li>Użytkownik zobowiązany jest do podania prawdziwych danych oraz do zachowania poufności danych logowania.</li>
                <li>Użytkownik może w każdej chwili usunąć konto, kontaktując się z Usługodawcą na adres wskazany w §1.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">§4. Zasady publikacji ogłoszeń</h2>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Użytkownik dodający ogłoszenie ponosi wyłączną odpowiedzialność za zgodność publikowanych treści i danych ze stanem faktycznym oraz obowiązującym prawem.</li>
                <li>Zabronione jest publikowanie ogłoszeń wprowadzających w błąd, naruszających prawa osób trzecich, dóbr osobistych, przepisy prawa lub dobre obyczaje.</li>
                <li>Usługodawca zastrzega sobie prawo do usunięcia ogłoszenia naruszającego niniejszy Regulamin lub przepisy prawa, bez konieczności wcześniejszego powiadomienia.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">§5. Odpowiedzialność</h2>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Usługodawca nie weryfikuje prawdziwości ani rzetelności treści ogłoszeń zamieszczanych przez Użytkowników i nie ponosi odpowiedzialności za ich zgodność ze stanem faktycznym.</li>
                <li>Usługodawca nie ponosi odpowiedzialności za przebieg, skutki ani rozliczenia transakcji cesji leasingu zawieranych między Użytkownikami.</li>
                <li>Usługodawca dokłada starań, aby Serwis działał w sposób ciągły i bez zakłóceń, nie gwarantuje jednak nieprzerwanej dostępności Serwisu.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">§6. Reklamacje</h2>
              <p className="mt-2">
                Reklamacje dotyczące funkcjonowania Serwisu można zgłaszać na adres e-mail eugeniusz.keptia@gmail.com. Reklamacja
                powinna zawierać opis problemu oraz dane kontaktowe zgłaszającego. Usługodawca rozpatruje reklamacje
                w terminie 14 dni od ich otrzymania.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">§7. Dane osobowe</h2>
              <p className="mt-2">
                Zasady przetwarzania danych osobowych Użytkowników określa odrębny dokument —{' '}
                <a href="/polityka-prywatnosci" className="text-amber-600 hover:underline">Polityka Prywatności</a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">§8. Postanowienia końcowe</h2>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Usługodawca zastrzega sobie prawo do zmiany Regulaminu. Zmiany wchodzą w życie w terminie wskazanym przy publikacji nowej wersji na stronie Serwisu.</li>
                <li>W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego, w tym Kodeksu cywilnego oraz ustawy o świadczeniu usług drogą elektroniczną.</li>
                <li>Regulamin wchodzi w życie z dniem publikacji w Serwisie.</li>
              </ol>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
