-- Add attachment_urls column to problem_reports
ALTER TABLE public.problem_reports ADD COLUMN attachment_urls text[] DEFAULT '{}';

-- Create storage bucket for report attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-attachments', 'report-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to report-attachments bucket
CREATE POLICY "Authenticated users can upload report attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'report-attachments');

-- Allow anyone to read report attachments (admins need to view them)
CREATE POLICY "Anyone can view report attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own report attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'report-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);