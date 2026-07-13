import React, { useEffect, useMemo, useState } from 'react';
import { Search, Star, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, TrendingUp, Shield, Users, Check, Bookmark } from 'lucide-react';
import { supabase, Listing } from '../lib/supabase';
import { ListingCard } from './ListingCard';
import { FeaturedCarousel } from './FeaturedCarousel';
import { Logo } from './Logo';
import { calculateDealScore } from '../utils/dealScore';
import { trackPageView } from '../utils/analytics';
import { useAuth } from '../contexts/AuthContext';

type HomePageProps = {
  onViewListing: (id: string) => void;
  initialFilters?: Partial<Filters>;
};

export type Filters = {
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

const POPULAR_BRANDS = ['BMW', 'Audi', 'Mercedes-Benz', 'Volkswagen', 'Škoda', 'Toyota', 'Kia', 'Volvo'];

const PRICE_RANGE_PRESETS: { label: string; min: string; max: string }[] = [
  { label: 'do 500 zł', min: '', max: '500' },
  { label: '500-1000 zł', min: '500', max: '1000' },
  { label: '1000-2000 zł', min: '1000', max: '2000' },
  { label: '2000-3000 zł', min: '2000', max: '3000' },
  { label: '3000 zł i więcej', min: '3000', max: '' },
];

const FAQ_ITEMS = [
  {
    question: 'Czym jest cesja leasingu?',
    answer: 'Cesja leasingu (przejęcie umowy leasingowej) to przeniesienie praw i obowiązków z dotychczasowego leasingobiorcy (cedenta) na nowego użytkownika (cesjonariusza). Nowa osoba przejmuje pozostałe raty leasingowe oraz prawo do korzystania z pojazdu, a leasingodawca musi wyrazić zgodę na taką zmianę.',
  },
  {
    question: 'Ile kosztuje cesja leasingu?',
    answer: 'Na koszt cesji składają się dwa elementy: odstępne płacone dotychczasowemu leasingobiorcy (ustalane indywidualnie między stronami, widoczne w każdym ogłoszeniu) oraz opłata manipulacyjna pobierana przez leasingodawcę za przepisanie umowy, zwykle w wysokości kilkuset złotych.',
  },
  {
    question: 'Czy cesja leasingu wymaga zgody leasingodawcy?',
    answer: 'Tak. Firma leasingowa musi zweryfikować nowego leasingobiorcę (m.in. jego zdolność finansową) i formalnie wyrazić zgodę na przeniesienie umowy, zanim cesja zostanie sfinalizowana.',
  },
  {
    question: 'Jakie dokumenty są potrzebne do przejęcia leasingu?',
    answer: 'Zazwyczaj wymagany jest wniosek o cesję złożony do leasingodawcy, dokumenty potwierdzające sytuację finansową nowego leasingobiorcy (np. dla firm: dokumenty rejestrowe i finansowe), a po akceptacji — aneks do umowy leasingowej podpisywany przez wszystkie trzy strony.',
  },
  {
    question: 'Czy przejęcie leasingu to dobry sposób na tańszy samochód?',
    answer: 'Często tak — przejmując leasing, płacisz tylko pozostałe raty i odstępne, a nie pełną wartość pojazdu, co przy dobrze dobranej ofercie bywa tańsze niż zakup podobnego auta na rynku wtórnym lub zawarcie nowej umowy leasingowej.',
  },
];

function AnimatedCounter({ target, prefix = '' }: { target: number; prefix?: string }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }

    const duration = 1200;
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return <>{prefix}{value}</>;
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-structured-data';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      document.getElementById('faq-structured-data')?.remove();
    };
  }, []);

  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question} className="bg-white/80 rounded-xl border border-gray-200/50 overflow-hidden">
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-semibold text-gray-900">{item.question}</span>
              {isOpen ? <ChevronUp className="w-4 h-4 text-amber-600 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-amber-600 flex-shrink-0" />}
            </button>
            {isOpen && (
              <p className="px-5 pb-4 text-sm text-gray-700 leading-relaxed">{item.answer}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function HomePage({ onViewListing, initialFilters }: HomePageProps) {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [savingSearch, setSavingSearch] = useState(false);
  const [searchSaved, setSearchSaved] = useState(false);
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
    ...initialFilters,
  });

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const featuredListings = useMemo(() => {
    if (currentPage !== 1) return [];
    return listings
      .filter((listing) => listing.is_promoted || (calculateDealScore(listing)?.score ?? 0) >= 8)
      .slice(0, 8);
  }, [listings, currentPage]);

  useEffect(() => {
    document.title = 'Cesly.pl – Cesja leasingu i przejęcie umowy leasingowej';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Znajdź oferty cesji i przejęcia leasingu samochodów w całej Polsce. Przejmij raty leasingowe lub odstąp swój leasing – bezpiecznie i szybko.');
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
    if (listings.length === 0) return;

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Oferty cesji leasingu',
      description: 'Aktualne ogłoszenia przejęcia i cesji umów leasingowych samochodów',
      numberOfItems: totalItems,
      itemListElement: listings.map((listing, index) => ({
        '@type': 'ListItem',
        position: (currentPage - 1) * ITEMS_PER_PAGE + index + 1,
        url: `https://cesly.pl/listing/${listing.id}`,
        name: listing.title,
      })),
    };

    let script = document.getElementById('itemlist-structured-data') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'itemlist-structured-data';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);

    return () => {
      document.getElementById('itemlist-structured-data')?.remove();
    };
  }, [listings, currentPage, totalItems]);

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

  const handleSaveSearch = async () => {
    if (!user) return;
    const name = window.prompt('Nazwa zapisanego wyszukiwania:', [filters.brand, filters.model, filters.vehicleType].filter(Boolean).join(' ') || 'Moje wyszukiwanie');
    if (!name) return;

    setSavingSearch(true);
    try {
      const { error } = await supabase.from('saved_searches').insert({
        user_id: user.id,
        name,
        filters,
      });
      if (error) throw error;
      setSearchSaved(true);
      setTimeout(() => setSearchSaved(false), 2500);
    } catch (error) {
      console.error('Error saving search:', error);
    } finally {
      setSavingSearch(false);
    }
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

      <section className="relative overflow-hidden bg-gradient-to-tr from-brand-navy to-brand-navy-light">
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 flex flex-col items-center">
          <img
            src="/hero-bg.png"
            alt="Cesly.pl – Cesje i najmy. Przejmij leasing, zyskaj więcej."
            className="w-full max-w-md md:max-w-xl h-auto"
          />
          <div className="flex items-center gap-8 text-sm bg-black/30 backdrop-blur-sm rounded-full px-6 py-2.5 mt-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white"><AnimatedCounter target={120} prefix="+" /> aktywnych ogłoszeń</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white"><AnimatedCounter target={500} prefix="+" /> użytkowników</span>
            </div>
          </div>
        </div>
      </section>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Compact strip on mobile so search + listings aren't pushed below the fold */}
        <div className="md:hidden flex items-center justify-around bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200/50 mb-6 text-center">
          <div className="flex flex-col items-center gap-1 px-1">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            <span className="text-[10px] font-medium text-gray-700">Największa oferta</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-1">
            <Shield className="w-5 h-5 text-amber-600" />
            <span className="text-[10px] font-medium text-gray-700">Bezpieczny kontakt</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-1">
            <Users className="w-5 h-5 text-amber-600" />
            <span className="text-[10px] font-medium text-gray-700">Aktywna społeczność</span>
          </div>
        </div>

        <div className="hidden md:grid md:grid-cols-3 gap-4 mb-8">
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
            <p className="text-xs text-gray-600">Bezpośredni kontakt z właścicielem, wiadomości w serwisie i możliwość zgłoszenia nieprawidłowego ogłoszenia</p>
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

          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Rata miesięczna — szybki wybór
            </label>
            <div className="flex flex-wrap gap-2">
              {PRICE_RANGE_PRESETS.map((preset) => {
                const isActive = filters.minMonthlyPayment === preset.min && filters.maxMonthlyPayment === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      handleFilterChange('minMonthlyPayment', isActive ? '' : preset.min);
                      handleFilterChange('maxMonthlyPayment', isActive ? '' : preset.max);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      isActive
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-amber-400 hover:text-amber-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
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

            {user && (
              <button
                onClick={handleSaveSearch}
                disabled={savingSearch}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-amber-700 transition-colors disabled:opacity-50"
              >
                <Bookmark className="w-4 h-4" />
                <span>{searchSaved ? 'Zapisano!' : 'Zapisz to wyszukiwanie'}</span>
              </button>
            )}
          </div>

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
          {featuredListings.length > 0 && (
            <FeaturedCarousel listings={featuredListings} onViewListing={onViewListing} />
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Aktualne oferty przejęcia leasingu</h2>
            <span className="text-sm text-gray-600">
              {((currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} z {totalItems} {totalItems === 1 ? 'oferty' : 'ofert'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {listings.map((listing, index) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                priority={currentPage === 1 && index < 4}
                index={index}
                onView={() => onViewListing(listing.id)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
                Poprzednia
              </button>

              <div className="flex items-center gap-1">
                {generatePageNumbers().map((page, idx) => (
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-500">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(Number(page))}
                      className={`min-w-[44px] px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
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
                className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Następna
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}

      <div className="mt-16 space-y-12">
        <section className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">Czym jest cesja leasingu?</h2>
          <p className="text-sm md:text-base text-gray-700 leading-relaxed mb-4">
            Cesja leasingu, nazywana też przejęciem umowy leasingowej lub odstąpieniem leasingu, polega na przeniesieniu
            praw i obowiązków z obecnego leasingobiorcy na nowego użytkownika. Cedent (osoba oddająca leasing) kończy
            spłacanie rat, a cesjonariusz (osoba przejmująca) wchodzi w jego miejsce — przejmuje pozostałe raty
            leasingowe oraz pojazd, płacąc cedentowi ustalone odstępne. Cała transakcja wymaga zgody leasingodawcy.
          </p>
          <h3 className="text-base font-semibold text-gray-900 mb-2">Korzyści z przejęcia leasingu</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
            <li className="flex items-start gap-2"><Check className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" /><span>Krótszy okres zobowiązania niż przy nowej umowie leasingowej</span></li>
            <li className="flex items-start gap-2"><Check className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" /><span>Możliwość przejęcia pojazdu poniżej jego wartości rynkowej</span></li>
            <li className="flex items-start gap-2"><Check className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" /><span>Uproszczona procedura w porównaniu z zakupem i nowym leasingiem</span></li>
            <li className="flex items-start gap-2"><Check className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" /><span>Znana historia serwisowa i przebieg pojazdu od dotychczasowego użytkownika</span></li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Popularne wyszukiwania</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_BRANDS.map((brand) => (
              <button
                key={brand}
                onClick={() => handleFilterChange('brand', brand)}
                className="px-4 py-2 text-sm font-medium bg-white/80 border border-gray-300 rounded-full text-gray-700 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700 transition-colors"
              >
                Cesja leasingu {brand}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Najczęściej zadawane pytania</h2>
          <FaqSection />
        </section>
      </div>
      </div>
    </div>
  );
}
