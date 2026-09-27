-- Keep only post IDs after content retention removes old items.
ALTER TABLE items ADD COLUMN reddit_post_id TEXT;
UPDATE items SET reddit_post_id = lower(substr(
  substr(url, instr(url, '/comments/') + 10), 1,
  instr(substr(url, instr(url, '/comments/') + 10) || '/', '/') - 1
)) WHERE source = 'reddit' AND instr(url, '/comments/') > 0;

CREATE TABLE reddit_seen (
  post_id TEXT PRIMARY KEY,
  first_seen_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO reddit_seen SELECT reddit_post_id, collected_at FROM items WHERE reddit_post_id IS NOT NULL;
CREATE TRIGGER reddit_deduplicate BEFORE INSERT ON items
WHEN NEW.reddit_post_id IS NOT NULL AND EXISTS (SELECT 1 FROM reddit_seen WHERE post_id = NEW.reddit_post_id)
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER reddit_remember AFTER INSERT ON items WHEN NEW.reddit_post_id IS NOT NULL
BEGIN INSERT OR IGNORE INTO reddit_seen VALUES (NEW.reddit_post_id, NEW.collected_at); END;

CREATE TABLE reddit_feeds (
  subreddit TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('week', 'month')),
  next_at INTEGER NOT NULL DEFAULT 0,
  last_success INTEGER,
  received INTEGER,
  inserted INTEGER,
  PRIMARY KEY (subreddit, period)
);
