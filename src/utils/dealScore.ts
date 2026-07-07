import { Listing } from '../lib/supabase';

export type DealScoreBreakdown = {
  score: number;
  label: string;
  colorClass: string;
  marketValue: number;
  totalCost: number;
};

// Compares the total cost of taking over the lease (odstępne + remaining
// installments + buyout) against the estimated market value of the vehicle.
// Kept in one place so the badge on the listing grid and the breakdown on
// the listing detail page always agree on the same number.
export function calculateDealScore(listing: Listing): DealScoreBreakdown | null {
  const { market_value, monthly_payment, transfer_fee, remaining_installments, buyout_price } = listing;
  if (!market_value || market_value <= 0 || !monthly_payment) return null;

  const totalCost = (transfer_fee || 0) + monthly_payment * remaining_installments + (buyout_price || 0);
  const ratio = (market_value - totalCost) / market_value;
  const score = Math.round(Math.min(10, Math.max(0, ratio * 20 + 5)) * 10) / 10;

  const colorClass = score >= 8 ? 'from-emerald-500 to-teal-500' : score >= 6 ? 'from-amber-400 to-orange-400' : 'from-red-400 to-rose-500';
  const label = score >= 8 ? 'Super okazja' : score >= 6 ? 'Dobra oferta' : 'Sprawdź';

  return { score, label, colorClass, marketValue: market_value, totalCost };
}

export const DEAL_SCORE_EXPLANATION =
  'Ocena porównuje szacowaną wartość rynkową pojazdu z całkowitym kosztem przejęcia leasingu (odstępne + suma pozostałych rat + ewentualny wykup). Im więcej "zyskujesz" względem wartości rynkowej, tym wyższa ocena. To szacunek pomocniczy, nie gwarancja - zawsze sprawdź stan pojazdu i warunki umowy samodzielnie.';
