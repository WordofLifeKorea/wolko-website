-- 0032: 캠프 준비 「신청서」 — 다음 캠프의 신청서 · 스태프/크루 지원서를 포털 안에서 만들고 승인받아 보관한다.
-- 작성(editor) → 검토(reviewer, 모두 승인) → 최종 승인(approver) = 「승인 완료」. 홈페이지와는 연결되어 있지 않다(홈페이지 코드·내용은 건드리지 않는다).
CREATE TABLE IF NOT EXISTS camp_form_roles (
  email TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('editor','reviewer','approver')), createdAt TEXT NOT NULL, PRIMARY KEY (email, role)
);
CREATE TABLE IF NOT EXISTS camp_forms (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('camper','staff')),
  campType TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','final','approved')),
  content TEXT NOT NULL,               -- JSON: { card, blocks, thanks }
  version INTEGER NOT NULL DEFAULT 1,  -- 검토에 올릴 때마다 +1 (이전 승인은 무효)
  copiedFrom TEXT,
  createdBy TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, approvedAt TEXT, deletedAt TEXT
);
CREATE TABLE IF NOT EXISTS camp_form_approvals (
  id TEXT PRIMARY KEY, formId TEXT NOT NULL, version INTEGER NOT NULL, stage TEXT NOT NULL CHECK (stage IN ('review','approve')),
  email TEXT NOT NULL, decision TEXT NOT NULL CHECK (decision IN ('approve','return')), comment TEXT NOT NULL DEFAULT '', at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cfa_form ON camp_form_approvals(formId, version);
