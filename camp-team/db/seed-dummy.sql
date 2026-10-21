-- 테스트(더미) 자료. 모두 isTest = 1 이라 화면에 "테스트" 표시가 붙고, 실제 자료와 구분된다.
-- 업무 이름은 현재 시트의 예시를 참고했지만 로컬 테스트 전용이다.

INSERT INTO camp_members (email,name,role,active,createdAt,updatedAt,isTest) VALUES
 ('test-admin@wolko.org','테스트 관리자','admin',1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z',1),
 ('test-finance@wolko.org','테스트 재정 담당','finance',1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z',1),
 ('test-member@wolko.org','테스트 팀원','member',1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z',1);

INSERT INTO camp_types (id,nameKo,nameEn,description,sortOrder,createdAt,updatedAt,createdBy,isTest) VALUES
 ('type-unity','Unity Camp','Unity Camp','연합 캠프',1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('type-winter','Winter Camp','Winter Camp','겨울 캠프',2,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('type-immersion','Immersion Camp','Immersion Camp','영어 이머전 캠프',3,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('type-partner','Partner Camp','Partner Camp','협력 교회·학교 캠프',4,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);

INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,createdAt,updatedAt,createdBy,isTest) VALUES
 ('camp-w27','type-winter','2027 Winter Camp','2027 Winter Camp','2027-01-14','2027-01-16','planning','','주제: 2027 Sample Theme','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('camp-u26','type-unity','Unity Camp','Unity Camp',NULL,NULL,'planning','','날짜 확정 필요','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('camp-p26','type-partner','Partner Camp','Partner Camp',NULL,NULL,'planning','','협력 교회와 일정 조율 중','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('camp-w26','type-winter','2026 Winter Camp (지난 캠프)','2026 Winter Camp (past)','2026-01-15','2026-01-17','done','','종료 후 평가 예시','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);

INSERT INTO tasks (id,campId,title,ownerName,dueDate,status,priority,createdAt,updatedAt,createdBy,isTest) VALUES
 ('t01','camp-w27','Confirm camp dates, theme & leadership','All Together',NULL,'Completed','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t02','camp-w27','Approve camp budget and venue','Leader A',NULL,'Completed','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t03','camp-w27','Recruit staff and confirm team roster','Leader B',NULL,'In Progress','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t04','camp-w27','Confirm speakers, breakout topics and schedule','Leader C','2026-11-30','In Progress','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t05','camp-w27','Launch camp promotion and registration','Leader B',NULL,'In Progress','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t06','camp-w27','Prepare English/Bible classes and classroom equipment','Leader D',NULL,'In Progress','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t07','camp-u26','Confirm Unity Camp dates, fees and breakout plan','All Together','2026-10-23','In Progress','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t08','camp-u26','Recruit Unity staff, leaders and participant registrations','All Together',NULL,'In Progress','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t09','camp-w27','Finalize training program and QT materials','Leader C',NULL,'Not Started','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t10','camp-w27','Confirm staff accommodation, meals and safety training','Leader B',NULL,'Not Started','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t11','camp-w27','Prepare camp printed materials, name tags and clothing','',NULL,'Not Started','Medium','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t12','camp-w27','Plan camp vehicle transportation and cleanup','Leader C',NULL,'Not Started','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t13','camp-w27','Finalize participant list, dorms and registration','Leader B',NULL,'Not Started','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t14','camp-w27','Prepare orientation, games and venue setup','Program Team',NULL,'Not Started','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t15','camp-w27','Prepare cabins and Gospel counseling training','Counselor Team',NULL,'Not Started','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t16','camp-w27','Prepare worship team, instruments and slides','Music Team',NULL,'Not Started','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t17','camp-w27','Check camp media, slides, photo/video plan','Tech & Media Team',NULL,'Not Started','Medium','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t18','camp-u26','Complete Unity safety, training and transport readiness','',NULL,'Not Started','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t19','camp-w27','Complete camp evaluation, finance and follow-up','Leader A',NULL,'Not Started','Medium','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t20','camp-p26','Confirm partner church/school camp needs and schedule','Leader A',NULL,'Waiting for Confirmation','High','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('t21','camp-u26','Send fee notice to churches (OVERDUE example)','Leader B','2026-10-15','In Progress','Medium','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);

INSERT INTO meetings (id,campId,meetDate,meetTime,title,purpose,createdAt,updatedAt,createdBy,isTest) VALUES
 ('m1','camp-u26','2026-10-20','10:00','캠프팀 회의 (테스트)','Unity Camp 참가비와 분반 논의','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('m2','camp-w27','2026-10-13','10:00','Winter Camp 준비 회의 (테스트)','주제와 강사 확정','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);

INSERT INTO agenda_items (id,meetingId,campId,topic,status,nextMeeting,note,sortOrder,createdAt,updatedAt,createdBy,isTest) VALUES
 ('a1','m1','camp-u26','Unity Camp 참가비 확정','pending',1,'제안: 얼리버드 70,000 / 일반 85,000',1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('a2','m1','camp-u26','분반(breakout) 주제 결정','pending',1,'',2,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('a3','m2','camp-w27','Camp Crew 운영 방향','discussed',1,'후속 양육 포함',3,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);

INSERT INTO files (id,campId,title,description,kind,storage,externalUrl,uploadedBy,statusLabel,createdAt,updatedAt,createdBy,isTest) VALUES
 ('f1','camp-w27','Winter Camp 시간표 v3','','pdf','link','','Leader C','적용 중','2026-10-20T00:00:00Z','2026-10-20T00:00:00Z','seed',1),
 ('f2','camp-w27','스태프 배정표','','xls','link','','Leader B','','2026-10-18T00:00:00Z','2026-10-18T00:00:00Z','seed',1),
 ('f3','camp-u26','Unity Camp 포스터 시안','','img','link','','Leader D','','2026-10-17T00:00:00Z','2026-10-17T00:00:00Z','seed',1);

INSERT INTO budget_lines (id,campId,category,label,plannedAmount,actualAmount,notes,createdAt,updatedAt,createdBy,isTest) VALUES
 ('b1','camp-w27','venue','장소 대관 (더미)',3000000,NULL,'더미 금액','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b2','camp-w27','food','식사 (더미)',2200000,NULL,'더미 금액','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b3','camp-u26','print','인쇄물 (더미)',400000,150000,'더미 금액','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);

-- 2단계 더미 자료: 파일 분류와 외부 링크
UPDATE files SET category='program', topic='시간표', statusLabel='active', storage='link', linkKind='google-doc', externalUrl='https://docs.google.com/document/d/dummy-timetable-v3/edit' WHERE id='f1';
UPDATE files SET category='staff', topic='Camp Crew', statusLabel='draft', storage='link', linkKind='google-sheet', externalUrl='https://docs.google.com/spreadsheets/d/dummy-staff-roster/edit' WHERE id='f2';
UPDATE files SET category='promo', topic='포스터', statusLabel='draft', storage='link', linkKind='drive', externalUrl='https://drive.google.com/file/d/dummy-unity-poster/view' WHERE id='f3';
INSERT INTO files (id,campId,title,description,kind,storage,externalUrl,uploadedBy,statusLabel,category,topic,restricted,linkKind,createdAt,updatedAt,createdBy,isTest) VALUES
 ('f4','camp-w27','Winter Camp 예산 계획 (더미)','금액 자료 예시 — 금액 권한이 없는 사람에게는 목록에도 보이지 않습니다','xls','link','https://docs.google.com/spreadsheets/d/dummy-budget/edit','Leader A','draft','budget','예산',1,'google-sheet','2026-10-19T00:00:00Z','2026-10-19T00:00:00Z','seed',1);

-- 3단계 더미 자료: 팀 일정과 체크리스트 템플릿
INSERT INTO events (id,campId,title,kind,startDate,endDate,startTime,endTime,createdAt,updatedAt,createdBy,isTest) VALUES
 ('e1',NULL,'Leader D Out of Office','out','2026-10-18','2026-10-21','','','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('e2','camp-p26','Outreach at Sample Church','team','2026-10-23',NULL,'','','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('e3',NULL,'Leader C Out of Office','out','2026-10-27',NULL,'','','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('e4',NULL,'Camp & Outreach Huddle','team','2026-10-27',NULL,'10:00','11:00','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('e5',NULL,'Staff Devos','team','2026-10-28',NULL,'09:30','','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('e6','camp-w27','Winter Camp Speaker Call','team','2026-10-29',NULL,'14:00','15:00','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);

INSERT INTO checklist_templates (id,nameKo,nameEn,typeId,description,createdAt,updatedAt,createdBy,isTest) VALUES
 ('tpl-winter','Winter Camp 기본 체크리스트 (테스트)','Winter Camp checklist (test)','type-winter','현재 시트의 Master checklist 항목을 참고한 예시. 마감 기준일(며칠 전)은 비워 두었어요.','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);
INSERT INTO checklist_items (id,templateId,title,offsetDays,ownerSuggestion,priority,sortOrder,createdAt,updatedAt,createdBy,isTest) VALUES
 ('ci1','tpl-winter','Confirm camp dates, theme & leadership',NULL,'All Together','High',1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('ci2','tpl-winter','Approve camp budget and venue',-90,'Leader A','High',2,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('ci3','tpl-winter','Recruit staff and confirm team roster',-75,'Leader B','High',3,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('ci4','tpl-winter','Confirm speakers, breakout topics and schedule',-60,'Leader C','High',4,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('ci5','tpl-winter','Launch camp promotion and registration',-60,'Leader B','High',5,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('ci6','tpl-winter','Prepare camp printed materials, name tags and clothing',-14,'Leader C','Medium',6,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('ci7','tpl-winter','Plan camp vehicle transportation and cleanup',-14,'Leader C','High',7,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('ci8','tpl-winter','Complete camp evaluation, finance and follow-up',14,'Leader A','Medium',8,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);
