import React, { useEffect, useState } from 'react';
import { User, FileText, Heart, Clock, Trash2, File as FileEdit } from 'lucide-react';
import { supabase, Listing } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ListingCard } from './ListingCard';

type ProfilePageProps = {
  onViewListing: (id: string) => void;
};

type Tab = 'my-listings' | 'drafts' | 'favorites' | 'recent';

export function ProfilePage({ onViewListing }: ProfilePageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('my-listings');
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [draftListings, setDraftListings] = useState<Listing[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (activeTab === 'my-listings') {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMyListings(data || []);
      } else if (activeTab === 'drafts') {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'draft')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDraftListings(data || []);
      } else if (activeTab === 'favorites') {
        const { data: favorites, error: favError } = await supabase
          .from('favorites')
          .select('listing_id')
          .eq('user_id', user.id);

        if (favError) throw favError;

        if (favorites && favorites.length > 0) {
          const listingIds = favorites.map((f) => f.listing_id);
          const { data: listings, error: listError } = await supabase
            .from('listings')
            .select('*')
            .in('id', listingIds);

          if (listError) throw listError;
          setFavoriteListings(listings || []);
        } else {
          setFavoriteListings([]);
        }
      } else if (activeTab === 'recent') {
        const { data: recentViews, error: viewError } = await supabase
          .from('recent_views')
          .select('listing_id, viewed_at')
          .eq('user_id', user.id)
          .order('viewed_at', { ascending: false })
          .limit(20);

        if (viewError) throw viewError;

        if (recentViews && recentViews.length > 0) {
          const listingIds = recentViews.map((v) => v.listing_id);
          const { data: listings, error: listError } = await supabase
            .from('listings')
            .select('*')
            .in('id', listingIds);

          if (listError) throw listError;

          const sortedListings = listingIds
            .map((id) => listings?.find((l) => l.id === id))
            .filter(Boolean) as Listing[];

          setRecentListings(sortedListings);
        } else {
          setRecentListings([]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to ogłoszenie?')) return;

    try {
      const { error } = await supabase.from('listings').delete().eq('id', listingId);

      if (error) throw error;

      setMyListings((prev) => prev.filter((l) => l.id !== listingId));
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Nie udało się usunąć ogłoszenia');
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-gray-600 text-lg">
          Musisz być zalogowany, aby zobaczyć profil
        </p>
      </div>
    );
  }

  const tabs = [
    { id: 'my-listings' as Tab, label: 'Moje ogłoszenia', icon: FileText },
    { id: 'drafts' as Tab, label: 'Szkice', icon: FileEdit },
    { id: 'favorites' as Tab, label: 'Ulubione', icon: Heart },
    { id: 'recent' as Tab, label: 'Ostatnio oglądane', icon: Clock },
  ];

  const getCurrentListings = () => {
    switch (activeTab) {
      case 'my-listings':
        return myListings;
      case 'drafts':
        return draftListings;
      case 'favorites':
        return favoriteListings;
      case 'recent':
        return recentListings;
      default:
        return [];
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 rounded-full p-3 mr-4">
            <User size={32} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mój Profil</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Ładowanie...</p>
            </div>
          ) : getCurrentListings().length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                {activeTab === 'my-listings' && 'Nie masz jeszcze żadnych ogłoszeń'}
                {activeTab === 'drafts' && 'Nie masz żadnych szkiców'}
                {activeTab === 'favorites' && 'Nie masz jeszcze ulubionych ogłoszeń'}
                {activeTab === 'recent' && 'Nie oglądałeś jeszcze żadnych ogłoszeń'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getCurrentListings().map((listing) => (
                <div key={listing.id} className="relative">
                  <ListingCard listing={listing} onView={() => onViewListing(listing.id)} />
                  {(activeTab === 'my-listings' || activeTab === 'drafts') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteListing(listing.id);
                      }}
                      className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition shadow-lg"
                      title="Usuń ogłoszenie"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
