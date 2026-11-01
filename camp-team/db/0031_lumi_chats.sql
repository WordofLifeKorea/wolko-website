-- 0031: 루미 대화 기억 — 계정마다 최근 대화를 서버에 두어 다른 화면·다른 기기에서도 이어 쓴다(본인 계정만 읽고 지울 수 있다).
CREATE TABLE IF NOT EXISTS lumi_chats (
  email TEXT PRIMARY KEY, msgs TEXT NOT NULL, updatedAt TEXT NOT NULL
);
