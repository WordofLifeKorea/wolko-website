-- 0021: 사람별 항목 권한에 새 항목(달력 calendar, 장부 ledger)을 쓸 수 있게 한다.
-- SQLite 는 CHECK 조건을 바꿀 수 없어서 표를 새로 만들어 옮긴다 (기존에 정해 둔 권한은 그대로 옮겨진다).
-- calendar·ledger 를 따로 정하지 않은 사람은 예전 항목(업무·예산)의 값을 그대로 이어받으므로 기존 권한은 달라지지 않는다.
CREATE TABLE member_perms_new (
  email TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('tasks','calendar','meetings','files','camps','money','ledger','personal','notices')),
  level TEXT NOT NULL CHECK (level IN ('none','view','edit')),
  updatedAt TEXT NOT NULL, updatedBy TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (email, area)
);
INSERT INTO member_perms_new (email, area, level, updatedAt, updatedBy) SELECT email, area, level, updatedAt, updatedBy FROM member_perms;
DROP TABLE member_perms;
ALTER TABLE member_perms_new RENAME TO member_perms;
