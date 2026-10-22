# 캠프팀 포털 — 구조와 동작 설명서 (처음 보는 사람용)

> 상태: **개발 완료 · 로컬 확인만 함 · 배포 안 함 · push 안 함.**
> 이 문서는 "무엇이 어디에 있고, 어떻게 돌아가고, 무엇을 확인했고, 무엇은 아직 확인 못 했는지"를 정리합니다.
> 바로 화면부터 보고 싶으면 `MORNING-REVIEW.md`, 배포 순서는 `DEPLOY-CHECKLIST.md`를 보세요.

---

## 1. 한눈에 보기

기존 월코 포털(WOLKO) 안에 **`/campteam/` 주소로 붙는 새 구역**입니다. 기존 파일은 하나도 고치지 않고, **새 파일만 추가**했습니다.

```
사용자 브라우저
   │  (화면)  src/pages/campteam/*.astro  +  public/campteam/*.js·css
   │  (데이터) /api/campteam/*   ← functions/api/campteam/*.js  (Cloudflare Pages Functions)
   ▼
 새 D1 데이터베이스 (바인딩 이름 DB)      ← 캠프팀 데이터 전부
 새 R2 버킷 (CAMPTEAM_FILES, 선택)        ← 업로드 파일 본문 (없으면 기존 NAS 게이트웨이, 둘 다 없으면 링크 등록만)
 기존 CAMP_KV                           ← 읽기만: ① 로그인 확인 ② 신청 인원 "숫자"
```

**TV 화면**은 로그인 없이 `/tv/?t=<TV 전용 열쇠>` 로 열립니다(사무실 TV용). 금액·이메일·개인정보는 TV 데이터에 아예 들어가지 않습니다.

## 2. 지켜진 약속 (기존 것은 건드리지 않음)

| 약속 | 어떻게 지켰나 / 어떻게 확인하나 |
|---|---|
| 기존 코드 수정 없음 | 기준 커밋(`24fd01ed`) 대비 **추가된 파일만** 있음. `node camp-team/dev/predeploy-check.mjs` 가 자동 확인 |
| 기존 데이터 안 건드림 | 새 D1/R2만 씀. 기존 `CAMP_KV`는 **읽기 2가지뿐**(아래 5장) |
| 기존 계정·관리자 안 건드림 | 기존 `hubAccounts.js` 등은 수정 없음. 캠프팀 권한은 **캠프팀 안에서만** 적용되는 별도 명단(`camp_members`) |
| 배포 안 함 | 배포·push 명령을 실행하지 않음. 루트 `wrangler.toml` 도 만들지 않음(대시보드 설정을 덮어쓸 수 있어서) |
| 실제 내부 내용 비공개 | 저장소가 공개라서 더미(가짜) 데이터만 사용. 실제 이름·문구 검사도 자동 점검에 포함 |
| 새 유료 구독 없음 | Cloudflare 기존 계정 안에서 D1/R2 무료 범위 위주 (8장) |

**딱 하나의 예외(아직 적용 안 함):** 포털 첫 화면·왼쪽 메뉴에 "캠프팀" 카드를 넣으려면 기존 파일 2개(+ 메뉴 개수를 검사하는 기존 테스트 1개)에 몇 줄을 더해야 합니다. 그 변경은 **패치 파일 `camp-team/deploy/portal-menu.patch` 로만 준비**해 두었고, 승인 후 마지막에 적용합니다.

## 3. 폴더 지도

