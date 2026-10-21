# 캠프팀 포털 — 0단계 설계 문서

상태: **초안 (코드 구현 전)**. 브랜치: `feature/camp-team-portal` (로컬, push 안 함)
시안: `portal-home.html`, `tv-dashboard.html` (더미 데이터, 이 폴더에서 `python3 -m http.server`로 확인)

## 0. 절대 원칙

1. **기존 파일은 수정하지 않는다.** 새 기능은 새 파일로만 추가한다.
   - 예외 1개: 포털 메뉴에 카드 추가(`src/pages/portal.astro`). 배포 직전, 사용자 승인 후에만.
2. **기존 데이터는 읽지도 쓰지도 않는다.** `CAMP_KV`의 기존 키, NAS 운영 파일, 운영 Google Sheet·Calendar 모두 대상 아님.
3. **테스트는 로컬 + 더미 데이터 + 복사본으로만.** 모든 더미 레코드에는 `isTest: true`를 둔다.
4. **배포·push 금지.** 사용자가 직접 "올려"라고 할 때까지.
5. 확인 방법: `git diff main --stat`에 **추가(A)된 파일만** 보여야 한다.

## 1. 권한

| 구분 | 일반 자료·일정·업무·회의록 | 예산·금액 |
|---|---|---|
| admin 1명 | 전체 | 조회·작성 |
| 재정 담당 1명 | 조회만 | 조회·작성 |
| 캠프팀 팀원 | 작성·수정 | 조회·작성·수정 |
| 그 외 포털 사용자 | 조회만 | 조회 불가 |

- 구현: 기존 로그인(`parseHubSessionToken`)으로 이메일만 얻고, **별도 명단**(`camp_members` 테이블)에서 캠프팀 역할(`admin` / `finance` / `member`)을 찾는다. 명단에 없으면 "조회만".
- 기존 `hubAccounts.js`의 master/admin/counselor 로직은 건드리지 않는다.
- 명단 관리는 캠프팀 admin 화면에서. 재정 담당·admin 이메일은 사용자가 나중에 입력.
- **금액은 서버에서 차단**: 예산 API는 권한이 없으면 403, 일반 API 응답에는 금액 필드를 포함하지 않는다. 화면에서 숨기는 방식만으로는 처리하지 않는다.
- 삭제는 `deletedAt` 표시(복구 가능). 영구 삭제는 admin만.

## 2. 데이터 저장

| 용도 | 저장소 | 이유 |
|---|---|---|
| 캠프·업무·회의·결정·예산 등 관계형 데이터 | **새 D1 데이터베이스** (`wolko-camp-team`) | 고유 번호·관계·검색·정렬. 기존 KV와 완전히 분리 |
| 파일 본문 | 기존 NAS 게이트웨이의 **새 디렉터리 prefix**(`campteam/`) | 이미 검증된 대용량 저장소. 기존 키와 겹치지 않게 prefix 분리 |
| 외부 문서 | Google Drive/Docs 링크(파일 ID만 저장) | 중복 업로드 없이 연결 |

- 로컬 테스트: D1은 `wrangler pages dev`의 로컬 SQLite를 쓴다(Cloudflare 로그인 불필요, 운영 접속 없음).
- D1 만들기·바인딩 추가는 **배포 단계에서 사용자가 대시보드에서** 한다(새 바인딩 추가는 기존 바인딩에 영향 없음).
- 파일 접근: 새 자료는 **로그인 확인 후 내려주는 방식**(URL만 알면 받는 방식 아님). 기존 자료는 그대로.

