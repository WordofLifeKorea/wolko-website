-- 기본 캠프 유형·캠프 (한 번만 실행하면 되고, 다시 실행해도 같은 것이 두 번 생기지 않는다)
-- 실행 순서: 마이그레이션 0019 를 먼저 적용한 뒤 실행한다.
--   npx wrangler@4 d1 execute <DB 이름> --remote --config <wrangler.migrate.toml> --file camp-team/deploy/defaults-camps.sql
-- 모두 실제 자료(isTest=0)이고 화면에서 이름을 고치거나 지울 수 있다. 캠프 유형은 이름이 같은 것이 이미 있으면 새로 만들지 않고 그것을 쓴다.
-- 2027 겨울·2026 여름 캠프는 포털 「캠프 관리자」에 올라 있는 정보(src/content/camp_schedules)를 옮긴 것이다. 제주 캠프·테스트 캠프는 넣지 않았다.

INSERT INTO camp_types (id,nameKo,nameEn,description,sortOrder,createdAt,updatedAt,createdBy,isTest)
  SELECT 'type-wolko-english','WOLKO 영어 캠프','WOLKO English Camp','',1,'2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camp_types WHERE nameKo = 'WOLKO 영어 캠프' AND deletedAt IS NULL);
INSERT INTO camp_types (id,nameKo,nameEn,description,sortOrder,createdAt,updatedAt,createdBy,isTest)
  SELECT 'type-unity','연합캠프','Unity Camp','',2,'2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camp_types WHERE nameKo = '연합캠프' AND deletedAt IS NULL);
INSERT INTO camp_types (id,nameKo,nameEn,description,sortOrder,createdAt,updatedAt,createdBy,isTest)
  SELECT 'type-jrsyme','Jr.SYME','Jr.SYME','',3,'2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camp_types WHERE nameKo = 'Jr.SYME' AND deletedAt IS NULL);
INSERT INTO camp_types (id,nameKo,nameEn,description,sortOrder,createdAt,updatedAt,createdBy,isTest)
  SELECT 'type-christian-school','교회 학교 캠프','Christian School Camps','',4,'2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camp_types WHERE nameKo = '교회 학교 캠프' AND deletedAt IS NULL);
INSERT INTO camp_types (id,nameKo,nameEn,description,sortOrder,createdAt,updatedAt,createdBy,isTest)
  SELECT 'type-church','교회 캠프','Church Camps','',5,'2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camp_types WHERE nameKo = '교회 캠프' AND deletedAt IS NULL);

INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,year,season,capacity,registrationCampId,createdAt,updatedAt,createdBy,isTest)
  SELECT 'camp-2027-english-summer',(SELECT id FROM camp_types WHERE nameKo = 'WOLKO 영어 캠프' AND deletedAt IS NULL ORDER BY createdAt LIMIT 1),'2027 여름 WOLKO 영어 캠프 (일정 미정)','2027 Summer WOLKO English Camp (TBD)',NULL,NULL,'planning','','',2027,'여름',NULL,'','2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camps WHERE id = 'camp-2027-english-summer');
INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,year,season,capacity,registrationCampId,createdAt,updatedAt,createdBy,isTest)
  SELECT 'camp-2027-unity-summer',(SELECT id FROM camp_types WHERE nameKo = '연합캠프' AND deletedAt IS NULL ORDER BY createdAt LIMIT 1),'2027 여름 연합 캠프 (일정 미정)','2027 Summer Unity Camp (TBD)',NULL,NULL,'planning','','',2027,'여름',NULL,'','2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camps WHERE id = 'camp-2027-unity-summer');
INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,year,season,capacity,registrationCampId,createdAt,updatedAt,createdBy,isTest)
  SELECT 'camp-placeholder-english',(SELECT id FROM camp_types WHERE nameKo = 'WOLKO 영어 캠프' AND deletedAt IS NULL ORDER BY createdAt LIMIT 1),'WOLKO 영어 캠프 (일정 미정)','WOLKO English Camp (date TBD)',NULL,NULL,'planning','','',NULL,'',NULL,'','2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camps WHERE id = 'camp-placeholder-english');
INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,year,season,capacity,registrationCampId,createdAt,updatedAt,createdBy,isTest)
  SELECT 'camp-placeholder-unity',(SELECT id FROM camp_types WHERE nameKo = '연합캠프' AND deletedAt IS NULL ORDER BY createdAt LIMIT 1),'연합캠프 (일정 미정)','Unity Camp (date TBD)',NULL,NULL,'planning','','',NULL,'',NULL,'','2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camps WHERE id = 'camp-placeholder-unity');
INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,year,season,capacity,registrationCampId,createdAt,updatedAt,createdBy,isTest)
  SELECT 'camp-portal-2026-inland-english-junior',(SELECT id FROM camp_types WHERE nameKo = 'WOLKO 영어 캠프' AND deletedAt IS NULL ORDER BY createdAt LIMIT 1),'2026 여름 월코 주니어 영어캠프','2026 WOLKO Summer Junior English Camp','2026-07-27','2026-08-01','done','경기도 평택시 경기대로 1407, 2층 월코센터','',2026,'여름',40,'2026-inland-english-junior','2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camps WHERE id = 'camp-portal-2026-inland-english-junior' OR (registrationCampId = '2026-inland-english-junior' AND deletedAt IS NULL));
INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,year,season,capacity,registrationCampId,createdAt,updatedAt,createdBy,isTest)
  SELECT 'camp-portal-2026-inland-union',(SELECT id FROM camp_types WHERE nameKo = '연합캠프' AND deletedAt IS NULL ORDER BY createdAt LIMIT 1),'2026 교회 연합 여름캠프','2026 Unity Summer Camp','2026-08-06','2026-08-08','done','경기도 평택시 경기대로 1407, 2층 월코센터','',2026,'여름',40,'2026-inland-union','2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camps WHERE id = 'camp-portal-2026-inland-union' OR (registrationCampId = '2026-inland-union' AND deletedAt IS NULL));
INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,year,season,capacity,registrationCampId,createdAt,updatedAt,createdBy,isTest)
  SELECT 'camp-portal-2027-wolko-winter',(SELECT id FROM camp_types WHERE nameKo = 'WOLKO 영어 캠프' AND deletedAt IS NULL ORDER BY createdAt LIMIT 1),'2027 겨울 월코 영어 캠프','2027 Winter WOLKO English Camp','2027-01-11','2027-01-16','planning','경기도 평택시 경기대로 1407, 2층 월코센터','',2027,'겨울',50,'2027-wolko-winter','2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camps WHERE id = 'camp-portal-2027-wolko-winter' OR (registrationCampId = '2027-wolko-winter' AND deletedAt IS NULL));
INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,year,season,capacity,registrationCampId,createdAt,updatedAt,createdBy,isTest)
  SELECT 'camp-portal-2027-unity-winter',(SELECT id FROM camp_types WHERE nameKo = '연합캠프' AND deletedAt IS NULL ORDER BY createdAt LIMIT 1),'2027 겨울 연합 캠프','2027 Winter Unity Camp','2027-01-28','2027-01-30','planning','','',2027,'겨울',40,'2027-unity-winter','2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camps WHERE id = 'camp-portal-2027-unity-winter' OR (registrationCampId = '2027-unity-winter' AND deletedAt IS NULL));
INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,year,season,capacity,registrationCampId,createdAt,updatedAt,createdBy,isTest)
  SELECT 'camp-portal-2027-our-school-winter',(SELECT id FROM camp_types WHERE nameKo = '교회 학교 캠프' AND deletedAt IS NULL ORDER BY createdAt LIMIT 1),'2027 우리학교 캠프','2027 Our School Camp','2027-02-02','2027-02-05','planning','','',2027,'겨울',40,'2027-our-school-winter','2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camps WHERE id = 'camp-portal-2027-our-school-winter' OR (registrationCampId = '2027-our-school-winter' AND deletedAt IS NULL));
INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,year,season,capacity,registrationCampId,createdAt,updatedAt,createdBy,isTest)
  SELECT 'camp-portal-2027-siheung-jungang-elementary-english',(SELECT id FROM camp_types WHERE nameKo = '교회 캠프' AND deletedAt IS NULL ORDER BY createdAt LIMIT 1),'시흥중앙성결교회 초등영어캠프','Siheung Jungang Holiness Church Elementary English Camp','2027-01-19','2027-01-22','planning','','',2027,'겨울',NULL,'2027-siheung-jungang-elementary-english','2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z','defaults',0
  WHERE NOT EXISTS (SELECT 1 FROM camps WHERE id = 'camp-portal-2027-siheung-jungang-elementary-english' OR (registrationCampId = '2027-siheung-jungang-elementary-english' AND deletedAt IS NULL));
