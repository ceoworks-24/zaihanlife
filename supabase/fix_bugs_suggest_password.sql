-- Run this in Supabase Dashboard > SQL Editor

-- 1. posts 테이블에 password 컬럼 추가 (건의하기 비밀번호)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS password text;

-- 2. comments 테이블 확인: like_count, is_author 컬럼이 없어도 동작하도록
--    코드에서 이미 해당 컬럼 insert를 제거했으므로 별도 스키마 변경 불필요.
--    만약 기존에 컬럼이 없어서 insert 오류가 났다면 아래 명령으로 추가 가능:
-- ALTER TABLE comments ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0;
-- ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_author boolean DEFAULT false;
