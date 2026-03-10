-- Create community storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('community', 'community', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to community bucket
CREATE POLICY "Authenticated users can upload community files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'community');

-- Allow anyone to view community files (public bucket)
CREATE POLICY "Public can view community files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'community');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own community files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'community' AND (storage.foldername(name))[1] = auth.uid()::text);