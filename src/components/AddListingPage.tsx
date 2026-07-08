import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, X, ImagePlus, Sparkles } from 'lucide-react';
import { supabase, Listing } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { carBrands, carModels, motorcycleBrands, motorcycleModels, boatBrands, boatModels } from '../data/carData';

const BRANDS_BY_VEHICLE_TYPE: Record<string, string[]> = {
  'samochód': carBrands,
  'motocykl': motorcycleBrands,
  'łódź': boatBrands,
};

const MODELS_BY_VEHICLE_TYPE: Record<string, Record<string, string[]>> = {
  'samochód': carModels,
  'motocykl': motorcycleModels,
  'łódź': boatModels,
};
import { uploadImage, validateImageFile } from '../utils/imageUpload';

type AddListingPageProps = {
  onBack: () => void;
  onSuccess: () => void;
  editingListing?: Listing | null;
};

type ImageItem = {
  type: 'url' | 'uploaded';
  value: string;
  preview?: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
};

export function AddListingPage({ onBack, onSuccess, editingListing }: AddListingPageProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [smartInput, setSmartInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [needsManualPaste, setNeedsManualPaste] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
  const touchedFieldsRef = useRef<Set<string>>(new Set());
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnalyzedImageCountRef = useRef(0);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    vehicleType: 'samochód',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: '',
    monthlyPayment: '',
    buyoutPrice: '',
    transferFee: '',
    remainingInstallments: '',
    totalInstallments: '',
    priceType: 'brutto',
    customContactName: '',
    customContactPhone: '',
    customContactEmail: '',
  });

  useEffect(() => {
    if (editingListing) {
      setFormData({
        title: editingListing.title,
        description: editingListing.description || '',
        vehicleType: editingListing.vehicle_type,
        brand: editingListing.brand,
        model: editingListing.model,
        year: editingListing.year,
        mileage: editingListing.mileage?.toString() || '',
        monthlyPayment: editingListing.monthly_payment?.toString() || '',
        buyoutPrice: editingListing.buyout_price?.toString() || '',
        transferFee: editingListing.transfer_fee?.toString() || '',
        remainingInstallments: editingListing.remaining_installments?.toString() || '',
        totalInstallments: editingListing.total_installments?.toString() || '',
        priceType: editingListing.price_type || 'brutto',
        customContactName: editingListing.custom_contact_name || '',
        customContactPhone: editingListing.custom_contact_phone || '',
        customContactEmail: editingListing.custom_contact_email || '',
      });

      if (editingListing.images && editingListing.images.length > 0) {
        setImages(editingListing.images.map(url => ({ type: 'uploaded', value: url })));
      }
    }
  }, [editingListing]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.has('description') || params.has('price') || params.has('make')) {
      const description = params.get('description') || '';
      const price = params.get('price') || '';
      const make = params.get('make') || '';
      const year = params.get('year') || '';
      const sourceUrl = params.get('source_url') || '';

      setFormData(prev => ({
        ...prev,
        description: description || prev.description,
        brand: make || prev.brand,
        year: year ? parseInt(year) : prev.year,
        monthlyPayment: price || prev.monthlyPayment,
      }));

      if (sourceUrl) {
        setSmartInput(sourceUrl);
      }

      const imagesParam = params.get('images');
      if (imagesParam) {
        try {
          const imageUrls = JSON.parse(imagesParam);
          if (Array.isArray(imageUrls) && imageUrls.length > 0) {
            setImages(imageUrls.map(url => ({ type: 'url' as const, value: url })));
          }
        } catch (e) {
          console.error('Failed to parse images parameter:', e);
        }
      }

      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-gray-600 text-lg">
          Musisz być zalogowany, aby dodać ogłoszenie
        </p>
      </div>
    );
  }

  useEffect(() => {
    touchedFieldsRef.current = touchedFields;
  }, [touchedFields]);

  useEffect(() => {
    const anyUploading = images.some((img) => img.uploading);
    if (anyUploading) return;

    const readyUrls = images
      .filter((img) => !img.uploading && !img.error)
      .map((img) => img.value);

    if (readyUrls.length === 0) return;
    if (readyUrls.length === lastAnalyzedImageCountRef.current) return;

    lastAnalyzedImageCountRef.current = readyUrls.length;
    runAnalysis({ text: smartInput.trim() || undefined, imageUrls: readyUrls });
  }, [images]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTouchedFields((prev) => new Set(prev).add(name));
    setAiFilledFields((prev) => {
      if (!prev.has(name)) return prev;
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
    if (name === 'vehicleType') {
      setFormData((prev) => ({ ...prev, vehicleType: value, brand: '', model: '' }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // The model field is a closed <select> for most brands (e.g. BMW only
  // offers exact strings like "Seria 8", not "Seria 8 M850i xDrive Coupe").
  // Claude often returns a more descriptive trim/variant name from listing
  // text, which wouldn't match any <option> and would silently render blank.
  // Match it against the brand's known model list; fall back to null
  // (leave the field for the seller to pick) rather than setting a value
  // the dropdown can't display. Brands without a curated model list render
  // a free-text input instead, where any string is valid as-is.
  const resolveModelForDropdown = (
    vehicleType: string,
    brand: string,
    aiModel: string
  ): string | null => {
    const knownModels = MODELS_BY_VEHICLE_TYPE[vehicleType]?.[brand];
    if (!knownModels || knownModels.length === 0) {
      return aiModel;
    }
    const normalizedAiModel = aiModel.toLowerCase();
    const exactMatch = knownModels.find((m) => m.toLowerCase() === normalizedAiModel);
    if (exactMatch) return exactMatch;
    const containedMatches = knownModels.filter((m) =>
      normalizedAiModel.includes(m.toLowerCase())
    );
    if (containedMatches.length > 0) {
      return containedMatches.sort((a, b) => b.length - a.length)[0];
    }
    return null;
  };

  const applyAnalysisResult = (result: {
    brand: string | null;
    model: string | null;
    year: number | null;
    mileage: number | null;
    vehicleType: string | null;
    description: string | null;
    monthlyPayment?: number | null;
    transferFee?: number | null;
    buyoutPrice?: number | null;
    remainingInstallments?: number | null;
    totalInstallments?: number | null;
    priceType?: string | null;
  }) => {
    const filled: string[] = [];

    setFormData((prev) => {
      const next = { ...prev };

      if (
        result.vehicleType &&
        !touchedFieldsRef.current.has('vehicleType') &&
        BRANDS_BY_VEHICLE_TYPE[result.vehicleType]
      ) {
        next.vehicleType = result.vehicleType;
        filled.push('vehicleType');
      }
      if (result.brand && !touchedFieldsRef.current.has('brand')) {
        next.brand = result.brand;
        filled.push('brand');
      }
      if (result.model && !touchedFieldsRef.current.has('model')) {
        const resolvedModel = resolveModelForDropdown(next.vehicleType, next.brand, result.model);
        if (resolvedModel) {
          next.model = resolvedModel;
          filled.push('model');
        }
      }
      if (result.year && !touchedFieldsRef.current.has('year')) {
        next.year = result.year;
        filled.push('year');
      }
      if (result.mileage && !touchedFieldsRef.current.has('mileage')) {
        next.mileage = result.mileage.toString();
        filled.push('mileage');
      }
      if (result.description && !touchedFieldsRef.current.has('description')) {
        next.description = result.description;
        filled.push('description');
      }
      // Financial/lease fields: only ever set when the source text explicitly
      // stated them (the edge function never estimates these) - same
      // touched-field protection as every other suggested field.
      if (result.monthlyPayment && !touchedFieldsRef.current.has('monthlyPayment')) {
        next.monthlyPayment = result.monthlyPayment.toString();
        filled.push('monthlyPayment');
      }
      if (result.transferFee && !touchedFieldsRef.current.has('transferFee')) {
        next.transferFee = result.transferFee.toString();
        filled.push('transferFee');
      }
      if (result.buyoutPrice && !touchedFieldsRef.current.has('buyoutPrice')) {
        next.buyoutPrice = result.buyoutPrice.toString();
        filled.push('buyoutPrice');
      }
      if (result.remainingInstallments && !touchedFieldsRef.current.has('remainingInstallments')) {
        next.remainingInstallments = result.remainingInstallments.toString();
        filled.push('remainingInstallments');
      }
      if (result.totalInstallments && !touchedFieldsRef.current.has('totalInstallments')) {
        next.totalInstallments = result.totalInstallments.toString();
        filled.push('totalInstallments');
      }
      if (
        (result.priceType === 'netto' || result.priceType === 'brutto') &&
        !touchedFieldsRef.current.has('priceType')
      ) {
        next.priceType = result.priceType;
        filled.push('priceType');
      }

      return next;
    });

    if (filled.length > 0) {
      setAiFilledFields((prev) => {
        const next = new Set(prev);
        filled.forEach((f) => next.add(f));
        return next;
      });
    }
  };

  const runAnalysis = async (payload: { text?: string; imageUrls?: string[] }) => {
    setAnalyzing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-listing-input`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.needsManualPaste) {
        setNeedsManualPaste(true);
        return;
      }

      setNeedsManualPaste(false);
      applyAnalysisResult(result);
    } catch {
      // Silent failure by design - the form stays fully usable manually.
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSmartInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSmartInput(value);
    setNeedsManualPaste(false);

    if (analyzeTimerRef.current) {
      clearTimeout(analyzeTimerRef.current);
    }

    if (!value.trim()) return;

    analyzeTimerRef.current = setTimeout(() => {
      runAnalysis({ text: value.trim() });
    }, 1500);
  };

  const isFreeTextVehicleType = formData.vehicleType === 'inne';
  const availableBrands = BRANDS_BY_VEHICLE_TYPE[formData.vehicleType] || [];
  const availableModels = formData.brand
    ? (MODELS_BY_VEHICLE_TYPE[formData.vehicleType] || {})[formData.brand] || []
    : [];

  const fieldClass = (field: string) =>
    `w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      aiFilledFields.has(field)
        ? 'border-2 border-amber-400 bg-amber-50'
        : 'border border-gray-300'
    }`;

  const createImagePreview = (file: File): string => {
    return URL.createObjectURL(file);
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      if (!user) {
        setError('Musisz być zalogowany, aby przesyłać zdjęcia');
        return;
      }

      const tempId = Math.random().toString(36);
      const preview = createImagePreview(file);

      setImages((prev) => [
        ...prev,
        { type: 'uploaded', value: tempId, preview, uploading: true, progress: 0 }
      ]);

      try {
        const uploadedUrl = await uploadImage(file, user.id);

        setImages((prev) =>
          prev.map((img) => {
            if (img.value === tempId) {
              if (img.preview && img.preview.startsWith('blob:')) {
                URL.revokeObjectURL(img.preview);
              }
              return { type: 'uploaded', value: uploadedUrl, uploading: false, progress: 100 };
            }
            return img;
          })
        );
      } catch (err: any) {
        const errorMessage = err.message || 'Błąd przesyłania';
        setImages((prev) =>
          prev.map((img) =>
            img.value === tempId
              ? { ...img, uploading: false, error: errorMessage }
              : img
          )
        );
        setError(errorMessage);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const addUrlImage = () => {
    const url = prompt('Wklej URL zdjęcia:');
    if (url && url.trim()) {
      setImages((prev) => [...prev, { type: 'url', value: url.trim() }]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      if (newImages[index].preview) {
        URL.revokeObjectURL(newImages[index].preview!);
      }
      return newImages.filter((_, i) => i !== index);
    });
  };

  const handleImageDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setImages((prev) => {
      const newImages = [...prev];
      const draggedItem = newImages[draggedIndex];
      newImages.splice(draggedIndex, 1);
      newImages.splice(index, 0, draggedItem);
      setDraggedIndex(index);
      return newImages;
    });
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
  };

  const triggerMarketValueEstimate = (listingId: string, brand: string, model: string, year: number, mileage: number | null, priceType: string) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/estimate-car-value`;
    fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ listingId, brand, model, year, mileage, price_type: priceType }),
    }).catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const hasUploadingImages = images.some((img) => img.uploading);
      if (hasUploadingImages) {
        setError('Poczekaj na zakończenie przesyłania wszystkich zdjęć');
        setLoading(false);
        return;
      }

      const finalImageUrls = images
        .filter((img) => !img.error)
        .map((img) => img.value);

      const listingData = {
        title: formData.title,
        description: formData.description,
        vehicle_type: formData.vehicleType,
        brand: formData.brand,
        model: formData.model,
        year: parseInt(formData.year.toString()),
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        monthly_payment: parseFloat(formData.monthlyPayment),
        buyout_price: formData.buyoutPrice ? parseFloat(formData.buyoutPrice) : null,
        transfer_fee: parseFloat(formData.transferFee),
        remaining_installments: parseInt(formData.remainingInstallments),
        total_installments: parseInt(formData.totalInstallments),
        price_type: formData.priceType,
        images: finalImageUrls,
        custom_contact_name: formData.customContactName || null,
        custom_contact_phone: formData.customContactPhone || null,
        custom_contact_email: formData.customContactEmail || null,
      };

      if (editingListing) {
        const { error: updateError } = await supabase
          .from('listings')
          .update(listingData)
          .eq('id', editingListing.id);

        if (updateError) throw updateError;
        triggerMarketValueEstimate(editingListing.id, formData.brand, formData.model, parseInt(formData.year.toString()), formData.mileage ? parseInt(formData.mileage) : null, formData.priceType);
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('listings')
          .insert({
            ...listingData,
            user_id: user.id,
            is_promoted: false,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        if (inserted?.id) {
          triggerMarketValueEstimate(inserted.id, formData.brand, formData.model, parseInt(formData.year.toString()), formData.mileage ? parseInt(formData.mileage) : null, formData.priceType);
        }
      }

      images.forEach((img) => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || `Wystąpił błąd podczas ${editingListing ? 'aktualizacji' : 'dodawania'} ogłoszenia`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Powrót
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {editingListing ? 'Edytuj ogłoszenie' : 'Dodaj nowe ogłoszenie'}
        </h1>

        {!editingListing && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles size={20} className="text-blue-600" />
              Szybkie wypełnianie
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Wklej link do ogłoszenia (Otomoto, OLX, Gratka, Facebook) lub treść ogłoszenia
              — spróbujemy automatycznie wypełnić markę, model, rok, przebieg, opis, a jeśli
              treść zawiera też warunki cesji (rata, odstępne, wykup, raty) — również je.
            </p>

            <textarea
              value={smartInput}
              onChange={handleSmartInputChange}
              placeholder="https://www.otomoto.pl/... lub wklejona treść ogłoszenia"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {analyzing && (
              <p className="mt-2 text-sm text-blue-600">Analizuję...</p>
            )}

            {needsManualPaste && !analyzing && (
              <p className="mt-2 text-sm text-amber-700">
                Nie udało się pobrać tej strony (częste dla Facebooka) — wklej treść
                ogłoszenia ręcznie w polu powyżej zamiast linku.
              </p>
            )}

            {aiFilledFields.size > 0 && (
              <p className="mt-2 text-sm text-amber-700">
                Wypełniliśmy automatycznie pola oznaczone bursztynową ramką poniżej —
                sprawdź je przed zapisaniem.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Tytuł ogłoszenia *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={formData.title}
              onChange={handleChange}
              placeholder="np. BMW 320d - cesja leasingu"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 mb-1">
                Typ pojazdu *
              </label>
              <select
                id="vehicleType"
                name="vehicleType"
                required
                value={formData.vehicleType}
                onChange={handleChange}
                className={fieldClass('vehicleType')}
              >
                <option value="samochód">Samochód</option>
                <option value="motocykl">Motocykl</option>
                <option value="łódź">Łódź</option>
                <option value="inne">Inne</option>
              </select>
            </div>

            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                Rocznik *
              </label>
              <input
                id="year"
                name="year"
                type="number"
                required
                min="1900"
                max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={handleChange}
                className={fieldClass('year')}
              />
            </div>

            <div>
              <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-1">
                Przebieg (km)
              </label>
              <input
                id="mileage"
                name="mileage"
                type="number"
                min="0"
                value={formData.mileage}
                onChange={handleChange}
                placeholder="np. 50000"
                className={fieldClass('mileage')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                Marka *
              </label>
              {isFreeTextVehicleType ? (
                <input
                  id="brand"
                  name="brand"
                  type="text"
                  required
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="np. Segway, Can-Am..."
                  className={fieldClass('brand')}
                />
              ) : (
                <select
                  id="brand"
                  name="brand"
                  required
                  value={formData.brand}
                  onChange={(e) => {
                    handleChange(e);
                    setFormData((prev) => ({ ...prev, model: '' }));
                  }}
                  className={fieldClass('brand')}
                >
                  <option value="">Wybierz markę</option>
                  {availableBrands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                Model *
              </label>
              {isFreeTextVehicleType || (formData.brand && availableModels.length === 0) ? (
                <input
                  id="model"
                  name="model"
                  type="text"
                  required
                  value={formData.model}
                  onChange={handleChange}
                  disabled={!isFreeTextVehicleType && !formData.brand}
                  placeholder="np. wpisz model ręcznie"
                  className={`${fieldClass('model')} disabled:bg-gray-100 disabled:cursor-not-allowed`}
                />
              ) : (
                <select
                  id="model"
                  name="model"
                  required
                  value={formData.model}
                  onChange={handleChange}
                  disabled={!formData.brand}
                  className={`${fieldClass('model')} disabled:bg-gray-100 disabled:cursor-not-allowed`}
                >
                  <option value="">
                    {formData.brand ? 'Wybierz model' : 'Najpierw wybierz markę'}
                  </option>
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ceny są podane jako *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="priceType"
                  value="netto"
                  checked={formData.priceType === 'netto'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-700">Netto</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="priceType"
                  value="brutto"
                  checked={formData.priceType === 'brutto'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-700">Brutto</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="monthlyPayment" className="block text-sm font-medium text-gray-700 mb-1">
                Rata miesięczna (zł) *
              </label>
              <input
                id="monthlyPayment"
                name="monthlyPayment"
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.monthlyPayment}
                onChange={handleChange}
                placeholder="1500"
                className={fieldClass('monthlyPayment')}
              />
            </div>

            <div>
              <label htmlFor="transferFee" className="block text-sm font-medium text-gray-700 mb-1">
                Odstępne (zł) *
              </label>
              <input
                id="transferFee"
                name="transferFee"
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.transferFee}
                onChange={handleChange}
                placeholder="5000"
                className={fieldClass('transferFee')}
              />
            </div>

            <div>
              <label htmlFor="buyoutPrice" className="block text-sm font-medium text-gray-700 mb-1">
                Wykup (zł)
              </label>
              <input
                id="buyoutPrice"
                name="buyoutPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.buyoutPrice}
                onChange={handleChange}
                placeholder="50000"
                className={fieldClass('buyoutPrice')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="remainingInstallments"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Pozostałe raty *
              </label>
              <input
                id="remainingInstallments"
                name="remainingInstallments"
                type="number"
                required
                min="1"
                value={formData.remainingInstallments}
                onChange={handleChange}
                placeholder="24"
                className={fieldClass('remainingInstallments')}
              />
            </div>

            <div>
              <label
                htmlFor="totalInstallments"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Całkowita liczba rat *
              </label>
              <input
                id="totalInstallments"
                name="totalInstallments"
                type="number"
                required
                min="1"
                value={formData.totalInstallments}
                onChange={handleChange}
                placeholder="48"
                className={fieldClass('totalInstallments')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Opis *
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={6}
              value={formData.description}
              onChange={handleChange}
              placeholder="Szczegółowy opis pojazdu, stan techniczny, wyposażenie, historia..."
              className={fieldClass('description')}
            />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Niestandardowy kontakt (opcjonalnie)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Jeśli dodajesz ogłoszenie w imieniu innej osoby, możesz podać jej dane kontaktowe.
              Jeśli pozostawisz puste, będą wyświetlane Twoje dane.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="customContactName" className="block text-sm font-medium text-gray-700 mb-1">
                  Imię i nazwisko
                </label>
                <input
                  id="customContactName"
                  name="customContactName"
                  type="text"
                  value={formData.customContactName}
                  onChange={handleChange}
                  placeholder="Jan Kowalski"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="customContactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  id="customContactPhone"
                  name="customContactPhone"
                  type="tel"
                  value={formData.customContactPhone}
                  onChange={handleChange}
                  placeholder="+48 123 456 789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="customContactEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="customContactEmail"
                  name="customContactEmail"
                  type="email"
                  value={formData.customContactEmail}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zdjęcia
            </label>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mb-4 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <Upload
                size={48}
                className={`mx-auto mb-4 ${
                  isDragging ? 'text-blue-500' : 'text-gray-400'
                }`}
              />
              <p className="text-gray-700 font-medium mb-2">
                Przeciągnij i upuść zdjęcia tutaj
              </p>
              <p className="text-sm text-gray-500 mb-4">
                lub kliknij poniżej, aby wybrać pliki
              </p>
              <p className="text-xs text-gray-400">
                Obsługiwane formaty: JPG, PNG, WEBP, BMP, TIFF, GIF (max 20 MB)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Zdjęcia zostaną automatycznie skompresowane do 1 MB
              </p>
              <p className="text-xs text-orange-600 mt-1 font-medium">
                HEIC nie jest obsługiwany - przekonwertuj do JPG
              </p>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="relative group cursor-move"
                    draggable={!image.uploading}
                    onDragStart={() => handleImageDragStart(index)}
                    onDragOver={(e) => handleImageDragOver(e, index)}
                    onDragEnd={handleImageDragEnd}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-300">
                      <img
                        src={image.preview || image.value}
                        alt={`Zdjęcie ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://via.placeholder.com/400?text=Błąd+ładowania';
                        }}
                      />

                      {image.uploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <div className="text-white text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                            <p className="text-sm font-medium">Przesyłanie...</p>
                          </div>
                        </div>
                      )}

                      {image.error && (
                        <div className="absolute inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center">
                          <p className="text-white text-sm font-medium px-2 text-center">
                            {image.error}
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={image.uploading}
                    >
                      <X size={16} />
                    </button>
                    {!image.uploading && !image.error && (
                      <>
                        <div className="absolute bottom-2 left-2 bg-green-500 text-white rounded-full p-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                          {index + 1}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition">
                  <ImagePlus size={20} className="text-gray-600" />
                  <span className="text-gray-700">Dodaj z komputera</span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/bmp,image/tiff,.heic,.heif"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={addUrlImage}
                className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <Upload size={20} className="text-gray-600" />
                <span className="text-gray-700">Dodaj URL</span>
              </button>
            </div>

            <p className="text-sm text-gray-500 mt-2">
              Dozwolone formaty: JPG, PNG, WEBP (max 5 MB)
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || images.some((img) => img.uploading)}
              className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading
                ? (editingListing ? 'Aktualizowanie...' : 'Dodawanie...')
                : (editingListing ? 'Zapisz zmiany' : 'Dodaj ogłoszenie')
              }
            </button>
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Anuluj
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
