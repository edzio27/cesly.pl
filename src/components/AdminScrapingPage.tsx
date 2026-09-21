import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { buildDescription } from '../data/listingText';
import { Settings, Play, Trash2, Check, X, ExternalLink, Star } from 'lucide-react';

interface ScrapingSource {
  id: string;
  name: string;
  type: string;
  url: string;
  is_active: boolean;
  last_scraped_at: string | null;
  created_at: string;
}

interface ScrapedListing {
  id: string;
  source_id: string;
  external_id: string;
  raw_data: {
    title?: string;
    description?: string;
    source_excerpt?: string;
    external_url?: string;
    brand?: string;
    model?: string;
    year?: number | null;
    mileage?: number | null;
    vehicle_type?: string;
    images?: string[];
    location?: string | null;
    vehicle_price?: number | null;
    monthlyPayment?: number | null;
    transferFee?: number | null;
    remainingInstallments?: number | null;
    totalInstallments?: number | null;
    buyoutPrice?: number | null;
    priceType?: 'netto' | 'brutto' | null;
    remainingIsDerived?: boolean;
    is_complete?: boolean;
  };
  status: 'pending' | 'approved' | 'rejected' | 'published';
  listing_id?: string | null;
  created_at: string;
}

/**
 * Cztery liczby, bez których ogłoszenia nie da się zapisać — kolumny
 * `monthly_payment`, `transfer_fee`, `remaining_installments`
 * i `total_installments` są NOT NULL. Parser wyciąga komplet mniej więcej
 * w co piątym ogłoszeniu, więc resztę uzupełnia człowiek przy zatwierdzaniu.
 */
type EconomicsDraft = {
  monthlyPayment: string;
  transferFee: string;
  remainingInstallments: string;
  totalInstallments: string;
  buyoutPrice: string;
};

function draftFrom(listing: ScrapedListing): EconomicsDraft {
  const raw = listing.raw_data;
  const text = (value: number | null | undefined) => (value == null ? '' : String(value));
  return {
    monthlyPayment: text(raw.monthlyPayment),
    transferFee: text(raw.transferFee),
    remainingInstallments: text(raw.remainingInstallments),
    totalInstallments: text(raw.totalInstallments ?? raw.remainingInstallments),
    buyoutPrice: text(raw.buyoutPrice),
  };
}

