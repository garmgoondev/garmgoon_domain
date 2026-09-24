-- 사이트에서 수집한 글과, 엄선되어 카드뉴스가 된 결과
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  source_label TEXT NOT NULL,
  title TEXT NOT NULL,
  snippet TEXT,
  published_at INTEGER,
  collected_at INTEGER NOT NULL,
  day TEXT NOT NULL,
  -- new → scored → selected → published | skipped | failed
  status TEXT NOT NULL DEFAULT 'new',
  score REAL,
  rank INTEGER,
  headline TEXT,
  summary TEXT,
  point TEXT,
  category TEXT,
  tags TEXT,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX items_day_status ON items (day, status);

CREATE TABLE channels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  handle TEXT,
  thumbnail TEXT,
  added_at INTEGER NOT NULL,
  checked_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  published_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  -- new → done | failed
  status TEXT NOT NULL DEFAULT 'new',
  basis TEXT,
  one_liner TEXT,
  summary TEXT,
  points TEXT,
  tags TEXT,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX videos_status ON videos (status, published_at);
CREATE INDEX videos_channel ON videos (channel_id, published_at);

CREATE TABLE keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE scraps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (kind, ref_id)
);

CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'idea',
  tags TEXT NOT NULL DEFAULT '[]',
  link TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE reports (
  week TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 파이프라인 진행 상태 (key-value)
CREATE TABLE state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL
);
