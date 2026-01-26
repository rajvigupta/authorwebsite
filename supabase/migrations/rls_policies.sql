-- ============================================================================
-- MEMORYCRAVER - RLS Policies for Tables
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

-- Public can SELECT profiles (for displaying names, etc.)
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  TO public
  USING (true);

-- Authenticated users can INSERT (edge function uses service role)
-- This allows flexibility for profile creation
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can UPDATE only their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- AUTHOR_PROFILE TABLE
-- ============================================================================

-- Public can SELECT author profiles
CREATE POLICY "author_profile_select_public"
  ON author_profile FOR SELECT
  TO public
  USING (true);

-- Authenticated users can INSERT their author profile
CREATE POLICY "author_profile_insert_own"
  ON author_profile FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can UPDATE only their own author profile
CREATE POLICY "author_profile_update_own"
  ON author_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- BOOKS TABLE
-- ============================================================================

-- Public can SELECT published books, authors can SELECT all
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

-- Public can SELECT published chapters, authors can SELECT all
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

-- No INSERT/UPDATE policies - handled by edge functions with service role

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================

-- Book comments are public
-- Chapter comments only for purchasers/author
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

-- Authenticated users can INSERT if they have access
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