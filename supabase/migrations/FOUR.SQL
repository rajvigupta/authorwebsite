-- ============================================================================
-- STEP 1: CLEAN DATABASE - Remove all conflicts
-- ============================================================================
-- Run this FIRST in Supabase SQL Editor
-- ============================================================================

-- Drop the auto-trigger (you already did this, but just to be sure)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_profile_for_user();

-- Drop ALL existing RLS policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

DROP POLICY IF EXISTS "Anyone can view author profiles" ON author_profile;
DROP POLICY IF EXISTS "Authors can insert own author profile" ON author_profile;
DROP POLICY IF EXISTS "Authors can update own author profile" ON author_profile;
DROP POLICY IF EXISTS "Author profiles are viewable by everyone" ON author_profile;

DROP POLICY IF EXISTS "View books based on role" ON books;
DROP POLICY IF EXISTS "Published books are viewable by everyone" ON books;
DROP POLICY IF EXISTS "Authors can insert books" ON books;
DROP POLICY IF EXISTS "Authors can update books" ON books;
DROP POLICY IF EXISTS "Authors can delete books" ON books;

DROP POLICY IF EXISTS "View chapters based on role" ON chapters;
DROP POLICY IF EXISTS "Published chapters are viewable by everyone" ON chapters;
DROP POLICY IF EXISTS "Authors can insert chapters" ON chapters;
DROP POLICY IF EXISTS "Authors can update chapters" ON chapters;
DROP POLICY IF EXISTS "Authors can delete chapters" ON chapters;

DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
DROP POLICY IF EXISTS "Authors can view all purchases" ON purchases;

DROP POLICY IF EXISTS "View comments based on type" ON comments;
DROP POLICY IF EXISTS "Comments are viewable based on type" ON comments;
DROP POLICY IF EXISTS "Users can insert comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

DROP POLICY IF EXISTS "View votes based on type" ON votes;
DROP POLICY IF EXISTS "Votes are viewable based on type" ON votes;
DROP POLICY IF EXISTS "Users can insert votes" ON votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON votes;

-- Confirm RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE author_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CLEANUP COMPLETE - Now run the next migration to create correct policies
-- ============================================================================






-- ============================================================================
-- STEP 2: CREATE CORRECT RLS POLICIES
-- ============================================================================
-- Run this AFTER step 1 cleanup
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE - The KEY fix!
-- ============================================================================

-- Public can SELECT profiles (to show author names, commenter names, etc.)
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  TO public
  USING (true);

-- Authenticated users can UPDATE their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- NO INSERT POLICY FOR REGULAR USERS!
-- Profiles are ONLY created via the complete-signup edge function
-- which uses the SERVICE ROLE KEY (bypasses RLS)

-- ============================================================================
-- AUTHOR_PROFILE TABLE
-- ============================================================================

-- Public can SELECT author profiles
CREATE POLICY "author_profile_select_public"
  ON author_profile FOR SELECT
  TO public
  USING (true);

-- NO INSERT POLICY - created by complete-signup edge function

-- Authors can UPDATE their own author_profile
CREATE POLICY "author_profile_update_own"
  ON author_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- BOOKS TABLE
-- ============================================================================

-- Public can SELECT published books
-- Authors can SELECT all books
CREATE POLICY "books_select"
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

-- Only authors can INSERT books
CREATE POLICY "books_insert_author"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  );

-- Only authors can UPDATE books
CREATE POLICY "books_update_author"
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

-- Only authors can DELETE books
CREATE POLICY "books_delete_author"
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
-- CHAPTERS TABLE
-- ============================================================================

-- Public can SELECT published chapters
-- Authors can SELECT all chapters
CREATE POLICY "chapters_select"
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

-- Only authors can INSERT chapters
CREATE POLICY "chapters_insert_author"
  ON chapters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  );

-- Only authors can UPDATE chapters
CREATE POLICY "chapters_update_author"
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

-- Only authors can DELETE chapters
CREATE POLICY "chapters_delete_author"
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
-- PURCHASES TABLE
-- ============================================================================

-- Users can SELECT their own purchases
CREATE POLICY "purchases_select_own"
  ON purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authors can SELECT all purchases (for sales dashboard)
CREATE POLICY "purchases_select_author"
  ON purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'author'
    )
  );

-- NO INSERT/UPDATE policies - handled by edge functions with SERVICE ROLE

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================

-- Public can SELECT book comments
-- Only purchasers/author can SELECT chapter comments
CREATE POLICY "comments_select"
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

-- Authenticated users can INSERT comments if they have access
CREATE POLICY "comments_insert"
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

-- Users can UPDATE their own comments
CREATE POLICY "comments_update_own"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can DELETE their own comments
CREATE POLICY "comments_delete_own"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- VOTES TABLE
-- ============================================================================

-- Same structure as comments
CREATE POLICY "votes_select"
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

CREATE POLICY "votes_insert"
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

CREATE POLICY "votes_delete_own"
  ON votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES COMPLETE!
-- ============================================================================