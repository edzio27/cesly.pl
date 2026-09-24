import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, ExternalLink, ShieldCheck, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { formatPLN } from '../utils/listingMetrics';
import { CONTACT_EMAIL } from '../config/social';

type ClaimListingPageProps = {
  token: string;
  onViewListing: (id: string) => void;
  onBack: () => void;
};

type ClaimPreview = {
  listing_id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  monthly_payment: number;
  transfer_fee: number;
  image: string | null;
  source_url: string | null;
};

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800';

export default function ClaimListingPage({ token, onViewListing, onBack }: ClaimListingPageProps) {
  const { user, loading: authLoading } = useAuth();
  const [preview, setPreview] = useState<ClaimPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    document.title = 'Przejmij swoje ogłoszenie – Cesly.pl';
    // Prywatny link jednorazowego użytku nie ma czego szukać w indeksie.
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    robots.id = 'claim-robots';
    document.head.appendChild(robots);
    return () => {
      document.getElementById('claim-robots')?.remove();
      document.title = 'Cesly.pl – Cesja leasingu i przejęcie umowy leasingowej';
    };
  }, []);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('claim_preview', { p_token: token });
      if (rpcError) throw rpcError;
      setPreview((data as ClaimPreview[])?.[0] ?? null);
    } catch (err) {
      console.error('Błąd podglądu ogłoszenia:', err);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const handleClaim = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setClaiming(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('claim_listing', { p_token: token });
      if (rpcError) throw rpcError;
      if (typeof data === 'string') onViewListing(data);
    } catch (err) {
      const message = (err as { message?: string }).message || '';
      setError(
        message.includes('invalid_token')
          ? 'Ten link został już wykorzystany albo wygasł.'
          : 'Nie udało się przejąć ogłoszenia. Spróbuj ponownie.',
      );
      setClaiming(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-canvas-muted px-4 py-20">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="skeleton h-8 w-2/3 rounded" />
          <div className="skeleton h-48 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="min-h-screen bg-canvas-muted px-4 py-24 text-center">
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Ten link już nie działa</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Ogłoszenie zostało już przejęte albo usunięte. Jeśli to Twoja oferta i chcesz nią zarządzać,
            napisz na{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent-600 hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <button onClick={onBack} className="btn-ghost mt-6">
            Przejdź do ofert cesji
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-muted px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-accent-700">
          <BadgeCheck size={13} />
          Ogłoszenie czeka na właściciela
        </span>

        <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl">
          To Twoje ogłoszenie?
          <span className="block text-accent-600">Przejmij je za darmo</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base">
          Wystawiliśmy Twoją cesję na Cesly.pl, żeby zobaczyli ją ludzie, którzy celowo szukają przejęcia
          leasingu. Nie publikujemy przy niej Twoich danych kontaktowych — dopiero przejęcie ogłoszenia daje
          Ci nad nim pełną kontrolę.
        </p>

        <div className="mt-8 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft">
          <div className="flex flex-col gap-4 p-4 sm:flex-row">
            <img
              src={preview.image || FALLBACK_IMAGE}
              alt={preview.title}
              className="h-40 w-full rounded-2xl object-cover sm:h-28 sm:w-40"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold leading-snug text-ink-900">{preview.title}</h2>
              <p className="mt-0.5 text-sm text-ink-500">
                {preview.brand} {preview.model} {preview.year ? `· ${preview.year}` : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-ink-500">
                  Rata: <strong className="text-ink-900">{formatPLN(preview.monthly_payment)}</strong>
                </span>
                <span className="text-ink-500">
                  Odstępne:{' '}
                  <strong className="text-ink-900">
                    {preview.transfer_fee > 0 ? formatPLN(preview.transfer_fee) : 'brak'}
                  </strong>
                </span>
              </div>
              {preview.source_url && (
                <a
                  href={preview.source_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 transition-colors hover:text-accent-600"
                >
                  <ExternalLink size={12} />
                  Oryginalne ogłoszenie
                </a>
              )}
            </div>
          </div>
        </div>

        <ul className="mt-6 space-y-2.5">
          {[
            'Dodasz własny kontakt, zdjęcia i opis — ogłoszenie staje się Twoje',
            'Wiadomości od zainteresowanych trafiają prosto na Twoje konto',
            'W każdej chwili możesz je edytować albo usunąć',
          ].map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-ink-600">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              {point}
            </li>
          ))}
        </ul>

        {error && (
          <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}

        <button onClick={handleClaim} disabled={claiming} className="btn-accent mt-6 w-full py-4 text-base disabled:opacity-60">
          {claiming ? 'Przejmuję…' : user ? 'Przejmij ogłoszenie' : 'Zaloguj się i przejmij ogłoszenie'}
          <ArrowRight size={18} />
        </button>

        {!user && (
          <p className="mt-2 text-center text-xs text-ink-400">
            Założenie konta zajmuje chwilę i jest bezpłatne.
          </p>
        )}

        <div className="mt-8 flex items-start gap-2 border-t border-ink-100 pt-6 text-xs leading-relaxed text-ink-400">
          <Trash2 size={14} className="mt-0.5 shrink-0" />
          <p>
            Nie chcesz, żeby ta oferta była u nas widoczna? Napisz na{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-ink-600 hover:underline">
              {CONTACT_EMAIL}
            </a>{' '}
            — usuwamy ogłoszenie bez pytań.
          </p>
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
