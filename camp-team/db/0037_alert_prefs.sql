-- 알림 설정 개편: 사람마다 알림 시점·이메일 스위치·방해 금지 시간대. 모두 덧붙이기만 한다(기존 행은 그대로, 값이 없으면 기본값처럼 동작하므로 따로 채울 필요 없음).
--   dueDays / eventDays : 내가 따로 더하는 일수 JSON (예: [7,2]). NULL = 따로 정한 것 없음 → 팀 고정 알림(notify_settings 의 dueDays/eventDays)만 적용
--   emailDue            : 마감·일정 알림 이메일 받기 (1 = 받기). 지금은 값만 저장하고, 마감·일정 알림 메일을 보내는 기능이 생기면 그때 따른다
--   quietStart/quietEnd : 방해 금지 시간대 (한국 시간 'HH:MM'). 둘 다 NULL = 없음. 이 시간에는 이메일을 보내지 않는다
--   notifyMine          : 내가 만든 업무(담당자가 다른 사람인 것)도 알림 받기 (1 = 받기)
ALTER TABLE notify_prefs ADD COLUMN dueDays TEXT;
ALTER TABLE notify_prefs ADD COLUMN eventDays TEXT;
ALTER TABLE notify_prefs ADD COLUMN emailDue INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notify_prefs ADD COLUMN quietStart TEXT;
ALTER TABLE notify_prefs ADD COLUMN quietEnd TEXT;
ALTER TABLE notify_prefs ADD COLUMN notifyMine INTEGER NOT NULL DEFAULT 0;
