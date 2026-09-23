import { useEffect, useState } from 'react';
import {
  User,
  Plus,
  LogOut,
  Settings,
  Menu,
  X,
  Upload,
  BarChart3,
  Heart,
  MessageSquare,
  ChevronDown,
  Search,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { Logo } from './Logo';

type NavigationProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

// The scraping/import/analytics screens are owner tooling, not features for
// every signed-in visitor. Listing the allowed e-mails in VITE_ADMIN_EMAILS
// hides them from everyone else; with the variable unset the links stay
// visible so an existing deployment never locks the owner out.
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined)
  ?.split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDesktopMenu, setShowDesktopMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isAdmin =
    !ADMIN_EMAILS || ADMIN_EMAILS.length === 0
      ? !!user
      : !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A full-screen sheet behind a scrollable page is a classic mobile trap.
  useEffect(() => {
    document.body.style.overflow = showMobileMenu ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileMenu]);

  const handleSignOut = async () => {
    try {
      await signOut();
      onNavigate('home');
      setShowMobileMenu(false);
      setShowDesktopMenu(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setShowMobileMenu(false);
    setShowDesktopMenu(false);
  };

  const requireAuth = (page: string) => {
    if (user) handleNavigate(page);
    else {
      setShowMobileMenu(false);
      setShowAuthModal(true);
    }
  };

  const menuItem =
    'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900';

  return (
    <>
      <nav
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? 'glass-dark border-white/10 shadow-lift'
            : 'border-transparent bg-ink-950'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => handleNavigate('home')}
            className="group flex shrink-0 items-center gap-2.5"
            aria-label="Cesly.pl - strona główna"
          >
            <Logo size={34} className="transition-transform duration-300 group-hover:scale-105" />
            <span className="font-display text-lg font-extrabold tracking-tight text-white">
              Cesly<span className="text-accent-400">.pl</span>
            </span>
          </button>

          <div className="hidden items-center gap-1 md:flex">
            <button
              onClick={() => handleNavigate('home')}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                currentPage === 'home'
                  ? 'bg-white/10 text-white'
                  : 'text-ink-200 hover:bg-white/5 hover:text-white'
              }`}
            >
              Wszystkie cesje
            </button>
            <a
              href="/#jak-to-dziala"
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:bg-white/5 hover:text-white"
            >
              Jak to działa
            </a>
            <a
              href="/#faq"
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:bg-white/5 hover:text-white"
            >
              Pytania
            </a>
          </div>

          <div className="ml-auto hidden items-center gap-2 md:flex">
            {/* Once the hero search has scrolled away, the nav keeps a way back to it. */}
            {scrolled && currentPage === 'home' && (
              <a
                href="/#szukaj"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-ink-200 transition-colors hover:border-white/20 hover:text-white motion-safe:animate-scale-in"
              >
                <Search size={16} />
                <span>Szukaj cesji</span>
              </a>
            )}

            <button
              onClick={() => requireAuth('add-listing')}
              className="flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-600 hover:shadow-glow active:scale-[0.98]"
            >
              <Plus size={18} />
              <span>Dodaj ogłoszenie</span>
              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                gratis
              </span>
            </button>

            <div className="relative">
              <button
                onClick={() => (user ? setShowDesktopMenu(!showDesktopMenu) : setShowAuthModal(true))}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-medium text-ink-100 transition-colors hover:bg-white/5 hover:text-white"
              >
                <User size={18} />
                <span>{user ? 'Moje konto' : 'Zaloguj się'}</span>
                {user && <ChevronDown size={14} className={showDesktopMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />}
              </button>

              {user && showDesktopMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDesktopMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-ink-100 bg-white py-2 shadow-lift motion-safe:animate-scale-in">
                    <p className="truncate px-4 pb-2 text-xs text-ink-400">{user.email}</p>
                    <button onClick={() => handleNavigate('profile')} className={menuItem}>
                      <User size={17} className="text-ink-400" />
                      Mój profil i ogłoszenia
                    </button>
                    <button onClick={() => handleNavigate('profile')} className={menuItem}>
                      <Heart size={17} className="text-ink-400" />
                      Ulubione
                    </button>
                    <button onClick={() => handleNavigate('profile')} className={menuItem}>
                      <MessageSquare size={17} className="text-ink-400" />
                      Wiadomości
                    </button>

                    {isAdmin && (
                      <>
                        <div className="my-1 border-t border-ink-100" />
                        <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                          Narzędzia
                        </p>
                        <button onClick={() => handleNavigate('bulk-import')} className={menuItem}>
                          <Upload size={17} className="text-ink-400" />
                          Masowy import
                        </button>
                        <button onClick={() => handleNavigate('admin-scraping')} className={menuItem}>
                          <Settings size={17} className="text-ink-400" />
                          Admin
                        </button>
                        <button onClick={() => handleNavigate('analytics')} className={menuItem}>
                          <BarChart3 size={17} className="text-ink-400" />
                          Statystyki
                        </button>
                        <button onClick={() => handleNavigate('leady')} className={menuItem}>
                          <Inbox size={17} className="text-ink-400" />
                          Zapytania
                        </button>
                      </>
                    )}

                    <div className="my-1 border-t border-ink-100" />
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-ink-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <LogOut size={17} />
                      Wyloguj
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="ml-auto rounded-xl p-2.5 text-ink-100 transition-colors hover:bg-white/10 md:hidden"
            aria-label={showMobileMenu ? 'Zamknij menu' : 'Otwórz menu'}
            aria-expanded={showMobileMenu}
          >
            {showMobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {showMobileMenu && (
        <div className="fixed inset-0 top-16 z-40 overflow-y-auto bg-ink-950 px-4 py-6 md:hidden">
          <button
            onClick={() => requireAuth('add-listing')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-4 text-base font-semibold text-white"
          >
            <Plus size={20} />
            Dodaj ogłoszenie za darmo
          </button>

          <div className="mt-6 space-y-1">
            <button
              onClick={() => handleNavigate('home')}
              className="w-full rounded-xl px-4 py-3.5 text-left text-base font-medium text-white transition-colors hover:bg-white/5"
            >
              Wszystkie cesje
            </button>
            <a
              href="/#jak-to-dziala"
              onClick={() => setShowMobileMenu(false)}
              className="block rounded-xl px-4 py-3.5 text-base font-medium text-ink-100 transition-colors hover:bg-white/5"
            >
              Jak to działa
            </a>
            <a
              href="/#faq"
              onClick={() => setShowMobileMenu(false)}
              className="block rounded-xl px-4 py-3.5 text-base font-medium text-ink-100 transition-colors hover:bg-white/5"
            >
              Pytania i odpowiedzi
            </a>
          </div>

          <div className="mt-6 border-t border-white/10 pt-6 space-y-1">
            {user ? (
              <>
                <p className="truncate px-4 pb-2 text-xs text-ink-400">{user.email}</p>
                <button
                  onClick={() => handleNavigate('profile')}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-white transition-colors hover:bg-white/5"
                >
                  <User size={20} className="text-ink-300" />
                  Mój profil
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleNavigate('bulk-import')}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-ink-100 transition-colors hover:bg-white/5"
                    >
                      <Upload size={20} className="text-ink-300" />
                      Masowy import
                    </button>
                    <button
                      onClick={() => handleNavigate('admin-scraping')}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-ink-100 transition-colors hover:bg-white/5"
                    >
                      <Settings size={20} className="text-ink-300" />
                      Admin
                    </button>
                    <button
                      onClick={() => handleNavigate('analytics')}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-ink-100 transition-colors hover:bg-white/5"
                    >
                      <BarChart3 size={20} className="text-ink-300" />
                      Statystyki
                    </button>
                    <button
                      onClick={() => handleNavigate('leady')}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-ink-100 transition-colors hover:bg-white/5"
                    >
                      <Inbox size={20} className="text-ink-300" />
                      Zapytania
                    </button>
                  </>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-rose-300 transition-colors hover:bg-rose-500/10"
                >
                  <LogOut size={20} />
                  Wyloguj
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowAuthModal(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 px-4 py-3.5 text-left text-base font-semibold text-white transition-colors hover:bg-white/5"
              >
                <User size={20} />
                Zaloguj się / Zarejestruj
              </button>
            )}
          </div>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
