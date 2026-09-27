-- 선정 시점의 종합 점수 (AI 점수 + 호응·키워드·취향 가산점). 피드 상위 카드를 고를 때 쓴다.
ALTER TABLE items ADD COLUMN pick_score REAL;

-- 카드 좋아요(1)·싫어요(-1). 커뮤니티 글이 보관 기간 뒤 지워져도 취향 학습은 이어지도록
-- 카드의 분류 정보와 AI가 쓴 한국어 제목만 따로 남긴다. 원문 본문·댓글은 저장하지 않는다.
CREATE TABLE card_feedback (
  item_id INTEGER PRIMARY KEY,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  source TEXT NOT NULL,
  source_label TEXT NOT NULL,
  category TEXT,
  kind TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  headline TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX card_feedback_updated ON card_feedback (updated_at);
