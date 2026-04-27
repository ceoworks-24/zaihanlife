-- Run this in Supabase Dashboard > SQL Editor

-- 1. post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own likes" ON post_likes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own likes" ON post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. comments table RLS (if not already set)
-- Ensure comments table has RLS enabled and authenticated users can insert/select
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous) to read comments
CREATE POLICY "Anyone can read comments" ON comments
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own comments
CREATE POLICY "Authenticated users can insert comments" ON comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments, admin can delete any
CREATE POLICY "Users and admin can delete comments" ON comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'problemcompany1@naver.com');