```
camp-team/                설명서·DB 설계·로컬 도구 (배포물에 포함되지 않음)
  ARCHITECTURE.md        이 문서
  MORNING-REVIEW.md      5분 확인 가이드
  DEPLOY-CHECKLIST.md    나중에 배포할 때 순서
  PROGRESS.md            작업 기록
  db/0001~0009_*.sql     DB 표 만들기(순서대로). seed-dummy.sql = 가짜 데이터(운영에는 실행하지 않음)
  dev/                   로컬 실행·테스트 로그인·가짜 AI·배포 전 점검 스크립트
  deploy/portal-menu.patch  포털 메뉴 카드 추가(미적용)
camp-team-design/         설계 문서와 화면 시안(HTML)
functions/lib/campteam*.js    공통 로직(권한, 파일, 체크리스트, 시트, 회의록, 금액, TV, AI, 구글)
functions/api/campteam/*.js   API (화면이 부르는 서버 주소) 40여 개
src/layouts/CampTeamLayout.astro   캠프팀 공통 틀(왼쪽 메뉴·로그인 안내·한/영 전환)
src/pages/campteam/*.astro    캠프팀 화면 (홈, 캠프, 업무, 회의, 자료, 검색, 예산, TV 편집, 휴지통, 설정, 캠프 공간)
src/pages/tv.astro            사무실 TV 화면
public/campteam/*.js·css      화면 동작(자바스크립트)과 모양(CSS)
tests/campteam-*.test.mjs     자동 테스트 91개
```

## 4. 기능 지도 (요청 → 구현)

| 요청 | 화면 | 핵심 파일 |
|---|---|---|
| 캠프팀 홈 (진행 업무·마감 지남·담당 미정·다가오는 일정·최근 결정·공지) | `/campteam/` | `api/campteam/home.js`, `public/campteam/home.js` |
| **홈 꾸미기**: 섹션을 끌어서 순서 변경·숨기기·너비(반쪽/전체). 관리자는 "모두의 기본 홈", 각자는 "내 홈"(개인 설정이 우선) | 홈의 "✏️ 홈 꾸미기" | `api/campteam/home-layout.js`, `campteamHomeLayout.js`, 표 `home_layout` |
| **캠프 자료실 탭**: 기존 포털 캠프 자료실을 수정 없이 그대로 불러옴. 캠프팀에서 들어오면 위에 "← 캠프팀으로 돌아가기" 막대 | `/campteam/resources/` | `src/pages/campteam/resources.astro` |
| **팝업 공통 동작**: 모든 팝업에 ✕, 바깥 배경·Esc로 닫기, 고친 내용이 있으면 "저장하고 닫기/저장 안 하고 닫기/계속 편집" 확인 | 모든 화면 | `public/campteam/campteam.js` (한 곳) |
| **포털과 같은 왼쪽 메뉴**(짙은 청록 바탕·색 아이콘 칸·구역 제목)와 메뉴별 이모티콘 | 모든 화면 | `CampTeamLayout.astro`, `campteam.css` |
| 캠프 유형(Winter 등) / 개별 행사 + 캠프별 공간 | `/campteam/camps/`, `/campteam/space/` | `camps.js`, `camp-space.js` |
| 자료실: 업로드·분류·검색·미리보기·버전·외부 링크·여러 캠프에 연결 | `/campteam/files/` | `files.js`, `file.js`, `upload.js`, `file-url.js`, `campteamFiles.js` |
| 일정·업무: 달력/목록, 담당·기한 비어도 저장, 상태 변경 | `/campteam/tasks/` | `tasks.js`, `events.js`, `calendar.js` |
| 체크리스트 템플릿: 캠프 시작일 기준 마감 자동 계산, 담당자는 **제안만** | 업무 화면·설정 | `templates.js`, `apply-template.js`, `campteamChecklist.js` |
| 기존 시트에서 가져오기(CSV·붙여넣기) | 업무 화면 | `import-tasks.js`, `import-template.js` |
| 회의록: 한/영 같은 회의, 안건별 논의, 결정 이력(제안·방향·최종·보류·변경), 날짜/캠프/주제 검색, 다음 회의 안건 | `/campteam/meetings/` | `meetings.js`, `meeting.js`, `agenda.js`, `decisions.js`, `campteamMinutes.js` |
| 회의록 → 업무 만들기(한/영 중복 방지) | 회의 상세 | `meeting-task.js` |
| 통합 검색 | `/campteam/search/` | `search.js` |
| 캠프 예산(₩ 기본, USD 확장 가능, 예상 리포트, 지난 캠프 복사, CSV) | `/campteam/budget/` | `budget.js`, `budget-report.js`, `campteamMoney.js` |
| TV 대시보드: 위젯 끌어서 배치, 여러 화면 슬라이드, 자동 새로고침, 금액 없음 | `/tv/?t=…`, 편집 `/campteam/tv/` | `tv-data.js`, `tv-config.js`, `campteamTv.js`, `public/campteam/tv*.js` |
| 신청 인원 위젯(읽기 전용 숫자) | TV·홈 | `campteamRegistrations.js` |
| Google Sheets 미러링(꺼짐 기본) | 설정 | `sheets-sync.js`, `campteamSheets.js` |
| Google Calendar 미러링(꺼짐 기본) | 설정 | `calendar-sync.js` |
| Google 로그인(wolko.org, 조회 전용, 꺼짐 기본) | 로그인 안내창 | `google-login.js`, `campteamGoogleAuth.js` |
| AI 회의록 초안(꺼짐 기본) | 회의 상세 | `ai-minutes.js`, `ai-draft.js`, `campteamAi.js` |
| 번역 | **만들지 않음** — 용어집(`glossary.js`)과 연결 자리만 | |
| 백업·내보내기·휴지통·변경 기록 | `/campteam/trash/`, 설정 | `export.js`, `trash.js`, `audit.js` |

