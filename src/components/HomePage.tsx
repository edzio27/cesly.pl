import React, { useEffect, useState } from 'react';
import { Search, Star, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, TrendingUp, Shield, Users } from 'lucide-react';
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

const ITEMS_PER_PAGE = 21;

export function HomePage({ onViewListing }: HomePageProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
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

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

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
  }, [filters, currentPage]);

  useEffect(() => {
    if (currentPage > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from('listings').select('*', { count: 'exact' });

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

      query = query.order('is_promoted', { ascending: false });

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

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setListings(data || []);
      setTotalItems(count || 0);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const generatePageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const showPages = 5;

    if (totalPages <= showPages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30">
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-amber-100/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 text-center">
          <div className="inline-block mb-3">
            <img
              src="/cesly_logo_fixed.png"
              alt="Cesly.pl"
              className="h-12 md:h-16 mx-auto"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Największa baza cesji leasingów w Polsce
            </h1>
            <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span className="font-semibold">+120 aktywnych ogłoszeń</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="font-semibold">+500 użytkowników</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50 text-center">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-amber-100 rounded-full mb-1.5">
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Największa oferta</h3>
            <p className="text-[10px] text-gray-600">Tysiące aktywnych ogłoszeń cesji leasingu w jednym miejscu</p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50 text-center">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-amber-100 rounded-full mb-1.5">
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Bezpieczne transakcje</h3>
            <p className="text-[10px] text-gray-600">Weryfikowane ogłoszenia i bezpieczny kontakt z właścicielami</p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50 text-center">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-amber-100 rounded-full mb-1.5">
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Sprawdzona społeczność</h3>
            <p className="text-[10px] text-gray-600">Dołącz do setek zadowolonych użytkowników platformy</p>
          </div>
        </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg mb-6 border border-gray-200/50">
        <div className="px-4 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                Typ pojazdu
              </label>
              <select
                value={filters.vehicleType}
                onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
              >
                <option value="">Wszystkie</option>
                <option value="samochód">Samochód</option>
                <option value="motocykl">Motocykl</option>
                <option value="łódź">Łódź</option>
                <option value="inne">Inne</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                Marka
              </label>
              <input
                type="text"
                value={filters.brand}
                onChange={(e) => handleFilterChange('brand', e.target.value)}
                placeholder="np. BMW, Audi..."
                className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                Model
              </label>
              <input
                type="text"
                value={filters.model}
                onChange={(e) => handleFilterChange('model', e.target.value)}
                placeholder="np. X5, A4..."
                className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 mt-3 transition-colors"
          >
            {showAdvancedFilters ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Ukryj zaawansowane filtry</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Pokaż zaawansowane filtry</span>
              </>
            )}
          </button>

          {showAdvancedFilters && (
            <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-200">
            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                Rata miesięczna (min)
              </label>
              <input
                type="number"
                value={filters.minMonthlyPayment}
                onChange={(e) => handleFilterChange('minMonthlyPayment', e.target.value)}
                placeholder="Od"
                className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                Rata miesięczna (max)
              </label>
              <input
                type="number"
                value={filters.maxMonthlyPayment}
                onChange={(e) => handleFilterChange('maxMonthlyPayment', e.target.value)}
                placeholder="Do"
                className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                Max. pozostałe raty
              </label>
              <input
                type="number"
                value={filters.maxRemainingInstallments}
                onChange={(e) => handleFilterChange('maxRemainingInstallments', e.target.value)}
                placeholder="Bez limitu"
                className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                Sortowanie
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
              >
                <option value="newest">Najnowsze</option>
                <option value="oldest">Najstarsze</option>
                <option value="price_asc">Rata: rosnąco</option>
                <option value="price_desc">Rata: malejąco</option>
                <option value="installments_asc">Najmniej rat</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-3 border-t border-gray-200">
            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                Min. odstępne (zł)
              </label>
              <input
                type="number"
                value={filters.minTransferFee}
                onChange={(e) => handleFilterChange('minTransferFee', e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                Max. odstępne (zł)
              </label>
              <input
                type="number"
                value={filters.maxTransferFee}
                onChange={(e) => handleFilterChange('maxTransferFee', e.target.value)}
                placeholder="Bez limitu"
                className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-3 border-t border-gray-200">
            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                Min. przebieg (km)
              </label>
              <input
                type="number"
                value={filters.minMileage}
                onChange={(e) => handleFilterChange('minMileage', e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                Max. przebieg (km)
              </label>
              <input
                type="number"
                value={filters.maxMileage}
                onChange={(e) => handleFilterChange('maxMileage', e.target.value)}
                placeholder="Bez limitu"
                className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder-gray-500"
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Aktualne oferty przejęcia leasingu</h2>
            <span className="text-xs text-gray-600">
              {((currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} z {totalItems} {totalItems === 1 ? 'oferty' : 'ofert'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onView={() => onViewListing(listing.id)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
                Poprzednia
              </button>

              <div className="flex items-center gap-1">
                {generatePageNumbers().map((page, idx) => (
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 py-2 text-gray-500 text-xs">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(Number(page))}
                      className={`min-w-[32px] px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-amber-500 text-white shadow-md'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Następna
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
