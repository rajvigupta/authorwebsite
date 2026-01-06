-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE author_profile ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view author profiles" ON author_profile;
DROP POLICY IF EXISTS "Authors can insert own author profile" ON author_profile;
DROP POLICY IF EXISTS "Authors can update own author profile" ON author_profile;

-- Create simple, correct policies
-- PROFILES: Allow service role to insert, users to read/update
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No INSERT policy for profiles - only service role (edge function) can insert

-- AUTHOR_PROFILE: Same pattern
CREATE POLICY "author_profile_select_policy"
  ON author_profile FOR SELECT
  TO public
  USING (true);

CREATE POLICY "author_profile_update_policy"
  ON author_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No INSERT policy for author_profile - only service role can insert

