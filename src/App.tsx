import { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { HomePage } from './components/HomePage';
import { ListingDetailPage } from './components/ListingDetailPage';
import { AddListingPage } from './components/AddListingPage';
import { ProfilePage } from './components/ProfilePage';
import AdminScrapingPage from './components/AdminScrapingPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import { Listing } from './lib/supabase';

type Page = 'home' | 'listing-detail' | 'add-listing' | 'profile' | 'admin-scraping' | 'reset-password';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    if (path.startsWith('/listing/')) {
      const id = path.split('/listing/')[1];
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
    } else if (path === '/reset-password') {
      setCurrentPage('reset-password');
    } else {
      setCurrentPage('home');
    }

    const handlePopState = () => {
      const newPath = window.location.pathname;
      if (newPath.startsWith('/listing/')) {
        const id = newPath.split('/listing/')[1];
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
      } else if (newPath === '/reset-password') {
        setCurrentPage('reset-password');
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

      {currentPage === 'reset-password' && <ResetPasswordPage />}
    </div>
  );
}

export default App;
