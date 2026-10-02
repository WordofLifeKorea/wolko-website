/*
 * 경비 리포트 → "FIELD EXPENSE REPORT" 양식 엑셀(.xlsx)
 * 사람(제출자)마다 시트 1장. ExcelJS는 내보내기를 누를 때만 불러온다.
 * build(ExcelJS, people, { today, optionsText }) → workbook
 *   people: [{ name, reports: [{ rows, description, reviewedByName }] }]
 */
(function (root) {
  const BLACK = { style: 'thin', color: { argb: 'FF000000' } };
  const THICK = { style: 'medium', color: { argb: 'FF000000' } };
  const box = { top: BLACK, left: BLACK, bottom: BLACK, right: BLACK };
  const GREY = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  const FONT = 'Arial';

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
    const used = new Set();
    people.forEach(p => {
      const ws = wb.addWorksheet(sheetName(p.name, used), { pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      ws.columns = [{ width: 9 }, { width: 28 }, { width: 38 }, { width: 14 }, { width: 18 }];
      const cell = (ref, value, o = {}) => {
        const c = ws.getCell(ref);
        c.value = value;
        c.font = { name: FONT, size: o.size || 11, bold: !!o.bold, italic: !!o.italic, color: { argb: 'FF000000' } };
        c.alignment = { vertical: 'middle', horizontal: o.h || 'left', wrapText: !!o.wrap };
        if (o.border !== false) c.border = box;
        if (o.fill) c.fill = o.fill;
        if (o.fmt) c.numFmt = o.fmt;
        return c;
      };
      const merge = (range, value, o) => { ws.mergeCells(range); const c = cell(range.split(':')[0], value, o); return c; };
      const fillBorder = (range) => { // 병합 영역 전체에 테두리
        const [a, b] = range.split(':'); const r1 = ws.getCell(a).row, r2 = ws.getCell(b).row, c1 = ws.getCell(a).col, c2 = ws.getCell(b).col;
        for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) ws.getCell(r, c).border = box;
      };

      ws.getRow(1).height = 24; ws.getRow(2).height = 18;
      merge('A1:E1', 'WORD OF LIFE KOREA - FIELD EXPENSE REPORT', { bold: true, size: 15, h: 'center', border: false });
      merge('A2:E2', 'Attach receipts for all charges and expenses.', { bold: true, italic: true, size: 12, h: 'center', border: false });

      ws.getRow(3).height = 18;
      merge('A3:C3', "TEAM MEMBER'S NAME", { bold: true, h: 'center' }); fillBorder('A3:C3');
      cell('D3', 'DATE', { bold: true, h: 'center' });
      cell('E3', 'COMPLETED', { bold: true, h: 'center' });
      ws.getRow(4).height = 30;
      merge('A4:C4', p.name, { bold: true, size: 14, h: 'center' }); fillBorder('A4:C4');
      cell('D4', spaced(opts.today), { bold: true, h: 'center' });
      cell('E4', '', { fill: GREY });

      ws.getRow(5).height = 30;
      cell('A5', 'DO NOT USE', { bold: true, size: 8, h: 'center', wrap: true });
      cell('B5', 'Account*', { bold: true, h: 'center' });
      cell('C5', 'Description', { bold: true, h: 'center' });
      cell('D5', 'Date', { bold: true, h: 'center' });
      cell('E5', 'Amount', { bold: true, h: 'center' });

      const lines = [];
      p.reports.forEach(r => r.rows.forEach(x => lines.push(x)));
      lines.sort((a, b) => String(a.when || '').localeCompare(String(b.when || '')));
      const first = 6, slots = Math.max(15, lines.length + 1);
      for (let i = 0; i < slots; i++) {
        const row = first + i, x = lines[i];
        ws.getRow(row).height = 20;
        const acc = x ? splitAccount(x.account) : { num: '', name: '' };
        cell('A' + row, acc.num, { bold: true, size: 12, h: 'center' });
        cell('B' + row, acc.name, { h: 'center' });
        cell('C' + row, x ? (x.item || x.ministryPurpose || '') : '', { h: 'center', wrap: true });
        cell('D' + row, x ? spaced(x.when) : '', { h: 'center' });
        cell('E' + row, x ? Number(x.amountKrw) : '', { h: 'right', fmt: '"₩" #,##0' });
      }
      const last = first + slots - 1, tot = last + 1;
      ws.getRow(tot).height = 26;
      ws.mergeCells(`A${tot}:D${tot}`);
      cell(`A${tot}`, 'REIMBURSEMENT TOTAL:', { bold: true, italic: true, size: 14, h: 'right' }); fillBorder(`A${tot}:D${tot}`);
      cell(`E${tot}`, { formula: `SUM(E${first}:E${last})`, result: lines.reduce((s, x) => s + Number(x.amountKrw || 0), 0) }, { bold: true, size: 14, h: 'right', fmt: '"₩" #,##0' });

      const bank = tot + 1;
      ws.getRow(bank).height = 24;
      cell(`A${bank}`, 'Bank', { bold: true, size: 9, h: 'center' });
      ws.mergeCells(`B${bank}:E${bank}`);
      cell(`B${bank}`, 'Account #:', { bold: true, size: 12 }); fillBorder(`B${bank}:E${bank}`);

      const rem = bank + 1;
      ws.mergeCells(`A${rem}:E${rem}`);
      const notes = [...new Set(p.reports.map(r => String(r.description || '').trim()).filter(Boolean))];
      cell(`A${rem}`, { richText: [{ text: 'Remarks: ', font: { name: FONT, bold: true, italic: true, size: 11 } }, { text: notes.join(' / '), font: { name: FONT, italic: true, size: 11 } }] }, { wrap: true });
      fillBorder(`A${rem}:E${rem}`);
      ws.getRow(rem).height = Math.max(22, 16 * Math.ceil(notes.join(' / ').length / 70 + 0.5));

      const foot = rem + 1;
      ws.getRow(foot).height = 52;
      ws.mergeCells(`A${foot}:C${foot}`);
      cell(`A${foot}`, '*Account Options: ' + (opts.optionsText || ''), { size: 8, wrap: true }); fillBorder(`A${foot}:C${foot}`);
      ws.mergeCells(`D${foot}:E${foot}`);
      const approvers = [...new Set(p.reports.map(r => r.reviewedByName).filter(Boolean))];
      cell(`D${foot}`, 'Approved by: ' + approvers.join(', '), { italic: true, size: 9, wrap: true }); fillBorder(`D${foot}:E${foot}`);
      ws.getCell(`D${foot}`).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

      // 바깥 굵은 테두리
      for (let r = 3; r <= foot; r++) { ws.getCell(r, 1).border = { ...ws.getCell(r, 1).border, left: THICK }; ws.getCell(r, 5).border = { ...ws.getCell(r, 5).border, right: THICK }; }
      for (let c = 1; c <= 5; c++) ws.getCell(foot, c).border = { ...ws.getCell(foot, c).border, bottom: THICK };
    });
    return wb;
  }

  const api = { build, splitAccount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WolkoExpenseXlsx = api;
})(typeof window !== 'undefined' ? window : globalThis);
