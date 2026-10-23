-- 로컬 시험용 가짜 알림 자료 (날짜는 "오늘" 기준으로 계산). 실제 자료와 무관하다.
INSERT OR IGNORE INTO tasks (id,campId,title,ownerName,ownerEmail,dueDate,status,priority,createdAt,updatedAt,createdBy,isTest) VALUES
 ('al-t1','camp-w27','샘플 업무: 강사 일정 확정','Member','test-member@wolko.org',date('now','+9 hours','-2 day'),'In Progress','High',datetime('now'),datetime('now'),'seed',1),
 ('al-t2','camp-w27','샘플 업무: 프로그램 안내문 초안','Member','test-member@wolko.org',date('now','+9 hours'),'In Progress','Medium',datetime('now'),datetime('now'),'seed',1),
 ('al-t3','camp-w27','샘플 업무: 간식 업체 견적 받기','Member','test-member@wolko.org',date('now','+9 hours','+1 day'),'Not Started','Medium',datetime('now'),datetime('now'),'seed',1),
 ('al-t4','camp-w27','샘플 업무: 숙소 배정표 정리','Member','test-member@wolko.org',date('now','+9 hours','+3 day'),'Not Started','Low',datetime('now'),datetime('now'),'seed',1),
 ('al-t5','camp-w27','샘플 업무: 재정 보고서 검토','Director','test-director@wolko.org',date('now','+9 hours','+1 day'),'In Progress','High',datetime('now'),datetime('now'),'seed',1);
INSERT OR IGNORE INTO meetings (id,campId,meetDate,meetTime,title,purpose,createdAt,updatedAt,createdBy,isTest) VALUES
 ('al-m1','camp-w27',date('now','+9 hours','+1 day'),'10:00','샘플 주간 회의','주간 점검',datetime('now'),datetime('now'),'seed',1);
INSERT OR IGNORE INTO announcements (id,title,body,audience,pinned,link,createdAt,updatedAt,createdBy,createdByName,isTest) VALUES
 ('al-a1','샘플 공지: 이번 주 회의 안내','이번 주 회의는 화요일 오전에 진행해요. 안건을 미리 적어 주세요.','all',1,'/campteam/meetings/',datetime('now'),datetime('now'),'test-director@wolko.org','Director',1);
