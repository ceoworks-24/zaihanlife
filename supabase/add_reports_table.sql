-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS reports (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 로그인 유저만 신고 가능
CREATE POLICY "Authenticated users can insert reports" ON reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- 관리자만 신고 목록 조회 가능
CREATE POLICY "Admin can read reports" ON reports
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' = 'problemcompany1@naver.com');
