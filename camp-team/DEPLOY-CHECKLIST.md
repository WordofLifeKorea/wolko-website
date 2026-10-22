# 배포 체크리스트 (아직 실행하지 않음 — 승인 후 순서대로)

원칙: **새 것을 만들어 연결만** 합니다. 기존 D1/KV/R2/NAS/환경변수는 수정·삭제하지 않습니다. 각 단계 사이에 멈추고 확인할 수 있습니다.

## A. 배포 전 (내 컴퓨터)
- [ ] `node camp-team/dev/predeploy-check.mjs` → `✅ 모든 점검 통과`
- [ ] 로컬에서 화면 확인 완료 (`MORNING-REVIEW.md`)
- [ ] 수정 요청 반영 후 다시 점검
- [ ] **이 단계에서 push/배포를 할지 결정** (이전까지는 로컬 커밋만 있음)

## B. Cloudflare 대시보드 (사용자가 직접 · 기존 설정은 그대로 둠)
1. **D1 새로 만들기**: Storage & Databases → D1 → 새 데이터베이스(예: `wolko-camp-team`)
2. **마이그레이션 실행**(D1 → Console 또는 `wrangler d1 execute`): `camp-team/db/0001_init.sql` → `0002` → … → `0009_home_layout.sql` **순서대로**. `seed-dummy.sql` 은 **절대 실행하지 않음**(가짜 데이터)
3. **Pages 프로젝트 → 설정 → 바인딩**: D1 바인딩을 **이름 `DB`** 로 추가(Production). 기존 바인딩은 건드리지 않음
4. (선택) **R2 버킷** 새로 만들어 이름 **`CAMPTEAM_FILES`** 로 바인딩. 안 하면 기존 NAS 사용, 둘 다 없으면 링크 등록만 가능
5. **`CAMPTEAM_DEV_AUTH` 는 만들지 않음**(로컬 전용)
6. 루트에 `wrangler.toml` 이 없는지 재확인(있으면 대시보드 설정을 덮어씀)

## C. 코드 올리기 (승인 후)
1. 먼저 **Preview(미리보기) 배포**로: 브랜치 `feature/camp-team-portal` 을 push → Pages 가 Preview URL 을 만들어 줌. 운영 도메인에 영향 없음
   (Preview 환경에도 `DB` 바인딩이 필요하면 B-3 을 Preview 에도 추가)
2. Preview 에서 확인 (아래 D)
3. 문제 없으면 운영 반영(main 병합) — **포털 메뉴 카드 패치는 이때 마지막으로**:
   ```bash
   git apply --check camp-team/deploy/portal-menu.patch   # 먼저 검사
   git apply camp-team/deploy/portal-menu.patch           # 적용(기존 파일 2개 + 메뉴 개수 테스트 1개)
   node --test tests/portal-layout.test.mjs
   ```

## D. 배포 후 첫 설정 (관리자 `aidenpark@wolko.org` 또는 `hkim3@wol.org` 로 로그인)
- [ ] `/campteam/` 이 열리고 "관리자"로 인식되는지
- [ ] 설정 → **명단**: 재정 담당, 팀원 이메일 입력
- [ ] 캠프 유형(Winter/Unity 등)·개별 행사 만들기
- [ ] **실제 체크리스트 템플릿**: 업무 화면의 "붙여넣기 가져오기"로 (미리보기 → 저장)
- [ ] 기존 업무 시트 가져오기(CSV/붙여넣기) — **미리보기로 먼저 확인**
- [ ] 일반 계정(명단에 없는 사람)으로 들어가 **금액이 안 보이는지**, "모두의 기본 홈" 저장이 막히는지 확인
- [ ] 홈 꾸미기에서 **모두의 기본 홈** 배치 정하기(관리자)
- [ ] "선생님 담당 리더"가 **포털에서 승인된 멤버**인지 확인 → 캠프 자료실 탭에서 자료가 보이는지 (캠프팀 명단과 무관, 기존 캠프 자료실 규칙 그대로)
- [ ] 파일 업로드 1개 시험(R2/NAS 어느 쪽이 연결됐는지 확인)
- [ ] TV: 설정/TV 편집에서 **TV 전용 열쇠** 만들기 → 위젯 배치 → TV Bro 에 `https://사이트주소/tv/?t=열쇠` 입력 → 북마크 → 사무실 TV 가 밤에 꺼지고 아침에 켜지는 것 확인

## E. 선택 기능 (필요할 때, 하나씩, 복사본으로 먼저)
| 기능 | 순서 |
|---|---|
| **Sheets 미러링** | ① **복사본 시트**를 만들고 `Task ID` 열 추가 ② 서비스 계정에 복사본 편집 권한 ③ `CAMPTEAM_SHEET_ID`(복사본) 설정 ④ 설정 화면 **미리보기**로 "무엇을 쓸지" 확인 ⑤ `CAMPTEAM_SHEETS_WRITE=1` + 관리자 확인으로 복사본에 쓰기 ⑥ 문제 없으면 운영 시트 ID 로 교체. 기존 `Task ID` 없는 줄은 건드리지 않고, 줄 삭제는 하지 않음 |
| **Calendar** | 테스트 캘린더 → 서비스 계정에 공유 → `CAMPTEAM_CALENDAR_ID` → 미리보기 → `CAMPTEAM_CALENDAR_WRITE=1` |
| **Google 로그인** | Google Cloud 에서 OAuth 클라이언트(웹) 만들기 → 승인된 JavaScript 출처에 사이트 주소 → `CAMPTEAM_GOOGLE_CLIENT_ID` 설정. wolko.org 계정만, 조회 전용 |
| **AI 초안** | `ANTHROPIC_API_KEY` 를 **비밀(Secret)** 로 추가. 사용량 과금 주의. 키는 채팅에 붙여넣지 말 것 |

## F. 문제가 생기면 (되돌리기)
- **캠프팀 전체 끄기**: Pages 바인딩의 `DB` 를 제거하면 캠프팀 API 는 오류 안내를 내고, 기존 포털은 영향 없음(독립 경로 `/campteam/*`, `/api/campteam/*`, `/tv/`)
- **포털 메뉴 카드만 제거**: `git apply -R camp-team/deploy/portal-menu.patch`
- **TV**: TV Bro 주소를 기존 대시보드 주소로 되돌리면 끝
- **TV 열쇠 유출 의심**: TV 편집 → 열쇠 다시 만들기(이전 주소 즉시 무효)
- **데이터 백업**: 설정 → 내보내기(JSON 전체/CSV). 배포 후 주기적으로 받아 두기
- **잘못 삭제**: 휴지통에서 복구(영구 삭제 기능 없음)

## G. 비밀값 안전 수칙
- API 키·서비스 계정 JSON·토큰은 **대시보드의 비밀 칸에만** 입력. 채팅, 저장소, 문서에 붙여넣지 않습니다.
- 저장소는 공개이므로 실제 이름·연락처·내부 문서를 올리지 않습니다(`predeploy-check` 가 일부 검사).
