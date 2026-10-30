/** 지원서·추천서 메일 공통 — 공식 로고(이미지, 메일 앱은 SVG를 못 보여 준다)와 로고 색 */
export const MAIL_NAVY = '#004e65';
/** 받는 사람이 낯설지 않게 — 'WOLKO Portal' 대신 단체 이름으로 보낸다 */
export const MAIL_FROM = '월코 Word of Life Korea';
/** 받은편지함 미리보기 줄(본문 첫 줄 대신 보인다) */
export const preheader = text => `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${text}</div>`;
export const MAIL_LOGO = '<img src="https://wolko.org/images/wolko-logo-email.png" width="206" height="40" alt="WOLKO 월코 — Word of Life Korea" style="display:block;border:0;width:206px;height:auto;">';
