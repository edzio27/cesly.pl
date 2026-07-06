import React from 'react';
import { Star, Calendar, TrendingUp } from 'lucide-react';
import { Listing } from '../lib/supabase';
import { trackListingClick } from '../utils/analytics';

type ListingCardProps = {
  listing: Listing;
  onView: () => void;
};

export function ListingCard({ listing, onView }: ListingCardProps) {
  const mainImage = listing.images && listing.images.length > 0
    ? listing.images[0]
    : 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=600';

  const handleClick = () => {
    trackListingClick(listing.id, 'card');
    onView();
  };

  return (
    <div
      onClick={handleClick}
      className="group bg-white/90 backdrop-blur-sm rounded-xl shadow-md overflow-hidden hover:shadow-xl hover:shadow-amber-500/20 transition-all cursor-pointer border border-gray-200 hover:border-amber-400 hover:scale-[1.02] duration-300"
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
          className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-gray-900/10 to-transparent"></div>
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center">
          <span className="text-amber-600 text-[10px] font-bold uppercase tracking-wide">
            {listing.vehicle_type}
          </span>
        </div>
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
        </div>
      </div>
    </div>
  );
}
