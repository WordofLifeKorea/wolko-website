(function (root) {
  /**
   * 예비 순위: 같은 캠프·같은 성별의 예비 신청자끼리, 예약금이 확인된 사람이 먼저(확인된 시각 순),
   * 그다음 예약금 확인 전인 사람(신청 순)이다. 최종확정된 신청은 예비 순위에서 빠진다.
   */
  function isActiveWaitlist(reg) {
    return reg && reg.isWaitlist === true && (reg.status || (reg.confirmed === true ? 'confirmed' : 'pending')) !== 'confirmed';
  }
  function groupKey(reg) {
    return reg.campId + '|' + (reg.registrationType === 'group' ? 'group' : (reg.gender || ''));
  }
  function depositTime(reg) {
    var t = Date.parse(reg.depositConfirmedAt || '');
    return Number.isFinite(t) ? t : null;
  }
  function submittedTime(reg) {
    var t = Date.parse(reg.registeredAt || '');
    return Number.isFinite(t) ? t : 0;
  }
  function rankFor(reg, regs) {
    if (!isActiveWaitlist(reg)) return null;
    var key = groupKey(reg);
    var peers = regs.filter(function (r) { return isActiveWaitlist(r) && groupKey(r) === key; });
    peers.sort(function (a, b) {
      var da = depositTime(a), db = depositTime(b);
      if (da !== null && db !== null) return da - db || submittedTime(a) - submittedTime(b);
      if (da !== null) return -1;
      if (db !== null) return 1;
      return submittedTime(a) - submittedTime(b);
    });
    var index = peers.findIndex(function (r) { return r.regId === reg.regId; });
    return index === -1 ? null : index + 1;
  }
  root.WolkoWaitlist = { rankFor: rankFor, isActiveWaitlist: isActiveWaitlist };
})(typeof window !== 'undefined' ? window : globalThis);
