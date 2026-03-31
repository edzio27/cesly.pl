import React, { useState } from 'react';
import { ArrowLeft, Upload, X, ImagePlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { carBrands, carModels } from '../data/carData';
import { uploadImage, validateImageFile } from '../utils/imageUpload';

type AddListingPageProps = {
  onBack: () => void;
  onSuccess: () => void;
};

type ImageItem = {
  type: 'url' | 'file';
  value: string;
  file?: File;
  preview?: string;
};

export function AddListingPage({ onBack, onSuccess }: AddListingPageProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
  });

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-gray-600 text-lg">
          Musisz być zalogowany, aby dodać ogłoszenie
        </p>
      </div>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const availableModels = formData.brand ? carModels[formData.brand] || [] : [];

  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      const preview = URL.createObjectURL(file);
      setImages((prev) => [
        ...prev,
        { type: 'file', value: file.name, file, preview }
      ]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUploadingImages(true);

    try {
      const finalImageUrls: string[] = [];

      for (const image of images) {
        if (image.type === 'url') {
          finalImageUrls.push(image.value);
        } else if (image.type === 'file' && image.file && user) {
          const uploadedUrl = await uploadImage(image.file, user.id);
          finalImageUrls.push(uploadedUrl);
        }
      }

      setUploadingImages(false);

      const { error: insertError } = await supabase.from('listings').insert({
        user_id: user.id,
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
        is_promoted: false,
      });

      if (insertError) throw insertError;

      images.forEach((img) => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas dodawania ogłoszenia');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={onBack}
        className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Powrót
      </button>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dodaj nowe ogłoszenie</h1>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                Marka *
              </label>
              <select
                id="brand"
                name="brand"
                required
                value={formData.brand}
                onChange={(e) => {
                  handleChange(e);
                  setFormData((prev) => ({ ...prev, model: '' }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Wybierz markę</option>
                {carBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                Model *
              </label>
              <select
                id="model"
                name="model"
                required
                value={formData.model}
                onChange={handleChange}
                disabled={!formData.brand}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
                Obsługiwane formaty: JPG, PNG, WEBP, HEIC, BMP, TIFF (max 20 MB)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Zdjęcia zostaną automatycznie skompresowane do 1 MB
              </p>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-300">
                      {image.preview ? (
                        <img
                          src={image.preview}
                          alt={`Podgląd ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={image.value}
                          alt={`Zdjęcie ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://via.placeholder.com/400?text=Błąd+ładowania';
                          }}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {image.type === 'file' ? image.file?.name : 'URL'}
                    </p>
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
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {uploadingImages
                ? 'Przesyłanie zdjęć...'
                : loading
                ? 'Dodawanie...'
                : 'Dodaj ogłoszenie'}
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
  );
}
