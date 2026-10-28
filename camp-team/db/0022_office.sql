-- 0022: 캠프팀 홈 「팀 사무실」 — 지금 자리에 앉아 있는 사람(접속 확인)과 팀원별 캐릭터 모양.
-- office_presence: 캠프팀 페이지를 열어 둔 사람이 1분마다 갱신하는 "마지막으로 본 시각". 오래되면(약 2분 30초) 자리가 비어 보인다. hidden=1 이면 자리를 숨긴 사람.
-- office_avatars: 팀원별 캐릭터 모양(머리·피부·안경 등을 담은 짧은 JSON). 정해 두지 않은 사람은 화면이 이메일로 자동으로 정한다. 실제 이름·외모는 코드가 아니라 여기(DB)에만 둔다.
CREATE TABLE IF NOT EXISTS office_presence (
  email TEXT PRIMARY KEY,
  lastSeen TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS office_avatars (
  email TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  updatedBy TEXT NOT NULL DEFAULT ''
);
