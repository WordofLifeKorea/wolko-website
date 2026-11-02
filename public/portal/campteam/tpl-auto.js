/* 체크리스트 자동 적용 질문 — (1) 템플릿 편집창의 「새 캠프를 만들면 물어보기」 스위치, (2) 새 캠프를 만든 직후 뜨는 「이 캠프에 체크리스트를 적용할까요?」 창.
   창은 묻기만 한다. 사람이 「적용」을 눌러야만 기존 /api/campteam/apply-template 로 업무가 만들어지고, 「나중에」·닫기·Esc 는 아무것도 만들지 않는다.
   쓰는 곳: camps.js(새 캠프 저장 뒤 offer), tasks.js(템플릿 편집창에 mountSwitch). */
(function () {
  CT.addDict({
    ko: { taSwitch: '새 캠프를 만들면 이 체크리스트를 적용할지 물어보기', taSwitchHelp: '켜 두면 새 캠프를 만들 때 「적용할까요?」 창이 떠요. 「적용」을 누르기 전에는 업무가 만들어지지 않아요.', taSwitchType: '이 템플릿은 정해 둔 캠프 유형의 캠프에만 물어봐요.', taSwitchAll: '캠프 유형을 정하지 않은 템플릿이라 모든 새 캠프에 물어봐요.',
      taTitle: '이 캠프에 체크리스트를 적용할까요?', taIntro: function (n) { return '「' + n + '」에 맞는 체크리스트예요. 체크한 것만 업무로 만들어요. 담당자는 정해지지 않고, 이미 만든 업무는 건너뛰어요.'; }, taItems: function (n) { return '항목 ' + n + '개'; }, taNew: function (n) { return '새로 ' + n + '개 만들어져요'; },
      taNoDate: '이 캠프에는 시작일이 없어서 마감일 없이 만들어져요. 캠프 날짜를 정한 뒤에 적용하면 마감일이 자동으로 들어가요.', taApply: '적용', taLater: '나중에', taClose: '닫기', taNone: '적용할 체크리스트를 하나 이상 골라 주세요.', taWorking: '만드는 중…', taDone: function (n) { return n + '개의 업무를 만들었어요.'; }, taLaterNote: '나중에 「업무 → 체크리스트 템플릿」에서 「캠프에 적용」을 누르면 언제든 적용할 수 있어요.' },
    en: { taSwitch: 'Ask whether to apply this checklist when a new camp is created', taSwitchHelp: 'When on, a "Apply checklist?" window appears when you create a new camp. No tasks are created until you press Apply.', taSwitchType: 'This template only asks for camps of its chosen camp type.', taSwitchAll: 'This template has no camp type, so it asks for every new camp.',
      taTitle: 'Apply a checklist to this camp?', taIntro: function (n) { return 'Checklists that fit "' + n + '". Only the ones you tick become tasks. Owners are left empty and existing tasks are skipped.'; }, taItems: function (n) { return n + ' items'; }, taNew: function (n) { return n + ' new tasks will be created'; },
      taNoDate: 'This camp has no start date, so tasks are created without due dates. Apply after setting the camp dates to get due dates automatically.', taApply: 'Apply', taLater: 'Later', taClose: 'Close', taNone: 'Pick at least one checklist to apply.', taWorking: 'Creating…', taDone: function (n) { return n + ' tasks created.'; }, taLaterNote: 'You can apply it any time from Tasks → Checklist templates → "Apply to camp".' }
  });
  var esc = CT.esc;

  /** 이 캠프(유형 typeId)에 물어볼 템플릿: 스위치가 켜져 있고 항목이 있으며, 유형이 정해진 템플릿은 같은 유형일 때만. 유형이 없는 템플릿은 모든 캠프. */
  function pick(templates, typeId) {
    return (templates || []).filter(function (t) { return Number(t.autoApply) === 1 && t.items && t.items.length && (!t.typeId || t.typeId === typeId); });
  }

  /** 템플릿 편집창 안의 스위치. box 안에 그리고, 값은 이름이 autoApply 인 숨은 칸('1'/'0')에 넣어 폼과 같이 저장된다 */
  function mountSwitch(box, t) {
    if (!box) return;
    var on = !!(t && Number(t.autoApply) === 1);
    box.innerHTML = '<label class="tplauto-sw"><input type="checkbox" id="tplAutoCk"' + (on ? ' checked' : '') + '><span>' + esc(CT.t('taSwitch')) + '</span></label>' +
      '<input type="hidden" name="autoApply" id="tplAutoVal" value="' + (on ? '1' : '0') + '">' +
      '<small class="hint">' + esc(CT.t('taSwitchHelp')) + ' ' + esc(CT.t(t && t.typeId ? 'taSwitchType' : 'taSwitchAll')) + '</small>';
    var ck = box.querySelector('#tplAutoCk'), val = box.querySelector('#tplAutoVal');
    ck.addEventListener('change', function () { val.value = ck.checked ? '1' : '0'; });
  }

  var dlg = null;
  function ensureDlg() {
    if (dlg && dlg.isConnected) return dlg;
    dlg = document.createElement('dialog'); dlg.id = 'tplAutoDlg'; dlg.className = 'tpldlg'; document.body.appendChild(dlg); return dlg;
  }

  /** 새 캠프를 만든 직후 호출: camp = { id, typeId, startDate, nameKo, nameEn }. 물어볼 템플릿이 없거나 업무 작성 권한이 없으면 아무 일도 하지 않는다. */
  async function offer(camp) {
    try {
      if (!camp || !camp.id || !CT.can('tasks', 'edit')) return;
      var tpls = pick((await CT.api('/api/campteam/templates')).templates, camp.typeId || '');
      if (!tpls.length) return;
      // 각 템플릿을 적용하면 몇 개가 새로 생기는지 미리 본다(아무것도 만들지 않는 preview). 실패해도 창은 뜬다.
      var pv = await Promise.all(tpls.map(function (t) { return CT.api('/api/campteam/apply-template', { method: 'POST', body: { campId: camp.id, templateId: t.id, preview: true } }).catch(function () { return null; }); }));
      var hasDate = pv.some(function (p) { return p && p.summary; }) ? pv.some(function (p) { return p && p.summary && p.summary.campHasDate; }) : !!camp.startDate;
      var d = ensureDlg();
      d.innerHTML = '<h3>' + esc(CT.t('taTitle')) + '</h3><p class="tpldlg-note">' + esc(CT.t('taIntro')(CT.pick(camp, 'name') || camp.nameKo || '')) + '</p>' +
        (hasDate ? '' : '<div class="hintbox" style="margin:8px 0">' + esc(CT.t('taNoDate')) + '</div>') +
        '<div class="tpldlg-list">' + tpls.map(function (t, i) {
          var n = pv[i] && pv[i].summary ? pv[i].summary.toCreate : null;
          return '<label><input type="checkbox" data-tpl="' + esc(t.id) + '" checked><span><b>' + esc(CT.pick(t, 'name')) + '</b><small>' + esc(CT.t('taItems')(t.items.length)) + (n == null ? '' : ' · ' + esc(CT.t('taNew')(n))) + '</small></span></label>';
        }).join('') + '</div><div class="err" id="tplAutoErr" hidden></div><p class="tpldlg-note">' + esc(CT.t('taLaterNote')) + '</p>' +
        '<div class="dlg-actions"><button type="button" class="btn" id="tplAutoLater">' + esc(CT.t('taLater')) + '</button><button type="button" class="btn pri" id="tplAutoGo">' + esc(CT.t('taApply')) + '</button></div>';
      var err = d.querySelector('#tplAutoErr'), go = d.querySelector('#tplAutoGo');
      d.querySelector('#tplAutoLater').onclick = function () { d.close(); };
      go.onclick = async function () {
        var ids = Array.prototype.map.call(d.querySelectorAll('input[data-tpl]'), function (c) { return c.checked ? c.dataset.tpl : null; }).filter(Boolean);
        if (!ids.length) { err.textContent = CT.t('taNone'); err.hidden = false; return; }
        go.disabled = true; go.textContent = CT.t('taWorking'); err.hidden = true;
        var made = 0;
        try {
          for (var i = 0; i < ids.length; i++) { var r = await CT.api('/api/campteam/apply-template', { method: 'POST', body: { campId: camp.id, templateId: ids[i] } }); made += r.created || 0; }
        } catch (e) { err.textContent = e.message; err.hidden = false; go.disabled = false; go.textContent = CT.t('taApply'); return; }
        d.innerHTML = '<h3>' + esc(CT.t('taTitle')) + '</h3><p>' + esc(CT.t('taDone')(made)) + '</p><div class="dlg-actions"><button type="button" class="btn pri" id="tplAutoOk">' + esc(CT.t('taClose')) + '</button></div>';
        d.querySelector('#tplAutoOk').onclick = function () { d.close(); };
      };
      d.showModal();
    } catch (e) { /* 물어보는 창이 안 떠도 캠프 만들기는 이미 끝났다 — 조용히 넘어간다 */ }
  }

  window.CTTplAuto = { pick: pick, offer: offer, mountSwitch: mountSwitch };
})();
