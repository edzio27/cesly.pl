import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Listing } from '../lib/supabase';
import { ListingCard } from './ListingCard';

type FeaturedCarouselProps = {
  listings: Listing[];
  onViewListing: (id: string) => void;
};

export function FeaturedCarousel({ listings, onViewListing }: FeaturedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (listings.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: direction === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Wyróżnione oferty
        </h2>
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Poprzednie oferty"
            className="p-2 rounded-full border border-gray-300 bg-white hover:bg-amber-50 hover:border-amber-400 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Następne oferty"
            className="p-2 rounded-full border border-gray-300 bg-white hover:bg-amber-50 hover:border-amber-400 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory scrollbar-hide"
      >
        {listings.map((listing, index) => (
          <div key={listing.id} className="w-56 sm:w-64 flex-shrink-0 snap-start">
            <ListingCard
              listing={listing}
              index={index}
              onView={() => onViewListing(listing.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
