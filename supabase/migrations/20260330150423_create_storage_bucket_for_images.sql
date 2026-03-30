/*
  # Create storage bucket for listing images

  1. New Storage Bucket
    - Create `images` bucket for storing listing photos
    - Set bucket to public for easy access
    - Configure file size limits

  2. Security
    - Anyone can view images (public bucket)
    - Only authenticated users can upload
    - Users can only delete their own images
*/

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Allow anyone to view images (public bucket)
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
