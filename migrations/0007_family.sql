-- 가족 공간. 관리자 로그인과 별개로 구성원마다 비밀번호가 있다.
CREATE TABLE family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL DEFAULT '🙂',
  color TEXT NOT NULL DEFAULT '#ff5a36',
  -- pbkdf2$반복횟수$salt$hash
  password TEXT NOT NULL,
  -- 비밀번호가 바뀌면 올려서 기존 세션을 무효로 만든다
  session_version INTEGER NOT NULL DEFAULT 1,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  -- 마지막으로 가족 공간을 본 시각. 이후 글·댓글에 NEW를 붙인다.
  seen_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- kind: diary(일기) | message(메시지), visibility: private(나만) | family(가족 공개)
CREATE TABLE family_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('diary', 'message')),
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'family')),
  diary_day TEXT,
  mood TEXT,
  body TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  edited_at INTEGER
);
CREATE INDEX family_posts_visibility ON family_posts (visibility, created_at);
CREATE INDEX family_posts_member ON family_posts (member_id, created_at);

CREATE TABLE family_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  edited_at INTEGER
);
CREATE INDEX family_comments_post ON family_comments (post_id, created_at);
CREATE INDEX family_comments_created ON family_comments (created_at);

CREATE TABLE family_reactions (
  post_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  emoji TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, member_id, emoji)
);

-- 파일 본체는 R2의 family/{id}/{original|preview|thumb}에 있다.
-- 글에 붙기 전(post_id NULL)인 파일은 하루가 지나면 정리한다.
CREATE TABLE family_files (
  id TEXT PRIMARY KEY,
  post_id INTEGER,
  member_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  is_image INTEGER NOT NULL DEFAULT 0,
  has_preview INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX family_files_post ON family_files (post_id);
