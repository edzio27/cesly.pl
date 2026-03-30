import { supabase } from '../lib/supabase';

export async function uploadImage(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `listing-images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(filePath, file, {
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
  const maxSize = 5 * 1024 * 1024;
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return 'Dozwolone formaty: JPG, PNG, WEBP';
  }

  if (file.size > maxSize) {
    return 'Maksymalny rozmiar pliku to 5 MB';
  }

  return null;
}
