-- ============================================================================
-- CREATE STORAGE BUCKETS
-- ============================================================================
-- Run this in Supabase SQL Editor to create all required storage buckets
-- ============================================================================

-- Create profile-pictures bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create book-covers bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-covers',
  'book-covers',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create chapter-covers bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chapter-covers',
  'chapter-covers',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create chapter-pdfs bucket (public URLs but access controlled in app)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chapter-pdfs',
  'chapter-pdfs',
  true,
  20971520, -- 20MB
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create chapter-images bucket (public - for inline images in rich text)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chapter-images',
  'chapter-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;