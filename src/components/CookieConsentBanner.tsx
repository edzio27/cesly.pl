import { useEffect, useState } from 'react';
import { getCookieConsent, setCookieConsent, CookieConsent } from '../utils/analytics';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsent() === null);
  }, []);

  const handleChoice = (value: CookieConsent) => {
    setCookieConsent(value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <p className="text-sm text-gray-700 flex-1 text-center sm:text-left">
          Używamy plików cookies do zliczania statystyk odwiedzin i kliknięć ogłoszeń. Podstawowe funkcje serwisu
          działają niezależnie od Twojego wyboru. Więcej informacji w{' '}
          <a href="/polityka-prywatnosci" className="underline text-amber-600 hover:text-amber-700">
            Polityce Prywatności
          </a>
          .
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => handleChoice('declined')}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Odrzuć
          </button>
          <button
            onClick={() => handleChoice('accepted')}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
          >
            Akceptuję
          </button>
        </div>
      </div>
    </div>
  );
}