## 5. 서버·계정 데이터를 어떻게 불러오는가

### 5-1. 로그인 확인 (기존 계정은 "읽기만")
1. 사용자가 기존 포털에 로그인하면 브라우저에 포털 세션 토큰이 있습니다(`sessionStorage 'wolko-hub-token'`).
2. 캠프팀 화면이 API를 부를 때 그 토큰을 보냅니다.
3. 서버(`functions/lib/campteamAuth.js`)는 **기존 검증 함수로 토큰이 진짜인지만 확인해 이메일을 얻습니다.** 계정을 만들거나 바꾸지 않습니다.
4. 그 이메일을 **캠프팀 전용 명단(`camp_members` 표)** 에서 찾아 역할을 정합니다. 명단에 없으면 "조회만".
5. (선택) Google 로그인을 켜면 wolko.org 구글 계정은 **캠프팀 전용 토큰(`wolko-camp-token`)** 을 받습니다. 이 토큰은 기존 포털에서는 통하지 않고 **조회 전용**입니다.

### 5-2. 권한표 (서버에서 강제 — 화면에서 숨기는 것만이 아님)

| 구분 | 자료·일정·업무·회의록 | 예산·금액 |
|---|---|---|
| 관리자 (코드에 고정 2명: `aidenpark@wolko.org`, `hkim3@wol.org` + 설정에서 추가한 사람) | 전체 | 조회·작성 |
| 재정 담당 | 조회만 (금액 자료는 올릴 수 있음) | 조회·작성 |
| 캠프팀 팀원 | 작성·수정 | 조회·작성 |
| 그 외 포털 사용자 / 명단 없음 | 조회만 | **API가 아예 안 내려줌** (403, 응답에 금액 필드 없음) |

- 재정 담당·팀원 이메일은 **코드에 없습니다.** 배포 후 설정 화면에서 입력합니다.
- 기존 포털의 master/admin 권한은 캠프팀 안에서 자동으로 관리자가 되지 않습니다(테스트로 확인).

### 5-2b. 누가 어디까지 접근하나 (한눈에)

