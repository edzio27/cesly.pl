import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, SlidersHorizontal, X, Bookmark, Check, ArrowUpDown } from 'lucide-react';
import {
  ActiveChip,
  Filters,
  SORT_OPTIONS,
  VEHICLE_TYPES,
  activeFilterChips,
  countActiveFilters,
} from '../types/filters';

type FilterBarProps = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  resultCount: number;
  loading: boolean;
  canSaveSearch: boolean;
  onSaveSearch: () => void;
  searchSaved: boolean;
};

const POPULAR_BRANDS = ['BMW', 'Audi', 'Mercedes-Benz', 'Volkswagen', 'Škoda', 'Toyota', 'Kia', 'Volvo', 'Porsche', 'Hyundai'];

const PAYMENT_PRESETS = [
  { label: 'do 500 zł', min: '', max: '500' },
  { label: '500 – 1 000 zł', min: '500', max: '1000' },
  { label: '1 000 – 2 000 zł', min: '1000', max: '2000' },
  { label: '2 000 – 3 500 zł', min: '2000', max: '3500' },
  { label: '3 500 zł i więcej', min: '3500', max: '' },
];

const INSTALMENT_PRESETS = [
  { label: 'do 12 rat', min: '', max: '12' },
  { label: '12 – 24 raty', min: '12', max: '24' },
  { label: '24 – 48 rat', min: '24', max: '48' },
  { label: 'powyżej 48 rat', min: '48', max: '' },
];

const MILEAGE_PRESETS = ['20000', '50000', '100000', '150000'];

function Popover({
  label,
  summary,
  active,
  children,
}: {
  label: string;
  summary?: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
          active
            ? 'border-accent-300 bg-accent-50 text-accent-700'
            : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300'
        }`}
      >
        <span>{summary || label}</span>
        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-ink-100 bg-white p-4 shadow-lift motion-safe:animate-scale-in">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-400">{label}</p>
          {children}
        </div>
      )}
    </div>
  );
}

function RangeInputs({
  min,
  max,
  unit,
  onMin,
  onMax,
}: {
  min: string;
  max: string;
  unit: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        value={min}
        onChange={(e) => onMin(e.target.value)}
        placeholder="od"
        className="field"
        aria-label={`Od (${unit})`}
      />
      <span className="text-ink-300">–</span>
      <input
        type="number"
        inputMode="numeric"
        value={max}
        onChange={(e) => onMax(e.target.value)}
        placeholder="do"
        className="field"
        aria-label={`Do (${unit})`}
      />
    </div>
  );
}

function PresetRow({
  presets,
  min,
  max,
  onPick,
}: {
  presets: { label: string; min: string; max: string }[];
  min: string;
  max: string;
  onPick: (min: string, max: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {presets.map((preset) => {
        const isActive = min === preset.min && max === preset.max;
        return (
          <button
            key={preset.label}
            type="button"
            onClick={() => (isActive ? onPick('', '') : onPick(preset.min, preset.max))}
            className={`chip ${isActive ? 'chip-active' : ''}`}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

type GroupProps = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  /** The bar has one row to spend, so the rarer filters collapse into "Więcej". */
  layout: 'bar' | 'sheet';
};

function YearFields({ filters, onChange }: Omit<GroupProps, 'layout'>) {
  return (
    <RangeInputs
      min={filters.minYear}
      max={filters.maxYear}
      unit="rok"
      onMin={(v) => onChange({ minYear: v })}
      onMax={(v) => onChange({ maxYear: v })}
    />
  );
}

function MileageFields({ filters, onChange }: Omit<GroupProps, 'layout'>) {
  return (
    <>
      <RangeInputs
        min={filters.minMileage}
        max={filters.maxMileage}
        unit="km"
        onMin={(v) => onChange({ minMileage: v })}
        onMax={(v) => onChange({ maxMileage: v })}
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {MILEAGE_PRESETS.map((km) => (
          <button
            key={km}
            type="button"
            onClick={() => onChange({ maxMileage: filters.maxMileage === km ? '' : km })}
            className={`chip ${filters.maxMileage === km ? 'chip-active' : ''}`}
          >
            do {Number(km).toLocaleString('pl-PL')} km
          </button>
        ))}
      </div>
    </>
  );
}

function FreshnessFields({ filters, onChange }: Omit<GroupProps, 'layout'>) {
  return (
    <div className="space-y-1">
      {[
        { value: '', label: 'Wszystkie' },
        { value: '7', label: 'Z ostatnich 7 dni' },
        { value: '30', label: 'Z ostatnich 30 dni' },
      ].map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange({ freshDays: option.value })}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
            filters.freshDays === option.value ? 'bg-accent-50 text-accent-700' : 'text-ink-700 hover:bg-ink-50'
          }`}
        >
          {option.label}
          {filters.freshDays === option.value && <Check size={15} />}
        </button>
      ))}
    </div>
  );
}

