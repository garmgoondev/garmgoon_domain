-- 사이트별 1st-Party 엣지 실측 방문자 및 전환 이벤트 집계
CREATE TABLE IF NOT EXISTS telemetry_visitors (
  site_id TEXT NOT NULL,
  day TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (site_id, day, visitor_hash)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_visitors_site_day ON telemetry_visitors(site_id, day);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  day TEXT NOT NULL,
  visitor_hash TEXT,
  meta TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_site_day ON telemetry_events(site_id, day);
