import { Listing } from '../lib/supabase';

export type DealTone = 'great' | 'good' | 'fair' | 'high';

export type DealScoreBreakdown = {
  score: number;
  label: string;
  /** Tailwind gradient stops, kept for the legacy badge markup. */
  colorClass: string;
  tone: DealTone;
  marketValue: number;
  totalCost: number;
};

const TONE_STYLES: Record<DealTone, { label: string; colorClass: string }> = {
  great: { label: 'Świetna cena', colorClass: 'from-emerald-500 to-teal-500' },
  good: { label: 'Dobra cena', colorClass: 'from-emerald-400 to-emerald-500' },
  fair: { label: 'Cena rynkowa', colorClass: 'from-accent-400 to-accent-500' },
  high: { label: 'Powyżej rynku', colorClass: 'from-rose-400 to-rose-500' },
};

// Compares the total cost of taking over the lease (odstępne + remaining
// instalments + buyout) against the estimated market value of the vehicle.
// Kept in one place so the badge on the listing grid and the breakdown on
// the listing detail page always agree on the same number.
//
// Calibration: the earlier curve (ratio * 20 + 5) hit a perfect 10 at only
// 25% below market, which put "SUPER OKAZJA" on almost every listing and
// made the badge meaningless. The gentler slope below reserves the top of
// the scale for genuinely large discounts.
export function calculateDealScore(listing: Listing): DealScoreBreakdown | null {
  const { market_value, monthly_payment, transfer_fee, remaining_installments, buyout_price } = listing;
  if (!market_value || market_value <= 0 || !monthly_payment) return null;

  const totalCost = (transfer_fee || 0) + monthly_payment * remaining_installments + (buyout_price || 0);
  const ratio = (market_value - totalCost) / market_value;
  const score = Math.round(Math.min(10, Math.max(0, ratio * 14 + 4.5)) * 10) / 10;

  const tone: DealTone = score >= 8.5 ? 'great' : score >= 7 ? 'good' : score >= 5 ? 'fair' : 'high';

  return { score, tone, ...TONE_STYLES[tone], marketValue: market_value, totalCost };
}

/** Below this the badge is noise rather than a signal, so it is hidden. */
export const DEAL_SCORE_BADGE_THRESHOLD = 7;

export const DEAL_SCORE_EXPLANATION =
  'Ocena porównuje szacowaną wartość rynkową pojazdu z całkowitym kosztem przejęcia leasingu (odstępne + suma pozostałych rat + ewentualny wykup). Im więcej "zyskujesz" względem wartości rynkowej, tym wyższa ocena. To szacunek pomocniczy, nie gwarancja - zawsze sprawdź stan pojazdu i warunki umowy samodzielnie.';
