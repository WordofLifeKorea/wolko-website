/*
 * 구글 광고(Ad Grants) 전환 측정 — 광고를 보고 들어온 사람이 실제로 신청·문의·후원으로 이어졌는지 구글 광고에 알린다.
 *
 * 켜는 법: 구글 광고 › 목표 › 전환에서 전환 액션을 만들고, 아래 ADS_ID(AW-로 시작)와 액션별 라벨을 채운다.
 *   ADS_ID 가 비어 있으면 이 파일은 아무것도 불러오지도 보내지도 않는다(지금 상태).
 * 원칙: 이름 · 이메일 · 전화 같은 개인 정보는 보내지 않는다(전환이 일어났다는 사실과 종류만). 포탈(/portal)에서는 불러오지 않는다.
 * 페이지에서 쓰는 법: window.wolkoConversion('camp_register') — 함수가 아직 없을 수도 있으니 if (window.wolkoConversion) 로 감싼다.
 */
(function () {
  var ADS_ID = '';   // 예: 'AW-123456789'
  var LABELS = {
    camp_register: '',   // 캠프 신청 완료 (/camp-register)
    staff_apply: '',     // 스태프 · 크루 지원 완료 (/camp-register 의 스태프 지원서)
    contact: '',         // 문의 보내기 완료 (/contact)
    donate_click: '',    // 후원 버튼 클릭 — 월드 오브 라이프 후원 페이지(give.wol.org)로 나가는 링크
  };

  window.wolkoConversion = function () {};   // 꺼져 있어도 페이지 코드가 그대로 부를 수 있게
  if (!ADS_ID || /^\/portal(\/|$)/.test(location.pathname)) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ADS_ID);
  document.head.appendChild(s);
  window.gtag('js', new Date());
  window.gtag('config', ADS_ID);

  /** 전환 하나를 보낸다. 라벨이 없는 종류는 조용히 건너뛴다. 같은 페이지에서 같은 종류는 한 번만. */
  var sent = {};
  window.wolkoConversion = function (key, done) {
    var label = LABELS[key];
    if (!label || sent[key]) { if (done) done(); return; }
    sent[key] = true;
    var called = false;
    var finish = function () { if (!called) { called = true; if (done) done(); } };
    window.gtag('event', 'conversion', { send_to: ADS_ID + '/' + label, transport_type: 'beacon', event_callback: finish });
    if (done) setTimeout(finish, 800);   // 구글이 답하지 않아도 0.8초 뒤에는 계속한다
  };

  // 후원 버튼: give.wol.org 로 나가는 링크를 누르면 전환. 새 탭으로 열리는 링크라 페이지 이동을 막지 않는다
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href*="give.wol.org"]');
    if (a) window.wolkoConversion('donate_click');
  }, true);
})();
