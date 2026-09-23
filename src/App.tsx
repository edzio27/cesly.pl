import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Navigation } from './components/Navigation';
import { HomePage } from './components/HomePage';
import { ListingDetailPage } from './components/ListingDetailPage';
import { Footer } from './components/Footer';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { Analytics } from '@vercel/analytics/react';
import { Listing } from './lib/supabase';
import {
  CATEGORY_PATH_PREFIX,
  SeoCategory,
  categoryToFilters,
  findCategory,
  parseCategorySlug,
} from './data/seoCategories';

// Only the homepage and listing pages need to be in the critical bundle -
// they're the pages Google indexes. Everything else (auth-gated tools,
// admin utilities) loads on demand to keep the initial JS payload small,
// which helps Core Web Vitals (a Google ranking signal).
const AddListingPage = lazy(() => import('./components/AddListingPage').then(m => ({ default: m.AddListingPage })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AdminScrapingPage = lazy(() => import('./components/AdminScrapingPage'));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage'));
const BulkImportPage = lazy(() => import('./components/BulkImportPage'));
const BookmarkletPage = lazy(() => import('./components/BookmarkletPage'));
const AnalyticsPage = lazy(() => import('./components/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const RegulaminPage = lazy(() => import('./components/RegulaminPage'));
const PolitykaPrywatnosciPage = lazy(() => import('./components/PolitykaPrywatnosciPage'));
const LeadsPage = lazy(() => import('./components/LeadsPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink-200 border-t-accent-500"></div>
    </div>
  );
}

type Page = 'home' | 'listing-detail' | 'add-listing' | 'profile' | 'admin-scraping' | 'reset-password' | 'bulk-import' | 'bookmarklet' | 'analytics' | 'regulamin' | 'polityka-prywatnosci' | 'leady';

/** Ścieżki bez parametrów — jedna tablica zamiast dwóch drabinek `else if`. */
const STATIC_ROUTES: Record<string, Page> = {
  '/add': 'add-listing',
  '/profile': 'profile',
  '/admin-scraping': 'admin-scraping',
  '/bulk-import': 'bulk-import',
  '/facebook-import': 'bookmarklet',
  '/analytics': 'analytics',
  '/leady': 'leady',
  '/regulamin': 'regulamin',
  '/polityka-prywatnosci': 'polityka-prywatnosci',
};

const PAGE_PATHS: Partial<Record<Page, string>> = Object.fromEntries(
  Object.entries(STATIC_ROUTES).map(([path, page]) => [page, path]),
);

// Legacy/CDN-cached crawler redirects may still point at the hash form
// (#/listing/{id}) instead of the real path. Accept both so no visitor
// coming from an old cached link ends up stranded on the homepage.
function parseListingId(path: string, hash: string): string | null {
  if (path.startsWith('/listing/')) {
    const id = path.split('/listing/')[1]?.split('?')[0];
    return id || null;
  }
  const hashMatch = hash.match(/^#\/listing\/([^/?]+)/);
  return hashMatch ? hashMatch[1] : null;
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [pendingHomeFilters, setPendingHomeFilters] = useState<Record<string, string> | undefined>(undefined);
  // HomePage seeds its filter state once, on mount. Bumping this key remounts
  // it so footer category links work while the homepage is already open.
  const [homeFiltersKey, setHomeFiltersKey] = useState(0);
  // Strona kategorii (/cesja-leasingu/<slug>) to ta sama HomePage z nałożonym
  // filtrem i własnym H1 — dzięki temu crawler i użytkownik widzą tę samą listę.
  const [category, setCategory] = useState<SeoCategory | null>(null);

  const applyRoute = useCallback((path: string, hash: string) => {
    const listingId = parseListingId(path, hash);
    const nextCategory = findCategory(parseCategorySlug(path));

    setSelectedListingId(listingId);
    setCategory(nextCategory);

    if (path === '/reset-password' || (hash && hash.includes('type=recovery'))) {
      setCurrentPage('reset-password');
    } else if (listingId) {
      setCurrentPage('listing-detail');
    } else {
      setCurrentPage(STATIC_ROUTES[path] ?? 'home');
    }
  }, []);

  useEffect(() => {
    applyRoute(window.location.pathname, window.location.hash);

    const handlePopState = () => applyRoute(window.location.pathname, window.location.hash);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyRoute]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
    setCategory(null);

    window.history.pushState({}, '', PAGE_PATHS[page as Page] ?? '/');

    if (page !== 'listing-detail') {
      setSelectedListingId(null);
    }
    if (page !== 'add-listing') {
      setEditingListing(null);
    }
    window.scrollTo({ top: 0 });
  };

  const handleNavigateCategory = (slug: string) => {
    const next = findCategory(slug);
    if (!next) return;

    setCategory(next);
    setPendingHomeFilters(undefined);
    setCurrentPage('home');
    setSelectedListingId(null);
    window.history.pushState({}, '', `${CATEGORY_PATH_PREFIX}${slug}`);
    window.scrollTo({ top: 0 });
  };

  const handleViewListing = (id: string) => {
    setSelectedListingId(id);
    setCurrentPage('listing-detail');
    window.history.pushState({}, '', `/listing/${id}`);
  };

  const handleEditListing = (listing: Listing) => {
    setEditingListing(listing);
    setCurrentPage('add-listing');
    window.history.pushState({}, '', '/add');
  };

  const handleAddListingSuccess = () => {
    setEditingListing(null);
    setCurrentPage('profile');
    window.history.pushState({}, '', '/profile');
  };

  const handleApplySavedSearch = (filters: Record<string, string>) => {
    setPendingHomeFilters(filters);
    setHomeFiltersKey((key) => key + 1);
    setCategory(null);
    setCurrentPage('home');
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-canvas-muted">
      <Navigation currentPage={currentPage} onNavigate={handleNavigate} />

      {currentPage === 'home' && (
        // Slug wchodzi w klucz, żeby przejście między kategoriami przeładowało
        // filtry — HomePage czyta `initialFilters` tylko przy montowaniu.
        <HomePage
          key={`${homeFiltersKey}-${category?.slug ?? ''}`}
          onViewListing={handleViewListing}
          initialFilters={category ? categoryToFilters(category) : pendingHomeFilters}
          category={category}
          onNavigate={handleNavigate}
          onNavigateCategory={handleNavigateCategory}
        />
      )}

      {currentPage === 'listing-detail' && selectedListingId && (
        <ListingDetailPage
          listingId={selectedListingId}
          onBack={() => handleNavigate('home')}
          onEdit={handleEditListing}
          onViewListing={handleViewListing}
        />
      )}

      <Suspense fallback={<PageLoader />}>
        {currentPage === 'add-listing' && (
          <AddListingPage
            onBack={() => handleNavigate('home')}
            onSuccess={handleAddListingSuccess}
            editingListing={editingListing}
          />
        )}

        {currentPage === 'profile' && (
          <ProfilePage onViewListing={handleViewListing} onApplySavedSearch={handleApplySavedSearch} />
        )}

        {currentPage === 'admin-scraping' && <AdminScrapingPage />}

        {currentPage === 'bulk-import' && <BulkImportPage />}

        {currentPage === 'bookmarklet' && <BookmarkletPage />}

        {currentPage === 'analytics' && <AnalyticsPage />}

        {currentPage === 'leady' && <LeadsPage />}

        {currentPage === 'reset-password' && <ResetPasswordPage />}

        {currentPage === 'regulamin' && <RegulaminPage />}

        {currentPage === 'polityka-prywatnosci' && <PolitykaPrywatnosciPage />}
      </Suspense>

      <Footer onNavigate={handleNavigate} onNavigateCategory={handleNavigateCategory} />
      <CookieConsentBanner />
      {/* Pakiet był w package.json od dawna, ale nigdzie nie renderowany —
          czyli nie zbierał nic. Vercel Web Analytics nie używa cookies ani
          identyfikatorów zapisywanych na urządzeniu, więc działa niezależnie
          od banera; własne liczniki w `analytics.ts` nadal wymagają zgody. */}
      <Analytics />
    </div>
  );
}

export default App;
