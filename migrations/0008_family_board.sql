-- 우리집 보드: 할 일, 기억할 정보, 기념일, 장보기, 웹 푸시 알림.
-- visibility: private(만든 사람만) | family(가족 모두, 누구나 고칠 수 있음)

-- repeat: none(한 번, start_day 당일) | weekly | biweekly(start_day가 있는 주부터 격주) | monthly(month_day일, 없는 달은 말일)
-- assignee_id가 NULL이면 '모두'
CREATE TABLE family_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'family')),
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  assignee_id INTEGER,
  repeat TEXT NOT NULL CHECK (repeat IN ('none', 'weekly', 'biweekly', 'monthly')),
  weekdays TEXT NOT NULL DEFAULT '[]',
  month_day INTEGER,
  start_day TEXT NOT NULL,
  end_day TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX family_tasks_owner ON family_tasks (owner_id);

-- 반복 할 일은 날짜마다 완료 여부를 따로 남긴다
CREATE TABLE family_task_done (
  task_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  member_id INTEGER NOT NULL,
  done_at INTEGER NOT NULL,
  PRIMARY KEY (task_id, day)
);

CREATE TABLE family_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'family')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  pinned INTEGER NOT NULL DEFAULT 0,
  updated_by INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 고치기 전 내용. 정보마다 최근 10개만 남긴다.
CREATE TABLE family_note_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_by INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX family_note_history_note ON family_note_history (note_id, id);

-- 매년 돌아오는 날. calendar가 lunar면 month·day는 음력(평달 기준). year는 처음 해(나이·주년 계산용, 선택).
CREATE TABLE family_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'family')),
  kind TEXT NOT NULL CHECK (kind IN ('birthday', 'anniversary', 'memorial', 'other')),
  title TEXT NOT NULL,
  calendar TEXT NOT NULL CHECK (calendar IN ('solar', 'lunar')),
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  year INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE family_shopping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  qty TEXT NOT NULL DEFAULT '',
  added_by INTEGER NOT NULL,
  done_by INTEGER,
  done_at INTEGER,
  created_at INTEGER NOT NULL
);

-- 기기마다 하나. tz는 그 기기의 시간대(아침 요약을 보낼 시각 기준), last_day는 마지막으로 요약을 보낸 날.
CREATE TABLE family_push (
  endpoint TEXT PRIMARY KEY,
  member_id INTEGER NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  tz TEXT NOT NULL,
  last_day TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX family_push_member ON family_push (member_id);

-- 아침 요약 시각(0~23, NULL이면 끔)과 새 글·댓글 알림 여부
ALTER TABLE family_members ADD COLUMN notify_hour INTEGER DEFAULT 8;
ALTER TABLE family_members ADD COLUMN notify_posts INTEGER NOT NULL DEFAULT 1;