| 위치 | 비로그인 | 포털 로그인(명단 없음 = 조회만) | 재정 담당 | 캠프팀 팀원 | 관리자 |
|---|---|---|---|---|---|
| 포털의 "캠프팀" 카드 | 안 보임 | **보임**(카드는 로그인한 모두에게) | 보임 | 보임 | 보임 |
| 캠프팀 페이지 열기 | 로그인 안내창 | 열림(조회) | 열림 | 열림 | 열림 |
| 홈·캠프·업무·회의·자료 **보기** | ✕ | ✅ | ✅ | ✅ | ✅ |
| 위 항목 **작성·수정·삭제** | ✕ | ✕ | ✕(금액 자료만) | ✅ | ✅ |
| 예산·금액(메뉴·API·TV 제외) | ✕ | ✕ (메뉴 없음, API 403) | ✅ 조회·작성 | ✅ 조회·작성 | ✅ |
| 휴지통 복구 | ✕ | ✕ | 금액 항목만 | ✅ | ✅ |
| **내 홈 꾸미기** | ✕ | ✅ (내 것만) | ✅ | ✅ | ✅ |
| **모두의 기본 홈 꾸미기** | ✕ | ✕ | ✕ | ✕ | ✅ |
| 설정·팀 명단·변경 기록·내보내기·TV 설정(열쇠) | ✕ | ✕ | ✕ | ✕ | ✅ |
| **캠프 자료실 탭** | 기존 자료실의 로그인 | 아래 설명 | 아래 설명 | 아래 설명 | 아래 설명 |
| TV 화면(`/tv/?t=열쇠`) | 열쇠가 맞으면 열림(금액·이메일 없음) | — | — | — | — |

- **캠프 자료실 탭의 접근은 캠프팀 명단과 무관합니다.** 탭은 기존 `/camp-resources` 페이지를 그대로 불러오기만 하므로, 누가 보고 올리고 관리하는지는 **기존 캠프 자료실의 규칙**(승인된 포털 멤버는 보기·올리기, 마스터가 정한 관리자는 폴더 관리 등)이 그대로 정합니다. 즉 "선생님 담당 리더"는 **포털에서 승인된 멤버이기만 하면** 자료를 볼 수 있고, 캠프팀 명단에 넣을 필요가 없습니다(넣으면 캠프팀 안의 권한이 추가될 뿐). 캠프팀 쪽 권한은 이 페이지에 영향을 주지 않습니다.
- 포털의 master/admin 권한은 캠프팀 안에서 **자동으로 관리자가 되지 않습니다**(자동 테스트로 확인). 캠프팀 관리자는 코드에 고정된 2명 + 설정에서 추가한 사람입니다.
- 이 표 전체를 `tests/campteam-home-layout.test.mjs`의 "접근 권한 표" 테스트가 21개 요청 × 5개 역할(105칸)로 자동 검증합니다.

### 5-3. 기존 데이터를 읽는 유일한 두 곳
| 읽는 것 | 방법 | 쓰기? |
|---|---|---|
| 포털 세션 토큰 검증 | 기존 검증 함수 호출 | 없음 |
| 캠프 신청 인원 | `CAMP_KV`의 `camp:{캠프ID}:submissions` **한 값을 읽어 개수만 셈** (이름·연락처는 응답에 넣지 않음) | 없음 |

그 밖의 기존 KV 키, NAS 운영 파일, 운영 Google Sheet·Calendar는 읽지도 쓰지도 않습니다.

### 5-4. 캠프팀 데이터가 저장되는 곳
D1 표 24개(대부분 행에 고유 번호·만든 사람·삭제 표시. `home_layout`은 보기 설정이라 삭제 표시 대신 초기화하면 행을 지움):
`camp_members`(명단) · `camp_types`/`camps`(캠프) · `tasks`/`events`(업무·일정) · `checklist_templates`/`checklist_items` · `meetings`/`agenda_items`/`decisions`/`meeting_files`/`meeting_texts`(회의) · `files`/`file_versions`/`file_links`(자료) · `budget_lines`/`budget_targets`(예산) · `tv_layout`/`tv_settings`/`notices`(TV) · `home_layout`(홈 배치) · `glossary` · `ai_drafts` · `audit_log`.

- **삭제는 휴지통 방식**(`deletedAt`) — 복구 가능, 영구 삭제 기능은 없음.
- **금액은 정수로 저장**(원=원, 달러=센트): 소수 오차 방지, USD 확장 대비.
- **파일 열기**: 로그인한 사람에게 5분짜리 서명 주소를 만들어 줌(주소만 알아서는 안 열림). 금액 자료는 금액 권한자만.

## 6. 코드 읽는 법 (초보자용)

