-- 알림공지: 팀 공지, 알림 확인 상태, 하루/주간 요약 보관, 알림 설정, 주간 이메일 개인 설정과 발송 기록
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','people')),
  pinned INTEGER NOT NULL DEFAULT 0,
  link TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, createdBy TEXT NOT NULL, createdByName TEXT NOT NULL DEFAULT '',
  deletedAt TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(createdAt);
CREATE TABLE IF NOT EXISTS announcement_recipients (
  announcementId TEXT NOT NULL REFERENCES announcements(id),
  email TEXT NOT NULL,
  PRIMARY KEY (announcementId, email)
);
CREATE INDEX IF NOT EXISTS idx_ann_recipients_email ON announcement_recipients(email);
-- 사람마다 "봤어요(seen) / 껐어요(dismissed)" 표시. alertKey 예: task:<id>:d3, meet:<id>:d1, ann:<id>
CREATE TABLE IF NOT EXISTS alert_state (
  email TEXT NOT NULL, alertKey TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('seen','dismissed')),
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (email, alertKey)
);
-- AI 요약 문장 (하루 한 번, 주간은 화요일). 목록 자체는 저장하지 않고 열 때마다 계산한다.
CREATE TABLE IF NOT EXISTS daily_summaries (
  email TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('daily','weekly')), forDate TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL,
  PRIMARY KEY (email, kind, forDate)
);
CREATE TABLE IF NOT EXISTS notify_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updatedAt TEXT NOT NULL, updatedBy TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS notify_prefs (email TEXT PRIMARY KEY, weeklyEmail INTEGER NOT NULL DEFAULT 1, updatedAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS mail_log (
  email TEXT NOT NULL, kind TEXT NOT NULL, weekKey TEXT NOT NULL, status TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL,
  PRIMARY KEY (email, kind, weekKey)
);
