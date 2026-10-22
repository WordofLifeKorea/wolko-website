-- 회계 장부(10단계) 더미 자료: 새 역할(디렉터·월코 재정 조회) 테스트 계정 + 가짜 기간·거래·기간 예산. 로컬 테스트 전용.
-- 처음부터 만들 때는 seed-dummy.sql 다음에, 이미 만들어 둔 로컬 DB에는 0010 마이그레이션 뒤에 한 번 실행한다.
INSERT OR IGNORE INTO camp_members (email,name,role,active,createdAt,updatedAt,isTest) VALUES
 ('test-director@wolko.org','테스트 디렉터','director',1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z',1),
 ('test-treasurer@wolko.org','테스트 월코 재정(조회)','treasurer',1,'2026-10-21T00:00:00Z','2026-10-21T00:00:00Z',1);

-- ── 회계 장부 더미 자료 (가짜 금액·기간, 로컬 테스트 전용) ──
-- 지난 기간은 마감되어 있고, 남은 금액이 이번 기간의 "이월금"으로 넘어온 모습
INSERT INTO ledger_periods (id,name,startDate,endDate,status,currency,closingBalance,closedAt,closedBy,carryPeriodId,note,createdAt,updatedAt,createdBy,isTest) VALUES
 ('lp-2026h2','2026 하반기 (테스트)','2026-07-01','2026-12-31','closed','KRW',1200000,'2027-01-02T00:00:00Z','test-director@wolko.org','lp-2027h1','',  '2026-07-01T00:00:00Z','2027-01-02T00:00:00Z','seed',1),
 ('lp-2027h1','2027 상반기 (테스트)','2027-01-01','2027-06-30','open','KRW',NULL,NULL,NULL,NULL,'','2027-01-01T00:00:00Z','2027-01-01T00:00:00Z','seed',1);
INSERT INTO ledger_entries (id,periodId,entryDate,kind,amount,category,description,note,source,externalKey,createdAt,updatedAt,createdBy,isTest) VALUES
 ('le-carry','lp-2027h1','2027-01-01','income',1200000,'이월금','2026 하반기 (테스트) 이월','','carry','carry:lp-2026h2','2027-01-02T00:00:00Z','2027-01-02T00:00:00Z','seed',1),
 ('le-01','lp-2027h1','2027-01-08','expense',245000,'물품구입비','액티비티 물품 구입 (가짜)','','manual',NULL,'2027-01-08T00:00:00Z','2027-01-08T00:00:00Z','seed',1),
 ('le-02','lp-2027h1','2027-01-12','expense',3000000,'숙박시설비','숙소 계약금 (가짜)','1차','manual',NULL,'2027-01-12T00:00:00Z','2027-01-12T00:00:00Z','seed',1),
 ('le-03','lp-2027h1','2027-01-14','expense',600000,'식비','식사 선결제 (가짜)','','manual',NULL,'2027-01-14T00:00:00Z','2027-01-14T00:00:00Z','seed',1),
 ('le-04','lp-2027h1','2027-01-20','income',2400000,'캠프비','캠프 참가비 1차 입금 (가짜)','','manual',NULL,'2027-01-20T00:00:00Z','2027-01-20T00:00:00Z','seed',1),
 ('le-05','lp-2027h1','2027-02-02','income',500000,'후원금','교회 후원 (가짜)','','manual',NULL,'2027-02-02T00:00:00Z','2027-02-02T00:00:00Z','seed',1);
INSERT INTO ledger_plan (periodId,kind,category,amount,updatedAt,updatedBy) VALUES
 ('lp-2027h1','income','캠프비',5000000,'2027-01-01T00:00:00Z','seed'),
 ('lp-2027h1','income','후원금',1000000,'2027-01-01T00:00:00Z','seed'),
 ('lp-2027h1','expense','식비',1800000,'2027-01-01T00:00:00Z','seed'),
 ('lp-2027h1','expense','숙박시설비',4000000,'2027-01-01T00:00:00Z','seed'),
 ('lp-2027h1','expense','물품구입비',500000,'2027-01-01T00:00:00Z','seed'),
 ('lp-2027h1','expense','강사비',400000,'2027-01-01T00:00:00Z','seed');