- **화면**은 `.astro` 파일(뼈대) + `public/campteam/*.js`(동작). 글자는 `data-t="키"`로 표시하고 한/영 사전(`CT.addDict`)에서 가져옵니다.
- **API 파일 하나 = 주소 하나.** `functions/api/campteam/tasks.js` 는 `/api/campteam/tasks`. 안의 `onRequestGet/Post/Patch/Delete`가 요청 종류별 처리입니다.
- 모든 API는 맨 앞에서 `campSession()`으로 "누구인지·무슨 권한인지" 확인하고, 권한이 없으면 바로 돌려보냅니다.
- 공통 부품: `CT.api`(서버 부르기), `CT.ask`(입력 창), `CT.money`(금액 표시).
- 금액 예상 규칙(`forecastOf`): 이미 지급했고 실제 금액이 있으면 실제 금액, 아니면 실제·예상·계획 중 가장 현실적인 값.
- 테스트는 가짜 DB(`node:sqlite`)와 가짜 파일 보관소로 돌립니다(`tests/helpers/campteam-fakes.mjs`).

## 7. 확인한 것 / 확인하지 못한 것

### ✅ 확인함
- 자동 테스트 **91개 통과** (권한·파일·업무·체크리스트·회의·예산·TV·관리·AI·구글·캠프 공간·홈 배치·역할별 접근 표).
- 실제 브라우저로 로컬 서버에서 역할별(관리자/재정/팀원/조회만) 화면 확인, 폰(375px)·아이패드(768px) 폭에서 가로 넘침 없음.
- TV 화면: 렌더링, 슬라이드 넘김, 오프라인 표시, 편집기에서 끌어서 저장 → TV에 반영.
- AI 초안: **가짜 AI 서버**로 요청 모양·검토·선택 적용 흐름 확인.
- 기존 파일 수정 0건, 기존 포털 테스트 결과가 원본과 동일(원본에서도 실패하던 9건은 그대로 — 캠프팀과 무관).
- 메뉴 패치를 임시 사본에 적용해도 기존 테스트 결과가 변하지 않음.

### ⚠️ 로컬에서는 확인 불가 (배포 후 복사본으로 먼저 확인할 것)
| 항목 | 이유 |
|---|---|
| 실제 Google Sheets 쓰기 / Calendar 쓰기 | 서비스 계정·운영 시트에 접근하지 않음. 가짜 구글로 "무엇을 쓸지" 계산만 검증 |
| 실제 Google 로그인 | Google Cloud 클라이언트 ID가 필요 |
| 실제 Claude API 호출 | 키 없음. 가짜 서버로만 확인 |
| 실제 Cloudflare D1/R2 연결 | 로컬은 같은 SQLite 방식의 모의 환경 |
| 실제 NAS 업로드 | NAS 게이트웨이 접속 안 함 |
| 사무실 TV(TV Bro) 실제 렌더링 | 데스크톱 브라우저로만 확인 |
| PDF 미리보기의 다양한 실제 파일 | 직접 만든 간단한 PDF만 시험 |
| Word/Excel 미리보기 | **지원하지 않음** — 내려받기만 됩니다(편집 가능하다고 표시하지 않음) |

### 🚫 만들지 않은 것
- 번역(자동 번역) — 용어집과 연결 자리만.
- 기존 경비 리포트와의 연결 — 요청대로 캠프 전용 예산을 따로 둠.
- 실제 체크리스트 템플릿 내용 — 공개 저장소에 올리지 않았으므로 배포 후 "붙여넣기 가져오기"로 넣습니다.

## 8. 비용

새 유료 구독은 없습니다. 모두 기존 Cloudflare 계정 안에서 쓰며, 일반적인 사무실 규모에서는 무료 사용량 안에 들어갈 것으로 예상합니다(**실제 요금제·한도는 대시보드에서 확인 필요**).

