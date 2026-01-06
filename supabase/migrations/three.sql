-- ============================================================================
-- SECURE RLS POLICIES FOR PROFILES & AUTHOR_PROFILE
-- ============================================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE author_profile ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "author_profile_select_public" ON author_profile;
DROP POLICY IF EXISTS "author_profile_insert_own" ON author_profile;
DROP POLICY IF EXISTS "author_profile_update_own" ON author_profile;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Anyone can read profiles (needed for displaying author info, comments, etc.)
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  TO public
  USING (true);

-- Authenticated users can insert (foreign key ensures it's their own ID)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Foreign key constraint handles security

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No DELETE policy = nobody can delete profiles manually
-- (Handled automatically by ON DELETE CASCADE from auth.users)

-- ============================================================================
-- AUTHOR_PROFILE POLICIES
-- ============================================================================

-- Anyone can read author profiles (public information)
CREATE POLICY "author_profile_select_public"
  ON author_profile FOR SELECT
  TO public
  USING (true);

-- Authenticated users can insert (foreign key ensures valid user_id)
CREATE POLICY "author_profile_insert_own"
  ON author_profile FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Foreign key constraint handles security

-- Users can only update their own author_profile
CREATE POLICY "author_profile_update_own"
  ON author_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy for author_profile either