/** The filter controls, shared by the desktop bar and the mobile sheet. */
function FilterGroups({ filters, onChange, layout }: GroupProps) {
  const paymentSummary =
    filters.minMonthlyPayment || filters.maxMonthlyPayment
      ? `Rata ${filters.minMonthlyPayment || '0'}–${filters.maxMonthlyPayment || '∞'} zł`
      : undefined;

  const feeSummary = filters.noTransferFee
    ? 'Bez odstępnego'
    : filters.minTransferFee || filters.maxTransferFee
      ? `Odstępne ${filters.minTransferFee || '0'}–${filters.maxTransferFee || '∞'}`
      : undefined;

  const instalmentSummary =
    filters.minRemainingInstallments || filters.maxRemainingInstallments
      ? `${filters.minRemainingInstallments || '0'}–${filters.maxRemainingInstallments || '∞'} rat`
      : undefined;

  return (
    <>
      <Popover
        label="Typ pojazdu"
        summary={filters.vehicleType ? VEHICLE_TYPES.find((t) => t.value === filters.vehicleType)?.label : undefined}
        active={!!filters.vehicleType}
      >
        <div className="space-y-1">
          {VEHICLE_TYPES.map((type) => (
            <button
              key={type.label}
              type="button"
              onClick={() => onChange({ vehicleType: type.value })}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                filters.vehicleType === type.value ? 'bg-accent-50 text-accent-700' : 'text-ink-700 hover:bg-ink-50'
              }`}
            >
              {type.label}
              {filters.vehicleType === type.value && <Check size={15} />}
            </button>
          ))}
        </div>
      </Popover>

      <Popover
        label="Marka i model"
        summary={[filters.brand, filters.model].filter(Boolean).join(' ') || undefined}
        active={!!(filters.brand || filters.model)}
      >
        <div className="space-y-2">
          <input
            value={filters.brand}
            onChange={(e) => onChange({ brand: e.target.value })}
            placeholder="Marka, np. BMW"
            className="field"
          />
          <input
            value={filters.model}
            onChange={(e) => onChange({ model: e.target.value })}
            placeholder="Model, np. X5"
            className="field"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {POPULAR_BRANDS.map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => onChange({ brand: filters.brand === brand ? '' : brand, model: '' })}
              className={`chip ${filters.brand === brand ? 'chip-active' : ''}`}
            >
              {brand}
            </button>
          ))}
        </div>
      </Popover>

      <Popover label="Rata miesięczna" summary={paymentSummary} active={!!paymentSummary}>
        <RangeInputs
          min={filters.minMonthlyPayment}
          max={filters.maxMonthlyPayment}
          unit="zł"
          onMin={(v) => onChange({ minMonthlyPayment: v })}
          onMax={(v) => onChange({ maxMonthlyPayment: v })}
        />
        <PresetRow
          presets={PAYMENT_PRESETS}
          min={filters.minMonthlyPayment}
          max={filters.maxMonthlyPayment}
          onPick={(min, max) => onChange({ minMonthlyPayment: min, maxMonthlyPayment: max })}
        />
      </Popover>

      <Popover label="Odstępne" summary={feeSummary} active={!!feeSummary}>
        <button
          type="button"
          onClick={() =>
            onChange(
              filters.noTransferFee
                ? { noTransferFee: '' }
                : { noTransferFee: '1', minTransferFee: '', maxTransferFee: '' },
            )
          }
          className={`mb-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
            filters.noTransferFee ? 'bg-emerald-50 text-emerald-700' : 'text-ink-700 hover:bg-ink-50'
          }`}
        >
          Tylko bez odstępnego
          {!!filters.noTransferFee && <Check size={15} />}
        </button>
        <div className={filters.noTransferFee ? 'pointer-events-none opacity-40' : ''}>
          <RangeInputs
            min={filters.minTransferFee}
            max={filters.maxTransferFee}
            unit="zł"
            onMin={(v) => onChange({ minTransferFee: v })}
            onMax={(v) => onChange({ maxTransferFee: v })}
          />
        </div>
      </Popover>

      <Popover label="Pozostałe raty" summary={instalmentSummary} active={!!instalmentSummary}>
        <RangeInputs
          min={filters.minRemainingInstallments}
          max={filters.maxRemainingInstallments}
          unit="rat"
          onMin={(v) => onChange({ minRemainingInstallments: v })}
          onMax={(v) => onChange({ maxRemainingInstallments: v })}
        />
        <PresetRow
          presets={INSTALMENT_PRESETS}
          min={filters.minRemainingInstallments}
          max={filters.maxRemainingInstallments}
          onPick={(min, max) => onChange({ minRemainingInstallments: min, maxRemainingInstallments: max })}
        />
      </Popover>

      {layout === 'sheet' ? (
        <>
          <Popover
            label="Rocznik"
            summary={filters.minYear || filters.maxYear ? `${filters.minYear || '…'}–${filters.maxYear || '…'}` : undefined}
            active={!!(filters.minYear || filters.maxYear)}
          >
            <YearFields filters={filters} onChange={onChange} />
          </Popover>

          <Popover
            label="Przebieg"
            summary={
              filters.minMileage || filters.maxMileage
                ? `do ${Number(filters.maxMileage || 0).toLocaleString('pl-PL')} km`
                : undefined
            }
            active={!!(filters.minMileage || filters.maxMileage)}
          >
            <MileageFields filters={filters} onChange={onChange} />
          </Popover>

          <Popover
            label="Świeżość ogłoszenia"
            summary={filters.freshDays ? `Z ostatnich ${filters.freshDays} dni` : undefined}
            active={!!filters.freshDays}
          >
            <FreshnessFields filters={filters} onChange={onChange} />
          </Popover>
        </>
      ) : (
        <Popover
          label="Więcej filtrów"
          active={!!(filters.minYear || filters.maxYear || filters.minMileage || filters.maxMileage || filters.freshDays)}
        >
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">Rocznik</p>
              <YearFields filters={filters} onChange={onChange} />
            </div>
            <div className="border-t border-ink-100 pt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">Przebieg</p>
              <MileageFields filters={filters} onChange={onChange} />
            </div>
            <div className="border-t border-ink-100 pt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">Świeżość ogłoszenia</p>
              <FreshnessFields filters={filters} onChange={onChange} />
            </div>
          </div>
        </Popover>
      )}
    </>
  );
}

export function FilterBar({
  filters,
  onChange,
  onReset,
  resultCount,
  loading,
  canSaveSearch,
  onSaveSearch,
  searchSaved,
}: FilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeCount = countActiveFilters(filters);
  const chips: ActiveChip[] = activeFilterChips(filters);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  return (
    <div className="sticky top-16 z-30 border-b border-ink-100 glass-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 py-3">
          {/* Desktop: filters live inline. Mobile: one button, one sheet. */}
          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            <FilterGroups filters={filters} onChange={onChange} layout="bar" />
          </div>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink-700 lg:hidden"
          >
            <SlidersHorizontal size={16} />
            Filtry
            {activeCount > 0 && (
              <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden whitespace-nowrap text-sm text-ink-500 sm:block">
              {loading ? 'Szukam…' : `${resultCount.toLocaleString('pl-PL')} ${resultCount === 1 ? 'oferta' : 'ofert'}`}
            </span>

            <label className="relative flex items-center">
              <ArrowUpDown size={15} className="pointer-events-none absolute left-3 text-ink-400" />
              <select
                value={filters.sortBy}
                onChange={(e) => onChange({ sortBy: e.target.value })}
                aria-label="Sortowanie"
                className="w-[11.5rem] appearance-none truncate rounded-xl border border-ink-200 bg-white py-2 pl-9 pr-8 text-sm font-semibold text-ink-700 hover:border-ink-300 sm:w-auto"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 text-ink-400" />
            </label>
          </div>
        </div>

        {(chips.length > 0 || activeCount > 0) && (
          <div className="flex flex-wrap items-center gap-2 pb-3">
            {chips.map((chip) => (
              <button
                key={`${chip.key}-${chip.label}`}
                type="button"
                onClick={() => onChange(chip.clear)}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink-700"
              >
                {chip.label}
                <X size={12} />
              </button>
            ))}
            <button type="button" onClick={onReset} className="text-xs font-semibold text-ink-500 underline hover:text-ink-800">
              Wyczyść wszystko
            </button>
            {canSaveSearch && (
              <button
                type="button"
                onClick={onSaveSearch}
                className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-accent-600 hover:text-accent-700"
              >
                <Bookmark size={13} />
                {searchSaved ? 'Zapisano!' : 'Zapisz to wyszukiwanie'}
              </button>
            )}
          </div>
        )}
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink-900">Filtry</h2>
              <button onClick={() => setSheetOpen(false)} className="rounded-full p-2 text-ink-500 hover:bg-ink-50">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col items-stretch gap-2 [&_.relative>button]:w-full [&_.relative>button]:justify-between">
              <FilterGroups filters={filters} onChange={onChange} layout="sheet" />
            </div>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onReset} className="btn-ghost flex-1">
                Wyczyść
              </button>
              <button type="button" onClick={() => setSheetOpen(false)} className="btn-accent flex-[2]">
                Pokaż {resultCount.toLocaleString('pl-PL')} ofert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
