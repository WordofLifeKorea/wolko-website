-- 0035: 팀 사무실 자리 — 여기 적힌 사람만 캐릭터(책상)를 갖는다. 비어 있으면 예전처럼 캠프팀 명단 전원이 자리를 갖는다.
-- visitor=1 이면 접속해서 앉아 있을 때만 책상과 캐릭터가 나타나고, 접속하지 않으면 빈 책상도 남기지 않는다.
-- 명단에 있지만 여기 없는 사람은 접속해 있을 때 「게스트」로 나온다.
CREATE TABLE IF NOT EXISTS office_seats (
  email TEXT PRIMARY KEY, visitor INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL
);