| 항목 | 비용 |
|---|---|
| D1 | 소규모는 무료 한도 |
| R2(선택) | 10GB까지 무료, 이후 소액. 안 쓰면 기존 NAS |
| Google Sheets/Calendar/로그인 | 무료(서비스 계정·OAuth 클라이언트 만들기) |
| **Claude API(AI 초안)** | **켠 경우에만 사용량만큼 과금.** 회의 한 번 초안은 대개 소액이지만 기본은 꺼짐 |
| TV | TV Bro 앱(무료)에 주소만 입력 |

## 9. 선택 기능 켜는 법 (모두 기본 꺼짐)

| 기능 | 설정(Cloudflare 대시보드 → Pages → 설정 → 변수/비밀) |
|---|---|
| 파일 R2 저장 | R2 버킷 새로 만들어 `CAMPTEAM_FILES` 로 연결 (없으면 기존 NAS 사용) |
| 업로드 크기 | `CAMPTEAM_MAX_UPLOAD_BYTES` (선택) |
| Sheets 미리보기 | `CAMPTEAM_SHEET_ID`, (선택)`CAMPTEAM_SHEET_TAB`(기본 `Tasks`) + 기존 `GOOGLE_SERVICE_ACCOUNT_JSON` |
| Sheets 실제 쓰기 | 위 + `CAMPTEAM_SHEETS_WRITE=1` + 시트에 **`Task ID` 열 추가** + 서비스 계정에 편집 권한 + 관리자 화면 확인 |
| Calendar | `CAMPTEAM_CALENDAR_ID`, 쓰기는 `CAMPTEAM_CALENDAR_WRITE=1` + 캘린더를 서비스 계정에 공유 |
| Google 로그인 | `CAMPTEAM_GOOGLE_CLIENT_ID` (Google Cloud OAuth 클라이언트, 승인된 출처에 사이트 주소) |
| AI 회의록 초안 | `ANTHROPIC_API_KEY` (비밀값), 선택: `CAMPTEAM_AI_MODEL` |

**비밀값(키·서비스 계정 JSON)은 채팅이나 저장소에 붙여넣지 말고 대시보드 "비밀(Secret)" 칸에 직접 넣으세요.**

## 10. TV 사용법

1. 관리자로 `/campteam/tv/` 에서 위젯을 끌어 배치하고(화면 여러 장 가능), 저장.
2. 같은 화면에서 **TV 전용 열쇠**를 만들면 주소(`https://…/tv/?t=열쇠`)가 나옵니다. 열쇠를 다시 만들면 이전 주소는 즉시 무효.
3. TV Bro에서 그 주소를 열고 홈/북마크로 저장. 해상도는 FHD(1920×1080) 기준, 새로고침 주기 기본 60초(30~600초), 6시간마다 전체 새로고침.
4. 인터넷이 끊기면 마지막 화면을 유지하고 "오프라인" 표시가 뜹니다.
5. 기존 Apps Script TV는 **새 TV가 검증될 때까지 그대로 둡니다.** 전환은 TV 브라우저 주소만 바꾸면 끝, 되돌리기도 주소만 바꾸면 됩니다.

## 11. AI 회의록 초안 흐름

녹음 전사 텍스트를 회의에 붙여넣기(보관) → "AI 초안 만들기" → Claude가 안건·결정·할 일 후보를 **초안으로만** 생성 → 사람이 항목을 골라 적용. 초안은 `ai_drafts`에 `draft` 상태로 저장되고, **담당자는 비워 두며 결정은 자동 확정하지 않습니다.** 키가 없으면 버튼이 비활성(503 안내).

## 12. 더 개선할 수 있는 점 (선택)
- 예산 화면 오류 문구 다듬기, TV 편집기 위젯 이름표.
- 홈 꾸미기는 "순서·숨김·너비"까지입니다(TV 편집기처럼 칸 단위 자유 배치는 아님). 더 필요하면 확장 가능.
- 캠프 자료실을 캠프팀 디자인으로 다시 그린 읽기 전용 목록은 만들지 않았습니다(기존 자료 저장소를 읽는 새 코드가 필요해서).
- Office 문서 미리보기(기존 OnlyOffice 연동) — 서버 위치 확인 후.
- 번역 연결(Claude API) — 용어집은 준비됨.
