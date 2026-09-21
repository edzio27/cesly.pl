import { Facebook, Mail, ArrowUpRight } from 'lucide-react';
import { Logo } from './Logo';
import { SeoCategory, categoryUrl, findCategory } from '../data/seoCategories';

type FooterProps = {
  onNavigate: (page: string) => void;
  onNavigateCategory: (slug: string) => void;
};

// Wcześniej te pozycje były przyciskami nakładającymi filtry — dla Google
// nie istniały, bo crawler nie klika w <button>. Teraz to prawdziwe <a href>
// prowadzące pod adresy kategorii, które renderuje też funkcja `seo-page`.
// To jedyne miejsce, z którego bot trafia ze strony głównej na kategorie.
const CATEGORY_SLUGS = [
  'samochody',
  'motocykle',
  'lodzie',
  'bez-odstepnego',
  'rata-do-1000-zl',
  'krotkie-umowy',
];

const BRAND_SLUGS = ['bmw', 'audi', 'mercedes-benz', 'volkswagen', 'toyota', 'skoda'];

function pick(slugs: string[]): SeoCategory[] {
  return slugs.map((slug) => findCategory(slug)).filter((entry): entry is SeoCategory => entry !== null);
}

const CATEGORY_LINKS = pick(CATEGORY_SLUGS);
const BRAND_LINKS = pick(BRAND_SLUGS);

export function Footer({ onNavigate, onNavigateCategory }: FooterProps) {
  const goTo = (page: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(page);
  };

  const goToCategory = (slug: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigateCategory(slug);
  };

  return (
    <footer className="relative overflow-hidden bg-ink-950 text-ink-200">
      <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo size={32} />
              <span className="font-display text-lg font-extrabold tracking-tight text-white">
                Cesly<span className="text-accent-400">.pl</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-300">
              Portal wyłącznie o cesjach leasingu. Bez tysięcy ofert sprzedaży, bez szukania słowa „cesja”
              w opisie — z filtrami, które w tej niszy naprawdę mają znaczenie.
            </p>
            <a
              href="https://www.facebook.com/profile.php?id=61577465008887"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm font-medium transition-colors hover:border-white/25 hover:text-white"
            >
              <Facebook size={16} />
              Cesly.pl na Facebooku
              <ArrowUpRight size={13} />
            </a>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Popularne kategorie</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {CATEGORY_LINKS.map((category) => (
                <li key={category.slug}>
                  <a
                    href={categoryUrl(category)}
                    onClick={goToCategory(category.slug)}
                    className="text-left transition-colors hover:text-accent-400"
                  >
                    {category.heading}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Marki</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {BRAND_LINKS.map((category) => (
                <li key={category.slug}>
                  <a
                    href={categoryUrl(category)}
                    onClick={goToCategory(category.slug)}
                    className="text-left transition-colors hover:text-accent-400"
                  >
                    {category.heading}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Serwis</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="/add" onClick={goTo('add-listing')} className="transition-colors hover:text-accent-400">
                  Dodaj ogłoszenie
                </a>
              </li>
              <li>
                <a href="/#jak-to-dziala" className="transition-colors hover:text-accent-400">
                  Jak działa cesja
                </a>
              </li>
              <li>
                <a href="/#faq" className="transition-colors hover:text-accent-400">
                  Pytania i odpowiedzi
                </a>
              </li>
              <li>
                <a href="/regulamin" onClick={goTo('regulamin')} className="transition-colors hover:text-accent-400">
                  Regulamin
                </a>
              </li>
              <li>
                <a
                  href="/polityka-prywatnosci"
                  onClick={goTo('polityka-prywatnosci')}
                  className="transition-colors hover:text-accent-400"
                >
                  Polityka prywatności
                </a>
              </li>
              <li>
                <a
                  href="mailto:eugeniusz.keptia@gmail.com"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-accent-400"
                >
                  <Mail size={14} />
                  Kontakt
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-ink-400 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Cesly.pl. Wszelkie prawa zastrzeżone.</p>
          <p>Cesly.pl nie jest stroną umowy leasingowej ani pośrednikiem finansowym.</p>
        </div>
      </div>
    </footer>
  );
}
