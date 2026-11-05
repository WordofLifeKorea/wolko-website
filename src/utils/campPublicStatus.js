// 캠프 카드의 '신청 상태' 글자 — /camp 다가오는 캠프 카드가 캠프 신청 화면(/camp-register)과 같은 시각에 같은 글자를 보이게 하는 규칙 하나.
//
// 캠프 신청 화면은 상태를 세 단계로 정한다. 이 함수는 그 세 단계를 그대로 따라 한다(그 화면 코드는 고치지 않는다).
//  1) 처음 그릴 때: JSON status 그대로 — camp-register 머리의 statusLabel(신청 중 · 마감 · 준비 중 · 정원 마감)
//  2) 신청창이 있는 캠프(functions/lib/winterCampPolicy.js REGISTRATION_WINDOWS)에 신청 단추가 있으면:
//     camp-register applyRegistrationWindows 가 '신청 중 / 오픈 예정 / 신청 일시 마감 / 마감'으로 바꾼다.
//     신청 단추가 있는 경우 = status 'open' 이면서 — 내륙은 외부 신청서(use_external_form)가 아님, 제주는 신청서 주소(registration_url)가 있음.
//  3) status 'upcoming' + open_date 인 캠프에 카운트다운이 있으면: 열리는 시각이 되면 배지를 '신청 중'으로 바꾼다.
//     카운트다운이 있는 경우 = 내륙은 registration_url 이 비어 있을 때('카페에서 소식 받기'가 먼저), 제주는 주소와 상관없이.
//
// schedule: 캠프 일정 모음의 항목({ id, data }) — data 는 src/content/camp_schedules/*.json 내용.
// now: 밀리초 시각(Date.now() 꼴). 결과 { key, ko, en } — ko · en 은 캠프 신청 화면 배지 글자와 똑같다.
import { REGISTRATION_WINDOWS, registrationState } from '../../functions/lib/winterCampPolicy.js';

// camp-register 머리 statusLabel 과 같은 글자
export const CAMP_STATUS_LABELS = {
  open:     { ko: '신청 중',   en: 'Open' },
  closed:   { ko: '마감',      en: 'Closed' },
  upcoming: { ko: '준비 중',   en: 'Upcoming' },
  full:     { ko: '정원 마감', en: 'Full' },
};

// camp-register applyRegistrationWindows 의 배지 글자
const WINDOW_LABELS = {
  open:   { key: 'open',       ko: '신청 중',        en: 'Open' },
  before: { key: 'opens-soon', ko: '오픈 예정',      en: 'Opens soon' },
  paused: { key: 'paused',     ko: '신청 일시 마감', en: 'Closed for now' },
  closed: { key: 'closed',     ko: '마감',           en: 'Closed' },
};

function baseLabel(status) {
  const label = CAMP_STATUS_LABELS[status];
  return label ? { key: status, ko: label.ko, en: label.en } : { key: String(status), ko: String(status), en: String(status) };
}

export function campPublicStatus(schedule, now = Date.now()) {
  const id = schedule?.id;
  const d = schedule?.data || {};
  const isJeju = d.camp_type === 'jeju';
  const t = typeof now === 'number' ? now : new Date(now).getTime();

  // 2) 신청창 — 신청 단추가 그려지는 캠프만
  const hasRegisterButton = d.status === 'open' && (isJeju ? !!d.registration_url : !d.use_external_form);
  if (hasRegisterButton && REGISTRATION_WINDOWS[id]) {
    const info = registrationState(id, t);
    if (info.state === 'open') return { ...WINDOW_LABELS.open };
    if (info.state === 'before') return { ...WINDOW_LABELS.before };
    return { ...(info.nextOpenAt ? WINDOW_LABELS.paused : WINDOW_LABELS.closed) };
  }

  // 3) 카운트다운 — 열리는 시각이 지나면 '신청 중'
  const hasCountdown = d.status === 'upcoming' && !!d.open_date && (isJeju || !d.registration_url);
  if (hasCountdown && new Date(d.open_date).getTime() - t <= 0) return { ...WINDOW_LABELS.open };

  // 1) JSON status 그대로
  return baseLabel(d.status);
}

// 색 단계: 신청 중 = 진한 청록, 곧 열림 · 준비 중 = 본문색, 마감 쪽 = 흐린 글자 (camp-register .crp-status-* 와 같은 나눔)
export function campStatusTone(key) {
  if (key === 'open') return 'open';
  if (key === 'opens-soon' || key === 'upcoming') return 'upcoming';
  return 'closed';
}
