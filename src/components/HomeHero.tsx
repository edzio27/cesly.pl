import { useState } from 'react';
import { Search, ArrowRight, Plus, ShieldCheck, Zap, Coins, TrendingUp, ChevronDown } from 'lucide-react';
import { Filters, VEHICLE_TYPES } from '../types/filters';
import { formatPLN } from '../utils/listingMetrics';

export type HomeStats = {
  total: number;
  addedThisWeek: number;
  medianPayment: number | null;
  noFeeCount: number;
};

type HomeHeroProps = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onSubmit: () => void;
  onAddListing: () => void;
  stats: HomeStats | null;
};

const QUICK_CHIPS: { label: string; patch: Partial<Filters> }[] = [
  { label: 'Rata do 1 000 zł', patch: { minMonthlyPayment: '', maxMonthlyPayment: '1000' } },
  { label: 'Bez odstępnego', patch: { noTransferFee: '1', minTransferFee: '', maxTransferFee: '' } },
  { label: 'Krótka umowa — do 12 rat', patch: { minRemainingInstallments: '', maxRemainingInstallments: '12' } },
  { label: 'Dodane w ostatnich 7 dniach', patch: { freshDays: '7' } },
  { label: 'Motocykle', patch: { vehicleType: 'motocykl' } },
];

const SELLER_POINTS = [
  { icon: Coins, title: 'Zero opłat i prowizji', text: 'Dodanie ogłoszenia jest darmowe — nie pobieramy prowizji od cesji.' },
  { icon: Zap, title: 'Ogłoszenie w 3 minuty', text: 'Wklej link z Otomoto albo treść ogłoszenia — resztę uzupełnimy za Ciebie.' },
  { icon: ShieldCheck, title: 'Tylko szukający cesji', text: 'Trafiasz do ludzi, którzy celowo szukają przejęcia leasingu, nie do przypadkowych.' },
];

export function HomeHero({ filters, onChange, onSubmit, onAddListing, stats }: HomeHeroProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');

  return (
    <section className="relative overflow-hidden bg-ink-950">
      {/* Mesh + grid backdrop instead of a flat gradient. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-accent-600/25 blur-[120px] motion-safe:animate-float-slow" />
        <div className="absolute -right-24 top-10 h-[24rem] w-[24rem] rounded-full bg-brand-blue/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[20rem] w-[20rem] rounded-full bg-accent-400/10 blur-[100px]" />
        <div className="absolute inset-0 bg-grid-faint bg-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 lg:px-8 lg:pb-14 lg:pt-16">
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur">
          {(
            [
              { key: 'buy', label: 'Szukam cesji' },
              { key: 'sell', label: 'Chcę oddać leasing' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                mode === tab.key ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-200 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === 'buy' ? (
          <>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white text-balance sm:text-5xl lg:text-6xl">
              Wszystkie cesje leasingu
              <span className="block text-accent-400">w jednym miejscu</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-200 sm:text-lg">
              Filtruj po racie, odstępnym i liczbie pozostałych rat — a nie po słowie „cesja” w opisie.
              Pokazujemy też realny koszt miesięczny, czyli ratę razem z rozłożonym odstępnym.
            </p>

            <div id="szukaj" className="mt-8 scroll-mt-24">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSubmit();
                }}
                className="rounded-3xl border border-white/10 bg-white/[0.07] p-2 backdrop-blur-xl lg:flex lg:items-center lg:gap-2"
              >
                {/* On mobile the fields stack, so each gets a hairline of its
                    own - without it the selects read as static labels. */}
                <div className="relative flex-[2]">
                  <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    value={filters.q}
                    onChange={(e) => onChange({ q: e.target.value })}
                    placeholder="Marka, model albo cokolwiek z ogłoszenia…"
                    aria-label="Szukaj ogłoszeń cesji"
                    className="w-full rounded-2xl bg-transparent py-4 pl-12 pr-4 text-base text-white placeholder:text-ink-300 focus:outline-none"
                  />
                </div>

                <div className="hidden h-8 w-px bg-white/10 lg:block" />

                <div className="relative border-t border-white/10 lg:border-t-0">
                  <select
                    value={filters.vehicleType}
                    onChange={(e) => onChange({ vehicleType: e.target.value })}
                    aria-label="Typ pojazdu"
                    className="w-full cursor-pointer appearance-none rounded-2xl bg-transparent py-4 pl-4 pr-10 text-base font-medium text-white focus:outline-none lg:w-auto [&>option]:text-ink-900"
                  >
                    {VEHICLE_TYPES.map((type) => (
                      <option key={type.label} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-300"
                  />
                </div>

                <div className="hidden h-8 w-px bg-white/10 lg:block" />

                <div className="relative w-full border-t border-white/10 lg:w-44 lg:border-t-0">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={filters.maxMonthlyPayment}
                    onChange={(e) => onChange({ maxMonthlyPayment: e.target.value })}
                    placeholder="Rata do…"
                    aria-label="Maksymalna rata miesięczna"
                    className="w-full rounded-2xl bg-transparent px-4 py-4 text-base text-white placeholder:text-ink-300 focus:outline-none"
                  />
                  {filters.maxMonthlyPayment && (
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-300">zł</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 px-7 py-4 text-base font-bold text-white transition-all hover:bg-accent-600 hover:shadow-glow active:scale-[0.99] lg:mt-0 lg:w-auto"
                >
                  Szukaj
                  <ArrowRight size={18} />
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => onChange(chip.patch)}
                    className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-ink-100 backdrop-blur transition-colors hover:border-accent-400/60 hover:bg-accent-500/10 hover:text-white"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {stats && (
              <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'aktywnych ogłoszeń', value: stats.total.toLocaleString('pl-PL'), icon: TrendingUp },
                  { label: 'dodanych w tym tygodniu', value: stats.addedThisWeek.toLocaleString('pl-PL'), icon: Zap },
                  {
                    label: 'mediana raty',
                    value: stats.medianPayment != null ? formatPLN(stats.medianPayment) : '—',
                    icon: Coins,
                  },
                  { label: 'ofert bez odstępnego', value: stats.noFeeCount.toLocaleString('pl-PL'), icon: ShieldCheck },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur"
                  >
                    <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-300">
                      <stat.icon size={12} className="text-accent-400" />
                      {stat.label}
                    </dt>
                    <dd className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white text-balance sm:text-5xl">
                Oddaj leasing,
                <span className="block text-accent-400">zanim zapłacisz kolejną ratę</span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-200 sm:text-lg">
                Wystaw ogłoszenie na portalu, na który ludzie wchodzą wyłącznie po cesje.
                Bez opłat, bez prowizji, bez ginięcia między tysiącami ofert sprzedaży.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={onAddListing}
                  className="flex items-center gap-2 rounded-2xl bg-accent-500 px-7 py-4 text-base font-bold text-white transition-all hover:bg-accent-600 hover:shadow-glow active:scale-[0.99]"
                >
                  <Plus size={19} />
                  Dodaj ogłoszenie za darmo
                </button>
                <button
                  onClick={() => setMode('buy')}
                  className="rounded-2xl border border-white/15 px-5 py-4 text-sm font-semibold text-ink-100 transition-colors hover:border-white/30 hover:text-white"
                >
                  Najpierw pokaż mi oferty
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {SELLER_POINTS.map((point) => (
                <div
                  key={point.title}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
                    <point.icon size={19} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{point.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-200">{point.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
