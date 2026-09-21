import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
    remainingIsDerived?: boolean;
    is_complete?: boolean;
  };
  status: 'pending' | 'approved' | 'rejected' | 'published';
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
      .limit(50);

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
      alert(`Import zakończony. Dodano ${result.processed} ogłoszeń.\n\n${perSource}`);
      loadData();
    } catch (error) {
      console.error('Error running scraper:', error);
      alert('Error running scraper');
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
      alert('Please fill in all fields');
      return;
    }

    const { error } = await supabase
      .from('scraping_sources')
      .insert([newSource]);

    if (error) {
      console.error('Error adding source:', error);
      alert('Error adding source');
    } else {
      setNewSource({ name: '', type: 'rss', url: '' });
      setShowAddSource(false);
      loadData();
    }
  }

  async function toggleSource(id: string, isActive: boolean) {
    await supabase
      .from('scraping_sources')
      .update({ is_active: !isActive })
      .eq('id', id);

    loadData();
  }

  async function deleteSource(id: string) {
    if (!confirm('Are you sure you want to delete this source?')) return;

    await supabase
      .from('scraping_sources')
      .delete()
      .eq('id', id);

    loadData();
  }

  async function updateListingStatus(id: string, status: 'approved' | 'rejected') {
    await supabase
      .from('scraped_listings')
      .update({ status, processed_at: new Date().toISOString() })
      .eq('id', id);

    loadData();
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
  async function publishListing(listing: ScrapedListing) {
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
      alert(`Nie mogę opublikować — brakuje: ${missing.join(', ')}.\nUzupełnij pola przy ogłoszeniu i spróbuj ponownie.`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newListing, error } = await supabase
      .from('listings')
      .insert([{
        user_id: user.id,
        title: raw.title || `${raw.brand} ${raw.model}`.trim(),
        description: raw.description || '',
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
        price_type: 'brutto',
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
      alert(`Publikacja nieudana: ${error?.message ?? 'nieznany błąd'}`);
      return;
    }

    await supabase
      .from('scraped_listings')
      .update({
        status: 'published',
        listing_id: newListing.id,
        processed_at: new Date().toISOString(),
      })
      .eq('id', listing.id);

    alert('Ogłoszenie opublikowane.');
    loadData();
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
        <h2 className="text-xl font-bold mb-6">Scraped Listings ({scrapedListings.length})</h2>

        <div className="space-y-4">
          {scrapedListings.map((listing) => (
            <div key={listing.id} className="border rounded-lg p-4">
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

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{listing.raw_data.description}</p>

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

                {listing.status === 'approved' && (
                  <button
                    onClick={() => publishListing(listing)}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Publish
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
