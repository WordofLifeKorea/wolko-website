/*
 * 경비 리포트 → "FIELD EXPENSE REPORT" 양식 엑셀(.xlsx)
 * 사람(제출자)마다 시트 1장. ExcelJS는 내보내기를 누를 때만 불러온다.
 * build(ExcelJS, people, { today, optionsText }) → workbook
 *   people: [{ name, reports: [{ rows, description, reviewedByName, status, processedAt }] }]
 */
(function (root) {
  const C = { blue: 'FF004F68', blueSoft: 'FFEAF4F8', zebra: 'FFF5F8FA', grey: 'FFE4EAEE', memo: 'FFFFF4D1', green: 'FFD9F0E1', ink: 'FF1F2D36', mute: 'FF5B7480', white: 'FFFFFFFF' };
  const line = (argb = 'FFB6C4CC', style = 'thin') => ({ style, color: { argb } });
  const FONT = 'Arial';
  const KRW = '"₩" #,##0';
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

  const splitAccount = a => {
    const m = String(a || '').match(/^(.*?)\s*\((\d{3,5})\)\s*$/);
    return m ? { num: Number(m[2]), name: m[1] } : { num: '', name: String(a || '') };
  };
  const spaced = d => String(d || '').replace(/-/g, ' ');
  const sheetName = (name, used) => {
    let base = String(name || 'Report').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 28) || 'Report', n = base, i = 2;
    while (used.has(n.toLowerCase())) n = base.slice(0, 26) + ' ' + i++;
    used.add(n.toLowerCase());
    return n;
  };

  function build(ExcelJS, people, opts) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'WOLKO'; wb.created = new Date();
    const used = new Set();

    people.forEach(p => {
      const ws = wb.addWorksheet(sheetName(p.name, used), {
        views: [{ showGridLines: false }],
        pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } },
      });
      ws.columns = [{ width: 11 }, { width: 30 }, { width: 42 }, { width: 15 }, { width: 19 }];

      // 병합 영역까지 한꺼번에 서식을 입히는 헬퍼
      const put = (range, value, o = {}) => {
        const [a, b] = range.includes(':') ? range.split(':') : [range, range];
        if (a !== b) ws.mergeCells(range);
        const c1 = ws.getCell(a).col, r1 = ws.getCell(a).row, c2 = ws.getCell(b).col, r2 = ws.getCell(b).row;
        for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
          const cell = ws.getCell(r, c);
          if (o.fill) cell.fill = fill(o.fill);
          cell.border = { top: line(), left: line(), bottom: line(), right: line() };
        }
        const cell = ws.getCell(a);
        cell.value = value;
        cell.font = { name: FONT, size: o.size || 11, bold: !!o.bold, italic: !!o.italic, color: { argb: o.color || C.ink } };
        cell.alignment = { vertical: 'middle', horizontal: o.h || 'left', wrapText: !!o.wrap, indent: o.indent || 0 };
        if (o.fmt) cell.numFmt = o.fmt;
        return cell;
      };

      /* ── 제목 ── */
      ws.getRow(1).height = 34; ws.getRow(2).height = 22;
      put('A1:E1', 'WORD OF LIFE KOREA  ·  FIELD EXPENSE REPORT', { fill: C.blue, color: C.white, bold: true, size: 16, h: 'center' });
      put('A2:E2', 'Attach receipts for all charges and expenses.', { fill: C.blueSoft, color: C.blue, italic: true, bold: true, size: 11, h: 'center' });

      /* ── 이름 / 날짜 / 완료 ── */
      ws.getRow(3).height = 20; ws.getRow(4).height = 36;
      const lab = { fill: C.grey, bold: true, size: 9, color: C.mute, h: 'center' };
      put('A3:C3', "TEAM MEMBER'S NAME", lab); put('D3', 'DATE', lab); put('E3', 'COMPLETED', lab);
      put('A4:C4', p.name, { bold: true, size: 17, h: 'center' });
      put('D4', spaced(opts.today), { bold: true, size: 12, h: 'center' });
      const allPaid = p.reports.length > 0 && p.reports.every(r => r.status === 'processed');
      const paidAt = allPaid ? p.reports.map(r => String(r.processedAt || '').slice(0, 10)).filter(Boolean).sort().pop() : '';
      put('E4', allPaid ? '✓ ' + spaced(paidAt) : '', allPaid ? { fill: C.green, bold: true, size: 12, color: 'FF1E6B3A', h: 'center' } : { fill: C.grey });

      /* ── 항목 표 ── */
      ws.getRow(5).height = 30;
      const th = { fill: C.blue, color: C.white, bold: true, h: 'center' };
      put('A5', 'DO NOT USE', { ...th, size: 8, wrap: true }); put('B5', 'Account*', th); put('C5', 'Description', th); put('D5', 'Date', th); put('E5', 'Amount', th);

      const lines = [];
      p.reports.forEach(r => r.rows.forEach(x => lines.push(x)));
      lines.sort((a, b) => String(a.when || '').localeCompare(String(b.when || '')));
      const first = 6, slots = Math.max(15, lines.length + 1);
      for (let i = 0; i < slots; i++) {
        const row = first + i, x = lines[i];
        ws.getRow(row).height = 24;
        const hasMemo = !!(x && (x.memo || x.approverMemo));
        const bg = hasMemo ? C.memo : (i % 2 ? C.zebra : C.white);
        const acc = x ? splitAccount(x.account) : { num: '', name: '' };
        put('A' + row, acc.num, { fill: bg, bold: true, size: 12, color: C.blue, h: 'center' });
        put('B' + row, acc.name, { fill: bg, indent: 1 });
        put('C' + row, x ? (x.item || x.ministryPurpose || '') + (hasMemo ? '  ✎' : '') : '', { fill: bg, wrap: true, indent: 1 });
        put('D' + row, x ? spaced(x.when) : '', { fill: bg, h: 'center' });
        put('E' + row, x ? Number(x.amountKrw) : '', { fill: bg, h: 'right', fmt: KRW, bold: true });
      }
      const last = first + slots - 1, tot = last + 1;

      /* ── 합계 ── */
      ws.getRow(tot).height = 32;
      put(`A${tot}:D${tot}`, 'REIMBURSEMENT TOTAL', { fill: C.blueSoft, bold: true, italic: true, size: 14, color: C.blue, h: 'right', indent: 1 });
      const sum = lines.reduce((s, x) => s + Number(x.amountKrw || 0), 0);
      put(`E${tot}`, { formula: `SUM(E${first}:E${last})`, result: sum }, { fill: C.blueSoft, bold: true, size: 15, color: C.blue, h: 'right', fmt: KRW });

      /* ── 입금 계좌 ── */
      const bank = tot + 1;
      ws.getRow(bank).height = 30;
      put(`A${bank}`, 'BANK', { fill: C.grey, bold: true, size: 9, color: C.mute, h: 'center' });
      put(`B${bank}:E${bank}`, 'Account #:', { bold: true, size: 12, indent: 1 });

      /* ── Remarks ── */
      const notes = [...new Set(p.reports.map(r => String(r.description || '').trim()).filter(Boolean))];
      lines.forEach(x => { // 메모가 있는 항목은 "품목: 메모"로 함께 적는다
        const m = [x.memo, x.approverMemo && '(' + x.approverMemo + ')'].filter(Boolean).join(' ');
        if (m) notes.push((x.item || x.ministryPurpose || '') + ': ' + m);
      });
      const noteText = notes.join('\n');
      let r = bank + 1;
      ws.getRow(r).height = 22;
      put(`A${r}:E${r}`, 'REMARKS', { fill: C.grey, bold: true, size: 10, color: C.mute, indent: 1 });
      r++;
      ws.getRow(r).height = Math.max(30, 17 * Math.max(1, noteText.split('\n').reduce((n, l) => n + Math.ceil(l.length / 62), 0)) + 8);
      put(`A${r}:E${r}`, noteText || ' ', { wrap: true, indent: 1, italic: true });
      ws.getCell(`A${r}`).alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };

      // 카테고리별 소계 — 계정번호 순, 칸을 나눠 한눈에 보이게
      const sub = new Map();
      lines.forEach(x => sub.set(x.account, (sub.get(x.account) || 0) + Number(x.amountKrw || 0)));
      const subList = [...sub.entries()].sort((a, b) => (splitAccount(a[0]).num || 99999) - (splitAccount(b[0]).num || 99999));
      if (subList.length) {
        r++;
        ws.getRow(r).height = 22;
        put(`A${r}:D${r}`, 'SUBTOTAL BY CATEGORY', { fill: C.blueSoft, bold: true, size: 10, color: C.blue, indent: 1 });
        put(`E${r}`, 'Amount', { fill: C.blueSoft, bold: true, size: 10, color: C.blue, h: 'right' });
        subList.forEach(([acct, v], i) => {
          r++;
          ws.getRow(r).height = 22;
          const bg = i % 2 ? C.zebra : C.white;
          put(`A${r}:D${r}`, acct, { fill: bg, indent: 1 });
          put(`E${r}`, Math.round(v), { fill: bg, bold: true, h: 'right', fmt: KRW });
        });
      }

      /* ── 안내 / 승인 ── */
      const foot = r + 1;
      ws.getRow(foot).height = 58;
      put(`A${foot}:C${foot}`, '*Account Options: ' + (opts.optionsText || ''), { size: 8, color: C.mute, wrap: true, indent: 1 });
      ws.getCell(`A${foot}`).alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
      const approvers = [...new Set(p.reports.map(x => x.reviewedByName).filter(Boolean))];
      put(`D${foot}:E${foot}`, 'Approved by:  ' + approvers.join(', '), { italic: true, size: 10, wrap: true, indent: 1 });
      ws.getCell(`D${foot}`).alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };

      /* ── 바깥 굵은 테두리 + 인쇄 영역 ── */
      const thick = line('FF000000', 'medium');
      for (let rr = 1; rr <= foot; rr++) {
        const l = ws.getCell(rr, 1), rt = ws.getCell(rr, 5);
        l.border = { ...l.border, left: thick }; rt.border = { ...rt.border, right: thick };
      }
      for (let c = 1; c <= 5; c++) {
        const t = ws.getCell(1, c), b = ws.getCell(foot, c);
        t.border = { ...t.border, top: thick }; b.border = { ...b.border, bottom: thick };
      }
      ws.pageSetup.printArea = `A1:E${foot}`;
    });
    return wb;
  }

  const api = { build, splitAccount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WolkoExpenseXlsx = api;
})(typeof window !== 'undefined' ? window : globalThis);
