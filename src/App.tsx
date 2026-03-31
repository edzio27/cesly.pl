import { useState } from 'react';
import { Navigation } from './components/Navigation';
import { HomePage } from './components/HomePage';
import { ListingDetailPage } from './components/ListingDetailPage';
import { AddListingPage } from './components/AddListingPage';
import { ProfilePage } from './components/ProfilePage';
import AdminScrapingPage from './components/AdminScrapingPage';
import { Listing } from './lib/supabase';

type Page = 'home' | 'listing-detail' | 'add-listing' | 'profile' | 'admin-scraping';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
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
  };

  const handleEditListing = (listing: Listing) => {
    setEditingListing(listing);
    setCurrentPage('add-listing');
  };

  const handleAddListingSuccess = () => {
    setEditingListing(null);
    setCurrentPage('profile');
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
    </div>
  );
}

export default App;
