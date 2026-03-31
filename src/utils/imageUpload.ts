import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';

async function convertToJpegUsingCanvas(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      const maxDimension = 1920;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('Nie można przekonwertować obrazu'));
            return;
          }
          const newFileName = file.name.replace(/\.[^/.]+$/, '.jpg');
          resolve(new File([blob], newFileName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Nie można załadować obrazu'));
    };

    img.src = objectUrl;
  });
}

export async function compressImage(file: File): Promise<File> {

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    const newFileName = file.name.replace(/\.[^/.]+$/, '.jpg');
    return new File([compressedFile], newFileName, {
      type: 'image/jpeg',
    });
  } catch (error) {
    console.error('Image compression failed, trying canvas fallback:', error);

    try {
      return await convertToJpegUsingCanvas(file);
    } catch (canvasError) {
      console.error('Canvas fallback also failed:', canvasError);

      if (file.size > 20 * 1024 * 1024) {
        throw new Error('Plik jest zbyt duży (max 20 MB)');
      }

      if (file.type.startsWith('image/')) {
        return file;
      }

      throw new Error('Nie można przetworzyć tego pliku');
    }
  }
}

export async function uploadImage(file: File, userId: string): Promise<string> {
  const compressedFile = await compressImage(file);

  const fileName = `${userId}/${Math.random().toString(36).substring(2)}.jpg`;
  const filePath = `listing-images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(filePath, compressedFile, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export function validateImageFile(file: File): string | null {
  const maxSize = 20 * 1024 * 1024;

  const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' ||
                 file.name.match(/\.(heic|heif)$/i);

  if (isHEIC) {
    return 'Format HEIC nie jest obsługiwany. Przekonwertuj zdjęcie do JPG lub PNG (możesz użyć aplikacji Zdjęcia lub innego konwertera)';
  }

  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/gif'
  ];

  const isImage = allowedTypes.includes(file.type) || file.type.startsWith('image/');

  if (!isImage) {
    return 'Plik musi być obrazem (JPG, PNG, WEBP, BMP, TIFF, GIF)';
  }

  if (file.size > maxSize) {
    return 'Maksymalny rozmiar pliku to 20 MB';
  }

  return null;
}
