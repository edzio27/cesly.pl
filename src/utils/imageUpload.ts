import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return new File([compressedFile], file.name.replace(/\.[^/.]+$/, '.jpg'), {
      type: 'image/jpeg',
    });
  } catch (error) {
    console.error('Image compression failed:', error);
    return file;
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
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/bmp',
    'image/tiff'
  ];

  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(heic|heif)$/i)) {
    return 'Dozwolone formaty: JPG, PNG, WEBP, HEIC, BMP, TIFF';
  }

  if (file.size > maxSize) {
    return 'Maksymalny rozmiar pliku to 20 MB';
  }

  return null;
}
