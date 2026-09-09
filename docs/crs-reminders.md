# CRS 교회 교류 알림

## 동작

- 마지막 수정일, 생성일, 최근 방문일 및 방문 기록 입력일 중 가장 최근 날짜로 180일을 계산합니다.
- 날짜가 전혀 없는 교회는 자동 메일에서 제외합니다. 날짜를 입력하면 계산됩니다.
- 종 아이콘은 로그인된 CRS 헤더에서 건수를 표시하고 교회 상세창으로 연결합니다. 한국어/영어 토글을 따릅니다.
- 승인된 포탈 회원에게만 개별 메일을 보냅니다. 다른 회원의 이메일 주소는 노출되지 않습니다.
- 기본 발신: `WOLKO CRS <crs@wolko.org>`, 회신: `wolkorea1@gmail.com`.
- 교회/마지막 기록 시각/수신자 조합마다 한 번 발송합니다. 새 기록 후 다시 180일이 지나면 새로운 알림입니다.
- GitHub Actions가 매일 한국 시간 오전 9시 17분에 실행됩니다(실제 시작은 GitHub 사정에 따라 지연 가능).

## 운영 활성화 (필수)

1. Cloudflare Pages 운영 환경에서 기존 `CAMP_KV`, `FIREBASE_CRS_SERVICE_ACCOUNT`, `RESEND_API_KEY` 설정을 확인합니다.
2. Firebase 서비스 계정에 CRS Realtime Database 읽기/쓰기 권한이 필요합니다. 발송 이력은 `crsReminderDelivery`에 저장됩니다.
   일반 클라이언트가 이 경로를 읽거나 수정하지 못하도록 기존 Firebase Rules를 확인합니다. 상위 경로 전체 허용 규칙이 있으면 하위 deny 규칙으로 막을 수 없으므로 상위 규칙부터 좁혀야 합니다.
3. 암호학적으로 임의 생성한 32바이트 이상의 `CRS_REMINDER_SECRET`을 Cloudflare Pages Secret과 GitHub repository Actions Secret에 동일하게 저장합니다. 소스/채팅/로그에 값을 넣지 않습니다. 환경변수 변경 후 Pages를 재배포합니다.
4. Resend에서 `wolko.org` 발신 도메인이 검증되어 있는지 확인합니다. 필요하면 Pages 변수 `CRS_REMINDER_FROM=hub@wolko.org`로 기존 주소를 사용합니다. 기본은 `crs@wolko.org`입니다.
5. GitHub Actions의 **CRS Contact Reminders**를 `dry_run=true`로 실행합니다. 교회/회원 건수만 확인하며 실제 메일은 보내지 않습니다.
6. 검증 후 GitHub repository Actions Variable `CRS_REMINDERS_ENABLED=true`를 설정하면 일일 자동 발송이 활성화됩니다. 초기 실행은 누적된 모든 미교류 건을 발송하므로 건수를 먼저 검토합니다.

이 저장소에 워크플로를 푸시하는 것만으로 비밀키 설정이나 메일 발송 활성화가 완료되지는 않습니다.

## 중복 및 실패 처리

Firebase ETag 조건부 쓰기로 먼저 발송 권한을 확보하고, Resend idempotency key도 함께 사용합니다.
한 요청당 최대 10통씩 처리하며 워크플로는 최대 100번 반복합니다. 한도를 넘으면 다음 실행에 이어서 처리합니다.
성공은 `sent`, 실패/불확실한 전송 결과는 `review`, 처리 도중 중단은 `sending`으로 남습니다.
`review` 또는 `sending`이 있으면 워크플로를 실패 처리해 운영자에게 확인을 요구하고 자동 재전송하지 않습니다.
Resend 로그에서 미발송이 확실한 경우에만 해당 이력 키를 삭제해 다음 실행에서 재시도합니다. 발송된 건은 유지하거나 `sent`로 수정합니다.
회원 탈퇴/교회 수정 직후 실행 중인 작업의 스냅샷에는 반영이 지연될 수 있습니다.

## 검증

`node --test tests/crs-reminders.test.mjs`

공식 참고: [Resend 발신 도메인](https://resend.com/docs/dashboard/domains/introduction), [Firebase 조건부 쓰기](https://firebase.google.com/docs/database/rest/save-data#section-conditional-requests).
