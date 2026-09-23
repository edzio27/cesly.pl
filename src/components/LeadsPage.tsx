import { useCallback, useEffect, useState } from 'react';
import { Phone, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

type LeadStatus = 'new' | 'contacted' | 'closed';

type Lead = {
  id: string;
  created_at: string;
  name: string;
  contact: string;
  message: string | null;
  intent: 'przejme' | 'oddam' | 'finansowanie';
  listing_id: string | null;
  source_path: string | null;
  status: LeadStatus;
  notes: string | null;
};

const INTENT_LABEL: Record<Lead['intent'], string> = {
  przejme: 'Chce przejąć cesję',
  oddam: 'Chce oddać leasing',
  finansowanie: 'Pyta o finansowanie',
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'Nowe',
  contacted: 'Skontaktowano',
  closed: 'Zamknięte',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadStatus | 'all'>('new');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (loadError) setError(loadError.message);
    else setLeads((data ?? []) as Lead[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Zmiany lecą w tle, lista zmienia się od razu — tak jak w panelu importu.
  async function setStatus(id: string, status: LeadStatus) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    await supabase.from('leads').update({ status }).eq('id', id);
  }

  async function remove(id: string) {
    const snapshot = leads.find((l) => l.id === id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    const { error: deleteError } = await supabase.from('leads').delete().eq('id', id);
    if (deleteError && snapshot) {
      setLeads((prev) => [snapshot, ...prev]);
      setError(`Nie udało się usunąć: ${deleteError.message}`);
    }
  }

  const counts = {
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    closed: leads.filter((l) => l.status === 'closed').length,
  };
  const visible = leads.filter((l) => filter === 'all' || l.status === filter);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
        Zapytania o pomoc przy cesji
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Zgłoszenia z formularza na stronach ogłoszeń. Dane osobowe — nie przekazuj ich nikomu, kogo nie ma
        w treści zgody.
      </p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        {([
          ['new', `Nowe (${counts.new})`],
          ['contacted', `Skontaktowano (${counts.contacted})`],
          ['closed', `Zamknięte (${counts.closed})`],
          ['all', `Wszystkie (${leads.length})`],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === value ? 'bg-ink-900 text-white' : 'border border-ink-200 text-ink-700 hover:bg-ink-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-ink-500">Wczytuję…</p>
      ) : visible.length === 0 ? (
        <p className="mt-8 rounded-xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
          Brak zgłoszeń w tym widoku.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {visible.map((lead) => (
            <div key={lead.id} className="rounded-2xl border border-ink-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">
                    {lead.name}
                    <span className="ml-2 rounded bg-ink-100 px-2 py-0.5 text-xs font-normal text-ink-600">
                      {INTENT_LABEL[lead.intent]}
                    </span>
                    <span className="ml-1.5 rounded bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-800">
                      {STATUS_LABEL[lead.status]}
                    </span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-700">
                    <Phone size={14} />
                    {lead.contact}
                  </p>
                  {lead.message && <p className="mt-2 text-sm text-ink-600">{lead.message}</p>}
                  <p className="mt-2 text-xs text-ink-400">
                    {new Date(lead.created_at).toLocaleString('pl-PL')}
                    {lead.listing_id && (
                      <>
                        {' · '}
                        <a
                          href={`/listing/${lead.listing_id}`}
                          className="inline-flex items-center gap-1 underline hover:text-accent-600"
                        >
                          ogłoszenie <ExternalLink size={11} />
                        </a>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {lead.status !== 'contacted' && (
                    <button onClick={() => setStatus(lead.id, 'contacted')} className="btn-ghost text-sm">
                      Skontaktowano
                    </button>
                  )}
                  {lead.status !== 'closed' && (
                    <button onClick={() => setStatus(lead.id, 'closed')} className="btn-ghost text-sm">
                      Zamknij
                    </button>
                  )}
                  <button
                    onClick={() => remove(lead.id)}
                    className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
                    title="Usuń zgłoszenie"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
