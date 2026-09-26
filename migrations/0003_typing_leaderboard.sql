-- 실시간 타자 게임 명예의 전당 리더보드
CREATE TABLE typing_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  wpm REAL NOT NULL,
  accuracy REAL NOT NULL,
  time_seconds REAL NOT NULL,
  text_length INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT 'race',
  week TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_typing_scores_wpm ON typing_scores (wpm DESC);
CREATE INDEX idx_typing_scores_week ON typing_scores (week, wpm DESC);
CREATE INDEX idx_typing_scores_created ON typing_scores (created_at DESC);
