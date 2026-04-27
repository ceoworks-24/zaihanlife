-- Run this in Supabase Dashboard > SQL Editor

-- posts 테이블에 is_pinned 컬럼 추가 (공지 상단 고정)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- 어드민만 is_pinned 수정 가능하도록 RLS UPDATE 정책이 없다면 추가
-- (posts 테이블에 이미 UPDATE 정책이 있다면 생략 가능)
-- CREATE POLICY "Admin can update any post" ON posts
--   FOR UPDATE TO authenticated
--   USING (auth.jwt() ->> 'email' = 'problemcompany1@naver.com');
