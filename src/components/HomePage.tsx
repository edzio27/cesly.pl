import React, { useEffect, useState } from 'react';
import { Search, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase, Listing } from '../lib/supabase';
import { ListingCard } from './ListingCard';

type HomePageProps = {
  onViewListing: (id: string) => void;
};

type Filters = {
  vehicleType: string;
  brand: string;
  model: string;
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
    brand: '',
    model: '',
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

      if (filters.brand) {
        query = query.ilike('brand', `%${filters.brand}%`);
      }

      if (filters.model) {
        query = query.ilike('model', `%${filters.model}%`);
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
          query = query.order('updated_at', { ascending: false });
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
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/40 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-orange-500/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 text-center">
          <div className="inline-block mb-4">
            <img
              src="/cesly_logo_transparent_clean.png"
              alt="Cesly.pl"
              className="h-32 md:h-40 mx-auto"
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-300 max-w-2xl mx-auto">
              Znajdź najlepsze oferty cesji leasingowych samochodów, motocykli i łodzi
            </p>
          </div>
        </div>

      <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-xl mb-8 border border-slate-700/50">
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-200 mb-2">
                Typ pojazdu
              </label>
              <select
                value={filters.vehicleType}
                onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-100"
              >
                <option value="">Wszystkie</option>
                <option value="samochód">Samochód</option>
                <option value="motocykl">Motocykl</option>
                <option value="łódź">Łódź</option>
                <option value="inne">Inne</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-200 mb-2">
                Marka
              </label>
              <input
                type="text"
                value={filters.brand}
                onChange={(e) => handleFilterChange('brand', e.target.value)}
                placeholder="np. BMW, Audi..."
                className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-100 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-200 mb-2">
                Model
              </label>
              <input
                type="text"
                value={filters.model}
                onChange={(e) => handleFilterChange('model', e.target.value)}
                placeholder="np. X5, A4..."
                className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-100 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-200 mb-2">
                Rata miesięczna (min)
              </label>
              <input
                type="number"
                value={filters.minMonthlyPayment}
                onChange={(e) => handleFilterChange('minMonthlyPayment', e.target.value)}
                placeholder="Od"
                className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-100 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-200 mb-2">
                Rata miesięczna (max)
              </label>
              <input
                type="number"
                value={filters.maxMonthlyPayment}
                onChange={(e) => handleFilterChange('maxMonthlyPayment', e.target.value)}
                placeholder="Do"
                className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-100 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-200 mb-2">
                Max. pozostałe raty
              </label>
              <input
                type="number"
                value={filters.maxRemainingInstallments}
                onChange={(e) => handleFilterChange('maxRemainingInstallments', e.target.value)}
                placeholder="Bez limitu"
                className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-100 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-200 mb-2">
                Sortowanie
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-100"
              >
                <option value="newest">Najnowsze</option>
                <option value="oldest">Najstarsze</option>
                <option value="price_asc">Rata: rosnąco</option>
                <option value="price_desc">Rata: malejąco</option>
                <option value="installments_asc">Najmniej rat</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
            <div>
              <label className="block text-xs font-semibold text-gray-200 mb-2">
                Min. odstępne (zł)
              </label>
              <input
                type="number"
                value={filters.minTransferFee}
                onChange={(e) => handleFilterChange('minTransferFee', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-100 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-200 mb-2">
                Max. odstępne (zł)
              </label>
              <input
                type="number"
                value={filters.maxTransferFee}
                onChange={(e) => handleFilterChange('maxTransferFee', e.target.value)}
                placeholder="Bez limitu"
                className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-100 placeholder-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-gray-300">Ładowanie ofert...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-300 text-lg">Brak ofert spełniających kryteria</p>
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
