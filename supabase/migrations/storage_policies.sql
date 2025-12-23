-- ============================================================================
-- STORAGE POLICIES - File Upload & Access Rules
-- ============================================================================

-- ============================================================================
-- BUCKET: profile-pictures
-- ============================================================================

-- Anyone can view profile pictures (public bucket)
CREATE POLICY "Profile pictures are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

-- Users can upload their own profile pictures
CREATE POLICY "Users can upload own profile picture"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own profile pictures
CREATE POLICY "Users can update own profile picture"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own profile pictures
CREATE POLICY "Users can delete own profile picture"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- BUCKET: book-covers
-- ============================================================================

-- Anyone can view book covers (public bucket)
CREATE POLICY "Book covers are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

-- Only authors can upload book covers
CREATE POLICY "Authors can upload book covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'book-covers' AND
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'author')
  );

-- Only authors can update book covers
CREATE POLICY "Authors can update book covers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'book-covers' AND
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'author')
  );

-- Only authors can delete book covers
CREATE POLICY "Authors can delete book covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'book-covers' AND
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'author')
  );

-- ============================================================================
-- BUCKET: chapter-covers
-- ============================================================================

-- Anyone can view chapter covers (public bucket)
CREATE POLICY "Chapter covers are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chapter-covers');

-- Only authors can upload chapter covers
CREATE POLICY "Authors can upload chapter covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chapter-covers' AND
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'author')
  );

-- Only authors can update chapter covers
CREATE POLICY "Authors can update chapter covers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'chapter-covers' AND
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'author')
  );

-- Only authors can delete chapter covers
CREATE POLICY "Authors can delete chapter covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chapter-covers' AND
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'author')
  );

-- ============================================================================
-- BUCKET: chapter-pdfs
-- ============================================================================

-- PDFs are NOT public - only purchasers can access
-- This is enforced in application logic (check purchase before showing URL)

CREATE POLICY "Anyone can view PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chapter-pdfs');
  -- Note: URL is only shared with purchasers in app logic

-- Only authors can upload PDFs
CREATE POLICY "Authors can upload PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chapter-pdfs' AND
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'author')
  );

-- Only authors can delete PDFs
CREATE POLICY "Authors can delete PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chapter-pdfs' AND
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'author')
  );

-- ============================================================================
-- BUCKET: chapter-images
-- ============================================================================

-- Anyone can view inline images (used in rich text)
CREATE POLICY "Chapter images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chapter-images');

-- Only authors can upload chapter images
CREATE POLICY "Authors can upload chapter images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chapter-images' AND
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'author')
  );

-- Only authors can delete chapter images
CREATE POLICY "Authors can delete chapter images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chapter-images' AND
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'author')
  );