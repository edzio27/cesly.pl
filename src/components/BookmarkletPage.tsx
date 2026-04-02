import { useState } from 'react';
import { Copy, Check, Facebook, ArrowRight, Zap } from 'lucide-react';

export default function BookmarkletPage() {
  const [copied, setCopied] = useState(false);

  const bookmarkletCode = `javascript:(function(){var s=document.createElement('script');s.src='https://cesly.pl/facebook-extractor.js?'+Date.now();document.body.appendChild(s);})();`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-10 h-10" />
              <h1 className="text-4xl font-bold">Import z Facebooka</h1>
            </div>
            <p className="text-blue-100 text-lg">
              Jednym kliknięciem przenieś ogłoszenia z Facebooka do Cesly.pl
            </p>
          </div>

          <div className="p-8">
            <div className="space-y-8">
              <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
                <h2 className="text-xl font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Facebook className="w-6 h-6" />
                  Jak to działa?
                </h2>
                <p className="text-blue-800">
                  Bookmarklet to małe narzędzie, które możesz uruchomić na dowolnej stronie Facebooka z ogłoszeniem.
                  Automatycznie wyciągnie tekst, zdjęcia i stworzy draft ogłoszenia na Cesly.pl.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">
                  Instrukcja instalacji
                </h2>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        Pokaż pasek zakładek
                      </h3>
                      <p className="text-slate-600 mb-3">
                        W przeglądarce wciśnij <kbd className="px-2 py-1 bg-slate-200 rounded text-sm font-mono">Ctrl+Shift+B</kbd> (Windows/Linux)
                        lub <kbd className="px-2 py-1 bg-slate-200 rounded text-sm font-mono">Cmd+Shift+B</kbd> (Mac)
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        Skopiuj kod bookmarkletu
                      </h3>
                      <div className="relative">
                        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                          {bookmarkletCode}
                        </div>
                        <button
                          onClick={handleCopy}
                          className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4" />
                              Skopiowano!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Kopiuj
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        Utwórz zakładkę
                      </h3>
                      <div className="space-y-3 text-slate-600">
                        <p>Kliknij prawym przyciskiem myszy na pasku zakładek i wybierz "Dodaj zakładkę" lub "Add bookmark"</p>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <p className="font-semibold text-slate-800 mb-2">Wypełnij pola:</p>
                          <ul className="space-y-2">
                            <li><strong>Nazwa:</strong> Cesly - Import z FB</li>
                            <li><strong>URL:</strong> Wklej skopiowany kod (ten długi początkujący się od <code className="bg-slate-200 px-1 rounded">javascript:</code>)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      4
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        Gotowe! Jak używać?
                      </h3>
                      <div className="space-y-3 text-slate-600">
                        <p>Teraz możesz:</p>
                        <ol className="list-decimal list-inside space-y-2 ml-2">
                          <li>Otwórz post z ogłoszeniem na Facebooku (dowolna grupa)</li>
                          <li>Kliknij zakładkę "Cesly - Import z FB" na pasku zakładek</li>
                          <li>Poczekaj chwilę - otworzy się nowa karta z wypełnionym formularzem</li>
                          <li>Sprawdź dane i dodaj ogłoszenie!</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-900 mb-2">
                      Zalety bookmarkletu
                    </h3>
                    <ul className="space-y-2 text-green-800">
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        Działa z prywatnymi grupami (jesteś zalogowany)
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        Wyciąga tekst, zdjęcia i link do posta
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        Automatycznie rozpoznaje markę, model, cenę, ratę
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        Bezpieczne - wszystko odbywa się w twojej przeglądarce
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  <strong>Uwaga:</strong> Bookmarklet wymaga, żebyś był zalogowany na Facebooku.
                  Nie działa z mobilnej aplikacji Facebook - użyj przeglądarki na komputerze.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Powrót do strony głównej
          </a>
        </div>
      </div>
    </div>
  );
}
