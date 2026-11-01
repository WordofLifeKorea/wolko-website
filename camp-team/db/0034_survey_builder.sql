-- 0034: 평가 설문 만들기(구글 폼처럼) — 대상(audience)·설명·질문 번호 기록, 템플릿 저장, 설문 보내기 기록.
-- 기존 설문(별점·선택·글)은 그대로 열리고 답을 받는다. 새 칸은 모두 기본값이 있어 예전 설문에 영향이 없다.
ALTER TABLE surveys ADD COLUMN audience TEXT NOT NULL DEFAULT 'other';   -- staff | student | parent | church | other(링크만)
ALTER TABLE surveys ADD COLUMN description TEXT NOT NULL DEFAULT '';     -- 설문 맨 위 설명(한국어)
ALTER TABLE surveys ADD COLUMN descriptionEn TEXT NOT NULL DEFAULT '';
ALTER TABLE surveys ADD COLUMN qSeq INTEGER NOT NULL DEFAULT 0;          -- 지금까지 쓴 가장 큰 질문 번호(지운 질문의 번호를 새 질문이 다시 쓰지 않게 — 옛 답이 엉뚱한 질문에 붙지 않도록)
-- 팀이 같이 쓰는 설문 템플릿 (질문 묶음). 지우면 deletedAt 만 표시.
CREATE TABLE IF NOT EXISTS survey_templates (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, audience TEXT NOT NULL DEFAULT 'other',
  questions TEXT NOT NULL DEFAULT '[]',                 -- JSON: 설문 질문과 같은 모양
  createdBy TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL, deletedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_survey_tpl ON survey_templates(deletedAt, audience);
-- 설문 보내기 기록. 전화번호는 저장하지 않고 해시(되돌릴 수 없는 값)만 둔다 — 같은 번호에 같은 설문을 두 번 보내지 않기 위한 용도.
CREATE TABLE IF NOT EXISTS survey_sends (
  id TEXT PRIMARY KEY, surveyId TEXT NOT NULL, phoneHash TEXT NOT NULL,
  sentAt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'          -- pending(보내는 중) | sent | failed
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_sends_once ON survey_sends(surveyId, phoneHash);
CREATE INDEX IF NOT EXISTS idx_survey_sends_day ON survey_sends(sentAt);
