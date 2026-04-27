-- Run this in Supabase Dashboard > SQL Editor

-- bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bookmarks" ON bookmarks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks" ON bookmarks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON bookmarks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Suggest posts: only visible to the author or admin
-- Add this policy to posts table (if RLS is enabled on posts)
-- Replace existing SELECT policy or add alongside it:
--
-- CREATE POLICY "Suggest posts visible to author and admin only" ON posts
--   FOR SELECT USING (
--     category != 'suggest'
--     OR auth.uid() = user_id
--     OR auth.jwt() ->> 'email' = 'problemcompany1@naver.com'
--   );
