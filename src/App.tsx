import { useState, useEffect, lazy, Suspense } from 'react';
import { Navigation } from './components/Navigation';
import { HomePage } from './components/HomePage';
import { ListingDetailPage } from './components/ListingDetailPage';
import { Footer } from './components/Footer';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { Listing } from './lib/supabase';

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

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
    </div>
  );
}

type Page = 'home' | 'listing-detail' | 'add-listing' | 'profile' | 'admin-scraping' | 'reset-password' | 'bulk-import' | 'bookmarklet' | 'analytics' | 'regulamin' | 'polityka-prywatnosci';

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

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    if (path === '/reset-password' || (hash && hash.includes('type=recovery'))) {
      setCurrentPage('reset-password');
    } else if (parseListingId(path, hash)) {
      const id = parseListingId(path, hash);
      if (id) {
        setSelectedListingId(id);
        setCurrentPage('listing-detail');
      }
    } else if (path === '/add') {
      setCurrentPage('add-listing');
    } else if (path === '/profile') {
      setCurrentPage('profile');
    } else if (path === '/admin-scraping') {
      setCurrentPage('admin-scraping');
    } else if (path === '/bulk-import') {
      setCurrentPage('bulk-import');
    } else if (path === '/facebook-import') {
      setCurrentPage('bookmarklet');
    } else if (path === '/analytics') {
      setCurrentPage('analytics');
    } else if (path === '/regulamin') {
      setCurrentPage('regulamin');
    } else if (path === '/polityka-prywatnosci') {
      setCurrentPage('polityka-prywatnosci');
    } else {
      setCurrentPage('home');
    }

    const handlePopState = () => {
      const newPath = window.location.pathname;
      const newHash = window.location.hash;
      if (newPath === '/reset-password' || (newHash && newHash.includes('type=recovery'))) {
        setCurrentPage('reset-password');
      } else if (parseListingId(newPath, newHash)) {
        const id = parseListingId(newPath, newHash);
        if (id) {
          setSelectedListingId(id);
          setCurrentPage('listing-detail');
        }
      } else if (newPath === '/add') {
        setCurrentPage('add-listing');
      } else if (newPath === '/profile') {
        setCurrentPage('profile');
      } else if (newPath === '/admin-scraping') {
        setCurrentPage('admin-scraping');
      } else if (newPath === '/bulk-import') {
        setCurrentPage('bulk-import');
      } else if (newPath === '/facebook-import') {
        setCurrentPage('bookmarklet');
      } else if (newPath === '/analytics') {
        setCurrentPage('analytics');
      } else if (newPath === '/regulamin') {
        setCurrentPage('regulamin');
      } else if (newPath === '/polityka-prywatnosci') {
        setCurrentPage('polityka-prywatnosci');
      } else {
        setCurrentPage('home');
        setSelectedListingId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);

    let url = '/';
    if (page === 'add-listing') url = '/add';
    else if (page === 'profile') url = '/profile';
    else if (page === 'admin-scraping') url = '/admin-scraping';
    else if (page === 'bulk-import') url = '/bulk-import';
    else if (page === 'bookmarklet') url = '/facebook-import';
    else if (page === 'analytics') url = '/analytics';
    else if (page === 'regulamin') url = '/regulamin';
    else if (page === 'polityka-prywatnosci') url = '/polityka-prywatnosci';

    window.history.pushState({}, '', url);

    if (page !== 'listing-detail') {
      setSelectedListingId(null);
    }
    if (page !== 'add-listing') {
      setEditingListing(null);
    }
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
    setCurrentPage('home');
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navigation currentPage={currentPage} onNavigate={handleNavigate} />

      {currentPage === 'home' && <HomePage onViewListing={handleViewListing} initialFilters={pendingHomeFilters} onNavigate={handleNavigate} />}

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

        {currentPage === 'reset-password' && <ResetPasswordPage />}

        {currentPage === 'regulamin' && <RegulaminPage />}

        {currentPage === 'polityka-prywatnosci' && <PolitykaPrywatnosciPage />}
      </Suspense>

      <Footer onNavigate={handleNavigate} onApplyFilters={handleApplySavedSearch} />
      <CookieConsentBanner />
    </div>
  );
}

export default App;
