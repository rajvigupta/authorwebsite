-- ============================================================================
-- MEMORYCRAVER - Storage RLS Policies
-- ============================================================================

-- ============================================================================
-- BUCKET: profile-pictures
-- ============================================================================

-- Anyone can view profile pictures
CREATE POLICY "Profile pictures are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

-- Users can upload their own profile picture
CREATE POLICY "Users can upload own profile picture"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own profile picture
CREATE POLICY "Users can update own profile picture"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own profile picture
CREATE POLICY "Users can delete own profile picture"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- BUCKET: book-covers
-- ============================================================================

-- Anyone can view book covers
CREATE POLICY "Book covers are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

-- Only authors can upload book covers (with folder structure)
CREATE POLICY "Authors can upload book covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'book-covers'
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'author'
    )
    AND storage.foldername(name) IS NOT NULL
  );

-- Only authors can update book covers
CREATE POLICY "Authors can update book covers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'book-covers'
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'author'
    )
  );

-- Only authors can delete book covers
CREATE POLICY "Authors can delete book covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'book-covers'
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'author'
    )
  );

-- ============================================================================
-- BUCKET: chapter-covers
-- ============================================================================

-- Anyone can view chapter covers
CREATE POLICY "chapter covers are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chapter-covers');

-- Authors can upload chapter covers
CREATE POLICY "authors upload chapter covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chapter-covers'
    AND auth.uid() IS NOT NULL
  );

-- Authors can update chapter covers
CREATE POLICY "authors update chapter covers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'chapter-covers'
    AND auth.uid() IS NOT NULL
  );

-- Authors can delete chapter covers
CREATE POLICY "authors delete chapter covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chapter-covers'
    AND auth.uid() IS NOT NULL
  );

-- ============================================================================
-- BUCKET: chapter-pdfs
-- ============================================================================

-- Anyone can view PDFs (URL is only shared with purchasers in app logic)
CREATE POLICY "Anyone can view chapter PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chapter-pdfs');

-- Authors can upload PDFs (with folder structure: userId/filename)
CREATE POLICY "Authors can upload chapter PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chapter-pdfs'
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'author'
    )
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authors can update PDFs
CREATE POLICY "Authors can update chapter PDFs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'chapter-pdfs'
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'author'
    )
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authors can delete PDFs
CREATE POLICY "Authors can delete chapter PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chapter-pdfs'
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'author'
    )
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- BUCKET: chapter-images
-- ============================================================================

-- Anyone can view chapter images (inline images in rich text)
CREATE POLICY "Chapter images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chapter-images');

-- Authors can upload chapter images (with folder structure)
CREATE POLICY "Authors can upload chapter images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chapter-images'
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'author'
    )
    AND storage.foldername(name) IS NOT NULL
  );

-- Authors can delete chapter images
CREATE POLICY "Authors can delete chapter images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chapter-images'
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'author'
    )
  );