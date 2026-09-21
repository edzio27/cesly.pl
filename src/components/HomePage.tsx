import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Star,
  SearchX,
  Bookmark,
  ArrowRight,
} from 'lucide-react';
import { supabase, Listing } from '../lib/supabase';
import { ListingCard, ListingCardSkeleton } from './ListingCard';
import { AuthModal } from './AuthModal';
import { FilterBar } from './FilterBar';
import { HomeHero, HomeStats } from './HomeHero';
import { calculateDealScore } from '../utils/dealScore';
import { listingCosts } from '../utils/listingMetrics';
import { trackPageView } from '../utils/analytics';
import { useAuth } from '../contexts/AuthContext';
import { EMPTY_FILTERS, Filters, countActiveFilters } from '../types/filters';
import { SeoCategory, SEO_CATEGORIES, categoryUrl } from '../data/seoCategories';
import {
  FAQ_ITEMS,
  HOME_HEADING_LINES,
  HOME_LEAD,
  HOW_IT_WORKS_STEPS,
  TAKEOVER_BENEFITS,
  WHAT_IS_CESJA_BODY,
  WHAT_IS_CESJA_HEADING,
} from '../data/seoContent';

export type { Filters } from '../types/filters';

type HomePageProps = {
  onViewListing: (id: string) => void;
  onNavigate: (page: string) => void;
  onNavigateCategory: (slug: string) => void;
  initialFilters?: Partial<Filters>;
  /** Ustawione na `/cesja-leasingu/<slug>` — zmienia H1, meta i canonical. */
  category?: SeoCategory | null;
};

// Multiple of 12 (LCM of the grid's 2/3/4 responsive column counts) so the
// last row is always fully filled before a next page is ever needed.
const ITEMS_PER_PAGE = 24;

// Realny koszt/mies., koszt do końca umowy and the market-value score are
// derived from several columns, so Postgres cannot order by them. For those
// three the matching rows are fetched once and sorted in the browser; every
// other sort still runs server-side with a normal range query.
const COMPUTED_SORTS = new Set(['effective_asc', 'total_asc', 'deal']);
const MAX_CLIENT_SORT_ROWS = 1000;

// Te same marki co wcześniej, ale jako kategorie — każdy kafelek jest teraz
// linkiem pod własny adres, a nie przyciskiem nakładającym filtr.
const POPULAR_BRAND_SLUGS = ['bmw', 'audi', 'mercedes-benz', 'volkswagen', 'skoda', 'toyota', 'kia', 'volvo'];

