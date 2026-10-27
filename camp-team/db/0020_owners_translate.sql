-- 0020: 업무 제목 한/영 번역 칸, 담당자 이름 관리(기본 이름·새 이름 확인·합치기)
-- 업무 제목: title 은 처음 쓴 그대로, titleKo/titleEn 은 화면 언어별로 보여 줄 제목(번역은 서버가 채운다. 비어 있으면 title 을 보여 준다)
ALTER TABLE tasks ADD COLUMN titleKo TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN titleEn TEXT NOT NULL DEFAULT '';
-- 담당자 이름 목록: approved=관리자가 인정한(기본) 이름, pending=팀원이 새로 적어서 관리자 확인을 기다리는 이름, merged=기존 이름과 합치기로 정한 이름(mergedInto)
CREATE TABLE IF NOT EXISTS owner_names (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved','pending','merged')),
  mergedInto TEXT NOT NULL DEFAULT '',
  createdBy TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
