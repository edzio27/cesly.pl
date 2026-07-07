import React from 'react';
import { Star, Calendar, TrendingUp } from 'lucide-react';
import { Listing } from '../lib/supabase';
import { trackListingClick } from '../utils/analytics';

type ListingCardProps = {
  listing: Listing;
  onView: () => void;
  priority?: boolean;
};

function calcDealScore(listing: Listing): number | null {
  const { market_value, monthly_payment, transfer_fee, remaining_installments, buyout_price } = listing;
  if (!market_value || market_value <= 0 || !monthly_payment) return null;
  const totalCost = (transfer_fee || 0) + monthly_payment * remaining_installments + (buyout_price || 0);
  const ratio = (market_value - totalCost) / market_value;
  // ratio > 0 → płacisz mniej niż wartość rynkowa (okazja)
  // ratio < 0 → przepłacasz
  const score = Math.min(10, Math.max(0, ratio * 20 + 5));
  return Math.round(score * 10) / 10;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? 'from-emerald-500 to-teal-500' : score >= 6 ? 'from-amber-400 to-orange-400' : 'from-red-400 to-rose-500';
  const label = score >= 8 ? 'Super okazja' : score >= 6 ? 'Dobra oferta' : 'Sprawdź';
  return (
    <div className={`absolute top-2 right-2 bg-gradient-to-br ${color} text-white rounded-lg px-2 py-1 shadow-lg`}>
      <div className="text-[11px] font-black leading-none">{score.toFixed(1)}/10</div>
      <div className="text-[8px] font-semibold uppercase tracking-wide leading-none mt-0.5">{label}</div>
    </div>
  );
}

function StarRating({ score }: { score: number }) {
  const stars = Math.round(score / 2);
  const color = score >= 8 ? 'text-emerald-500' : score >= 6 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={i <= stars ? color : 'text-gray-300'}
          fill={i <= stars ? 'currentColor' : 'none'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export function ListingCard({ listing, onView, priority = false }: ListingCardProps) {
  const mainImage = listing.images && listing.images.length > 0
    ? listing.images[0]
    : 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=600';

  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    trackListingClick(listing.id, 'card');
    onView();
  };

  return (
    <a
      href={`/listing/${listing.id}`}
      onClick={handleClick}
      className="group block bg-white/90 backdrop-blur-sm rounded-xl shadow-md overflow-hidden hover:shadow-xl hover:shadow-amber-500/20 transition-all cursor-pointer border border-gray-200 hover:border-amber-400 hover:scale-[1.02] duration-300"
    >
      {listing.is_promoted && (
        <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-white px-2 py-1 text-xs font-bold flex items-center">
          <Star size={12} className="mr-1" fill="currentColor" />
          PROMOWANE
        </div>
      )}

      <div className="aspect-square w-full overflow-hidden bg-gray-100 relative">
        <img
          src={mainImage}
          alt={listing.title}
          loading={priority ? 'eager' : 'lazy'}
          // @ts-expect-error React 18 types don't include fetchpriority yet; lowercase name is required for React to pass it through as-is
          fetchpriority={priority ? 'high' : 'auto'}
          className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-gray-900/10 to-transparent"></div>
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center">
          <span className="text-amber-600 text-[10px] font-bold uppercase tracking-wide">
            {listing.vehicle_type}
          </span>
        </div>
        {(() => { const s = calcDealScore(listing); return s !== null && s > 0 ? <ScoreBadge score={s} /> : null; })()}
      </div>

      <div className="p-3">
        <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
          {listing.title}
        </h3>

        <div className="space-y-1 mb-2">
          <div className="flex justify-between text-xs items-center">
            <span className="text-gray-600">Rata miesięczna:</span>
            <span className="font-bold text-amber-600 text-sm">
              {listing.monthly_payment.toLocaleString('pl-PL')} zł
            </span>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Odstępne:</span>
            <span className="font-semibold text-gray-900">
              {listing.transfer_fee.toLocaleString('pl-PL')} zł
            </span>
          </div>

          {listing.buyout_price && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Wykup:</span>
              <span className="font-semibold text-gray-900">
                {listing.buyout_price.toLocaleString('pl-PL')} zł
              </span>
            </div>
          )}

          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Pozostałe raty:</span>
            <span className="font-semibold text-gray-900">
              {listing.remaining_installments} / {listing.total_installments}
            </span>
          </div>

          {listing.mileage && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Przebieg:</span>
              <span className="font-semibold text-gray-900">
                {listing.mileage.toLocaleString('pl-PL')} km
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div className="flex items-center text-xs text-gray-500">
            <Calendar size={12} className="mr-1" />
            {new Date(listing.created_at).toLocaleDateString('pl-PL')}
          </div>
          {(() => { const s = calcDealScore(listing); return s !== null && s > 0 ? <StarRating score={s} /> : null; })()}
        </div>
      </div>
    </a>
  );
}
