-- 0033: 새 캠프 카드 만들기 → 환규 선교사님께 인계. (0032 의 상태·역할을 넓히고, 월코 포털 종 알림용 받은 요청함을 만든다)
-- camp_forms: 상태 draft → review(Jason) → final(Aiden) → handed(환규 확인 대기) → confirmed(환규 확인 완료). 홈페이지에 반영된 것이 보이면 liveAt 에 시각이 찍힌다.
CREATE TABLE camp_forms_new (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('camper','staff')),
  campType TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','final','handed','confirmed')),
  content TEXT NOT NULL,                  -- JSON: { card, base, blocks, thanks }
  version INTEGER NOT NULL DEFAULT 1,
  campId TEXT NOT NULL DEFAULT '',        -- 홈페이지 캠프 파일 이름(제안). 한 번 쓰이면 바꾸지 않는다
  baseCampId TEXT NOT NULL DEFAULT '',    -- 이 신청서가 불러온 지난 캠프
  ack INTEGER NOT NULL DEFAULT 0,         -- 「바뀌지 않은 항목을 확인했어요」
  codeRequests TEXT NOT NULL DEFAULT '[]',-- JSON: [{id,text,by,at,state,prUrl,note}]
  copiedFrom TEXT,
  createdBy TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
  handedAt TEXT, confirmedAt TEXT, confirmedBy TEXT, liveAt TEXT, deletedAt TEXT
);
INSERT INTO camp_forms_new (id,kind,campType,title,status,content,version,copiedFrom,createdBy,createdAt,updatedAt,handedAt,deletedAt)
  SELECT id,kind,campType,title,CASE status WHEN 'approved' THEN 'handed' ELSE status END,content,version,copiedFrom,createdBy,createdAt,updatedAt,approvedAt,deletedAt FROM camp_forms;
DROP TABLE camp_forms;
ALTER TABLE camp_forms_new RENAME TO camp_forms;

CREATE TABLE camp_form_roles_new (
  email TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('editor','reviewer','approver','deployer')), createdAt TEXT NOT NULL, PRIMARY KEY (email, role)
);
INSERT INTO camp_form_roles_new (email, role, createdAt) SELECT email, role, createdAt FROM camp_form_roles;
DROP TABLE camp_form_roles;
ALTER TABLE camp_form_roles_new RENAME TO camp_form_roles;

-- 월코 포털 종 알림에 한 줄로 보이는 「받은 요청」. 환규 선교사님에게는 인계 요청(camp_handoff), 팀에게는 완료 알림(camp_done).
CREATE TABLE IF NOT EXISTS portal_inbox (
  id TEXT PRIMARY KEY, email TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, href TEXT NOT NULL DEFAULT '', formId TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, readAt TEXT, doneAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_portal_inbox_email ON portal_inbox(email, doneAt, readAt);
