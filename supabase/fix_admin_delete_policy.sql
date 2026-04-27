-- Fix: Allow admin to delete any post regardless of user_id (including null)
-- Run this in Supabase Dashboard > SQL Editor

CREATE POLICY "Admin can delete any post"
  ON posts
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'problemcompany1@naver.com'
  );
