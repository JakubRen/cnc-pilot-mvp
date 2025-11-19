-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'files',
  'files',
  false,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for files bucket

-- Policy 1: Users can view files from their company
CREATE POLICY "Users can view company files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = (
    SELECT company_id::text
    FROM users
    WHERE auth_id = auth.uid()
  )
);

-- Policy 2: Users can upload files to their company folder
CREATE POLICY "Users can upload company files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = (
    SELECT company_id::text
    FROM users
    WHERE auth_id = auth.uid()
  )
);

-- Policy 3: Users can update their company files
CREATE POLICY "Users can update company files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = (
    SELECT company_id::text
    FROM users
    WHERE auth_id = auth.uid()
  )
);

-- Policy 4: Users can delete their company files
CREATE POLICY "Users can delete company files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = (
    SELECT company_id::text
    FROM users
    WHERE auth_id = auth.uid()
  )
);

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

COMMENT ON POLICY "Users can view company files" ON storage.objects IS
  'Allows users to view files uploaded by their company';

COMMENT ON POLICY "Users can upload company files" ON storage.objects IS
  'Allows users to upload files to their company folder';

COMMENT ON POLICY "Users can update company files" ON storage.objects IS
  'Allows users to update files in their company folder';

COMMENT ON POLICY "Users can delete company files" ON storage.objects IS
  'Allows users to delete files from their company folder';
