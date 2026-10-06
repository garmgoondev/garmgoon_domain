-- 실시간 자동화 파이프라인 하트비트 및 최근 실행 결과 추적
CREATE TABLE IF NOT EXISTS automation_heartbeats (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  last_run_at TEXT NOT NULL,
  message TEXT,
  duration_ms INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_automation_heartbeats_status ON automation_heartbeats(status);
