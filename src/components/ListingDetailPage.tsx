import React, { useEffect, useState } from 'react';
import { ArrowLeft, Heart, Calendar, DollarSign, TrendingUp, Star, ChevronLeft, ChevronRight, CreditCard as Edit, Share2, Check, X } from 'lucide-react';
import { supabase, Listing } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { trackPageView, trackListingClick } from '../utils/analytics';
import { calculateDealScore, DEAL_SCORE_EXPLANATION } from '../utils/dealScore';

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
      const image = listing.images && listing.images.length > 0
        ? listing.images[0]
        : 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1200';

      const price = listing.price_type === 'monthly'
        ? `${listing.price} zł/mies`
        : `${listing.price} zł`;

      const description = `${listing.brand} ${listing.model} ${listing.year} - ${price}. ${listing.description.substring(0, 150)}...`;

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

      addStructuredData(listing, image, price);
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

  const addStructuredData = (listing: Listing, image: string, price: string) => {
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
      alert('Musisz być zalogowany, aby dodać do ulubionych');
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Ładowanie...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Powrót
          </button>
          <p className="text-center text-gray-600 text-lg">Ogłoszenie nie zostało znalezione</p>
        </div>
      </div>
    );
  }

  const images = listing.images && listing.images.length > 0
    ? listing.images
    : ['https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1200'];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

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

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextLightboxImage = () => {
    if (!listing) return;
    const images = listing.images && listing.images.length > 0
      ? listing.images
      : ['https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1200'];
    setLightboxIndex((prev) => (prev + 1) % images.length);
  };

  const prevLightboxImage = () => {
    if (!listing) return;
    const images = listing.images && listing.images.length > 0
      ? listing.images
      : ['https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1200'];
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="breadcrumb" className="text-sm text-gray-500 mb-4">
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); onBack(); }}
            className="hover:text-blue-600"
          >
            Strona główna
          </a>
          <span className="mx-2">/</span>
          <span className="capitalize">{listing.vehicle_type}</span>
          <span className="mx-2">/</span>
          <span className="text-gray-700 font-medium">{listing.brand} {listing.model}</span>
        </nav>

        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Powrót do listy
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {listing.is_promoted && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 text-sm font-semibold flex items-center">
            <Star size={18} className="mr-2" fill="currentColor" />
            Oferta Promowana
          </div>
        )}

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <div
                className="relative aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden mb-4 cursor-zoom-in"
                onClick={() => openLightbox(currentImageIndex)}
              >
                <img
                  src={images[currentImageIndex]}
                  alt={listing.title}
                  className="w-full h-full object-contain"
                />

                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/75 hover:bg-white rounded-full p-2 transition"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/75 hover:bg-white rounded-full p-2 transition"
                    >
                      <ChevronRight size={24} />
                    </button>

                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="grid grid-cols-6 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`aspect-square rounded overflow-hidden border-2 transition ${
                        currentImageIndex === idx
                          ? 'border-blue-600'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{listing.title}</h1>
                <div className="flex gap-2">
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition relative group"
                    title="Udostępnij"
                  >
                    {copied ? <Check size={24} className="text-green-600" /> : <Share2 size={24} />}
                    {copied && (
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        Link skopiowany!
                      </div>
                    )}
                  </button>
                  {user && listing.user_id === user.id && onEdit && (
                    <button
                      onClick={() => onEdit(listing)}
                      className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
                      title="Edytuj ogłoszenie"
                    >
                      <Edit size={24} />
                    </button>
                  )}
                  <button
                    onClick={toggleFavorite}
                    className={`p-2 rounded-full transition ${
                      isFavorite
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Heart size={24} fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  {listing.vehicle_type}
                </span>
                <span className="inline-block ml-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                  {listing.brand} {listing.model} ({listing.year})
                </span>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Parametry finansowe
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Rata miesięczna:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {listing.monthly_payment.toLocaleString('pl-PL')} zł
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Odstępne:</span>
                    <span className="text-xl font-bold text-gray-900">
                      {listing.transfer_fee.toLocaleString('pl-PL')} zł
                    </span>
                  </div>

                  {!!listing.buyout_price && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Cena wykupu:</span>
                      <span className="text-xl font-bold text-gray-900">
                        {listing.buyout_price.toLocaleString('pl-PL')} zł
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-blue-200">
                    <span className="text-gray-700 font-medium">Pozostałe raty:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {listing.remaining_installments} z {listing.total_installments}
                    </span>
                  </div>
                </div>
              </div>

              {(() => {
                const deal = calculateDealScore(listing);
                if (!deal || deal.score < 5.5) return null;
                const gain = deal.marketValue - deal.totalCost;
                return (
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 mb-6 text-white shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-400" />
                        <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Opłacalność cesji</span>
                      </div>
                      <div className={`bg-gradient-to-br ${deal.colorClass} px-3 py-1 rounded-lg flex items-center gap-1.5`}>
                        <Star size={13} fill="currentColor" />
                        <span className="text-sm font-black">{deal.score.toFixed(1)}/10</span>
                        <span className="text-xs font-semibold">{deal.label}</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Szacowana wartość rynkowa</span>
                        <span className="font-semibold">{deal.marketValue.toLocaleString('pl-PL')} zł</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Całkowity koszt przejęcia (odstępne + raty + wykup)</span>
                        <span className="font-semibold text-red-300">− {deal.totalCost.toLocaleString('pl-PL')} zł</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-600">
                        <span className="text-slate-300 font-medium">Różnica</span>
                        <span className={`text-lg font-black ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {gain >= 0 ? '+' : ''}{gain.toLocaleString('pl-PL')} zł
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{DEAL_SCORE_EXPLANATION}</p>
                  </div>
                );
              })()}

              {(sellerProfile?.email || sellerProfile?.phone || sellerProfile?.name) && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">Kontakt</h2>
                  <div className="space-y-2">
                    {sellerProfile.name && (
                      <div className="flex items-center text-gray-700">
                        <span className="font-medium mr-2">Kontakt:</span>
                        <span className="text-gray-900">{sellerProfile.name}</span>
                      </div>
                    )}
                    {sellerProfile.email && (
                      <div className="flex items-center text-gray-700">
                        <span className="font-medium mr-2">Email:</span>
                        <a href={`mailto:${sellerProfile.email}`} className="text-blue-600 hover:underline">
                          {sellerProfile.email}
                        </a>
                      </div>
                    )}
                    {sellerProfile.phone && (
                      <div className="flex items-center text-gray-700">
                        <span className="font-medium mr-2">Telefon:</span>
                        <a href={`tel:${sellerProfile.phone}`} className="text-blue-600 hover:underline">
                          {sellerProfile.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {user && listing.user_id !== user.id && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Napisz wiadomość</h2>
                  {messageSent ? (
                    <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      Wiadomość wysłana. Odpowiedź znajdziesz w swoim profilu, w zakładce "Wiadomości".
                    </p>
                  ) : (
                    <>
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Napisz wiadomość do właściciela ogłoszenia..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      {messageError && <p className="text-xs text-red-600 mt-1">{messageError}</p>}
                      <button
                        onClick={handleSendMessage}
                        disabled={sendingMessage || !messageText.trim()}
                        className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {sendingMessage ? 'Wysyłanie...' : 'Wyślij wiadomość'}
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <div className="flex items-center">
                  <Calendar size={16} className="mr-2" />
                  Dodano: {new Date(listing.created_at).toLocaleDateString('pl-PL')}
                </div>
                <button
                  onClick={() => setReportOpen(true)}
                  className="text-gray-400 hover:text-red-600 underline transition-colors"
                >
                  Zgłoś ogłoszenie
                </button>
              </div>

              {reportOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReportOpen(false)}>
                  <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Zgłoś ogłoszenie</h3>
                    {reportSent ? (
                      <p className="text-sm text-emerald-700">Dziękujemy za zgłoszenie. Sprawdzimy je jak najszybciej.</p>
                    ) : (
                      <>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Powód</label>
                        <select
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3"
                        >
                          <option value="nieaktualne">Ogłoszenie nieaktualne</option>
                          <option value="oszustwo">Podejrzenie oszustwa</option>
                          <option value="nieprawdziwe_dane">Nieprawdziwe dane / cena</option>
                          <option value="duplikat">Duplikat ogłoszenia</option>
                          <option value="inne">Inne</option>
                        </select>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Dodatkowe informacje (opcjonalnie)</label>
                        <textarea
                          value={reportMessage}
                          onChange={(e) => setReportMessage(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-4"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setReportOpen(false)}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Anuluj
                          </button>
                          <button
                            onClick={handleSendReport}
                            disabled={sendingReport}
                            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                          >
                            {sendingReport ? 'Wysyłanie...' : 'Zgłoś'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Opis</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
          </div>
        </div>
        </div>

        {suggestedListings.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Proponowane ogłoszenia</h2>
            <div className="relative">
              <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide">
                {suggestedListings.map((suggestedListing) => {
                  const mainImage = suggestedListing.images && suggestedListing.images.length > 0
                    ? suggestedListing.images[0]
                    : 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=600';

                  return (
                    <a
                      key={suggestedListing.id}
                      href={`/listing/${suggestedListing.id}`}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                        e.preventDefault();
                        if (onViewListing) {
                          onViewListing(suggestedListing.id);
                        } else {
                          window.history.pushState({}, '', `/listing/${suggestedListing.id}`);
                        }
                      }}
                      className="flex-none w-72 snap-start block"
                    >
                      <div className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl hover:shadow-amber-500/20 transition-all cursor-pointer border border-gray-200 hover:border-amber-400 hover:scale-[1.02] duration-300">
                        {suggestedListing.is_promoted && (
                          <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-white px-2 py-1 text-xs font-bold flex items-center">
                            <Star size={14} className="mr-1" fill="currentColor" />
                            PROMOWANE
                          </div>
                        )}

                        <div className="aspect-square w-full overflow-hidden bg-gray-100 relative">
                          <img
                            src={mainImage}
                            alt={suggestedListing.title}
                            loading="lazy"
                            className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-gray-900/10 to-transparent"></div>
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full">
                            <span className="text-amber-600 text-xs font-bold uppercase tracking-wide">
                              {suggestedListing.vehicle_type}
                            </span>
                          </div>
                        </div>

                        <div className="p-4">
                          <h3 className="text-base font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-amber-600 transition-colors">
                            {suggestedListing.title}
                          </h3>

                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between text-sm items-center">
                              <span className="text-gray-600">Rata:</span>
                              <span className="font-bold text-amber-600">
                                {suggestedListing.monthly_payment.toLocaleString('pl-PL')} zł
                              </span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Odstępne:</span>
                              <span className="font-semibold text-gray-900">
                                {suggestedListing.transfer_fee.toLocaleString('pl-PL')} zł
                              </span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Pozostałe raty:</span>
                              <span className="font-semibold text-gray-900">
                                {suggestedListing.remaining_installments} / {suggestedListing.total_installments}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center text-xs text-gray-500 pt-2 border-t border-gray-200">
                            <Calendar size={13} className="mr-1" />
                            {new Date(suggestedListing.created_at).toLocaleDateString('pl-PL')}
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition"
          >
            <X size={32} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              prevLightboxImage();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition"
          >
            <ChevronLeft size={48} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextLightboxImage();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition"
          >
            <ChevronRight size={48} />
          </button>

          <div className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            <img
              src={images[lightboxIndex]}
              alt={listing.title}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/75 text-white px-4 py-2 rounded-full">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