### 핵심 테이블 (초안)
모든 행: `id`(UUID), `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `isTest`.

- `camp_types` — Unity Camp, Immersion Camp, Winter Camp, Partner Camp … (캠프 유형 = 전체 기록)
- `camps` — 개별 행사(예: 2027 Winter Unity Camp), `typeId`, 날짜, 상태
- `tasks` — 업무: `title, ownerName?, ownerEmail?, dueDate?, status, priority, campId?, meetingId?, sourceKey?`
  - `status` ∈ Not Started / In Progress / Waiting for Confirmation / Delayed / Completed / Not Applicable (기존 시트·TV와 동일 문자열)
  - `priority` ∈ High / Medium / Low
  - 담당자·기한은 비어 있어도 저장 가능. 임의로 채우지 않는다.
- `checklist_templates`, `checklist_items` — 캠프 생성 시 템플릿 복사. `offsetDays`(캠프 시작일 기준)로 마감 계산 → **담당자는 제안만, 확정은 사람이**
- `meetings` — 날짜·시간·참석자·목적·요약·언어별 본문(ko/en)
- `agenda_items` — 안건별 논의, `meetingId`, `topic`
- `decisions` — `agendaItemId`, `kind`(제안/방향 합의/최종 결정/보류/변경), `supersedesId?`, `effective`(현재 유효 여부)
- `files` — 제목·설명·종류·캠프/행사/주제·업로더·날짜·`storage`(nas/drive/link)·`externalUrl`·`currentVersionId`
- `file_versions` — 이전 버전 보존, 적용 상태
- `links` — 파일/회의/업무/캠프 사이의 연결(같은 파일 여러 곳에 연결, 중복 업로드 방지)
- `notices` — TV 공지: `message`, `active`
- `budget_*` — 캠프 전용 예산 계획안·예상 지출·캠프별 금액·예상 리포트 (**기존 경비 리포트와 연결 안 함**)
- `camp_members` — 이메일, 역할, 활성 여부
- `audit_log` — 누가 무엇을 바꿨는지

회의 한·영 본문은 **같은 `meetingId`·같은 `taskId`를 가리키게** 해서 업무 중복 생성을 막는다.

## 3. 화면 (새 경로 `/campteam/*`)

1. 캠프팀 홈 — 시안 `portal-home.html`
2. 캠프별 공간 — 유형 → 개별 행사 → (정보·체크리스트·업무·자료·회의·예산)
3. 일정·업무 — 달력/목록 전환, 마감 지남·담당 미정 필터
4. 회의록·결정 — 날짜별/캠프별/주제별/결정 이력
5. 자료실 — 검색·필터·정렬·미리보기·버전
6. 예산 — 금액 권한자에게만 메뉴 표시
7. 설정 — 캠프팀 명단, 체크리스트 템플릿 (admin)

디자인은 기존 포털 토큰을 그대로 사용: `--blue #004f68`, `--blue-lt #0077a3`, `--accent #c42a36`, `--bg #f4f6f8`, Montserrat + Noto Sans KR, 사이드바 252px. 한/영 전환은 기존 `data-t` 방식을 따른다.

## 4. Google Sheets · Calendar · TV

**원본은 포털 DB.** Sheets는 표시·백업용 미러.

### 4-1. 포털 → Sheets (1단계)
- 대상 탭과 열 이름은 현재 Apps Script가 읽는 이름과 **정확히 동일**하게 쓴다.
  - `Tasks`: Task, Owner, Due, Status, Camp, Priority (+ 끝에 `Task ID` 추가, 행 매칭용)
  - `Meetings`: Decision, Notes, Date, Owner
  - `Notices`: Message, Active
- `Task Archive`, `Camp 4 Weeks` 탭은 건드리지 않는다.
- 쓰기 방식: `Task ID`로 행을 찾아 **해당 행만 갱신/추가**(전체 덮어쓰기 안 함 → 드롭다운·필터·서식 보존).
- 전환 후 Sheets 직접 편집은 보호 범위/안내 문구로 막는다.

### 4-2. 일정 → Google Calendar
- 캘린더 `WOLKO Camp & Outreach Team`에 서비스 계정 **일정 수정 권한** 필요(사용자가 캘린더 공유 설정에서 서비스 계정 이메일 추가).
- 포털에서 만든 일정에는 `extendedProperties.private.portalId`를 달아 중복·수정 추적.

### 4-3. 새 TV 페이지 (2단계, 사용자 선택)
- 경로 예: `/tv/<추측 불가능한 토큰>`. 로그인 없이 TV에서 열림.
- 레이아웃·내용은 기존과 동일: 헤더(시계·날씨), 통계 3개, Priority Tasks, Upcoming Schedule, Recent Meeting Decisions, Team Announcements. 색·폰트만 wolko 기준(시안 `tv-dashboard.html`).
- 데이터: `GET /api/campteam/tv?token=…` — **금액 없음**, 회의 개인정보 없음. 토큰은 admin이 재발급 가능.
- 순서/회전/페이지 크기/갱신 주기(90초)는 기존 `CONFIG` 값 그대로.
- **기존 Apps Script TV는 새 TV가 검증될 때까지 그대로 유지.** 전환은 TV 브라우저 주소만 바꾸면 끝.

### 4-4. 테스트 방법 (운영 보호)
- Sheet **복사본**과 Apps Script **복사본**, 테스트용 캘린더 하나를 만들어 거기에만 쓴다.
- 로컬에는 Google 인증 정보가 없으므로, 로컬에서는 "이렇게 쓸 예정" **dry-run 출력**으로 검증하고, 실제 쓰기는 복사본으로 별도 검증.

## 5. Google Drive
- 개인 gmail 폴더를 서비스 계정에 **공유(읽기)** → 포털에서 목록·검색·열기. 추가 비용 없음.
- 서비스 계정은 개인 Drive에 업로드 불가 → 포털 업로드는 NAS, Drive는 링크/목록용.
- 포털은 Drive **파일 ID와 폴더 ID**만 저장. 인수인계 시 폴더를 넘기고 새 폴더를 서비스 계정에 공유한 뒤 설정값 1개만 바꾼다.

## 6. 파일 미리보기·편집
- 미리보기: PDF(`pdfjs-dist`), 이미지, 오디오/영상(브라우저 기본). Office 파일은 기존 OnlyOffice 연동이 가능한 범위에서만, 아니면 열기·다운로드.
- 편집: Google Docs/Sheets는 기존 편집기로 열기, Word는 기존 OnlyOffice 경로. **지원하지 않는 형식을 편집 가능하다고 표시하지 않는다.**

## 7. AI (선택)
- 1단계에는 없음. 구조만 준비: `ai_drafts`(초안 본문, 종류, 근거 `sourceLinks`, `status: draft|reviewed|rejected`).
- API 비용·권한은 가정하지 않는다.

## 8. 용어
캠퍼(예비 초6~중3) / Wolko Camp Crew(고등학생, 성인 스태프와 구분) / Wolko Camp Volunteer(대학생 이상 staff). 표기: Word of Life, Wolko, Camp Crew, Cause Circle, Unity Camp, Immersion Camp, Jr.SYME(Students of Youth ministry in English).

## 9. 구현 순서와 확인 방법

| 단계 | 내용 | 내가 확인하는 방법 |
|---|---|---|
| 1 | 홈 + 캠프 유형/행사 + 권한 + 더미 데이터 | 로컬에서 역할별로 보이는 화면 비교 |
| 2 | 파일 관리 | 더미 파일 업로드·버전·검색·미리보기 |
| 3 | 일정·업무 + 체크리스트 템플릿 + Sheets/Calendar dry-run | 마감일 계산, 담당 미정 필터, 쓰기 예정 내용 |
| 4 | 회의록·결정 이력·통합 검색 | 안건별 연결, 한·영 같은 업무 가리키는지 |
| 5 | 예산 | 비권한 계정에서 403 확인 |
| 6 | 새 TV 페이지 | TV 해상도에서 기존과 같은 내용 확인 |

단계마다 `git diff main --stat`으로 "추가된 파일만" 확인 가능.

## 10. 아직 모르는 것 / 필요한 입력
- 재정 담당·admin 이메일 (나중에)
- Cloudflare 요금제·현재 바인딩(KV/R2/NAS 토큰) — 배포 단계에서 대시보드 확인
- OnlyOffice 서버 위치(Office 미리보기 가능 범위)
- 캠프 유형별 체크리스트 템플릿 내용(현재 시트의 `Master checklist`, `Unity checklist`를 초기 템플릿으로 사용 예정)
