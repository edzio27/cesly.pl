export type Filters = {
  /** Free-text query matched against title, brand, model and description. */
  q: string;
  vehicleType: string;
  brand: string;
  model: string;
  minMonthlyPayment: string;
  maxMonthlyPayment: string;
  minTransferFee: string;
  maxTransferFee: string;
  minRemainingInstallments: string;
  maxRemainingInstallments: string;
  minMileage: string;
  maxMileage: string;
  minYear: string;
  maxYear: string;
  /** '1' keeps only listings with no odstępne at all. */
  noTransferFee: string;
  /** '' | '7' | '30' - only listings added within that many days. */
  freshDays: string;
  sortBy: string;
};

export const EMPTY_FILTERS: Filters = {
  q: '',
  vehicleType: '',
  brand: '',
  model: '',
  minMonthlyPayment: '',
  maxMonthlyPayment: '',
  minTransferFee: '',
  maxTransferFee: '',
  minRemainingInstallments: '',
  maxRemainingInstallments: '',
  minMileage: '',
  maxMileage: '',
  minYear: '',
  maxYear: '',
  noTransferFee: '',
  freshDays: '',
  sortBy: 'newest',
};

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Najnowsze' },
  { value: 'effective_asc', label: 'Realny koszt/mies.: rosnąco' },
  { value: 'price_asc', label: 'Rata: rosnąco' },
  { value: 'price_desc', label: 'Rata: malejąco' },
  { value: 'fee_asc', label: 'Odstępne: rosnąco' },
  { value: 'total_asc', label: 'Koszt umowy: rosnąco' },
  { value: 'installments_asc', label: 'Najkrótsza umowa' },
  { value: 'deal', label: 'Najlepsza cena vs rynek' },
];

export const VEHICLE_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'Wszystkie pojazdy' },
  { value: 'samochód', label: 'Samochody' },
  { value: 'motocykl', label: 'Motocykle' },
  { value: 'łódź', label: 'Łodzie' },
  { value: 'inne', label: 'Inne' },
];

/** Everything except sortBy — sorting is not a filter and must not count. */
export function countActiveFilters(filters: Filters): number {
  return (Object.keys(filters) as (keyof Filters)[]).filter(
    (key) => key !== 'sortBy' && filters[key] !== '',
  ).length;
}

export type ActiveChip = { key: keyof Filters; label: string; clear: Partial<Filters> };

const money = (value: string) => `${Number(value).toLocaleString('pl-PL')} zł`;

/** Removable summary of what is currently narrowing the list. */
export function activeFilterChips(filters: Filters): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const push = (key: keyof Filters, label: string, clear?: Partial<Filters>) =>
    chips.push({ key, label, clear: clear ?? ({ [key]: '' } as Partial<Filters>) });

  if (filters.q) push('q', `„${filters.q}”`);
  if (filters.vehicleType) push('vehicleType', filters.vehicleType);
  if (filters.brand) push('brand', filters.brand);
  if (filters.model) push('model', filters.model);

  if (filters.minMonthlyPayment || filters.maxMonthlyPayment) {
    const label = !filters.minMonthlyPayment
      ? `rata do ${money(filters.maxMonthlyPayment)}`
      : !filters.maxMonthlyPayment
        ? `rata od ${money(filters.minMonthlyPayment)}`
        : `rata ${money(filters.minMonthlyPayment)} – ${money(filters.maxMonthlyPayment)}`;
    chips.push({ key: 'minMonthlyPayment', label, clear: { minMonthlyPayment: '', maxMonthlyPayment: '' } });
  }

  if (filters.noTransferFee) {
    push('noTransferFee', 'bez odstępnego');
  } else if (filters.minTransferFee || filters.maxTransferFee) {
    const label = !filters.minTransferFee
      ? `odstępne do ${money(filters.maxTransferFee)}`
      : !filters.maxTransferFee
        ? `odstępne od ${money(filters.minTransferFee)}`
        : `odstępne ${money(filters.minTransferFee)} – ${money(filters.maxTransferFee)}`;
    chips.push({ key: 'minTransferFee', label, clear: { minTransferFee: '', maxTransferFee: '' } });
  }

  if (filters.minRemainingInstallments || filters.maxRemainingInstallments) {
    const label = !filters.minRemainingInstallments
      ? `do ${filters.maxRemainingInstallments} rat`
      : !filters.maxRemainingInstallments
        ? `od ${filters.minRemainingInstallments} rat`
        : `${filters.minRemainingInstallments} – ${filters.maxRemainingInstallments} rat`;
    chips.push({
      key: 'maxRemainingInstallments',
      label,
      clear: { minRemainingInstallments: '', maxRemainingInstallments: '' },
    });
  }

  if (filters.minYear || filters.maxYear) {
    const label = `rocznik ${filters.minYear || '…'} – ${filters.maxYear || '…'}`;
    chips.push({ key: 'minYear', label, clear: { minYear: '', maxYear: '' } });
  }

  if (filters.minMileage || filters.maxMileage) {
    const label = !filters.minMileage
      ? `przebieg do ${Number(filters.maxMileage).toLocaleString('pl-PL')} km`
      : !filters.maxMileage
        ? `przebieg od ${Number(filters.minMileage).toLocaleString('pl-PL')} km`
        : `przebieg ${Number(filters.minMileage).toLocaleString('pl-PL')} – ${Number(filters.maxMileage).toLocaleString('pl-PL')} km`;
    chips.push({ key: 'minMileage', label, clear: { minMileage: '', maxMileage: '' } });
  }

  if (filters.freshDays) push('freshDays', `dodane w ${filters.freshDays} dni`);

  return chips;
}
