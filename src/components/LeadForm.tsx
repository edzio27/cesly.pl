import { useState } from 'react';
import { Check, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FINANCING_PARTNER } from '../config/partners';

type LeadIntent = 'przejme' | 'oddam' | 'finansowanie';

type LeadFormProps = {
  /** Ogłoszenie, przy którym stoi formularz — trafia do zgłoszenia jako kontekst. */
  listingId?: string;
  defaultIntent?: LeadIntent;
};

const INTENTS: { value: LeadIntent; label: string }[] = [
  { value: 'przejme', label: 'Chcę przejąć cesję' },
  { value: 'oddam', label: 'Chcę oddać swój leasing' },
  { value: 'finansowanie', label: 'Pytanie o finansowanie' },
];

/**
 * Zgoda musi wymieniać odbiorcę danych z nazwy. Dopóki partnera nie ma,
 * zgłoszenie zostaje u nas i tak brzmi klauzula — inaczej zbieralibyśmy zgodę
 * na przekazanie komuś, kogo użytkownik nie zna.
 */
function consentText(): string {
  const base =
    'Wyrażam zgodę na kontakt w sprawie mojego zapytania i na przetwarzanie podanych danych w tym celu przez Cesly.pl';
  return FINANCING_PARTNER
    ? `${base} oraz na przekazanie ich partnerowi finansowemu ${FINANCING_PARTNER.name}. Zgodę mogę wycofać w każdej chwili.`
    : `${base}. Dane nie są przekazywane innym podmiotom. Zgodę mogę wycofać w każdej chwili.`;
}

export function LeadForm({ listingId, defaultIntent = 'przejme' }: LeadFormProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [intent, setIntent] = useState<LeadIntent>(defaultIntent);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !contact.trim()) {
      setError('Podaj imię i numer telefonu albo adres e-mail.');
      return;
    }
    if (!consent) {
      setError('Bez zgody na kontakt nie możemy przyjąć zgłoszenia.');
      return;
    }

    setSending(true);
    const { error: insertError } = await supabase.from('leads').insert({
      name: name.trim(),
      contact: contact.trim(),
      message: message.trim() || null,
      intent,
      listing_id: listingId ?? null,
      source_path: window.location.pathname,
      consent_at: new Date().toISOString(),
    });
    setSending(false);

    if (insertError) {
      setError('Nie udało się wysłać zgłoszenia. Spróbuj ponownie za chwilę.');
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="flex items-center gap-2 font-semibold text-emerald-900">
          <Check size={18} />
          Zgłoszenie przyjęte
        </p>
        <p className="mt-1.5 text-sm text-emerald-800">
          Odezwiemy się na podany kontakt. Jeśli w międzyczasie znajdziesz coś samodzielnie — nic nie szkodzi,
          po prostu nam o tym powiedz.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-ink-100 bg-white p-5">
      <h3 className="font-display text-lg font-bold text-ink-900">Potrzebujesz pomocy przy cesji?</h3>
      <p className="mt-1 text-sm text-ink-500">
        Zostaw kontakt, jeśli chcesz sprawdzić zdolność, dopytać o formalności albo szukasz czegoś innego niż
        to ogłoszenie.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {INTENTS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setIntent(option.value)}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              intent === option.value
                ? 'bg-ink-900 text-white'
                : 'border border-ink-200 text-ink-600 hover:border-ink-300'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-ink-600">
          Imię
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-ink-900 focus:border-accent-400 focus:outline-none"
            autoComplete="given-name"
          />
        </label>
        <label className="text-sm text-ink-600">
          Telefon lub e-mail
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-ink-900 focus:border-accent-400 focus:outline-none"
            autoComplete="tel"
          />
        </label>
      </div>

      <label className="mt-3 block text-sm text-ink-600">
        Wiadomość <span className="text-ink-400">(opcjonalnie)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-ink-900 focus:border-accent-400 focus:outline-none"
        />
      </label>

      <label className="mt-4 flex items-start gap-2.5 text-xs leading-relaxed text-ink-500">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          {consentText()}{' '}
          <a href="/polityka-prywatnosci" className="underline hover:text-accent-600">
            Polityka prywatności
          </a>
        </span>
      </label>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button type="submit" disabled={sending} className="btn-accent mt-4 disabled:opacity-50">
        <Send size={16} />
        {sending ? 'Wysyłam…' : 'Poproś o kontakt'}
      </button>
    </form>
  );
}
