-- ============================================================================
-- MEMORYCRAVER - Core Database Schema
-- ============================================================================
-- Creates: Extensions, Types, Tables, Indexes, Constraints
-- ============================================================================

-- Enable extensions
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
  description TEXT, -- Nullable (modified later)
  chapter_number INTEGER NOT NULL CHECK (chapter_number > 0),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  content_type content_type NOT NULL,
  pdf_url TEXT,
  rich_content JSONB,
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT false, -- Added later
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
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE author_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;