# 캠프팀 포털 (개발 중 · 배포 전)

설계: `camp-team-design/DESIGN.md` · 시안: `camp-team-design/*.html`

## 이 컴퓨터에서 확인하기 (운영에 영향 없음)
```bash
./camp-team/dev/run-local.sh          # 빌드 → 임시 DB 생성 + 더미 데이터 → http://localhost:8788/campteam/
node camp-team/dev/make-tokens.mjs    # 역할별 테스트 로그인 토큰 출력 (admin / finance / member / viewer)
node --test tests/campteam-*.test.mjs
```
브라우저에서 토큰 넣기(개발자 도구 콘솔):
`sessionStorage.setItem('wolko-hub-token', '<토큰>'); location.reload()`

처음부터 다시 시작하려면 `camp-team/dev/.state` 폴더를 지우고 다시 실행하세요.

## 안전 규칙
- 새 데이터는 새 D1 데이터베이스(`DB`)에만 저장합니다. 기존 `CAMP_KV`·NAS 는 쓰지 않습니다(로그인 확인에 포털 계정을 읽기만 함).
- 루트에 `wrangler.toml` 을 만들지 마세요. Cloudflare Pages 가 대시보드 설정 대신 그 파일을 기준으로 삼아 기존 설정이 바뀔 수 있습니다.
- `CAMPTEAM_DEV_AUTH` 는 로컬 개발 전용입니다. 운영 환경에 설정하지 마세요(주소가 localhost 계열이 아니면 어차피 동작하지 않습니다).

## 진행 상황
- 1단계 완료: 캠프팀 홈 · 캠프 유형/행사 · 권한 · 팀 명단
- 2단계 완료: 자료실 (업로드 · 분류 · 검색 · 미리보기 · 버전 이력 · 외부 링크 · 여러 캠프 연결 · 금액 자료 제한)
- 3단계 완료: 일정 · 업무 (목록/필터/상태 변경, 달력, 팀 일정, 체크리스트 템플릿 적용 — 마감일 자동 계산·담당자는 제안만, 기존 시트 CSV/복사 붙여넣기 가져오기, Google Sheets 미러링 미리보기)
- Google Sheets 쓰기는 기본 꺼짐입니다. 미리보기(`GET /api/campteam/sheets-sync`)만 가능하고, 실제 쓰기는 `CAMPTEAM_SHEETS_WRITE=1` + `CAMPTEAM_SHEET_ID` + 관리자 확인이 모두 있어야 하며 아직 실제 Google 로는 시험하지 않았습니다.
- 파일 본문은 `CAMPTEAM_FILES`(R2) 가 있으면 R2 에, 없으면 기존 NAS 게이트웨이(`TEACH_NAS_URL/TOKEN`, 그룹 `camp`)에 저장합니다. 둘 다 없으면 링크 등록만 가능합니다.
- 파일 열기/받기는 로그인한 사람에게만 5분짜리 서명 주소를 만들어 줍니다(주소만 알아서는 열리지 않음).

## 배포할 때 필요한 것 (아직 하지 않음)
1. Cloudflare 대시보드에서 D1 데이터베이스 새로 만들기 → Pages 프로젝트에 `DB` 이름으로 연결
2. `camp-team/db/0001_init.sql`, `0002_files.sql`, `0003_tasks.sql` 을 순서대로 실행 (더미 데이터 `seed-dummy.sql` 은 실행하지 않음)
   (파일 보관소는 기존 NAS 를 쓰면 추가 설정 없음. R2 를 쓰려면 `CAMPTEAM_FILES` 이름으로 새 버킷을 연결)
3. 캠프팀 명단(admin, 재정 담당, 팀원) 등록: 설정 화면에서 입력
