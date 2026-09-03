import React, { useState } from 'react';
import { Star, Heart, Gauge, CalendarDays, Receipt, Sparkles, Clock } from 'lucide-react';
import { Listing } from '../lib/supabase';
import { trackListingClick } from '../utils/analytics';
import { calculateDealScore, DEAL_SCORE_BADGE_THRESHOLD, DEAL_SCORE_EXPLANATION } from '../utils/dealScore';
import { formatPLN, formatPLNCompact, listingAge, listingCosts } from '../utils/listingMetrics';

type ListingCardProps = {
  listing: Listing;
  onView: () => void;
  priority?: boolean;
  index?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (listing: Listing) => void;
};

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=600';

const TONE_BADGE: Record<string, string> = {
  great: 'bg-emerald-500 text-white',
  good: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  fair: 'bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-200',
  high: 'bg-ink-50 text-ink-500 ring-1 ring-inset ring-ink-200',
};

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-ink-400">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="truncate text-[13px] font-semibold text-ink-800">{value}</div>
    </div>
  );
}

export function ListingCard({
  listing,
  onView,
  priority = false,
  index = 0,
  isFavorite = false,
  onToggleFavorite,
}: ListingCardProps) {
  const initialImage = listing.images && listing.images.length > 0 ? listing.images[0] : FALLBACK_IMAGE;

  const deal = calculateDealScore(listing);
  const costs = listingCosts(listing);
  const age = listingAge(listing);
  const [imageSrc, setImageSrc] = useState(initialImage);
  const [imageLoaded, setImageLoaded] = useState(priority);

  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    trackListingClick(listing.id, 'card');
    onView();
  };

  const showDeal = deal && deal.score >= DEAL_SCORE_BADGE_THRESHOLD;

  return (
    <a
      href={`/listing/${listing.id}`}
      onClick={handleClick}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-ink-200 hover:shadow-card motion-safe:animate-fade-in-up"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100">
        <img
          src={imageSrc}
          alt={listing.title}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          // @ts-expect-error React 18 types don't include fetchpriority yet; lowercase name is required for React to pass it through as-is
          fetchpriority={priority ? 'high' : 'auto'}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            if (imageSrc !== FALLBACK_IMAGE) setImageSrc(FALLBACK_IMAGE);
            else setImageLoaded(true);
          }}
          className={`h-full w-full object-cover object-center transition-[opacity,transform] duration-700 group-hover:scale-[1.06] ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950/70 to-transparent" />

        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {listing.is_promoted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-soft">
              <Star size={10} fill="currentColor" />
              Promowane
            </span>
          )}
          {age.isNew && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-soft">
              <Sparkles size={10} />
              Nowe
            </span>
          )}
          {age.isStale && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-500 shadow-soft backdrop-blur">
              <Clock size={10} />
              Sprawdź aktualność
            </span>
          )}
        </div>

        {onToggleFavorite && (
          <button
            type="button"
            aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(listing);
            }}
            className="absolute right-2.5 top-2.5 rounded-full bg-white/90 p-2 text-ink-500 shadow-soft backdrop-blur transition-colors hover:text-rose-500"
          >
            <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} className={isFavorite ? 'text-rose-500' : ''} />
          </button>
        )}

        <div className="absolute inset-x-2.5 bottom-2.5 flex items-end justify-between gap-2">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-600 backdrop-blur">
            {listing.vehicle_type}
          </span>
          {listing.year > 0 && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-ink-600 backdrop-blur">
              {listing.year}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-ink-900 transition-colors group-hover:text-accent-600">
          {listing.title}
        </h3>

        <div className="mt-2.5 flex items-end justify-between gap-2">
          <div>
            <div className="font-display text-xl font-extrabold leading-none tracking-tight text-ink-900">
              {formatPLN(listing.monthly_payment)}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-ink-400">rata miesięczna</div>
          </div>
          {showDeal && (
            <span
              title={DEAL_SCORE_EXPLANATION}
              className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${TONE_BADGE[deal.tone]}`}
            >
              {deal.label}
            </span>
          )}
        </div>

        {/* Odstępne spread over the remaining instalments - the number that
            actually decides whether one listing beats another. */}
        <div className="mt-2.5 rounded-xl bg-ink-50 px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium text-ink-500">Realny koszt / mies.</span>
            <span className="font-display text-sm font-bold text-accent-600">
              {formatPLN(costs.effectiveMonthly)}
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium text-ink-400">Do końca umowy</span>
            <span className="text-[11px] font-semibold text-ink-600">
              {formatPLNCompact(costs.takeoverCost)}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <Metric
            icon={<Receipt size={11} />}
            label="Odstępne"
            value={listing.transfer_fee > 0 ? formatPLNCompact(listing.transfer_fee) : 'brak'}
          />
          <Metric
            icon={<CalendarDays size={11} />}
            label="Rat"
            value={`${listing.remaining_installments}/${listing.total_installments}`}
          />
          <Metric
            icon={<Gauge size={11} />}
            label="Przebieg"
            value={listing.mileage != null ? `${Math.round(listing.mileage / 1000)} tys.` : '—'}
          />
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2.5 text-[11px] text-ink-400">
          <span>{age.label}</span>
          <span className="font-semibold text-accent-600 opacity-0 transition-opacity group-hover:opacity-100">
            Zobacz ofertę →
          </span>
        </div>
      </div>
    </a>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
      <div className="skeleton aspect-[4/3] w-full" />
      <div className="space-y-3 p-3.5">
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-8 w-1/2 rounded" />
        <div className="skeleton h-14 w-full rounded-xl" />
        <div className="skeleton h-8 w-full rounded" />
      </div>
    </div>
  );
}
