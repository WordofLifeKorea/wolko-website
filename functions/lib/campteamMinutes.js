/**
 * 회의록 텍스트(Word 에서 복사)를 회의 + 구역으로 나누는 해석기. 한국어/영어 두 버전을 같은 구역 번호로 짝지어 한 회의로 합친다.
 * 형식 가정(실제 회의록에서 확인한 모양): 첫 줄 제목, "일시:/Date and time:" 같은 머리 정보, "1. 제목" 번호 구역,
 *  표는 탭(또는 " || ")으로 구분된 줄. "다음 회의/Next Meeting" 구역의 표는 다음 회의 안건 목록이 된다.
 */
const HEAD = {
  date: /^(일시|date and time|date|when)\s*[:：]\s*(.*)$/i, attendees: /^(참석자|attendees|participants)\s*[:：]\s*(.*)$/i,
  record: /^(기록 범위|recorded discussion|recording)\s*[:：]\s*(.*)$/i, sources: /^(회의 자료|meeting sources|sources)\s*[:：]\s*(.*)$/i,
  reference: /^(추가 참고 자료|additional reference)\s*[:：]\s*(.*)$/i, purpose: /^(목적|purpose)\s*[:：]\s*(.*)$/i,
};
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = n => String(n).padStart(2, '0');

export function parseMeetingDate(raw) {
  const t = String(raw || ''); let date = null, time = '';
  let m = /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(t) || /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(t);
  if (m) date = `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  else if ((m = /([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/.exec(t)) && MONTHS[m[1].toLowerCase()]) date = `${m[3]}-${pad(MONTHS[m[1].toLowerCase()])}-${pad(m[2])}`;
  let h;
  if ((h = /(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/.exec(t))) { let hh = Number(h[2]) % 12 + (h[1] === '오후' ? 12 : 0); time = `${pad(hh)}:${pad(h[3] || 0)}`; }
  else if ((h = /(\d{1,2}):(\d{2})\s*([ap])\.?m\.?/i.exec(t))) { let hh = Number(h[1]) % 12 + (h[3].toLowerCase() === 'p' ? 12 : 0); time = `${pad(hh)}:${h[2]}`; }
  else if ((h = /(\d{1,2})\s*([ap])\.?m\.?/i.exec(t))) { let hh = Number(h[1]) % 12 + (h[2].toLowerCase() === 'p' ? 12 : 0); time = `${pad(hh)}:00`; }
  else if ((h = /\b([01]\d|2[0-3]):([0-5]\d)\b/.exec(t))) time = `${h[1]}:${h[2]}`;
  return { date, time };
}

const splitRow = l => (l.includes('\t') ? l.split('\t') : l.split(/\s\|\|\s/)).map(c => c.trim());
const isRow = l => l.includes('\t') || / \|\| /.test(l);

export function parseMinutesText(input) {
  const lines = String(input || '').replace(/^﻿/, '').split(/\r?\n/).map(l => l.replace(/\s+$/, ''));
  const out = { title: '', header: {}, sections: [] };
  let cur = null, started = false;
  for (const raw of lines) {
    const line = raw.trim(); if (!line || /^--- end table$/.test(line)) continue;
    const num = /^(\d{1,2})\.\s+(\S.*)$/.exec(line);
    if (num && !isRow(line)) { cur = { no: Number(num[1]), title: num[2].trim(), lines: [], rows: [] }; out.sections.push(cur); started = true; continue; }
    if (!started) {
      let matched = false;
      for (const [k, re] of Object.entries(HEAD)) { const m = re.exec(line); if (m) { out.header[k] = m[2].trim(); matched = true; break; } }
      if (!matched && !out.title) out.title = line.replace(/^\[Title\]\s*/, '');
      continue;
    }
    if (isRow(line)) cur.rows.push(splitRow(line)); else cur.lines.push(line.replace(/^\[[^\]]+\]\s*/, ''));
  }
  if (out.header.date) Object.assign(out.header, parseMeetingDate(out.header.date), { dateRaw: out.header.date });
  out.sections = out.sections.map(s => ({ ...s, kind: /summary|요약/i.test(s.title) ? 'summary' : /participant groups|background|대상과 역할|대상|배경/i.test(s.title) ? 'context' : 'discussion',
    isNext: /next meeting|다음 회의/i.test(s.title) }));
  return out;
}

/** 한국어/영어 해석 결과를 구역 번호로 짝지어 하나로 합친다. 한쪽만 있어도 된다. */
export function mergeMinutes(ko, en) {
  const nums = [...new Set([...(ko?.sections || []), ...(en?.sections || [])].map(s => s.no))].sort((a, b) => a - b);
  const pick = (r, no) => (r?.sections || []).find(s => s.no === no);
  const text = (s) => s ? s.lines.join('\n') : '';
  const sections = nums.map(no => {
    const k = pick(ko, no), e = pick(en, no), base = k || e;
    const rowsKo = k?.rows || [], rowsEn = e?.rows || [];
    const tableToText = (rows) => rows.map(r => r.join(' — ')).join('\n');
    const isNext = !!base.isNext;
    const nextItems = isNext ? [...Array(Math.max(rowsKo.length, rowsEn.length))].map((_, i) => ({ topicKo: rowsKo[i]?.[0] || '', topicEn: rowsEn[i]?.[0] || '', noteKo: rowsKo[i]?.slice(1).join(' / ') || '', noteEn: rowsEn[i]?.slice(1).join(' / ') || '' }))
      .filter(x => (x.topicKo || x.topicEn) && !/^(topic|agenda|주제|안건|논의 주제|논의 안건)$/i.test(x.topicKo) && !/^(topic|agenda|주제|안건)$/i.test(x.topicEn)) : [];
    return { no, kind: base.kind, isNext, titleKo: k?.title || '', titleEn: e?.title || '',
      bodyKo: [text(k), isNext ? '' : tableToText(rowsKo)].filter(Boolean).join('\n'), bodyEn: [text(e), isNext ? '' : tableToText(rowsEn)].filter(Boolean).join('\n'), nextItems };
  });
  const h = ko?.header || {}, he = en?.header || {};
  return {
    titleKo: ko?.title || '', titleEn: en?.title || '', date: h.date || he.date || null, time: h.time || he.time || '',
    attendees: h.attendees || he.attendees || '', recordNote: h.record || he.record || '', sourcesNote: [h.sources || he.sources, h.reference || he.reference].filter(Boolean).join(' / '),
    purposeKo: h.purpose || '', purposeEn: he.purpose || '', sections,
  };
}
