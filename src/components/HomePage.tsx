import React, { useEffect, useState } from 'react';
import { Search, Star, ChevronDown, ChevronUp, TrendingUp, Shield, Users } from 'lucide-react';
import { supabase, Listing } from '../lib/supabase';
import { ListingCard } from './ListingCard';
import { trackPageView } from '../utils/analytics';

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
  minMileage: string;
  maxMileage: string;
  sortBy: string;
};

export function HomePage({ onViewListing }: HomePageProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    vehicleType: '',
    brand: '',
    model: '',
    minMonthlyPayment: '',
    maxMonthlyPayment: '',
    minTransferFee: '',
    maxTransferFee: '',
    maxRemainingInstallments: '',
    minMileage: '',
    maxMileage: '',
    sortBy: 'newest',
  });

  useEffect(() => {
    document.title = 'Cesly.pl - Cesja leasingu, przejęcie umowy leasingowej | Ogłoszenia z całej Polski';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Cesly.pl to platforma do cesji i przejęcia leasingu samochodów. Znajdź oferty przejęcia umowy leasingowej, odstąp leasing lub przejmij rat leasingowych. Bezpieczne transakcje cesji leasingowych w całej Polsce.');
    }
    trackPageView('home');
  }, []);

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

      if (filters.minMileage) {
        query = query.gte('mileage', parseInt(filters.minMileage));
      }

      if (filters.maxMileage) {
        query = query.lte('mileage', parseInt(filters.maxMileage));
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
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30">
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-amber-100/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 text-center">
          <div className="inline-block mb-4">
            <img
              src="/cesly_logo_fixed.png"
              alt="Cesly.pl"
              className="h-16 md:h-20 mx-auto"
            />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Największa baza cesji leasingów w Polsce
            </h1>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                <span className="font-semibold">+120 aktywnych ogłoszeń</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                <span className="font-semibold">+500 użytkowników</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full mb-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5">Największa oferta</h3>
            <p className="text-xs text-gray-600">Tysiące aktywnych ogłoszeń cesji leasingu w jednym miejscu</p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full mb-2">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5">Bezpieczne transakcje</h3>
            <p className="text-xs text-gray-600">Weryfikowane ogłoszenia i bezpieczny kontakt z właścicielami</p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full mb-2">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5">Sprawdzona społeczność</h3>
            <p className="text-xs text-gray-600">Dołącz do setek zadowolonych użytkowników platformy</p>
          </div>
        </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg mb-8 border border-gray-200/50">
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Typ pojazdu
              </label>
              <select
                value={filters.vehicleType}
                onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
              >
                <option value="">Wszystkie</option>
                <option value="samochód">Samochód</option>
                <option value="motocykl">Motocykl</option>
                <option value="łódź">Łódź</option>
                <option value="inne">Inne</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Marka
              </label>
              <input
                type="text"
                value={filters.brand}
                onChange={(e) => handleFilterChange('brand', e.target.value)}
                placeholder="np. BMW, Audi..."
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Model
              </label>
              <input
                type="text"
                value={filters.model}
                onChange={(e) => handleFilterChange('model', e.target.value)}
                placeholder="np. X5, A4..."
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 mt-4 transition-colors"
          >
            {showAdvancedFilters ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Ukryj zaawansowane filtry</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Pokaż zaawansowane filtry</span>
              </>
            )}
          </button>

          {showAdvancedFilters && (
            <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Rata miesięczna (min)
              </label>
              <input
                type="number"
                value={filters.minMonthlyPayment}
                onChange={(e) => handleFilterChange('minMonthlyPayment', e.target.value)}
                placeholder="Od"
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Rata miesięczna (max)
              </label>
              <input
                type="number"
                value={filters.maxMonthlyPayment}
                onChange={(e) => handleFilterChange('maxMonthlyPayment', e.target.value)}
                placeholder="Do"
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Max. pozostałe raty
              </label>
              <input
                type="number"
                value={filters.maxRemainingInstallments}
                onChange={(e) => handleFilterChange('maxRemainingInstallments', e.target.value)}
                placeholder="Bez limitu"
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Sortowanie
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
              >
                <option value="newest">Najnowsze</option>
                <option value="oldest">Najstarsze</option>
                <option value="price_asc">Rata: rosnąco</option>
                <option value="price_desc">Rata: malejąco</option>
                <option value="installments_asc">Najmniej rat</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5 mt-3 border-t border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Min. odstępne (zł)
              </label>
              <input
                type="number"
                value={filters.minTransferFee}
                onChange={(e) => handleFilterChange('minTransferFee', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Max. odstępne (zł)
              </label>
              <input
                type="number"
                value={filters.maxTransferFee}
                onChange={(e) => handleFilterChange('maxTransferFee', e.target.value)}
                placeholder="Bez limitu"
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5 mt-3 border-t border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Min. przebieg (km)
              </label>
              <input
                type="number"
                value={filters.minMileage}
                onChange={(e) => handleFilterChange('minMileage', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Max. przebieg (km)
              </label>
              <input
                type="number"
                value={filters.maxMileage}
                onChange={(e) => handleFilterChange('maxMileage', e.target.value)}
                placeholder="Bez limitu"
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          <p className="mt-4 text-gray-700">Ładowanie ofert...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-700 text-lg">Brak ofert spełniających kryteria</p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Aktualne oferty przejęcia leasingu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onView={() => onViewListing(listing.id)}
              />
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
