-- ============================================================================
-- MEMORYCRAVER - FINAL FIXED SCHEMA
-- ============================================================================
-- This is the FINAL version with ALL issues resolved
-- ============================================================================

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

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================================
-- TABLE: author_profile
-- ============================================================================

CREATE TABLE author_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT DEFAULT '',
  profile_picture_url TEXT,
  custom_links JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_author_profile_user_id ON author_profile(user_id);

-- ============================================================================
-- TABLE: books
-- ============================================================================

CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author_note TEXT,
  cover_image_url TEXT,
  price DECIMAL(10, 2) DEFAULT 0 CHECK (price = 0),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_books_is_published ON books(is_published);
CREATE INDEX idx_books_created_at ON books(created_at DESC);

-- ============================================================================
-- TABLE: chapters
-- ============================================================================

CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
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
  
  CONSTRAINT chapter_has_content CHECK (
    (content_type = 'pdf' AND pdf_url IS NOT NULL) OR
    (content_type = 'text' AND rich_content IS NOT NULL)
  ),
  
  CONSTRAINT unique_chapter_number_per_book UNIQUE (book_id, chapter_number)
);

CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_chapters_is_published ON chapters(is_published);
CREATE INDEX idx_chapters_book_chapter_number ON chapters(book_id, chapter_number);
CREATE INDEX idx_chapters_standalone ON chapters(chapter_number) WHERE book_id IS NULL;

-- ============================================================================
-- TABLE: purchases
-- ============================================================================

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10, 2) NOT NULL CHECK (amount_paid >= 0),
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT,
  payment_status payment_status DEFAULT 'pending',
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_chapter_purchase UNIQUE (user_id, chapter_id)
);

CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_chapter_id ON purchases(chapter_id);
CREATE INDEX idx_purchases_payment_status ON purchases(payment_status);
CREATE INDEX idx_purchases_razorpay_order_id ON purchases(razorpay_order_id);
CREATE INDEX idx_purchases_purchased_at ON purchases(purchased_at DESC);

-- ============================================================================
-- TABLE: comments
-- ============================================================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT comment_target CHECK (
    (book_id IS NOT NULL AND chapter_id IS NULL) OR
    (book_id IS NULL AND chapter_id IS NOT NULL)
  )
);

CREATE INDEX idx_comments_book_id ON comments(book_id);
CREATE INDEX idx_comments_chapter_id ON comments(chapter_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- ============================================================================
-- TABLE: votes
-- ============================================================================

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT vote_target CHECK (
    (book_id IS NOT NULL AND chapter_id IS NULL) OR
    (book_id IS NULL AND chapter_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX idx_votes_unique_book_user 
  ON votes(book_id, user_id) 
  WHERE book_id IS NOT NULL;

CREATE UNIQUE INDEX idx_votes_unique_chapter_user 
  ON votes(chapter_id, user_id) 
  WHERE chapter_id IS NOT NULL;

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
  SELECT security_answer_hash INTO stored_hash
  FROM profiles
  WHERE email = user_email;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = answer_hash;
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
-- RLS POLICIES - profiles (FIXED!)
-- ============================================================================

-- Allow anyone to view profiles (for displaying names, etc.)
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- RLS POLICIES - author_profile (FIXED!)
-- ============================================================================

-- Anyone can view author profiles
CREATE POLICY "Anyone can view author profiles"
  ON author_profile FOR SELECT
  TO public
  USING (true);

-- Authors can insert their own author_profile
CREATE POLICY "Authors can insert own author profile"
  ON author_profile FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authors can update their own author_profile
CREATE POLICY "Authors can update own author profile"
  ON author_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - books
-- ============================================================================

-- Everyone can see published books, authors can see all
CREATE POLICY "View books based on role"
  ON books FOR SELECT
  TO public
  USING (
    is_published = true OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  );

-- Only authors can insert books
CREATE POLICY "Authors can insert books"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  );

-- Only authors can update books
CREATE POLICY "Authors can update books"
  ON books FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  );

-- Only authors can delete books
CREATE POLICY "Authors can delete books"
  ON books FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  );

-- ============================================================================
-- RLS POLICIES - chapters
-- ============================================================================

-- Everyone can see published chapters, authors can see all
CREATE POLICY "View chapters based on role"
  ON chapters FOR SELECT
  TO public
  USING (
    is_published = true OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  );

-- Only authors can insert chapters
CREATE POLICY "Authors can insert chapters"
  ON chapters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  );

-- Only authors can update chapters
CREATE POLICY "Authors can update chapters"
  ON chapters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  );

-- Only authors can delete chapters
CREATE POLICY "Authors can delete chapters"
  ON chapters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  );

-- ============================================================================
-- RLS POLICIES - purchases
-- ============================================================================

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authors can view all purchases
CREATE POLICY "Authors can view all purchases"
  ON purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  );

-- Service role can insert/update purchases (via edge functions)
-- No public INSERT/UPDATE policies - handled by edge functions with service role

-- ============================================================================
-- RLS POLICIES - comments
-- ============================================================================

-- Book comments: Everyone can view
-- Chapter comments: Only purchasers + author can view
CREATE POLICY "View comments based on type"
  ON comments FOR SELECT
  TO public
  USING (
    book_id IS NOT NULL OR
    (
      chapter_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'author'
        ) OR
        EXISTS (
          SELECT 1 FROM purchases 
          WHERE purchases.user_id = auth.uid() 
          AND purchases.chapter_id = comments.chapter_id 
          AND purchases.payment_status = 'completed'
        )
      )
    )
  );

-- Users can insert comments if conditions are met
CREATE POLICY "Users can insert comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      book_id IS NOT NULL OR
      (
        chapter_id IS NOT NULL AND (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'author'
          ) OR
          EXISTS (
            SELECT 1 FROM purchases 
            WHERE purchases.user_id = auth.uid() 
            AND purchases.chapter_id = comments.chapter_id 
            AND purchases.payment_status = 'completed'
          )
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - votes
-- ============================================================================

-- Same structure as comments
CREATE POLICY "View votes based on type"
  ON votes FOR SELECT
  TO public
  USING (
    book_id IS NOT NULL OR
    (
      chapter_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'author'
        ) OR
        EXISTS (
          SELECT 1 FROM purchases 
          WHERE purchases.user_id = auth.uid() 
          AND purchases.chapter_id = votes.chapter_id 
          AND purchases.payment_status = 'completed'
        )
      )
    )
  );

CREATE POLICY "Users can insert votes"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      book_id IS NOT NULL OR
      (
        chapter_id IS NOT NULL AND (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'author'
          ) OR
          EXISTS (
            SELECT 1 FROM purchases 
            WHERE purchases.user_id = auth.uid() 
            AND purchases.chapter_id = votes.chapter_id 
            AND purchases.payment_status = 'completed'
          )
        )
      )
    )
  );

CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- DONE!
-- ============================================================================