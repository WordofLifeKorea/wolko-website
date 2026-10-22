-- 사람별 항목 권한(역할 기본값과 다른 칸만 저장). level: none(안 보임) / view(보기만) / edit(수정 가능). 관리자만 바꾼다.
CREATE TABLE IF NOT EXISTS member_perms (
  email TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('tasks','meetings','files','camps','money','personal','notices')),
  level TEXT NOT NULL CHECK (level IN ('none','view','edit')),
  updatedAt TEXT NOT NULL, updatedBy TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (email, area)
);
