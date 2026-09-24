import { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';

type ClaimLinkBoxProps = {
  token: string;
  /** Krótszy wariant do listy ogłoszeń w profilu. */
  compact?: boolean;
};

export function claimUrl(token: string): string {
  return `${window.location.origin}/przejmij/${token}`;
}

/** Gotowa wiadomość do wklejenia w komentarz albo PW na Facebooku. */
function messageTemplate(url: string): string {
  return [
    'Cześć! Widziałem Twoje ogłoszenie o cesji.',
    'Wystawiłem je za darmo na cesly.pl — portalu, na który ludzie wchodzą wyłącznie po cesje leasingu.',
    '',
    `Tym linkiem przejmiesz ogłoszenie na swoje konto (dodasz kontakt, zdjęcia, będziesz odbierać wiadomości): ${url}`,
    '',
    'Jeśli wolisz, żeby ogłoszenie zniknęło — daj znać, usuwam od ręki.',
  ].join('\n');
}

export function ClaimLinkBox({ token, compact = false }: ClaimLinkBoxProps) {
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);
  const url = claimUrl(token);

  const copy = async (what: 'link' | 'message') => {
    try {
      await navigator.clipboard.writeText(what === 'link' ? url : messageTemplate(url));
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Nie udało się skopiować:', error);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => copy('link')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-600 transition-colors hover:text-accent-700"
      >
        {copied === 'link' ? <Check size={13} /> : <Link2 size={13} />}
        {copied === 'link' ? 'Skopiowano' : 'Kopiuj link do przejęcia'}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-accent-200 bg-accent-50 p-5">
      <h3 className="flex items-center gap-2 font-display text-sm font-bold text-ink-900">
        <Link2 size={16} className="text-accent-600" />
        Link do przejęcia ogłoszenia
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
        Wyślij go autorowi ogłoszenia tam, gdzie je znalazłeś. Kto ma ten link, przejmuje ogłoszenie —
        więc nie publikuj go nigdzie otwarcie.
      </p>

      <code className="mt-3 block truncate rounded-xl border border-accent-200 bg-white px-3 py-2.5 text-xs text-ink-700">
        {url}
      </code>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => copy('link')} className="btn-accent py-2.5 text-xs">
          {copied === 'link' ? <Check size={15} /> : <Copy size={15} />}
          {copied === 'link' ? 'Skopiowano' : 'Kopiuj link'}
        </button>
        <button type="button" onClick={() => copy('message')} className="btn-ghost py-2.5 text-xs">
          {copied === 'message' ? <Check size={15} /> : <Copy size={15} />}
          {copied === 'message' ? 'Skopiowano' : 'Kopiuj gotową wiadomość'}
        </button>
      </div>
    </div>
  );
}
