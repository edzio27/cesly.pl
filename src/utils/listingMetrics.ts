import { Listing } from '../lib/supabase';

// Odstępne is a one-off payment, so a raw "rata" comparison between two
// listings is misleading: a 800 zł/mies. car with 30 000 zł odstępne and
// 20 rat left actually costs 2 300 zł a month. Every place that shows or
// sorts by price uses these numbers so the comparison stays honest.
export type ListingCosts = {
  /** Odstępne spread over the remaining instalments + the instalment itself. */
  effectiveMonthly: number;
  /** Everything paid until the contract ends (odstępne + all instalments). */
  takeoverCost: number;
  /** takeoverCost plus the optional end-of-contract buyout. */
  costWithBuyout: number;
  monthsLeft: number;
};

export function listingCosts(listing: Listing): ListingCosts {
  const monthly = listing.monthly_payment || 0;
  const fee = listing.transfer_fee || 0;
  const monthsLeft = listing.remaining_installments || 0;
  const takeoverCost = fee + monthly * monthsLeft;

  return {
    effectiveMonthly: monthsLeft > 0 ? monthly + fee / monthsLeft : monthly,
    takeoverCost,
    costWithBuyout: takeoverCost + (listing.buyout_price || 0),
    monthsLeft,
  };
}

export const NEW_LISTING_DAYS = 7;
export const STALE_LISTING_DAYS = 45;

export type ListingAge = {
  days: number;
  isNew: boolean;
  isStale: boolean;
  label: string;
};

export function listingAge(listing: Listing, now: Date = new Date()): ListingAge {
  const created = new Date(listing.created_at).getTime();
  const days = Math.max(0, Math.floor((now.getTime() - created) / 86_400_000));

  let label: string;
  if (days === 0) label = 'dziś';
  else if (days === 1) label = 'wczoraj';
  else if (days < 30) label = `${days} dni temu`;
  else if (days < 60) label = 'ponad miesiąc temu';
  else label = `${Math.floor(days / 30)} mies. temu`;

  return {
    days,
    isNew: days <= NEW_LISTING_DAYS,
    isStale: days >= STALE_LISTING_DAYS,
    label,
  };
}

export function formatPLN(value: number | null | undefined, withUnit = true): string {
  if (value == null) return '—';
  const rounded = Math.round(value);
  return `${rounded.toLocaleString('pl-PL')}${withUnit ? ' zł' : ''}`;
}

/** 94 500 zł -> "94,5 tys. zł", for tight spots like card footers. */
export function formatPLNCompact(value: number | null | undefined): string {
  if (value == null) return '—';
  if (Math.abs(value) < 10_000) return formatPLN(value);
  const thousands = value / 1000;
  const digits = thousands < 100 ? 1 : 0;
  return `${thousands.toLocaleString('pl-PL', { maximumFractionDigits: digits })} tys. zł`;
}
