-- ============================================================================
-- MEMORYCRAVER PLATFORM - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This migration creates all tables, constraints, indexes, triggers, and functions
-- for the author book platform with Razorpay payments
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('author', 'reader');
CREATE TYPE content_type AS ENUM ('pdf', 'text');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');

-- ============================================================================
-- TABLE: profiles
-- ============================================================================
-- Extends auth.users with additional profile information
-- One profile per authenticated user

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'reader',
  security_question TEXT,
  security_answer_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================================
-- TABLE: author_profile
-- ============================================================================
-- Extended information for authors only
-- One author_profile per author (profiles where role='author')

CREATE TABLE author_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT DEFAULT '',
  profile_picture_url TEXT,
  custom_links JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for author_profile
CREATE INDEX idx_author_profile_user_id ON author_profile(user_id);

-- ============================================================================
-- TABLE: books
-- ============================================================================
-- Book series containers (free, chapters inside are paid)

CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author_note TEXT,
  cover_image_url TEXT,
  price DECIMAL(10, 2) DEFAULT 0 CHECK (price = 0), -- Books are always free
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for books
CREATE INDEX idx_books_is_published ON books(is_published);
CREATE INDEX idx_books_created_at ON books(created_at DESC);

-- ============================================================================
-- TABLE: chapters
-- ============================================================================
-- Individual chapters (can belong to a book or be standalone)
-- If book_id IS NULL = standalone chapter

CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE, -- NULL = standalone
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  chapter_number INTEGER NOT NULL CHECK (chapter_number > 0),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  content_type content_type NOT NULL,
  pdf_url TEXT,
  rich_content JSONB,
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chapter_has_content CHECK (
    (content_type = 'pdf' AND pdf_url IS NOT NULL) OR
    (content_type = 'text' AND rich_content IS NOT NULL)
  ),
  
  -- Unique chapter number per book (but allows same number for standalone)
  CONSTRAINT unique_chapter_number_per_book UNIQUE (book_id, chapter_number)
);

-- Indexes for chapters
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_chapters_is_published ON chapters(is_published);
CREATE INDEX idx_chapters_book_chapter_number ON chapters(book_id, chapter_number);

-- Special index for standalone chapters (where book_id IS NULL)
CREATE INDEX idx_chapters_standalone ON chapters(chapter_number) WHERE book_id IS NULL;

-- ============================================================================
-- TABLE: purchases
-- ============================================================================
-- Tracks chapter purchases (one record per chapter purchase)

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10, 2) NOT NULL CHECK (amount_paid >= 0),
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT,
  payment_status payment_status DEFAULT 'pending',
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- User can only purchase each chapter once
  CONSTRAINT unique_user_chapter_purchase UNIQUE (user_id, chapter_id)
);

-- Indexes for purchases
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_chapter_id ON purchases(chapter_id);
CREATE INDEX idx_purchases_payment_status ON purchases(payment_status);
CREATE INDEX idx_purchases_razorpay_order_id ON purchases(razorpay_order_id);
CREATE INDEX idx_purchases_purchased_at ON purchases(purchased_at DESC);

-- ============================================================================
-- TABLE: comments
-- ============================================================================
-- Comments on books OR chapters (not both)
-- book_id for public book comments
-- chapter_id for private chapter comments (only for purchasers)

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Must have either book_id OR chapter_id (not both, not neither)
  CONSTRAINT comment_target CHECK (
    (book_id IS NOT NULL AND chapter_id IS NULL) OR
    (book_id IS NULL AND chapter_id IS NOT NULL)
  )
);

-- Indexes for comments
CREATE INDEX idx_comments_book_id ON comments(book_id);
CREATE INDEX idx_comments_chapter_id ON comments(chapter_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- ============================================================================
-- TABLE: votes
-- ============================================================================
-- Votes (likes) on books OR chapters (not both)
-- Similar structure to comments

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Must have either book_id OR chapter_id (not both, not neither)
  CONSTRAINT vote_target CHECK (
    (book_id IS NOT NULL AND chapter_id IS NULL) OR
    (book_id IS NULL AND chapter_id IS NOT NULL)
  )
);

-- Unique constraints: one vote per user per book/chapter
CREATE UNIQUE INDEX idx_votes_unique_book_user 
  ON votes(book_id, user_id) 
  WHERE book_id IS NOT NULL;

CREATE UNIQUE INDEX idx_votes_unique_chapter_user 
  ON votes(chapter_id, user_id) 
  WHERE chapter_id IS NOT NULL;

-- Indexes for votes
CREATE INDEX idx_votes_book_id ON votes(book_id);
CREATE INDEX idx_votes_chapter_id ON votes(chapter_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);

-- ============================================================================
-- TRIGGERS - Auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_author_profile_updated_at
  BEFORE UPDATE ON author_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER - Auto-create profile on user signup
-- ============================================================================

CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'reader'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();

-- ============================================================================
-- RPC FUNCTION - Verify security answer for password reset
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_security_answer(
  user_email TEXT,
  answer_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  -- Get stored hash for the user
  SELECT security_answer_hash INTO stored_hash
  FROM profiles
  WHERE email = user_email;
  
  -- If no hash found, return false
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Compare hashes (case-sensitive comparison of hex strings)
  RETURN stored_hash = answer_hash;
END;
$$;

-- ============================================================================
-- RPC FUNCTION - Get sales statistics (for author dashboard)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sales_stats(time_filter TEXT DEFAULT 'all')
RETURNS TABLE (
  total_revenue DECIMAL,
  total_sales BIGINT,
  unique_buyers BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
BEGIN
  -- Determine cutoff date based on filter
  CASE time_filter
    WHEN 'week' THEN
      cutoff_date := NOW() - INTERVAL '7 days';
    WHEN 'month' THEN
      cutoff_date := NOW() - INTERVAL '30 days';
    ELSE
      cutoff_date := '1970-01-01'::TIMESTAMPTZ; -- All time
  END CASE;
  
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount_paid), 0) as total_revenue,
    COUNT(*) as total_sales,
    COUNT(DISTINCT user_id) as unique_buyers
  FROM purchases
  WHERE payment_status = 'completed'
    AND purchased_at >= cutoff_date;
