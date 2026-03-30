import React, { useEffect, useState } from 'react';
import { Search, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase, Listing } from '../lib/supabase';
import { ListingCard } from './ListingCard';

type HomePageProps = {
  onViewListing: (id: string) => void;
};

type Filters = {
  vehicleType: string;
  minMonthlyPayment: string;
  maxMonthlyPayment: string;
  minTransferFee: string;
  maxTransferFee: string;
  maxRemainingInstallments: string;
  sortBy: string;
};

export function HomePage({ onViewListing }: HomePageProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    vehicleType: '',
    minMonthlyPayment: '',
    maxMonthlyPayment: '',
    minTransferFee: '',
    maxTransferFee: '',
    maxRemainingInstallments: '',
    sortBy: 'newest',
  });

  useEffect(() => {
    fetchListings();
  }, [filters]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase.from('listings').select('*');

      if (filters.vehicleType) {
        query = query.eq('vehicle_type', filters.vehicleType);
      }

      if (filters.minMonthlyPayment) {
        query = query.gte('monthly_payment', parseFloat(filters.minMonthlyPayment));
      }

      if (filters.maxMonthlyPayment) {
        query = query.lte('monthly_payment', parseFloat(filters.maxMonthlyPayment));
      }

      if (filters.minTransferFee) {
        query = query.gte('transfer_fee', parseFloat(filters.minTransferFee));
      }

      if (filters.maxTransferFee) {
        query = query.lte('transfer_fee', parseFloat(filters.maxTransferFee));
      }

      if (filters.maxRemainingInstallments) {
        query = query.lte('remaining_installments', parseInt(filters.maxRemainingInstallments));
      }

      switch (filters.sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'price_asc':
          query = query.order('monthly_payment', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('monthly_payment', { ascending: false });
          break;
        case 'installments_asc':
          query = query.order('remaining_installments', { ascending: true });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      const promoted = data?.filter((l) => l.is_promoted) || [];
      const regular = data?.filter((l) => !l.is_promoted) || [];
      setListings([...promoted, ...regular]);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-300/40 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-amber-300/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 text-center">
          <div className="inline-block mb-4 relative">
            <h1 className="text-6xl md:text-7xl font-black mb-2 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent"
                style={{
                  filter: 'drop-shadow(0 2px 8px rgba(217, 119, 6, 0.3))',
                  letterSpacing: '-0.02em'
                }}>
              Cesly.pl
            </h1>
            <div className="absolute -bottom-0.5 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full opacity-70"></div>
          </div>
          <div className="space-y-1">
            <p className="text-xl md:text-2xl font-bold text-amber-900">
              Marketplace Cesji Pojazdów
            </p>
            <p className="text-sm text-amber-700/80 max-w-2xl mx-auto">
              Znajdź najlepsze oferty cesji leasingowych samochodów, motocykli i łodzi
            </p>
          </div>
        </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg mb-8 border border-amber-200/50">
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-2">
                Typ pojazdu
              </label>
              <select
                value={filters.vehicleType}
                onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-gray-900"
              >
                <option value="">Wszystkie</option>
                <option value="samochód">Samochód</option>
                <option value="motocykl">Motocykl</option>
                <option value="łódź">Łódź</option>
                <option value="inne">Inne</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-2">
                Rata miesięczna (min)
              </label>
              <input
                type="number"
                value={filters.minMonthlyPayment}
                onChange={(e) => handleFilterChange('minMonthlyPayment', e.target.value)}
                placeholder="Od"
                className="w-full px-3 py-2.5 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-gray-900 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-2">
                Rata miesięczna (max)
              </label>
              <input
                type="number"
                value={filters.maxMonthlyPayment}
                onChange={(e) => handleFilterChange('maxMonthlyPayment', e.target.value)}
                placeholder="Do"
                className="w-full px-3 py-2.5 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-gray-900 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-2">
                Sortowanie
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-gray-900"
              >
                <option value="newest">Najnowsze</option>
                <option value="oldest">Najstarsze</option>
                <option value="price_asc">Rata: rosnąco</option>
                <option value="price_desc">Rata: malejąco</option>
                <option value="installments_asc">Najmniej rat</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-amber-200/50">
            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-2">
                Min. odstępne (zł)
              </label>
              <input
                type="number"
                value={filters.minTransferFee}
                onChange={(e) => handleFilterChange('minTransferFee', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-gray-900 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-2">
                Max. odstępne (zł)
              </label>
              <input
                type="number"
                value={filters.maxTransferFee}
                onChange={(e) => handleFilterChange('maxTransferFee', e.target.value)}
                placeholder="Bez limitu"
                className="w-full px-3 py-2.5 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-gray-900 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-2">
                Max. pozostałe raty
              </label>
              <input
                type="number"
                value={filters.maxRemainingInstallments}
                onChange={(e) => handleFilterChange('maxRemainingInstallments', e.target.value)}
                placeholder="Bez limitu"
                className="w-full px-3 py-2.5 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          <p className="mt-4 text-amber-700">Ładowanie ofert...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-amber-700 text-lg">Brak ofert spełniających kryteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onView={() => onViewListing(listing.id)}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
