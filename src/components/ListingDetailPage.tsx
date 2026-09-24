import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Heart,
  Calendar,
  TrendingUp,
  Star,
  ChevronLeft,
  ChevronRight,
  CreditCard as Edit,
  Share2,
  Check,
  X,
  Phone,
  Mail,
  MessageSquare,
  ExternalLink,
  Maximize2,
  AlertTriangle,
} from 'lucide-react';
import { supabase, Listing } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ListingCard } from './ListingCard';
import { trackPageView, trackListingClick } from '../utils/analytics';
import { calculateDealScore, DEAL_SCORE_BADGE_THRESHOLD, DEAL_SCORE_EXPLANATION } from '../utils/dealScore';
import { formatPLN, listingAge, listingCosts } from '../utils/listingMetrics';
import { formatInstallments } from '../data/listingText';
import { CONTACT_EMAIL } from '../config/social';
import { LeadForm } from './LeadForm';

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1200';

type ListingDetailPageProps = {
  listingId: string;
  onBack: () => void;
  onEdit?: (listing: Listing) => void;
  onViewListing?: (id: string) => void;
};

type SellerProfile = {
  phone?: string;
  email?: string;
  name?: string;
};

export function ListingDetailPage({ listingId, onBack, onEdit, onViewListing }: ListingDetailPageProps) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [suggestedListings, setSuggestedListings] = useState<Listing[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('nieaktualne');
  const [reportMessage, setReportMessage] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const { user } = useAuth();

  const handleSendMessage = async () => {
    if (!listing || !user || !messageText.trim()) return;
    setSendingMessage(true);
    setMessageError('');
    try {
      const { error } = await supabase.from('messages').insert({
        listing_id: listing.id,
        sender_id: user.id,
        recipient_id: listing.user_id,
        body: messageText.trim(),
      });
      if (error) throw error;
      setMessageText('');
      setMessageSent(true);
      setTimeout(() => setMessageSent(false), 4000);
    } catch (err) {
      console.error('Error sending message:', err);
      setMessageError('Nie udało się wysłać wiadomości. Spróbuj ponownie.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendReport = async () => {
    if (!listing) return;
    setSendingReport(true);
    try {
      const { error } = await supabase.from('listing_reports').insert({
        listing_id: listing.id,
        reporter_id: user?.id || null,
        reason: reportReason,
        message: reportMessage.trim() || null,
      });
      if (error) throw error;
      setReportSent(true);
      setReportMessage('');
      setTimeout(() => {
        setReportSent(false);
        setReportOpen(false);
      }, 2500);
    } catch (err) {
      console.error('Error sending report:', err);
    } finally {
      setSendingReport(false);
    }
  };

  useEffect(() => {
    fetchListing();
    trackPageView('listing', listingId);
    trackListingClick(listingId, 'detail_view');
    if (user) {
      checkFavorite();
      addRecentView();
    }
  }, [listingId, user]);

  useEffect(() => {
    if (listing) {
      fetchSuggestedListings();
    }
  }, [listing]);

  useEffect(() => {
    if (!loading && !listing) {
      let robotsTag = document.querySelector('meta[name="robots"]');
      if (!robotsTag) {
        robotsTag = document.createElement('meta');
        robotsTag.setAttribute('name', 'robots');
        document.head.appendChild(robotsTag);
      }
      const previousContent = robotsTag.getAttribute('content');
      robotsTag.setAttribute('content', 'noindex, follow');

      return () => {
        if (previousContent) {
          robotsTag!.setAttribute('content', previousContent);
        }
      };
    }
  }, [loading, listing]);

  useEffect(() => {
    if (listing) {
      const image = listing.images && listing.images.length > 0 ? listing.images[0] : FALLBACK_IMAGE;

      const price = listing.price_type === 'monthly'
        ? `${listing.price} zł/mies`
        : `${listing.price} zł`;

      const seoTitle = `${listing.brand} ${listing.model} ${listing.year} - Cesja leasingu | Cesly.pl`;
      const seoDescription = `Przejęcie leasingu: ${listing.brand} ${listing.model} ${listing.year}. Rata: ${price}. ${listing.description.substring(0, 120)}... Skontaktuj się z właścicielem i przejmij umowę leasingową.`;

      document.title = seoTitle;

      updateMetaTag('name', 'description', seoDescription);
      updateMetaTag('name', 'keywords', `cesja leasingu ${listing.brand}, przejęcie leasingu ${listing.model}, ${listing.brand} ${listing.model} leasing, cesja umowy leasingowej, przejęcie rat leasingowych`);
      updateMetaTag('property', 'og:title', seoTitle);
      updateMetaTag('property', 'og:description', seoDescription);
      updateMetaTag('property', 'og:image', image);
      updateMetaTag('property', 'og:url', `https://cesly.pl/listing/${listingId}`);
      updateMetaTag('property', 'og:type', 'product');
      updateMetaTag('name', 'twitter:title', seoTitle);
      updateMetaTag('name', 'twitter:description', seoDescription);
      updateMetaTag('name', 'twitter:image', image);

      addStructuredData(listing, image);
    }

    return () => {
      document.title = 'Cesly.pl – Cesja leasingu i przejęcie umowy leasingowej';
      removeStructuredData();
    };
  }, [listing, listingId]);

  const updateMetaTag = (attribute: string, key: string, content: string) => {
    let element = document.querySelector(`meta[${attribute}="${key}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  const addStructuredData = (listing: Listing, image: string) => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": `${listing.brand} ${listing.model} ${listing.year}`,
      "description": listing.description,
      "image": image,
      "brand": {
        "@type": "Brand",
        "name": listing.brand
      },
      "model": listing.model,
      "productionDate": listing.year?.toString(),
      "vehicleEngine": {
        "@type": "EngineSpecification",
        "fuelType": listing.fuel_type
      },
      "mileageFromOdometer": {
        "@type": "QuantitativeValue",
        "value": listing.mileage,
        "unitCode": "KMT"
      },
      "offers": {
        "@type": "Offer",
        "url": `https://cesly.pl/listing/${listing.id}`,
        "priceCurrency": "PLN",
        "price": listing.price,
        "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Person"
        }
      },
      "additionalProperty": [
        {
          "@type": "PropertyValue",
          "name": "Typ oferty",
          "value": "Cesja leasingu"
        },
        {
          "@type": "PropertyValue",
          "name": "Pozostałe raty",
          "value": listing.remaining_installments
        },
        {
          "@type": "PropertyValue",
          "name": "Typ pojazdu",
          "value": listing.vehicle_type
        }
      ]
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'listing-structured-data';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    const breadcrumbData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Strona główna", "item": "https://cesly.pl/" },
        { "@type": "ListItem", "position": 2, "name": listing.vehicle_type, "item": `https://cesly.pl/?vehicleType=${encodeURIComponent(listing.vehicle_type)}` },
        { "@type": "ListItem", "position": 3, "name": `${listing.brand} ${listing.model}`, "item": `https://cesly.pl/listing/${listing.id}` }
      ]
    };

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.id = 'breadcrumb-structured-data';
    breadcrumbScript.textContent = JSON.stringify(breadcrumbData);
    document.head.appendChild(breadcrumbScript);
  };

  const removeStructuredData = () => {
    document.getElementById('breadcrumb-structured-data')?.remove();
    const script = document.getElementById('listing-structured-data');
    if (script) {
      script.remove();
    }
  };

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .maybeSingle();

      if (error) throw error;
      setListing(data);

      if (data) {
        if (data.custom_contact_name || data.custom_contact_phone || data.custom_contact_email) {
          setSellerProfile({
            name: data.custom_contact_name || undefined,
            phone: data.custom_contact_phone || undefined,
            email: data.custom_contact_email || undefined
          });
        } else if (data.origin === 'imported') {
          // Ogłoszenie dodane za autora: pod fallbackiem siedziałby kontakt
          // importera, a kupujący pisaliby do niego o cudze auto.
          setSellerProfile(null);
        } else if (data.user_id) {
          const [profileResult, emailResult] = await Promise.all([
            supabase.from('profiles').select('phone').eq('id', data.user_id).maybeSingle(),
            supabase.rpc('get_user_email', { user_id: data.user_id })
          ]);

          setSellerProfile({
            phone: profileResult.data?.phone,
            email: emailResult.data || undefined
          });
        }
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle();

      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const addRecentView = async () => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('recent_views')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('recent_views')
          .delete()
          .eq('id', existing.id);
      }

      await supabase.from('recent_views').insert({
        user_id: user.id,
        listing_id: listingId,
      });
    } catch (error) {
      console.error('Error adding recent view:', error);
    }
  };

  const fetchSuggestedListings = async () => {
    if (!listing) return;

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .neq('id', listingId)
        .or(`brand.eq.${listing.brand},vehicle_type.eq.${listing.vehicle_type}`)
        .eq('status', 'published')
        .order('is_promoted', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setSuggestedListings(data || []);
    } catch (error) {
      console.error('Error fetching suggested listings:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      alert('Zaloguj się, aby zapisywać ogłoszenia w ulubionych.');
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
        setIsFavorite(false);
      } else {
        await supabase.from('favorites').insert({
          user_id: user.id,
          listing_id: listingId,
        });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-muted">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="skeleton h-4 w-64 rounded" />
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-4">
              <div className="skeleton aspect-[16/10] w-full rounded-3xl" />
              <div className="skeleton h-24 w-full rounded-2xl" />
            </div>
            <div className="skeleton h-96 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-canvas-muted">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Nie znaleźliśmy tego ogłoszenia</h1>
          <p className="mt-2 text-sm text-ink-500">
            Mogło zostać usunięte przez autora albo cesja została już sfinalizowana.
          </p>
          <button onClick={onBack} className="btn-accent mt-6">
            <ArrowLeft size={17} />
            Wróć do listy cesji
          </button>
        </div>
      </div>
    );
  }

  const images = listing.images && listing.images.length > 0 ? listing.images : [FALLBACK_IMAGE];

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  const handleShare = async () => {
    const shareUrl = `https://cesly.pl/listing/${listingId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.title || 'Cesly',
          text: listing?.description?.substring(0, 100) || 'Zobacz to ogłoszenie na Cesly',
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);
  const nextLightboxImage = () => setLightboxIndex((prev) => (prev + 1) % images.length);
  const prevLightboxImage = () => setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);

  const costs = listingCosts(listing);
  const age = listingAge(listing);
  const deal = calculateDealScore(listing);
  const hasContact = !!(sellerProfile?.email || sellerProfile?.phone || sellerProfile?.name);
  const canMessage = !!user && listing.user_id !== user.id;
  // Przy ogłoszeniu dodanym za autora wiadomość trafia do nas, nie do niego —
  // nazywamy więc rzecz po imieniu zamiast udawać kontakt ze sprzedającym.
  const isImported = listing.origin === 'imported';

  const specs: { label: string; value: string }[] = [
    { label: 'Marka', value: listing.brand },
    { label: 'Model', value: listing.model },
    { label: 'Rocznik', value: listing.year ? String(listing.year) : '—' },
    { label: 'Przebieg', value: listing.mileage != null ? `${listing.mileage.toLocaleString('pl-PL')} km` : '—' },
    { label: 'Paliwo', value: listing.fuel_type || '—' },
    { label: 'Typ pojazdu', value: listing.vehicle_type },
    { label: 'Pozostałe raty', value: formatInstallments(listing.remaining_installments, listing.total_installments) },
    {
      label: 'Koniec umowy za',
      value: costs.monthsLeft > 0 ? `${costs.monthsLeft} mies.` : '—',
    },
  ];

  return (
    <div className="min-h-screen bg-canvas-muted pb-24 lg:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-400">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
            className="transition-colors hover:text-accent-600"
          >
            Cesje leasingu
          </a>
          <span>/</span>
          <span className="capitalize">{listing.vehicle_type}</span>
          <span>/</span>
          <span className="font-medium text-ink-700">
            {listing.brand} {listing.model}
          </span>
        </nav>

        <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {listing.is_promoted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  <Star size={10} fill="currentColor" />
                  Promowane
                </span>
              )}
              {age.isNew && (
                <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  Nowe
                </span>
              )}
              <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-600">
                {listing.vehicle_type}
              </span>
              <span className="text-xs text-ink-400">dodane {age.label}</span>
            </div>
            <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-3xl">
              {listing.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="relative rounded-xl border border-ink-200 bg-white p-2.5 text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-900"
              title="Udostępnij"
            >
              {copied ? <Check size={19} className="text-emerald-600" /> : <Share2 size={19} />}
            </button>
            {user && listing.user_id === user.id && onEdit && (
              <button
                onClick={() => onEdit(listing)}
                className="rounded-xl border border-ink-200 bg-white p-2.5 text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-900"
                title="Edytuj ogłoszenie"
              >
                <Edit size={19} />
              </button>
            )}
            <button
              onClick={toggleFavorite}
              aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
              className={`rounded-xl border p-2.5 transition-colors ${
                isFavorite
                  ? 'border-rose-200 bg-rose-50 text-rose-600'
                  : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:text-rose-500'
              }`}
            >
              <Heart size={19} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        </header>

        {listing.origin === 'imported' && (
          <div className="mt-5 rounded-2xl border border-ink-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-600">
                <ExternalLink size={10} />
                Oferta ze źródła zewnętrznego
              </span>
              {listing.source_url && (
                <a
                  href={listing.source_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-sm font-semibold text-accent-600 hover:underline"
                >
                  Zobacz oryginalne ogłoszenie i skontaktuj się ze sprzedającym
                </a>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Zebraliśmy tę cesję z ogłoszenia opublikowanego gdzie indziej i nie mamy przy niej danych
              kontaktowych — najszybciej dogadasz się przez oryginalne ogłoszenie. Możesz też zostawić
              kontakt poniżej: jeśli właściciel przejmie to ogłoszenie, przekażemy mu Twoje zgłoszenie.
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
              To Twoje ogłoszenie? Napisz na{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent-600 hover:underline">
                {CONTACT_EMAIL}
              </a>
              , a wyślemy Ci link, którym przejmiesz je na swoje konto — razem ze zgłoszeniami, które do
              niego przyszły.
            </p>
          </div>
        )}

        {age.isStale && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle size={17} className="shrink-0 text-amber-600" />
            <p className="flex-1 text-sm text-amber-900">
              To ogłoszenie wisi już {age.days} dni. Zapytaj właściciela, czy cesja jest jeszcze dostępna.
            </p>
            <button
              onClick={() => {
                setReportReason('nieaktualne');
                setReportOpen(true);
              }}
              className="text-sm font-semibold text-amber-800 underline hover:text-amber-900"
            >
              Zgłoś jako nieaktualne
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white p-3 shadow-soft">
              <div
                className="group relative aspect-[16/10] cursor-zoom-in overflow-hidden rounded-2xl bg-ink-100"
                onClick={() => openLightbox(currentImageIndex)}
              >
                <img src={images[currentImageIndex]} alt={listing.title} className="h-full w-full object-contain" />

                <span className="absolute right-3 top-3 rounded-full bg-ink-950/70 p-2 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                  <Maximize2 size={15} />
                </span>

                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                      aria-label="Poprzednie zdjęcie"
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2.5 text-ink-800 shadow-soft backdrop-blur transition-colors hover:bg-white"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                      aria-label="Następne zdjęcie"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2.5 text-ink-800 shadow-soft backdrop-blur transition-colors hover:bg-white"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink-950/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      aria-label={`Zdjęcie ${idx + 1}`}
                      className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl transition ${
                        currentImageIndex === idx
                          ? 'ring-2 ring-accent-500 ring-offset-2'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold text-ink-900">Parametry pojazdu</h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {specs.map((spec) => (
                  <div key={spec.label}>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{spec.label}</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold capitalize text-ink-900">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold text-ink-900">Opis od właściciela</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">{listing.description}</p>
            </section>

            <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold text-ink-900">Co dalej po kontakcie</h2>
              <ol className="mt-4 space-y-3">
                {[
                  'Ustalacie odstępne, termin przekazania pojazdu i kto pokrywa opłatę manipulacyjną leasingodawcy.',
                  'Składasz do firmy leasingowej wniosek o cesję razem z dokumentami potwierdzającymi zdolność finansową.',
                  'Leasingodawca weryfikuje Cię i wyraża zgodę — bez niej cesja nie może dojść do skutku.',
                  'Wszystkie trzy strony podpisują aneks, a pojazd i umowa przechodzą na Ciebie.',
                ].map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm leading-relaxed text-ink-600">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t border-ink-100 pt-4 text-xs leading-relaxed text-ink-400">
                Cesly.pl kojarzy strony i nie jest stroną umowy leasingowej. Przed wpłatą odstępnego sprawdź
                umowę, stan pojazdu i potwierdź warunki bezpośrednio u leasingodawcy.
              </p>
            </section>

            <div className="flex items-center justify-between text-sm text-ink-400">
              <span className="flex items-center gap-1.5">
                <Calendar size={15} />
                Dodano: {new Date(listing.created_at).toLocaleDateString('pl-PL')}
              </span>
              <button
                onClick={() => setReportOpen(true)}
                className="underline transition-colors hover:text-rose-600"
              >
                Zgłoś ogłoszenie
              </button>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
              <div className="bg-ink-950 px-6 py-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-300">Rata miesięczna</p>
                <p className="mt-1 font-display text-4xl font-extrabold tracking-tight">
                  {formatPLN(listing.monthly_payment)}
                </p>
                <div className="mt-4 rounded-2xl bg-white/[0.07] px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-ink-200">Realny koszt / mies.</span>
                    <span className="font-display text-lg font-bold text-accent-400">
                      {formatPLN(costs.effectiveMonthly)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-300">
                    Rata + odstępne rozłożone na {costs.monthsLeft || '—'} pozostałych rat.
                  </p>
                </div>
              </div>

              <dl className="divide-y divide-ink-100 px-6">
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-ink-500">Odstępne</dt>
                  <dd className="text-sm font-bold text-ink-900">
                    {listing.transfer_fee > 0 ? formatPLN(listing.transfer_fee) : 'brak'}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-ink-500">Pozostałe raty</dt>
                  <dd className="text-sm font-bold text-ink-900">
                    {formatInstallments(listing.remaining_installments, listing.total_installments)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-ink-500">Koszt do końca umowy</dt>
                  <dd className="text-sm font-bold text-ink-900">{formatPLN(costs.takeoverCost)}</dd>
                </div>
                {!!listing.buyout_price && (
                  <>
                    <div className="flex items-center justify-between py-3">
                      <dt className="text-sm text-ink-500">Wykup na koniec</dt>
                      <dd className="text-sm font-bold text-ink-900">{formatPLN(listing.buyout_price)}</dd>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <dt className="text-sm font-medium text-ink-700">Razem z wykupem</dt>
                      <dd className="font-display text-base font-extrabold text-ink-900">
                        {formatPLN(costs.costWithBuyout)}
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              <div className="p-6 pt-4">
                {hasContact && (
                  <div className="space-y-2">
                    {sellerProfile?.name && (
                      <p className="text-sm text-ink-600">
                        <span className="font-medium">Kontakt:</span> {sellerProfile.name}
                      </p>
                    )}
                    {sellerProfile?.phone && (
                      <a
                        href={`tel:${sellerProfile.phone}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-accent-600 hover:shadow-glow"
                      >
                        <Phone size={17} />
                        {sellerProfile.phone}
                      </a>
                    )}
                    {sellerProfile?.email && (
                      <a
                        href={`mailto:${sellerProfile.email}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 px-4 py-3 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50"
                      >
                        <Mail size={16} />
                        Napisz e-mail
                      </a>
                    )}
                  </div>
                )}

                {canMessage && (
                  <div className={hasContact ? 'mt-4 border-t border-ink-100 pt-4' : ''}>
                    <h3 className="text-sm font-bold text-ink-900">
                      {isImported ? 'Zgłoś zainteresowanie' : 'Napisz przez serwis'}
                    </h3>
                    {isImported && (
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
                        Właściciel nie przejął jeszcze tego ogłoszenia, więc zgłoszenie trafia do redakcji
                        Cesly. Przekażemy je, gdy tylko odbierze ogłoszenie — a jeśli nie chcesz czekać,
                        skontaktuj się przez oryginalne ogłoszenie powyżej.
                      </p>
                    )}
                    {messageSent ? (
                      <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        Wiadomość wysłana. Odpowiedź znajdziesz w profilu, w zakładce „Wiadomości”.
                      </p>
                    ) : (
                      <>
                        <textarea
                          id="wiadomosc"
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder={
                            isImported
                              ? 'Jestem zainteresowany tą cesją — proszę o kontakt.'
                              : 'Dzień dobry, czy cesja jest jeszcze aktualna?'
                          }
                          rows={3}
                          className="field mt-2 resize-none"
                        />
                        {messageError && <p className="mt-1 text-xs text-rose-600">{messageError}</p>}
                        <button
                          onClick={handleSendMessage}
                          disabled={sendingMessage || !messageText.trim()}
                          className="btn-accent mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <MessageSquare size={16} />
                          {sendingMessage ? 'Wysyłanie…' : 'Wyślij wiadomość'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {!hasContact && !canMessage && (
                  <p className="text-sm text-ink-500">
                    {isImported
                      ? 'Zaloguj się, aby zgłosić zainteresowanie tą cesją.'
                      : 'Zaloguj się, aby napisać do właściciela tego ogłoszenia.'}
                  </p>
                )}
              </div>
            </div>

            {deal && deal.score >= DEAL_SCORE_BADGE_THRESHOLD && (
              <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
                    <TrendingUp size={16} className="text-emerald-600" />
                    Opłacalność cesji
                  </h3>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    {deal.label}
                  </span>
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink-500">Szacowana wartość rynkowa</dt>
                    <dd className="font-semibold text-ink-900">{formatPLN(deal.marketValue)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink-500">Całkowity koszt przejęcia</dt>
                    <dd className="font-semibold text-ink-900">− {formatPLN(deal.totalCost)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-ink-100 pt-2">
                    <dt className="font-medium text-ink-700">Różnica</dt>
                    <dd
                      className={`font-display text-base font-extrabold ${
                        deal.marketValue - deal.totalCost >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {deal.marketValue - deal.totalCost >= 0 ? '+' : ''}
                      {formatPLN(deal.marketValue - deal.totalCost)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-[11px] leading-relaxed text-ink-400">{DEAL_SCORE_EXPLANATION}</p>
              </div>
            )}
          </aside>
        </div>

        {/* Najwyższa intencja w całym serwisie jest właśnie tutaj: ktoś ogląda
            konkretną cesję i zastanawia się, czy ją udźwignie. */}
        <section className="mt-12 max-w-2xl">
          <LeadForm listingId={listing.id} />
        </section>

        {suggestedListings.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
              Podobne cesje
            </h2>
            <div className="scrollbar-hide -mx-1 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
              {suggestedListings.map((suggested, index) => (
                <div key={suggested.id} className="w-60 shrink-0 snap-start sm:w-64">
                  <ListingCard
                    listing={suggested}
                    index={index}
                    onView={() => {
                      if (onViewListing) onViewListing(suggested.id);
                      else window.history.pushState({}, '', `/listing/${suggested.id}`);
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile: the contact action follows the visitor down the page. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-extrabold text-ink-900">
              {formatPLN(listing.monthly_payment)}
              <span className="ml-1 text-xs font-medium text-ink-400">/mies.</span>
            </p>
            <p className="truncate text-[11px] text-ink-500">
              realnie {formatPLN(costs.effectiveMonthly)} / mies.
            </p>
          </div>
          {sellerProfile?.phone ? (
            <a href={`tel:${sellerProfile.phone}`} className="btn-accent shrink-0">
              <Phone size={17} />
              Zadzwoń
            </a>
          ) : (
            <a href={isImported && listing.source_url ? listing.source_url : '#wiadomosc'}
               target={isImported && listing.source_url ? '_blank' : undefined}
               rel={isImported && listing.source_url ? 'noopener noreferrer nofollow' : undefined}
               className="btn-accent shrink-0">
              {isImported && listing.source_url ? <ExternalLink size={17} /> : <MessageSquare size={17} />}
              {isImported && listing.source_url ? 'Zobacz u źródła' : 'Napisz'}
            </a>
          )}
        </div>
      </div>

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold text-ink-900">Zgłoś ogłoszenie</h3>
            {reportSent ? (
              <p className="mt-3 text-sm text-emerald-700">Dziękujemy za zgłoszenie. Sprawdzimy je jak najszybciej.</p>
            ) : (
              <>
                <label className="mt-4 block text-xs font-semibold text-ink-600">Powód</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="field mt-1.5"
                >
                  <option value="nieaktualne">Ogłoszenie nieaktualne</option>
                  <option value="oszustwo">Podejrzenie oszustwa</option>
                  <option value="nieprawdziwe_dane">Nieprawdziwe dane / cena</option>
                  <option value="duplikat">Duplikat ogłoszenia</option>
                  <option value="inne">Inne</option>
                </select>
                <label className="mt-4 block text-xs font-semibold text-ink-600">
                  Dodatkowe informacje (opcjonalnie)
                </label>
                <textarea
                  value={reportMessage}
                  onChange={(e) => setReportMessage(e.target.value)}
                  rows={3}
                  className="field mt-1.5 resize-none"
                />
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={() => setReportOpen(false)} className="btn-ghost">
                    Anuluj
                  </button>
                  <button
                    onClick={handleSendReport}
                    disabled={sendingReport}
                    className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                  >
                    {sendingReport ? 'Wysyłanie…' : 'Zgłoś'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/95" onClick={closeLightbox}>
          <button
            onClick={closeLightbox}
            aria-label="Zamknij"
            className="absolute right-4 top-4 text-white transition-colors hover:text-ink-300"
          >
            <X size={30} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevLightboxImage();
                }}
                aria-label="Poprzednie zdjęcie"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white transition-colors hover:text-ink-300"
              >
                <ChevronLeft size={44} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextLightboxImage();
                }}
                aria-label="Następne zdjęcie"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white transition-colors hover:text-ink-300"
              >
                <ChevronRight size={44} />
              </button>
            </>
          )}

          <div className="flex h-full max-h-[90vh] w-full max-w-7xl items-center justify-center p-4">
            <img
              src={images[lightboxIndex]}
              alt={listing.title}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-ink-950/80 px-4 py-2 text-sm text-white">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
