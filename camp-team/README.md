# 캠프팀 포털 (개발 완료 · 로컬 확인만 · 배포 전)

설계: `camp-team-design/DESIGN.md` · 시안: `camp-team-design/*.html`

**문서 안내**
- `MORNING-REVIEW.md` — 5분 확인 가이드 (여기서 시작)
- `ARCHITECTURE.md` — 구조·코드 읽는 법·서버/계정 데이터 읽는 방식·확인한 것/못한 것·비용
- `DEPLOY-CHECKLIST.md` — 나중에 배포할 때 순서·되돌리기
- `PROGRESS.md` — 작업 기록 · `deploy/portal-menu.patch` — 포털 메뉴 카드 추가(미적용)

## 이 컴퓨터에서 확인하기 (운영에 영향 없음)
```bash
./camp-team/dev/run-local.sh          # 빌드 → 임시 DB 생성 + 더미 데이터 → http://localhost:8788/campteam/
node camp-team/dev/predeploy-check.mjs   # 배포 전 자동 점검(읽기 전용)
node camp-team/dev/make-tokens.mjs    # 역할별 테스트 로그인 토큰 출력 (admin / finance / member / viewer)
node --test tests/campteam-*.test.mjs
```
역할을 골라 로그인하려면 서버 실행 후 http://localhost:8788/dev-login/ 을 여세요(개발용, 운영에는 없음).
수동으로 토큰을 넣으려면(개발자 도구 콘솔):
`sessionStorage.setItem('wolko-hub-token', '<토큰>'); location.reload()`

처음부터 다시 시작하려면 `camp-team/dev/.state` 폴더를 지우고 다시 실행하세요.

## 안전 규칙
- 새 데이터는 새 D1 데이터베이스(`DB`)에만 저장합니다. 기존 `CAMP_KV`·NAS 는 쓰지 않습니다(로그인 확인에 포털 계정을 읽기만 함).
- 루트에 `wrangler.toml` 을 만들지 마세요. Cloudflare Pages 가 대시보드 설정 대신 그 파일을 기준으로 삼아 기존 설정이 바뀔 수 있습니다.
- `CAMPTEAM_DEV_AUTH` 는 로컬 개발 전용입니다. 운영 환경에 설정하지 마세요(주소가 localhost 계열이 아니면 어차피 동작하지 않습니다).

## 현재 상태
- 구현 완료: **캠프 예산 · 회계 장부**(장부·기간 마감과 이월·엑셀 가져오기/내보내기·경비 리포트 연동·잔액 대조·예산 계산기·새 권한) · 홈 · 캠프/캠프 공간 · 자료실 · 일정·업무·체크리스트 · 회의록·결정 이력 · 통합 검색 · 캠프 예산 · TV 대시보드 · 휴지통·내보내기·변경 기록·용어집 · (꺼짐 기본) Sheets/Calendar 미러링 · Google 로그인 · AI 초안
- 자동 테스트: `node --test tests/campteam-*.test.mjs` (178개 통과)
- 파일 본문: `CAMPTEAM_FILES`(R2) 가 있으면 R2, 없으면 기존 NAS 게이트웨이(`TEACH_NAS_URL/TOKEN`, 그룹 `camp`), 둘 다 없으면 링크 등록만
- 파일 열기/받기는 로그인한 사람에게만 5분짜리 서명 주소로 제공
- Sheets/Calendar 쓰기·Google 로그인·AI 는 기본 꺼짐이며 실제 Google/Claude 로는 아직 시험하지 못했습니다(가짜 서버·계산 검증만). 자세히는 `ARCHITECTURE.md` 7장.

## 배포 (아직 하지 않음)
`DEPLOY-CHECKLIST.md` 를 보세요. 요약: 새 D1 만들기 → `DB` 로 연결 → `db/0001~0014` 순서 실행(시드 제외) → Preview 확인 → 명단 입력 → (마지막에) 포털 메뉴 패치.