export default function AdminScrapingPage() {
  const [sources, setSources] = useState<ScrapingSource[]>([]);
  const [scrapedListings, setScrapedListings] = useState<ScrapedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, EconomicsDraft>>({});
  const [publishingAll, setPublishingAll] = useState(false);
  // Kolejka pokazywała wszystko naraz, więc po imporcie nowe zgłoszenia ginęły
  // wśród rzeczy już przejrzanych. Domyślnie pokazujemy tylko to, co czeka
  // na decyzję.
  const [statusFilter, setStatusFilter] = useState<'todo' | 'published' | 'rejected' | 'all'>('todo');
  const [rowNotice, setRowNotice] = useState<Record<string, string>>({});
  const [busyRows, setBusyRows] = useState<Record<string, boolean>>({});
  const [scrapeSummary, setScrapeSummary] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    type: 'rss',
    url: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const counts = {
    todo: scrapedListings.filter((l) => l.status === 'pending' || l.status === 'approved').length,
    complete: scrapedListings.filter(
      (l) => l.raw_data.is_complete && (l.status === 'pending' || l.status === 'approved'),
    ).length,
    published: scrapedListings.filter((l) => l.status === 'published').length,
    rejected: scrapedListings.filter((l) => l.status === 'rejected').length,
  };

  const visibleListings = scrapedListings.filter((listing) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'todo') return listing.status === 'pending' || listing.status === 'approved';
    return listing.status === statusFilter;
  });

  /**
   * Każda akcja zmienia listę NA MIEJSCU. Wcześniej po zatwierdzeniu czy
   * usunięciu wołaliśmy loadData(), co przeładowywało całą kolejkę, gubiło
   * wpisane w formularzach liczby i rzucało stronę na początek — przy
   * przerabianiu kilkunastu ogłoszeń pod rząd to była główna uciążliwość.
   */
  function patchListing(id: string, patch: Partial<ScrapedListing>) {
    setScrapedListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function dropListing(id: string) {
    setScrapedListings((prev) => prev.filter((l) => l.id !== id));
  }

  /** Krótki komunikat przy wierszu — zamiast okienka alert(). */
  function flash(id: string, message: string) {
    setRowNotice((prev) => ({ ...prev, [id]: message }));
    setTimeout(() => setRowNotice((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    }), 4000);
  }

  async function loadData() {
    setLoading(true);

    const { data: sourcesData } = await supabase
      .from('scraping_sources')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: listingsData } = await supabase
      .from('scraped_listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (sourcesData) setSources(sourcesData);
    if (listingsData) setScrapedListings(listingsData);

    setLoading(false);
  }

  async function runScraper() {
    setScraping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-listings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      const perSource = (result.results ?? [])
        .map((entry: Record<string, unknown>) =>
          entry.error
            ? `${entry.source}: BŁĄD ${entry.error}`
            : entry.skipped
              ? `${entry.source}: pominięte (${entry.skipped})`
              : `${entry.source}: kandydatów ${entry.candidates}, znanych ${entry.alreadyKnown}, pobrano ${entry.fetched}, dodano ${entry.inserted} (w tym kompletnych ${entry.complete})`,
        )
        .join('\n');
      setScrapeSummary(`Import: dodano ${result.processed}. ${perSource}`);
      loadData();
    } catch (error) {
      console.error('Error running scraper:', error);
      setScrapeSummary('Nie udało się uruchomić importu.');
    } finally {
      setScraping(false);
    }
  }

  async function runBackfill() {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backfill-market-values`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Błąd');
      setBackfillResult(`Wyceniono ${result.processed} z ${result.total} ogłoszeń`);
    } catch (error: any) {
      setBackfillResult(`Błąd: ${error.message}`);
    } finally {
      setBackfilling(false);
    }
  }

  async function addSource() {
    if (!newSource.name || !newSource.url) {
      setScrapeSummary('Uzupełnij wszystkie pola źródła.');
      return;
    }

    // Dopisujemy zwrócony wiersz do listy zamiast przeładowywać całą stronę —
    // inaczej dodanie źródła gubiło stan kolejki i przewijało na początek.
    const { data, error } = await supabase
      .from('scraping_sources')
      .insert([newSource])
      .select()
      .single();

    if (error || !data) {
      console.error('Nie udało się dodać źródła:', error);
      setScrapeSummary(`Nie udało się dodać źródła: ${error?.message ?? 'nieznany błąd'}`);
      return;
    }

    setSources((prev) => [data, ...prev]);
    setNewSource({ name: '', type: 'rss', url: '' });
    setShowAddSource(false);
  }

  async function toggleSource(id: string, isActive: boolean) {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: !isActive } : s)));
    await supabase
      .from('scraping_sources')
      .update({ is_active: !isActive })
      .eq('id', id);
  }

  async function deleteSource(id: string) {
    const snapshot = sources.find((s) => s.id === id);
    setSources((prev) => prev.filter((s) => s.id !== id));

    const { error } = await supabase.from('scraping_sources').delete().eq('id', id);
    if (error && snapshot) {
      setSources((prev) => [snapshot, ...prev]);
      setScrapeSummary(`Nie udało się usunąć źródła: ${error.message}`);
    }
  }

  async function updateListingStatus(id: string, status: 'approved' | 'rejected') {
    const previous = scrapedListings.find((l) => l.id === id)?.status;
    patchListing(id, { status });
    await supabase
      .from('scraped_listings')
      .update({ status, processed_at: new Date().toISOString() })
      .eq('id', id);
    return previous;
  }

  function setDraft(id: string, patch: Partial<EconomicsDraft>, seed: ScrapedListing) {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? draftFrom(seed)), ...patch } }));
  }

  /**
   * Poprzednia wersja tej funkcji nie mogła zadziałać ani razu: wstawiała
   * kolumny, których w tabeli nie ma (`transmission`, `body_type`, `color`,
   * `location`, `contact_*`, `fuel_type`), a pomijała wszystkie NOT NULL
   * dotyczące cesji. Każde kliknięcie „Publikuj" kończyło się błędem Postgresa
   * schowanym pod komunikatem „Error publishing listing".
   */
  async function publishListing(listing: ScrapedListing, quiet = false): Promise<boolean> {
    const raw = listing.raw_data;
    const draft = drafts[listing.id] ?? draftFrom(listing);

    const toNumber = (value: string): number | null => {
      if (!value.trim()) return null;
      const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : null;
    };

    const monthlyPayment = toNumber(draft.monthlyPayment);
    const transferFee = toNumber(draft.transferFee);
    const remainingInstallments = toNumber(draft.remainingInstallments);
    const totalInstallments = toNumber(draft.totalInstallments);

    const missing: string[] = [];
    if (monthlyPayment == null) missing.push('rata miesięczna');
    if (transferFee == null) missing.push('odstępne (0 jeśli brak)');
    if (remainingInstallments == null) missing.push('pozostałe raty');
    if (totalInstallments == null) missing.push('raty łącznie');
    if (!raw.brand) missing.push('marka');
    if (!raw.model) missing.push('model');
    if (raw.year == null) missing.push('rocznik');

    if (missing.length > 0) {
      if (!quiet) flash(listing.id, `Brakuje: ${missing.join(', ')}`);
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: newListing, error } = await supabase
      .from('listings')
      .insert([{
        user_id: user.id,
        title: raw.title || `${raw.brand} ${raw.model}`.trim(),
        // Opis składamy tu jeszcze raz, z liczb w ich ostatecznej postaci —
        // moderator mógł je poprawić po imporcie. Nigdy nie kopiujemy opisu
        // ze źródła: to cudzy utwór, a my publikujemy własny tekst z faktów.
        description: buildDescription({
          brand: raw.brand,
          model: raw.model,
          year: raw.year,
          mileage: raw.mileage,
          location: raw.location,
          monthlyPayment,
          transferFee,
          remainingInstallments,
          totalInstallments,
          buyoutPrice: toNumber(draft.buyoutPrice),
          remainingIsDerived: raw.remainingIsDerived,
        }),
        vehicle_type: raw.vehicle_type || 'samochód',
        brand: raw.brand,
        model: raw.model,
        year: raw.year,
        mileage: raw.mileage ?? null,
        monthly_payment: monthlyPayment,
        transfer_fee: transferFee,
        remaining_installments: remainingInstallments,
        total_installments: totalInstallments,
        buyout_price: toNumber(draft.buyoutPrice),
        images: raw.images ?? [],
        // Kwoty w ogłoszeniach bywają netto — różnica to 23%, więc sztywne
        // 'brutto' zaniżało realny koszt o niemal jedną czwartą.
        price_type: raw.priceType ?? 'brutto',
        status: 'published',
        // Ogłoszenie nie jest nasze — zapisujemy skąd pochodzi i że zostało
        // dodane za autora. Bez tego nie da się go potem przekazać właścicielowi.
        origin: 'imported',
        source_url: raw.external_url ?? null,
      }])
      .select()
      .single();

    if (error || !newListing) {
      console.error('Publikacja nieudana:', error);
      if (!quiet) flash(listing.id, `Nie udało się: ${error?.message ?? 'nieznany błąd'}`);
      return false;
    }

    await supabase
      .from('scraped_listings')
      .update({
        status: 'published',
        listing_id: newListing.id,
        processed_at: new Date().toISOString(),
      })
      .eq('id', listing.id);

    patchListing(listing.id, { status: 'published', listing_id: newListing.id });
    return true;
  }

  /**
   * Publikuje hurtem wszystko, co ma komplet danych. Ogłoszenia niekompletne
   * pomija w ciszy — nie da się ich zapisać, bo kolumny są NOT NULL.
   */
  async function publishAllComplete() {
    const candidates = scrapedListings.filter(
      (listing) => listing.status === 'pending' || listing.status === 'approved',
    );
    if (candidates.length === 0) return;

    setPublishingAll(true);
    let published = 0;
    let skipped = 0;
    try {
      for (const listing of candidates) {
        const ok = await publishListing(listing, true);
        if (ok) published++;
        else skipped++;
      }
      setScrapeSummary(`Opublikowano ${published}, pominięto ${skipped} z powodu braku danych.`);
    } finally {
      setPublishingAll(false);
    }
  }

  /**
   * Podmienia opis już opublikowanego ogłoszenia na wygenerowany z faktów.
   * Potrzebne dla ogłoszeń zaimportowanych przed tą zmianą — mają w bazie
   * skopiowany opis z Otomoto, czasem razem z danymi kontaktowymi, które
   * sprzedający wpisał w treść.
   */
  async function rebuildDescriptions() {
    const published = scrapedListings.filter((l) => l.status === 'published' && l.listing_id);
    if (published.length === 0) {
      setScrapeSummary('Brak opublikowanych ogłoszeń z tej kolejki.');
      return;
    }

    let updated = 0;
    for (const listing of published) {
      const raw = listing.raw_data;
      const description = buildDescription({
        brand: raw.brand,
        model: raw.model,
        year: raw.year,
        mileage: raw.mileage,
        location: raw.location,
        monthlyPayment: raw.monthlyPayment,
        transferFee: raw.transferFee,
        remainingInstallments: raw.remainingInstallments,
        totalInstallments: raw.totalInstallments,
        buyoutPrice: raw.buyoutPrice,
        remainingIsDerived: raw.remainingIsDerived,
      });
      if (!description) continue;

      const { error } = await supabase
        .from('listings')
        .update({ description })
        .eq('id', listing.listing_id!);
      if (!error) updated++;
    }
    setScrapeSummary(`Przebudowano opisy: ${updated} z ${published.length}.`);
  }

  /** Zdejmuje opublikowane ogłoszenie ze strony; wpis zostaje jako odrzucony,
   *  żeby kolejny import go nie przywrócił. */
  /**
   * Zdejmuje ogłoszenie ze strony. Bez pytania o potwierdzenie, bo operacja
   * jest odwracalna: wpis zostaje w kolejce ze wszystkimi danymi i wystarczy
   * jedno kliknięcie „Publikuj", żeby wrócił na stronę.
   */
  async function unpublishListing(listing: ScrapedListing) {
    setBusyRows((prev) => ({ ...prev, [listing.id]: true }));
    patchListing(listing.id, { status: 'rejected', listing_id: null });

    try {
      if (listing.listing_id) {
        const { error } = await supabase.from('listings').delete().eq('id', listing.listing_id);
        if (error) {
          patchListing(listing.id, { status: 'published', listing_id: listing.listing_id });
          flash(listing.id, `Nie udało się usunąć: ${error.message}`);
          return;
        }
      }
      await supabase
        .from('scraped_listings')
        .update({ status: 'rejected', listing_id: null, processed_at: new Date().toISOString() })
        .eq('id', listing.id);
    } finally {
      setBusyRows((prev) => ({ ...prev, [listing.id]: false }));
    }
  }

  /** Kasuje wpis z kolejki na dobre. Uwaga: bez niego kolejny import może
   *  pobrać to ogłoszenie ponownie — odsiewanie działa po `external_id`. */
  /**
   * Kasuje wpis z kolejki. Też bez potwierdzenia — ogłoszenie wróci przy
   * kolejnym imporcie, bo odsiewanie działa po tym, co jest w kolejce.
   * Jeśli ma NIE wracać, właściwą akcją jest odrzucenie, nie skasowanie.
   */
  async function deleteQueueEntry(listing: ScrapedListing) {
    const snapshot = listing;
    dropListing(listing.id);
    const { error } = await supabase.from('scraped_listings').delete().eq('id', listing.id);
    if (error) {
      setScrapedListings((prev) => [snapshot, ...prev]);
      setScrapeSummary(`Nie udało się usunąć wpisu: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Scraping Management</h1>
        <p className="text-gray-600">Manage automatic listing collection from external sources</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Scraping Sources
          </h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={runScraper}
              disabled={scraping}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {scraping ? 'Running...' : 'Run Scraper'}
            </button>
            <div className="flex flex-col gap-1">
              <button
                onClick={runBackfill}
                disabled={backfilling}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                <Star className="w-4 h-4" />
                {backfilling ? 'Szacowanie...' : 'Wycen brakujące oceny (AI)'}
              </button>
              {backfillResult && (
                <p className="text-xs text-gray-600 px-1">{backfillResult}</p>
              )}
            </div>
            <button
              onClick={() => setShowAddSource(!showAddSource)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add Source
            </button>
          </div>
        </div>

        {showAddSource && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3">Add New Source</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Source Name"
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
              <select
                value={newSource.type}
                onChange={(e) => setNewSource({ ...newSource, type: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="rss">RSS Feed</option>
                <option value="web">Web Page</option>
                <option value="facebook">Facebook Group</option>
              </select>
              <input
                type="url"
                placeholder="URL"
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={addSource}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddSource(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {sources.map((source) => (
            <div key={source.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{source.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded ${source.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {source.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">{source.type}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{source.url}</p>
                {source.last_scraped_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last scraped: {new Date(source.last_scraped_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSource(source.id, source.is_active)}
                  className={`px-3 py-1 rounded ${source.is_active ? 'bg-gray-300' : 'bg-green-500 text-white'}`}
                >
                  {source.is_active ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => deleteSource(source.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">
            Kolejka importu
            {' · '}
            <span className="text-sm font-normal text-gray-500">
              do decyzji: {counts.todo} · kompletnych wśród nich: {counts.complete}
            </span>
          </h2>
          <button
            onClick={rebuildDescriptions}
            className="rounded-lg border border-amber-300 px-4 py-2 text-sm text-amber-800 hover:bg-amber-50"
            title="Podmienia skopiowane opisy na wygenerowane z faktów"
          >
            Przebuduj opisy opublikowanych
          </button>
          <button
            onClick={publishAllComplete}
            disabled={publishingAll}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {publishingAll ? 'Publikuję…' : 'Opublikuj wszystkie kompletne'}
          </button>
        </div>

        {scrapeSummary && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white">
            <span>{scrapeSummary}</span>
            <button onClick={() => setScrapeSummary(null)} className="shrink-0 text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mb-5 flex flex-wrap gap-2">
          {([
            ['todo', `Do decyzji (${counts.todo})`],
            ['published', `Opublikowane (${counts.published})`],
            ['rejected', `Odrzucone (${counts.rejected})`],
            ['all', `Wszystkie (${scrapedListings.length})`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`rounded-full px-3 py-1 text-sm ${
                statusFilter === value ? 'bg-gray-900 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {visibleListings.length === 0 && (
          <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            Nic tu nie ma. Uruchom import albo przełącz filtr.
          </p>
        )}

        <div className="space-y-4">
          {visibleListings.map((listing) => (
            <div
              key={listing.id}
              className={`rounded-lg border p-4 transition-opacity ${busyRows[listing.id] ? 'opacity-50' : ''}`}
            >
              {rowNotice[listing.id] && (
                <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{rowNotice[listing.id]}</p>
              )}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{listing.raw_data.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${
                      listing.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      listing.status === 'approved' ? 'bg-green-100 text-green-700' :
                      listing.status === 'published' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {listing.status}
                    </span>
                  </div>

                  <p className="mb-2 text-sm text-gray-700">{listing.raw_data.description}</p>

                  {listing.raw_data.source_excerpt && (
                    <blockquote className="mb-2 border-l-2 border-gray-300 pl-3 text-xs italic text-gray-500">
                      „{listing.raw_data.source_excerpt}"
                      <span className="not-italic"> — fragment ogłoszenia źródłowego, do weryfikacji</span>
                    </blockquote>
                  )}

                  <p className="text-xs text-gray-500 mb-2">
                    {[listing.raw_data.brand, listing.raw_data.model, listing.raw_data.year,
                      listing.raw_data.mileage ? `${listing.raw_data.mileage.toLocaleString('pl-PL')} km` : null,
                      listing.raw_data.location].filter(Boolean).join(' · ')}
                  </p>

                  {/* Parser trafia komplet liczb mniej więcej w co piątym ogłoszeniu.
                      Reszta wymaga uzupełnienia tutaj — inaczej zapis do `listings`
                      odbije się o NOT NULL. */}
                  {(listing.status === 'pending' || listing.status === 'approved') && (
                    <div className="my-3 rounded border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                        <span>Dane cesji</span>
                        {listing.raw_data.is_complete ? (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">komplet z ogłoszenia</span>
                        ) : (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">uzupełnij ręcznie</span>
                        )}
                        {listing.raw_data.remainingIsDerived && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">
                            liczba rat wyliczona z daty końca umowy
                          </span>
                        )}
                        {listing.raw_data.priceType === 'netto' && (
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-purple-700">
                            kwoty netto
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {([
                          ['monthlyPayment', 'Rata zł'],
                          ['transferFee', 'Odstępne zł'],
                          ['remainingInstallments', 'Pozostałe raty'],
                          ['totalInstallments', 'Raty łącznie'],
                          ['buyoutPrice', 'Wykup zł'],
                        ] as [keyof EconomicsDraft, string][]).map(([field, label]) => (
                          <label key={field} className="text-xs text-gray-600">
                            {label}
                            <input
                              value={(drafts[listing.id] ?? draftFrom(listing))[field]}
                              onChange={(e) => setDraft(listing.id, { [field]: e.target.value }, listing)}
                              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {listing.raw_data.external_url && (
                    <a
                      href={listing.raw_data.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View Original <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    Scraped: {new Date(listing.created_at).toLocaleString()}
                  </p>
                </div>

                {listing.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => updateListingStatus(listing.id, 'approved')}
                      className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      title="Approve"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => updateListingStatus(listing.id, 'rejected')}
                      className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      title="Reject"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Publikowanie dostępne też dla oczekujących — osobne
                    „zatwierdź, potem publikuj" to były dwa kliknięcia na to samo. */}
                {(listing.status === 'approved' || listing.status === 'pending') && (
                  <button
                    onClick={() => publishListing(listing)}
                    disabled={busyRows[listing.id]}
                    className="ml-2 whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Publikuj
                  </button>
                )}

                {listing.status === 'published' && (
                  <button
                    onClick={() => unpublishListing(listing)}
                    className="ml-4 whitespace-nowrap rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                    title="Usuwa ogłoszenie z serwisu; wpis zostaje jako odrzucony"
                  >
                    Usuń ze strony
                  </button>
                )}

                {(listing.status === 'rejected' || listing.status === 'published') && (
                  <button
                    onClick={() => deleteQueueEntry(listing)}
                    className="ml-2 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                    title="Usuń wpis z kolejki na stałe"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
