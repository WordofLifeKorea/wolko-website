# 주간 빈자리 알림 메일 (차량 운행 · 주방 보조)

매주 **월요일 한국 시간 오전 9시 30분**에, 그 주(월~일)에 열려 있는데 아직 채워지지 않은 자리가 있으면 Estelle(`esooy@wol.org`)에게 **영어 메일 한 통**을 보냅니다.
메일에는 어떤 자리가 비었는지가 날짜별로 들어갑니다.

- 차량 운행: 열려 있는 픽업/드롭오프 중 신청자가 없는 칸 (화~금이 기본 열림, 관리자가 연 칸 포함, 닫은 칸 제외)
- 주방 보조: 열려 있는 칸 중 정원이 덜 찬 칸 — "Lunch clean-up (1 of 2 signed up)"처럼 몇 명 찼는지 함께 표시
- 비어 있는 자리가 하나도 없으면 메일을 보내지 않습니다. 같은 주에는 한 번만 보냅니다(예비 실행이 한 번 더 돌아도 중복 발송 없음).

## 켜는 방법

1. Cloudflare Pages에 `RESEND_API_KEY`가 이미 있어야 합니다(다른 알림 메일과 같은 설정).
2. 인증키는 `STAFFING_REMINDER_SECRET`이 있으면 그것을, 없으면 `KITCHEN_REMINDER_SECRET` → `DRIVE_REMINDER_SECRET` → `CRS_REMINDER_SECRET` 순으로 씁니다(Cloudflare와 GitHub에 같은 값). 새로 만들지 않아도 됩니다.
3. GitHub Actions의 **Weekly staffing reminder**를 `dry_run=true`로 돌려 비어 있는 자리 계획을 확인합니다.
4. 시험 메일: `to`에 본인 이메일을 넣고 `dry_run=false`로 실행하면 그 주소로만 한 통 갑니다(정식 발송 기록은 남지 않습니다).
5. 저장소 Actions Variable `STAFFING_REMINDERS_ENABLED=true`로 매주 자동 발송을 켭니다.

받는 사람은 코드의 운행 스케줄 관리자·주방 관리자 목록(`DRIVE_MANAGER_EMAILS`, `KITCHEN_MANAGER_EMAILS`)입니다.
