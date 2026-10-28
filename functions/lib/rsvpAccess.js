/** 이벤트 참석 목록에 직접 참석자를 추가할 수 있는 계정 — 마스터·관리자 말고도 이 목록의 계정 */
export const RSVP_ADDER_EMAILS = ['peterchae@wol.org'];

export const canAddRsvp = session => !!session && (session.role === 'master' || session.role === 'admin'
  || RSVP_ADDER_EMAILS.includes(String(session.email || '').trim().toLowerCase()));