const POPULAR_BRANDS = POPULAR_BRAND_SLUGS
  .map((slug) => SEO_CATEGORIES.find((category) => category.slug === slug))
  .filter((category): category is SeoCategory => category !== undefined);

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
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
          <div
            key={item.question}
            className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
              isOpen ? 'border-accent-200' : 'border-ink-100'
            }`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-semibold text-ink-900">{item.question}</span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-accent-600" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" />
              )}
            </button>
            {isOpen && <p className="px-5 pb-5 text-sm leading-relaxed text-ink-600">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function HomePage({
  onViewListing,
  onNavigate,
  onNavigateCategory,
  initialFilters,
  category = null,
}: HomePageProps) {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [rows, setRows] = useState<Listing[]>([]);
  const [clientPaged, setClientPaged] = useState(false);
  const [promoted, setPromoted] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchSaved, setSearchSaved] = useState(false);
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS, ...initialFilters });
  const [debouncedQuery, setDebouncedQuery] = useState(filters.q);
  const resultsRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = countActiveFilters(filters);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(filters.q), 350);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const queryFilters = useMemo<Filters>(() => ({ ...filters, q: debouncedQuery }), [filters, debouncedQuery]);

  useEffect(() => {
    document.title = category
      ? `${category.heading} | Cesly.pl`
      : 'Cesly.pl – Cesja leasingu i przejęcie umowy leasingowej';

    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        category
          ? category.lead
          : 'Znajdź oferty cesji i przejęcia leasingu samochodów w całej Polsce. Filtruj po racie, odstępnym i liczbie rat. Dodaj własne ogłoszenie za darmo.',
      );

    // Bez tego wszystkie strony kategorii deklarowałyby canonical strony
    // głównej — czyli prosiłyby Google, żeby ich nie indeksował.
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute('href', `https://cesly.pl${category ? categoryUrl(category) : '/'}`);

    trackPageView(category ? `category:${category.slug}` : 'home');
  }, [category]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const isComputedSort = COMPUTED_SORTS.has(queryFilters.sortBy);

      let query = supabase
        .from('listings')
        .select('*', { count: 'exact' })
        // Drafts and rejected imports were previously served to visitors
        // alongside real offers.
        .eq('status', 'published');

      const term = queryFilters.q.trim().replace(/[,()]/g, ' ');
      if (term) {
        query = query.or(
          [`title.ilike.%${term}%`, `brand.ilike.%${term}%`, `model.ilike.%${term}%`, `description.ilike.%${term}%`].join(','),
        );
      }
      if (queryFilters.vehicleType) query = query.eq('vehicle_type', queryFilters.vehicleType);
      if (queryFilters.brand) query = query.ilike('brand', `%${queryFilters.brand}%`);
      if (queryFilters.model) query = query.ilike('model', `%${queryFilters.model}%`);
      if (queryFilters.minMonthlyPayment) query = query.gte('monthly_payment', Number(queryFilters.minMonthlyPayment));
      if (queryFilters.maxMonthlyPayment) query = query.lte('monthly_payment', Number(queryFilters.maxMonthlyPayment));
      if (queryFilters.noTransferFee) query = query.lte('transfer_fee', 0);
      else {
        if (queryFilters.minTransferFee) query = query.gte('transfer_fee', Number(queryFilters.minTransferFee));
        if (queryFilters.maxTransferFee) query = query.lte('transfer_fee', Number(queryFilters.maxTransferFee));
      }
      if (queryFilters.minRemainingInstallments)
        query = query.gte('remaining_installments', Number(queryFilters.minRemainingInstallments));
      if (queryFilters.maxRemainingInstallments)
        query = query.lte('remaining_installments', Number(queryFilters.maxRemainingInstallments));
      if (queryFilters.minMileage) query = query.gte('mileage', Number(queryFilters.minMileage));
      if (queryFilters.maxMileage) query = query.lte('mileage', Number(queryFilters.maxMileage));
      if (queryFilters.minYear) query = query.gte('year', Number(queryFilters.minYear));
      if (queryFilters.maxYear) query = query.lte('year', Number(queryFilters.maxYear));
      if (queryFilters.freshDays) query = query.gte('created_at', daysAgoIso(Number(queryFilters.freshDays)));

      if (isComputedSort) {
        query = query.order('created_at', { ascending: false }).limit(MAX_CLIENT_SORT_ROWS);
      } else {
        query = query.order('is_promoted', { ascending: false });
        switch (queryFilters.sortBy) {
          case 'oldest':
            query = query.order('created_at', { ascending: true });
            break;
          case 'price_asc':
            query = query.order('monthly_payment', { ascending: true });
            break;
          case 'price_desc':
            query = query.order('monthly_payment', { ascending: false });
            break;
          case 'fee_asc':
            query = query.order('transfer_fee', { ascending: true });
            break;
          case 'installments_asc':
            query = query.order('remaining_installments', { ascending: true });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        query = query.range(from, from + ITEMS_PER_PAGE - 1);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const fetched = data || [];

      if (isComputedSort) {
        const sorted = [...fetched].sort((a, b) => {
          if (a.is_promoted !== b.is_promoted) return a.is_promoted ? -1 : 1;
          if (queryFilters.sortBy === 'effective_asc')
            return listingCosts(a).effectiveMonthly - listingCosts(b).effectiveMonthly;
          if (queryFilters.sortBy === 'total_asc') return listingCosts(a).takeoverCost - listingCosts(b).takeoverCost;
          return (calculateDealScore(b)?.score ?? -1) - (calculateDealScore(a)?.score ?? -1);
        });
        setRows(sorted);
        setClientPaged(true);
        setTotalItems(Math.min(count ?? sorted.length, sorted.length));
      } else {
        setRows(fetched);
        setClientPaged(false);
        setTotalItems(count ?? fetched.length);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      setRows([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [queryFilters, currentPage]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Promoted offers are a paid slot, so they get their own rail instead of
  // being duplicated out of the grid below.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .eq('is_promoted', true)
        .order('created_at', { ascending: false })
        .limit(8);
      setPromoted(data || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data, count } = await supabase
        .from('listings')
        .select('monthly_payment, transfer_fee, created_at', { count: 'exact' })
        .eq('status', 'published')
        .limit(1000);

      if (!data) return;
      const weekAgo = Date.now() - 7 * 86_400_000;
      setStats({
        total: count ?? data.length,
        addedThisWeek: data.filter((row) => new Date(row.created_at).getTime() >= weekAgo).length,
        medianPayment: median(data.map((row) => Number(row.monthly_payment)).filter((value) => value > 0)),
        noFeeCount: data.filter((row) => !Number(row.transfer_fee)).length,
      });
    })();
  }, []);

  useEffect(() => {
    if (!user) {
      setFavorites(new Set());
      return;
    }
    (async () => {
      const { data } = await supabase.from('favorites').select('listing_id').eq('user_id', user.id);
      setFavorites(new Set((data || []).map((row) => row.listing_id as string)));
    })();
  }, [user]);

  const handleChange = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    if (!('sortBy' in patch)) setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters({ ...EMPTY_FILTERS, sortBy: filters.sortBy });
    setCurrentPage(1);
  };

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleFavorite = async (listing: Listing) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const isFavorite = favorites.has(listing.id);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFavorite) next.delete(listing.id);
      else next.add(listing.id);
      return next;
    });
    try {
      if (isFavorite) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listing.id);
      } else {
        await supabase.from('favorites').insert({ user_id: user.id, listing_id: listing.id });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFavorite) next.add(listing.id);
        else next.delete(listing.id);
        return next;
      });
    }
  };

  const handleSaveSearch = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const suggested = [filters.q, filters.brand, filters.model, filters.vehicleType].filter(Boolean).join(' ');
    const name = window.prompt('Nazwa zapisanego wyszukiwania:', suggested || 'Moje wyszukiwanie');
    if (!name) return;

    try {
      const { error } = await supabase.from('saved_searches').insert({ user_id: user.id, name, filters });
      if (error) throw error;
      setSearchSaved(true);
      setTimeout(() => setSearchSaved(false), 2500);
    } catch (error) {
      console.error('Error saving search:', error);
    }
  };

  const visible = useMemo(() => {
    if (!clientPaged) return rows;
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    return rows.slice(from, from + ITEMS_PER_PAGE);
  }, [rows, clientPaged, currentPage]);

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  useEffect(() => {
    if (rows.length === 0) return;

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Oferty cesji leasingu',
      description: 'Aktualne ogłoszenia przejęcia i cesji umów leasingowych samochodów',
      numberOfItems: totalItems,
      itemListElement: visible.map((listing, index) => ({
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
  }, [visible, rows.length, currentPage, totalItems]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    scrollToResults();
  };

  const pageNumbers = useMemo<(number | string)[]>(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push('…');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="bg-canvas-muted">
      <HomeHero
        filters={filters}
        onChange={handleChange}
        onSubmit={scrollToResults}
        onAddListing={() => (user ? onNavigate('add-listing') : setShowAuthModal(true))}
        stats={stats}
        heading={category ? category.heading : HOME_HEADING_LINES}
        lead={category ? category.lead : HOME_LEAD}
      />

      <FilterBar
        filters={filters}
        onChange={handleChange}
        onReset={handleReset}
        resultCount={totalItems}
        loading={loading}
        canSaveSearch
        onSaveSearch={handleSaveSearch}
        searchSaved={searchSaved}
      />

      <div ref={resultsRef} className="mx-auto max-w-7xl scroll-mt-32 px-4 py-8 sm:px-6 lg:px-8">
        {promoted.length > 0 && activeFilterCount === 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <Star size={16} className="text-accent-500" fill="currentColor" />
              <h2 className="font-display text-lg font-bold text-ink-900">Wyróżnione oferty</h2>
            </div>
            <div className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
              {promoted.map((listing, index) => (
                <div key={listing.id} className="w-60 shrink-0 snap-start sm:w-64">
                  <ListingCard
                    listing={listing}
                    index={index}
                    onView={() => onViewListing(listing.id)}
                    isFavorite={favorites.has(listing.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              {category
                ? `Oferty w kategorii: ${category.label}`
                : activeFilterCount > 0
                  ? 'Wyniki wyszukiwania'
                  : 'Aktualne oferty przejęcia leasingu'}
            </h2>
            {!loading && totalItems > 0 && (
              <p className="mt-1 text-sm text-ink-500">
                Pokazujemy {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} z {totalItems.toLocaleString('pl-PL')}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ListingCardSkeleton key={index} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-ink-100 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50 text-ink-400">
              <SearchX size={26} />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold text-ink-900">Brak ofert dla tych kryteriów</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
              Rynek cesji jest znacznie mniejszy niż rynek sprzedaży — spróbuj poluzować filtry albo zapisz
              wyszukiwanie, żeby wrócić do niego później.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button onClick={handleReset} className="btn-accent">
                <Search size={16} />
                Wyczyść filtry
              </button>
              <button onClick={handleSaveSearch} className="btn-ghost">
                <Bookmark size={16} />
                Zapisz wyszukiwanie
              </button>
              <button
                onClick={() => (user ? onNavigate('add-listing') : setShowAuthModal(true))}
                className="btn-ghost"
              >
                <Plus size={16} />
                Dodaj własne ogłoszenie
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {visible.map((listing, index) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  priority={currentPage === 1 && index < 4}
                  index={index}
                  onView={() => onViewListing(listing.id)}
                  isFavorite={favorites.has(listing.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Paginacja">
                <button
                  onClick={() => goToPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={17} />
                  <span className="hidden sm:inline">Poprzednia</span>
                </button>

                <div className="flex items-center gap-1">
                  {pageNumbers.map((page, index) =>
                    page === '…' ? (
                      <span key={`gap-${index}`} className="px-2 text-ink-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => goToPage(Number(page))}
                        aria-current={currentPage === page ? 'page' : undefined}
                        className={`min-w-[42px] rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                          currentPage === page
                            ? 'bg-ink-900 text-white'
                            : 'border border-ink-200 bg-white text-ink-700 hover:border-ink-300'
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                </div>

                <button
                  onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="hidden sm:inline">Następna</span>
                  <ChevronRight size={17} />
                </button>
              </nav>
            )}
          </>
        )}
      </div>

      <section id="jak-to-dziala" className="scroll-mt-32 border-y border-ink-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Jak przebiega cesja leasingu
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-500">
            Cztery kroki od znalezienia ogłoszenia do podpisania aneksu.
          </p>

          <ol className="relative mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Connector line only where the steps sit in a single row. */}
            <div className="absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-accent-200 via-accent-300 to-transparent lg:block" />
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <li key={step.title} className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 font-display text-sm font-bold text-white ring-4 ring-white">
                  {index + 1}
                </div>
                <h3 className="mt-4 font-semibold text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <section className="grid gap-8 rounded-3xl border border-ink-100 bg-white p-6 md:p-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              {WHAT_IS_CESJA_HEADING}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600 md:text-base">{WHAT_IS_CESJA_BODY}</p>
          </div>
          <div className="rounded-2xl bg-ink-50 p-5">
            <h3 className="font-semibold text-ink-900">Korzyści z przejęcia leasingu</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-600">
              {TAKEOVER_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
            Popularne wyszukiwania
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {POPULAR_BRANDS.map((brandCategory) => (
              <a
                key={brandCategory.slug}
                href={categoryUrl(brandCategory)}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateCategory(brandCategory.slug);
                }}
                className="chip py-2"
              >
                {brandCategory.heading}
              </a>
            ))}
          </div>
        </section>

        <section id="faq" className="scroll-mt-32">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
            Najczęściej zadawane pytania
          </h2>
          <div className="mt-4 max-w-3xl">
            <FaqSection />
          </div>
        </section>
      </div>

      <section className="relative overflow-hidden bg-ink-950">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent-600/25 blur-[100px]" />
          <div className="absolute inset-0 bg-grid-faint bg-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Chcesz oddać swój leasing?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-200">
            Dodaj ogłoszenie w kilka minut i znajdź kogoś, kto przejmie Twoje raty. Bezpłatnie, bez prowizji.
          </p>
          <button
            onClick={() => (user ? onNavigate('add-listing') : setShowAuthModal(true))}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-accent-500 px-7 py-4 text-base font-bold text-white transition-all hover:bg-accent-600 hover:shadow-glow active:scale-[0.99]"
          >
            <Plus size={19} />
            Dodaj ogłoszenie za darmo
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
