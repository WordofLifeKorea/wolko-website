-- 0031: 루미 대화 기억 — 계정마다 최근 대화를 서버에 두어 다른 화면·다른 기기에서도 이어 쓴다(본인 계정만 읽고 지울 수 있다).
CREATE TABLE IF NOT EXISTS lumi_chats (
  email TEXT PRIMARY KEY, msgs TEXT NOT NULL, updatedAt TEXT NOT NULL
);
-- 화면 설정(예: 사용법 카드 접기)을 계정마다 기억한다. 본인만 읽고 쓴다.
CREATE TABLE IF NOT EXISTS ui_prefs (
  email TEXT NOT NULL, k TEXT NOT NULL, v TEXT NOT NULL, updatedAt TEXT NOT NULL, PRIMARY KEY (email, k)
);