END;
$$;

-- ============================================================================
-- RLS (Row Level Security) - ENABLE
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE author_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - profiles
-- ============================================================================

-- Anyone can view profiles (for displaying author info, commenter names)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (via trigger, but allow explicit insert too)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- RLS POLICIES - author_profile
-- ============================================================================

-- Everyone can view author profiles (public information)
CREATE POLICY "Author profiles are viewable by everyone"
  ON author_profile FOR SELECT
  USING (true);

-- Only the author can update their own author_profile
CREATE POLICY "Authors can update own author profile"
  ON author_profile FOR UPDATE
  USING (auth.uid() = user_id);

-- Authors can insert their own author_profile
CREATE POLICY "Authors can insert own author profile"
  ON author_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - books
-- ============================================================================

-- Everyone can view published books
CREATE POLICY "Published books are viewable by everyone"
  ON books FOR SELECT
  USING (is_published = true OR auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'author'
  ));

-- Only authors can insert books
CREATE POLICY "Authors can insert books"
  ON books FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'author'
  ));

-- Only authors can update books
CREATE POLICY "Authors can update books"
  ON books FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'author'
  ));

-- Only authors can delete books
CREATE POLICY "Authors can delete books"
  ON books FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'author'
  ));

-- ============================================================================
-- RLS POLICIES - chapters
-- ============================================================================

-- Everyone can view published chapters (metadata only, not content)
CREATE POLICY "Published chapters are viewable by everyone"
  ON chapters FOR SELECT
  USING (
    is_published = true OR 
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'author')
  );

-- Only authors can insert chapters
CREATE POLICY "Authors can insert chapters"
  ON chapters FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'author'
  ));

-- Only authors can update chapters
CREATE POLICY "Authors can update chapters"
  ON chapters FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'author'
  ));

-- Only authors can delete chapters
CREATE POLICY "Authors can delete chapters"
  ON chapters FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'author'
  ));

-- ============================================================================
-- RLS POLICIES - purchases
-- ============================================================================

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Authors can view all purchases (for sales dashboard)
CREATE POLICY "Authors can view all purchases"
  ON purchases FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'author'
  ));

-- System can insert purchases (via edge functions with service role)
-- Regular users cannot directly insert purchases

-- System can update purchases (via edge functions with service role)
-- Regular users cannot directly update purchases

-- ============================================================================
-- RLS POLICIES - comments
-- ============================================================================

-- Book comments: Everyone can view
-- Chapter comments: Only purchasers + author can view
CREATE POLICY "Comments are viewable based on type"
  ON comments FOR SELECT
  USING (
    -- Book comments are public
    (book_id IS NOT NULL) OR
    -- Chapter comments only for purchasers or author
    (chapter_id IS NOT NULL AND (
      auth.uid() IN (SELECT id FROM profiles WHERE role = 'author') OR
      auth.uid() IN (
        SELECT user_id FROM purchases 
        WHERE chapter_id = comments.chapter_id 
        AND payment_status = 'completed'
      )
    ))
  );

-- Users can insert comments on books (if logged in)
-- Users can insert comments on chapters (if purchased)
CREATE POLICY "Users can insert comments"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      -- Can comment on books if logged in
      (book_id IS NOT NULL) OR
      -- Can comment on chapters if purchased or author
      (chapter_id IS NOT NULL AND (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'author') OR
        auth.uid() IN (
          SELECT user_id FROM purchases 
          WHERE chapter_id = comments.chapter_id 
          AND payment_status = 'completed'
        )
      ))
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - votes
-- ============================================================================

-- Book votes: Everyone can view
-- Chapter votes: Only purchasers + author can view
CREATE POLICY "Votes are viewable based on type"
  ON votes FOR SELECT
  USING (
    -- Book votes are public
    (book_id IS NOT NULL) OR
    -- Chapter votes only for purchasers or author
    (chapter_id IS NOT NULL AND (
      auth.uid() IN (SELECT id FROM profiles WHERE role = 'author') OR
      auth.uid() IN (
        SELECT user_id FROM purchases 
        WHERE chapter_id = votes.chapter_id 
        AND payment_status = 'completed'
      )
    ))
  );

-- Users can insert votes on books (if logged in)
-- Users can insert votes on chapters (if purchased)
CREATE POLICY "Users can insert votes"
  ON votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      -- Can vote on books if logged in
      (book_id IS NOT NULL) OR
      -- Can vote on chapters if purchased or author
      (chapter_id IS NOT NULL AND (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'author') OR
        auth.uid() IN (
          SELECT user_id FROM purchases 
          WHERE chapter_id = votes.chapter_id 
          AND payment_status = 'completed'
        )
      ))
    )
  );

-- Users can delete their own votes (for toggling)
CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- INITIAL DATA - Create storage buckets (run separately in Supabase dashboard)
-- ============================================================================

-- Note: Storage buckets must be created via Supabase Dashboard or API
-- The SQL commands below are for reference:

/*
-- profile-pictures bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-pictures', 'profile-pictures', true);

-- book-covers bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('book-covers', 'book-covers', true);

-- chapter-covers bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chapter-covers', 'chapter-covers', true);

-- chapter-pdfs bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chapter-pdfs', 'chapter-pdfs', true);

-- chapter-images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chapter-images', 'chapter-images', true);
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- To verify migration:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;