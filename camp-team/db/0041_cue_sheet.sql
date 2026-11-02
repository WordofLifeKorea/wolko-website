-- 0041: 큐시트 — 진행표(camp_timeline)의 시간 칸마다 "어느 팀이 무엇을 준비하나"와 준비물을 적고, 팀 목록을 캠프마다 둔다.
-- 모두 덧붙이기만 한다(기존 줄은 그대로, 새 칸은 빈 값이 기본값). 기존 notes 칸은 계속 「내부 메모」로, 공유·인쇄에 나가지 않는다.
--   team        : 이 칸을 맡은 팀 이름(예: 찬양팀). 「전체」 = 모두. 한 줄에 팀 하나 — 두 팀이 같이 하면 두 줄
--   prepNotes   : 팀이 해야 할 일·준비사항(자세히) — 스태프에게 보여 주는 글
--   items       : 이 칸에 필요한 준비물, 줄마다 하나 — 스태프에게 보여 주는 글
--   prepMinutes : 시작 몇 분 전까지 준비를 끝내야 하는지(비워도 됨)
ALTER TABLE camp_timeline ADD COLUMN team TEXT NOT NULL DEFAULT '';
ALTER TABLE camp_timeline ADD COLUMN prepNotes TEXT NOT NULL DEFAULT '';
ALTER TABLE camp_timeline ADD COLUMN items TEXT NOT NULL DEFAULT '';
ALTER TABLE camp_timeline ADD COLUMN prepMinutes INTEGER;
-- 준비물에도 어느 팀이 챙기는지
ALTER TABLE camp_supplies ADD COLUMN team TEXT NOT NULL DEFAULT '';
-- 캠프별 팀 목록(이름·색·순서). 지우면 deletedAt 만 표시한다
CREATE TABLE IF NOT EXISTS camp_teams (
  id TEXT PRIMARY KEY, campId TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '', sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, createdBy TEXT NOT NULL DEFAULT '', deletedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_camp_teams_camp ON camp_teams(campId, deletedAt);
