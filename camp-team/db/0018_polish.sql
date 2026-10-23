-- 0018: 업무 담당자 별칭, 월코 팀 전체 공개 파일, 캠프 카드 순서, 변경 기록 인덱스 (모두 다시 실행해도 안전)
-- 명단 사람마다 "업무에 적는 이름"(예: Mina, 미나). 이름만 적힌 업무를 그 사람 것으로 인식하는 데 쓴다.
CREATE TABLE IF NOT EXISTS member_aliases (email TEXT PRIMARY KEY, aliases TEXT NOT NULL DEFAULT '', updatedAt TEXT NOT NULL);
-- "월코 팀 전체 공개"로 표시한 파일 (캠프팀 명단 밖의 월코 팀원은 이 파일만 볼 수 있다)
CREATE TABLE IF NOT EXISTS file_public (fileId TEXT PRIMARY KEY, setBy TEXT NOT NULL DEFAULT '', updatedAt TEXT NOT NULL);
-- 캠프별 공간의 카드 순서: scope 'default'(모두의 기본) 또는 'u:이메일'(그 사람만)
CREATE TABLE IF NOT EXISTS camp_order (
  scope TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('type','camp')), itemId TEXT NOT NULL, pos INTEGER NOT NULL,
  PRIMARY KEY (scope, kind, itemId)
);
-- 휴지통·활동 기록이 "누가 언제 지웠나"를 찾을 때 전체를 훑지 않게
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entityId, at);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at);
