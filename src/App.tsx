import { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { HomePage } from './components/HomePage';
import { ListingDetailPage } from './components/ListingDetailPage';
import { AddListingPage } from './components/AddListingPage';
import { ProfilePage } from './components/ProfilePage';
import AdminScrapingPage from './components/AdminScrapingPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import BulkImportPage from './components/BulkImportPage';
import BookmarkletPage from './components/BookmarkletPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { Listing } from './lib/supabase';

type Page = 'home' | 'listing-detail' | 'add-listing' | 'profile' | 'admin-scraping' | 'reset-password' | 'bulk-import' | 'bookmarklet' | 'analytics';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    if (path === '/reset-password' || (hash && hash.includes('type=recovery'))) {
      setCurrentPage('reset-password');
    } else if (path.startsWith('/listing/')) {
      const pathParts = path.split('/listing/');
      if (pathParts.length > 1) {
        const id = pathParts[1].split('?')[0];
        if (id) {
          setSelectedListingId(id);
          setCurrentPage('listing-detail');
        }
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
    } else {
      setCurrentPage('home');
    }

    const handlePopState = () => {
      const newPath = window.location.pathname;
      const newHash = window.location.hash;
      if (newPath === '/reset-password' || (newHash && newHash.includes('type=recovery'))) {
        setCurrentPage('reset-password');
      } else if (newPath.startsWith('/listing/')) {
        const pathParts = newPath.split('/listing/');
        if (pathParts.length > 1) {
          const id = pathParts[1].split('?')[0];
          if (id) {
            setSelectedListingId(id);
            setCurrentPage('listing-detail');
          }
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

  return (
    <div className="min-h-screen bg-slate-950">
      <Navigation currentPage={currentPage} onNavigate={handleNavigate} />

      {currentPage === 'home' && <HomePage onViewListing={handleViewListing} />}

      {currentPage === 'listing-detail' && selectedListingId && (
        <ListingDetailPage
          listingId={selectedListingId}
          onBack={() => handleNavigate('home')}
          onEdit={handleEditListing}
        />
      )}

      {currentPage === 'add-listing' && (
        <AddListingPage
          onBack={() => handleNavigate('home')}
          onSuccess={handleAddListingSuccess}
          editingListing={editingListing}
        />
      )}

      {currentPage === 'profile' && <ProfilePage onViewListing={handleViewListing} />}

      {currentPage === 'admin-scraping' && <AdminScrapingPage />}

      {currentPage === 'bulk-import' && <BulkImportPage />}

      {currentPage === 'bookmarklet' && <BookmarkletPage />}

      {currentPage === 'analytics' && <AnalyticsPage />}

      {currentPage === 'reset-password' && <ResetPasswordPage />}
    </div>
  );
}

export default App;
