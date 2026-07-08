import { Facebook } from 'lucide-react';

type FooterProps = {
  onNavigate: (page: string) => void;
};

export function Footer({ onNavigate }: FooterProps) {
  const goTo = (page: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(page);
  };

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <h3 className="text-white font-bold text-lg mb-2">Cesly.pl</h3>
          <p className="text-sm text-gray-400">
            Największa baza ogłoszeń cesji i przejęcia leasingu samochodów w Polsce.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-2">Informacje</h4>
          <ul className="space-y-1 text-sm">
            <li>
              <a href="/regulamin" onClick={goTo('regulamin')} className="hover:text-amber-400 transition-colors">
                Regulamin
              </a>
            </li>
            <li>
              <a href="/polityka-prywatnosci" onClick={goTo('polityka-prywatnosci')} className="hover:text-amber-400 transition-colors">
                Polityka Prywatności
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-2">Kontakt</h4>
          <p className="text-sm text-gray-400 mb-3">eugeniusz.keptia@gmail.com</p>
          <a
            href="https://www.facebook.com/profile.php?id=61577465008887"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-amber-400 transition-colors"
          >
            <Facebook size={16} />
            Cesly.pl na Facebooku
          </a>
        </div>
      </div>

      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Cesly.pl. Wszelkie prawa zastrzeżone.
      </div>
    </footer>
  );
}
