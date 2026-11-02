/* 홈 맨 위 「지금」 카드 — 오늘 진행표가 있으면 지금·다음을 짧게, 곧 시작하는(또는 준비 중인) 캠프가 있으면 「캠프 D-n」과 다음 일정, 아무것도 없으면 아예 그리지 않는다.
   홈의 다른 카드들(pgd 칸·끌어서 옮기기)과는 따로 맨 위 빈 칸(#nowBox)에만 그려서 서로 영향이 없다. 요청은 가벼운 한 번(now?summary=1). 무엇을 보여 줄지는 now-core.js 의 homeCard() 가 정한다. */
(function () {
  var CT = window.CT, host = document.getElementById('nowBox'); if (!CT || !host || !window.NowCore) return;
  CT.addDict({
    ko: { hnNow: '지금', hnNext: '다음', hnMore: '자세히 ›', hnPrep: '준비는 지금부터!', hnLeft: function (n) { return n + '분 남음'; }, hnDn: function (n) { return 'D-' + n; }, hnDday: '오늘 시작', hnDayN: function (n) { return n + '일째'; }, hnFirst: '다음 준비·첫 일정', hnNextUp: '다음 일정', hnPrepP: '준비 기간' },
    en: { hnNow: 'Now', hnNext: 'Next', hnMore: 'Details ›', hnPrep: 'Start getting ready now!', hnLeft: function (n) { return n + ' min left'; }, hnDn: function (n) { return 'D-' + n; }, hnDday: 'Starts today', hnDayN: function (n) { return 'Day ' + n; }, hnFirst: 'Next prep / first up', hnNextUp: 'Next up', hnPrepP: 'Prep period' }
  });
  var esc = CT.esc, NC = window.NowCore, data = null, timer = 0;
  function ttl(r) { return CT.lang() === 'en' && r.titleEn ? r.titleEn : r.title; }
  function cname(c) { return CT.lang() === 'en' && c.nameEn ? c.nameEn : (c.nameKo || c.nameEn || ''); }
  function line(lab, r, extra) {
    return '<div class="hn-line"><span class="hn-lab">' + esc(lab) + '</span><span class="hn-t">' + esc(r.startTime ? r.startTime + ' ' : '') + '<b>' + esc(ttl(r)) + '</b>' + (r.place ? ' <small>· ' + esc(r.place) + '</small>' : '') + '</span>' + (extra || '') + '</div>';
  }
  function html(now) {
    var c = NC.homeCard(data, now); if (!c) return '';
    var lang = CT.lang(), head = '<div class="hn-hd"><b>' + esc(CT.t('hnNow')) + '</b><span class="hn-camp">' + esc(cname(c.camp)) + '</span>', body = '';
    if (c.kind === 'live') {
      var cn = c.cn;
      if (cn.current) body += line(CT.t('hnNow'), cn.current, '<em class="hn-em">' + esc(CT.t('hnLeft')(cn.minutesLeft)) + '</em>');
      if (cn.next) body += line(CT.t('hnNext'), cn.next, '<em class="hn-em' + (cn.prepNow ? ' prep' : '') + '">' + esc(cn.prepNow ? CT.t('hnPrep') : NC.fmtCountdown(cn.minutesToNext, lang)) + '</em>');
    } else {
      var tag = c.label === 'day' ? CT.t('hnDayN')(c.dayNo) : c.label === 'dn' ? CT.t('hnDn')(c.dDay) : CT.t('hnDday');
      head += '<span class="hn-d">' + esc(tag) + '</span>';
      if (c.nextRow) body += line(NC.dayLabel(c.nextRow.dayDate, now.date, lang), c.nextRow);
    }
    return '<section class="hn-card" aria-label="now">' + head + '<a class="hn-more" href="/portal/campteam/now/">' + esc(CT.t('hnMore')) + '</a></div>' + (body ? '<div class="hn-body">' + body + '</div>' : '') + '</section>';
  }
  function paint() { if (!data) return; host.innerHTML = html(NC.kstNow(Date.now())); }
  CT.api('/api/campteam/now?summary=1').then(function (d) { data = d; paint(); timer = setInterval(function () { if (!document.hidden) paint(); }, 30000); }).catch(function () { /* 카드만 안 보일 뿐, 홈은 그대로 */ });
  document.addEventListener('ct-lang', paint);
})();
