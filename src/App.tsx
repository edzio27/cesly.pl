import { useState } from 'react';
import { Navigation } from './components/Navigation';
import { HomePage } from './components/HomePage';
import { ListingDetailPage } from './components/ListingDetailPage';
import { AddListingPage } from './components/AddListingPage';
import { ProfilePage } from './components/ProfilePage';
import AdminScrapingPage from './components/AdminScrapingPage';

type Page = 'home' | 'listing-detail' | 'add-listing' | 'profile' | 'admin-scraping';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    if (page !== 'listing-detail') {
      setSelectedListingId(null);
    }
  };

  const handleViewListing = (id: string) => {
    setSelectedListingId(id);
    setCurrentPage('listing-detail');
  };

  const handleAddListingSuccess = () => {
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
        />
      )}

      {currentPage === 'add-listing' && (
        <AddListingPage
          onBack={() => handleNavigate('home')}
          onSuccess={handleAddListingSuccess}
        />
      )}

      {currentPage === 'profile' && <ProfilePage onViewListing={handleViewListing} />}

      {currentPage === 'admin-scraping' && <AdminScrapingPage />}
    </div>
  );
}

export default App;
