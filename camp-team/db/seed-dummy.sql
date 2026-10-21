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

-- 4단계 더미 자료: 템플릿 구역과 임시 기준일 표시, Unity 샘플 템플릿(가상 항목)
UPDATE checklist_items SET section='1. 기획·운영', provisional=CASE WHEN offsetDays IS NULL THEN 0 ELSE 1 END WHERE id IN ('ci1','ci2');
UPDATE checklist_items SET section='2. 모집·홍보', provisional=1 WHERE id IN ('ci3','ci5');
UPDATE checklist_items SET section='3. 강사·일정', provisional=1 WHERE id='ci4';
UPDATE checklist_items SET section='4. 본 캠프 준비', provisional=1 WHERE id IN ('ci6','ci7');
UPDATE checklist_items SET section='5. 사후 정리', provisional=1 WHERE id='ci8';
INSERT INTO checklist_templates (id,nameKo,nameEn,typeId,description,createdAt,updatedAt,createdBy,isTest) VALUES
 ('tpl-unity','Unity Camp 샘플 체크리스트 (테스트)','Unity Camp sample checklist (test)','type-unity','가상 항목입니다. 실제 체크리스트는 설정 후 "붙여넣어 가져오기"로 넣으세요.','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);
INSERT INTO checklist_items (id,templateId,title,offsetDays,ownerSuggestion,priority,sortOrder,section,provisional,createdAt,updatedAt,createdBy,isTest) VALUES
 ('ui1','tpl-unity','Set camp theme and dates',NULL,'All Together','High',1,'1. Planning',0,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('ui2','tpl-unity','Confirm location and participant limit',-80,'','High',2,'1. Planning',1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('ui3','tpl-unity','Send registration invitations and fee notices',-60,'Leader B','High',3,'2. Recruitment',1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('ui4','tpl-unity','Collect church rosters and emergency contacts',-30,'','High',4,'3. Registration',1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('ui5','tpl-unity','Prepare first-aid kits and share allergy information',-14,'','High',5,'4. Safety',1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('ui6','tpl-unity','Collect feedback forms and finalize accounts',14,'Leader A','Medium',6,'5. Post-camp',1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);

-- 5단계(회의록) 더미 자료 — 모두 가상 내용입니다.
UPDATE meetings SET titleEn='Team meeting (test)', attendees='Leader A, Leader B, Leader C', recordNote='약 40분 (가상)', sourcesNote='전사 텍스트 1건, 화이트보드 사진 1장 (가상)', status='final',
  purposeEn='Discuss Unity Camp fee and breakout themes (sample)', summaryKo='참가비 안과 분반 주제 후보를 논의했다. 최종 결정은 다음 회의로 넘긴다. (가상 내용)', summaryEn='The team discussed fee options and breakout theme candidates. Final decisions move to the next meeting. (sample)' WHERE id='m1';
UPDATE meetings SET titleEn='Winter Camp planning (test)', attendees='Leader A, Leader C', status='final', purposeEn='Theme and speakers (sample)' WHERE id='m2';
INSERT INTO agenda_items (id,meetingId,campId,topic,titleEn,bodyKo,bodyEn,kind,sectionNo,status,nextMeeting,sortOrder,tags,createdAt,updatedAt,createdBy,isTest) VALUES
 ('s1','m1','camp-u26','핵심 요약','Summary','참가비와 분반 주제를 논의했고 최종 결정은 다음 회의로 넘겼다.','Fee options and breakout themes were discussed; final decisions move to the next meeting.','summary',1,'discussed',0,1,'','2026-10-20T00:00:00Z','2026-10-20T00:00:00Z','seed',1),
 ('s2','m1','camp-u26','배경 설명 (결정 아님)','Background (not a decision)','지난해 참가비를 참고 자료로 공유했다. 이 내용은 이번 회의에서 새로 결정한 것이 아니다.','Last year''s fee was shared as reference. This was not newly decided at this meeting.','context',2,'discussed',0,2,',예산,','2026-10-20T00:00:00Z','2026-10-20T00:00:00Z','seed',1),
 ('s3','m1','camp-u26','참가비','Camp fee','얼리버드와 일반 두 가지 금액을 제안했다. 팀은 방향에는 공감했지만 금액은 아직 확정하지 않았다.','Early and regular prices were proposed. The team agreed on the direction but not on amounts yet.','discussion',3,'discussed',0,3,',예산,unity camp,','2026-10-20T00:00:00Z','2026-10-20T00:00:00Z','seed',1),
 ('s4','m1','camp-u26','분반 주제','Breakout themes','주제 후보 세 가지가 나왔다. 외부 강사 섭외가 필요하다.','Three theme candidates came up. External speakers are needed.','discussion',4,'discussed',0,4,',강사,','2026-10-20T00:00:00Z','2026-10-20T00:00:00Z','seed',1),
 ('s5','m2','camp-w27','주제와 강사','Theme and speakers','주제 후보 두 가지를 검토했다.','Two theme candidates were reviewed.','discussion',1,'discussed',0,1,',강사,','2026-10-13T00:00:00Z','2026-10-13T00:00:00Z','seed',1);
INSERT INTO decisions (id,meetingId,agendaItemId,campId,kind,textKo,textEn,decidedDate,supersedesId,state,tags,createdAt,updatedAt,createdBy,isTest) VALUES
 ('d1','m1','s3','camp-u26','proposal','얼리버드 70,000원 / 일반 85,000원 (가상 금액)','Early 70,000 / Regular 85,000 (sample amounts)','2026-10-20',NULL,'superseded',',예산,unity camp,','2026-10-20T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('d2','m1','s3','camp-u26','direction','참가비는 얼리버드와 일반 두 단계로 나누는 방향으로 한다.','Use two price tiers: early and regular.','2026-10-20',NULL,'active',',예산,unity camp,','2026-10-20T00:00:00Z','2026-10-20T00:00:00Z','seed',1),
 ('d3','m2','s5','camp-w27','final','Winter Camp 주제는 샘플 주제 A로 한다. (가상)','The Winter Camp theme is Sample Theme A. (sample)','2026-10-13',NULL,'superseded',',주제,','2026-10-13T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('d4','m1','s4','camp-w27','changed','Winter Camp 주제를 샘플 주제 B로 바꾼다. (가상)','The Winter Camp theme changes to Sample Theme B. (sample)','2026-10-20','d3','active',',주제,','2026-10-20T00:00:00Z','2026-10-20T00:00:00Z','seed',1),
 ('d5','m1','s3','camp-u26','hold','분반 강사 비용 지급 방식은 보류한다.','Speaker payment method is on hold.','2026-10-20',NULL,'active',',예산,강사,','2026-10-20T00:00:00Z','2026-10-20T00:00:00Z','seed',1);
UPDATE decisions SET supersedesId = NULL WHERE id = 'd1';
INSERT INTO decisions (id,meetingId,agendaItemId,campId,kind,textKo,textEn,decidedDate,supersedesId,state,tags,createdAt,updatedAt,createdBy,isTest) VALUES
 ('d6','m1','s3','camp-u26','final','얼리버드 70,000원 / 일반 80,000원으로 확정한다. (가상 금액)','Early 70,000 / Regular 80,000 confirmed. (sample amounts)','2026-10-20','d1','active',',예산,unity camp,','2026-10-20T00:00:00Z','2026-10-20T00:00:00Z','seed',1);
UPDATE tasks SET meetingId='m1', agendaItemId='s4' WHERE id='t06';

-- 6단계(예산) 더미 자료 — 모두 가상 금액입니다. KRW 는 원, USD 는 센트(최소 단위 정수)로 저장.
DELETE FROM budget_lines;
INSERT INTO budget_lines (id,campId,category,label,plannedAmount,expectedAmount,actualAmount,currency,vendor,paidAt,status,notes,createdAt,updatedAt,createdBy,isTest) VALUES
 ('b01','camp-w27','venue','장소 대관 (체육관·강당)',3000000,3000000,1500000,'KRW','샘플 센터','2026-10-10','ordered','계약금 50% 지급, 잔금 남음 (가상)','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b02','camp-w27','food','캠프 식사 (참가자·스태프)',4200000,4400000,NULL,'KRW','샘플 식당','','ordered','인원 변동 가능 (가상)','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b03','camp-w27','transport','차량 임대·유류',900000,900000,NULL,'KRW','','','planned','','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b04','camp-w27','print','교재 인쇄·이름표',650000,700000,NULL,'KRW','샘플 인쇄소','','planned','','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b05','camp-w27','print','캠프 티셔츠',1800000,1800000,NULL,'KRW','샘플 업체','','ordered','','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b06','camp-w27','speaker','강사 사례비',1500000,1500000,NULL,'KRW','','','planned','','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b07','camp-w27','snacks','간식·음료',500000,500000,NULL,'KRW','','','planned','','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b08','camp-w27','insurance','단체 보험',300000,300000,320000,'KRW','샘플 보험','2026-10-15','paid','계획보다 20,000원 초과 (가상)','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b09','camp-w27','promo','홍보물·SNS 광고',400000,400000,NULL,'KRW','','','planned','','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b10','camp-w27','scholarship','장학금·시상',1100000,1100000,NULL,'KRW','','','planned','','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b11','camp-w27','misc','예비비',800000,800000,NULL,'KRW','','','planned','','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b12','camp-w27','speaker','해외 게스트 강사 항공권 (USD 예시)',80000,85000,NULL,'USD','Sample Airline','','planned','USD 예시 줄: $800.00 계획 (가상)','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b13','camp-u26','print','포스터·안내문 인쇄',400000,400000,150000,'KRW','샘플 인쇄소','2026-10-12','ordered','일부 지급 (가상)','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('b14','camp-u26','venue','교회 장소 사례',600000,600000,NULL,'KRW','','','planned','','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);
INSERT INTO budget_targets (id,campId,currency,amountMinor,notes,createdAt,updatedAt,createdBy,isTest) VALUES
 ('bt1','camp-w27','KRW',15000000,'가상 총 예산','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('bt2','camp-w27','USD',200000,'가상: $2,000.00','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('bt3','camp-u26','KRW',1500000,'가상 총 예산','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);

-- 7단계(TV) 더미 자료: 로컬 테스트용 TV 열쇠, 공지, 캠프 주제/정원
INSERT INTO tv_settings (key,value,updatedAt) VALUES ('token','testtoken1','2026-10-21T00:00:00Z');
INSERT INTO notices (id,message,messageEn,active,sortOrder,createdAt,updatedAt,createdBy,isTest) VALUES
 ('n1','캠프 회의: 참가비와 분반 주제는 결정이 필요해요. (가상)','Camp meetings: fees and breakout themes need decisions. (sample)',1,1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('n2','회의가 끝나면 포털에 회의록을 올려 주세요. (가상)','Please upload meeting notes to the portal after each meeting. (sample)',1,2,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1),
 ('n3','(숨김 처리된 공지 예시)','(hidden notice example)',0,3,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z','seed',1);
UPDATE camps SET theme='2027 Sample Theme / Sample verse 1:1', capacity=40, registrationCampId='sample-winter' WHERE id='camp-w27';
