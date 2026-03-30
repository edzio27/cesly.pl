import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Heart,
  Calendar,
  DollarSign,
  TrendingUp,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { supabase, Listing } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type ListingDetailPageProps = {
  listingId: string;
  onBack: () => void;
};

export function ListingDetailPage({ listingId, onBack }: ListingDetailPageProps) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    fetchListing();
    if (user) {
      checkFavorite();
      addRecentView();
    }
  }, [listingId, user]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .maybeSingle();

      if (error) throw error;
      setListing(data);
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle();

      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const addRecentView = async () => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('recent_views')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('recent_views')
          .delete()
          .eq('id', existing.id);
      }

      await supabase.from('recent_views').insert({
        user_id: user.id,
        listing_id: listingId,
      });
    } catch (error) {
      console.error('Error adding recent view:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      alert('Musisz być zalogowany, aby dodać do ulubionych');
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
        setIsFavorite(false);
      } else {
        await supabase.from('favorites').insert({
          user_id: user.id,
          listing_id: listingId,
        });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Powrót
        </button>
        <p className="text-center text-gray-600 text-lg">Ogłoszenie nie zostało znalezione</p>
      </div>
    );
  }

  const images = listing.images && listing.images.length > 0
    ? listing.images
    : ['https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1200'];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={onBack}
        className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Powrót do listy
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {listing.is_promoted && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 text-sm font-semibold flex items-center">
            <Star size={18} className="mr-2" fill="currentColor" />
            Oferta Promowana
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          <div>
            <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4">
              <img
                src={images[currentImageIndex]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-75 hover:bg-opacity-100 rounded-full p-2 transition"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-75 hover:bg-opacity-100 rounded-full p-2 transition"
                  >
                    <ChevronRight size={24} />
                  </button>

                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.slice(0, 5).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`aspect-video rounded overflow-hidden border-2 transition ${
                      currentImageIndex === idx
                        ? 'border-blue-600'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{listing.title}</h1>
              <button
                onClick={toggleFavorite}
                className={`p-2 rounded-full transition ${
                  isFavorite
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Heart size={24} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                {listing.vehicle_type}
              </span>
              <span className="inline-block ml-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                {listing.brand} {listing.model} ({listing.year})
              </span>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Parametry finansowe
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Rata miesięczna:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {listing.monthly_payment.toLocaleString('pl-PL')} zł
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Odstępne:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {listing.transfer_fee.toLocaleString('pl-PL')} zł
                  </span>
                </div>

                {listing.buyout_price && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Cena wykupu:</span>
                    <span className="text-xl font-bold text-gray-900">
                      {listing.buyout_price.toLocaleString('pl-PL')} zł
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-blue-200">
                  <span className="text-gray-700 font-medium">Pozostałe raty:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {listing.remaining_installments} z {listing.total_installments}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Opis</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
            </div>

            <div className="flex items-center text-sm text-gray-500">
              <Calendar size={16} className="mr-2" />
              Dodano: {new Date(listing.created_at).toLocaleDateString('pl-PL')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
