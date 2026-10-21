/**
 * Word/표/목록에서 복사해 붙여넣은 체크리스트를 템플릿 항목으로 바꾸는 해석기. (Google·파일 접속 없음)
 *  - 표를 복사하면 칸이 탭으로 구분되어 들어온다: [체크박스] [업무] [담당] [기한] [우선순위]. 칸이 하나뿐인 줄은 구역 제목.
 *  - 단순 목록이면 "1. 제목" 은 구역, ☐ / - / • 로 시작하는 줄은 항목.
 *  - 담당자·기한을 임의로 채우지 않는다. 기한이 비어 있으면 기준일도 비워 둔다. (임시 기준일은 옵션)
 */
import { parseOwner } from './campteamCsv.js';

const CHECK = /^[☐□☑✓✔]\s*/;
const PRIORITY = [[/^(1|필수)|required/i, 'High'], [/^(2|중요)|important/i, 'Medium'], [/^(3|일반)|general/i, 'Low']];
export function parsePriority(raw) {
  const t = String(raw ?? '').trim();
  if (!t) return { priority: 'Medium', known: false };
  for (const [re, p] of PRIORITY) if (re.test(t)) return { priority: p, known: true };
  return { priority: 'Medium', known: false };
}

// 구역 이름으로 "캠프 시작일 기준 며칠 전" 을 임시로 추정 (사람이 확인하기 전 값 — provisional 로 표시된다)
const OFFSET_RULES = [
  [/post|wrap|evaluat|follow|사후|종료|평가|결산/i, 14], [/plan|operation|기획|운영|예산|budget/i, -90], [/speaker|instructor|강사|연사/i, -60],
  [/recruit|promot|market|홍보|모집/i, -75], [/church|school|partner|교회|학교|협력/i, -30], [/staff|training|스태프|훈련/i, -45],
  [/main camp prep|during training|본 캠프 준비|facilit|supplies|safety|시설|물품/i, -14], [/main|live|on-?site|본 캠프|현장/i, 0],
  [/team|팀/i, -14], [/registr|participant|등록|참가/i, -30],
];
export function suggestOffset(section) {
  for (const [re, n] of OFFSET_RULES) if (re.test(section || '')) return n;
  return null;
}

const HEADER_WORDS = { title: /^(task|업무|항목|할 ?일)$/i, owner: /^(owner|담당|담당자)$/i, due: /^(due|due date|기한|마감)$/i, priority: /^(priority|우선순위)$/i };

export function parseChecklistText(input) {
  const lines = String(input || '').replace(/^﻿/, '').split(/\r?\n/).map(l => l.replace(/\s+$/, '')).filter(l => l.trim());
  const tableMode = lines.some(l => l.includes('\t'));
  const sections = []; let cur = null, map = null, skipped = 0;
  const section = (name) => { cur = { name: name.trim(), items: [] }; sections.push(cur); };
  const item = (title, ownerRaw, prioRaw) => {
    const t = String(title || '').replace(CHECK, '').trim(); if (!t) { skipped++; return; }
    if (!cur) section('');
    const own = parseOwner(ownerRaw), pr = parsePriority(prioRaw);
    cur.items.push({ title: t.slice(0, 200), ownerSuggestion: (own.ownerName || own.ownerSuggestion).slice(0, 100), priority: pr.priority, priorityKnown: pr.known });
  };
  for (const line of lines) {
    if (tableMode) {
      const cells = line.split('\t').map(c => c.trim());
      const filled = cells.filter(Boolean);
      if (filled.length === 0) continue;
      if (!map && cells.some(c => HEADER_WORDS.title.test(c)) && cells.some(c => HEADER_WORDS.owner.test(c) || HEADER_WORDS.priority.test(c))) {
        map = {}; cells.forEach((c, i) => { for (const k of Object.keys(HEADER_WORDS)) if (HEADER_WORDS[k].test(c)) map[k] = i; }); continue;
      }
      if (map && cells.some(c => HEADER_WORDS.title.test(c)) && cells.some(c => HEADER_WORDS.owner.test(c))) continue; // 반복되는 머리글 줄
      if (filled.length === 1 && !CHECK.test(filled[0])) { section(filled[0]); continue; }
      if (map) { item(cells[map.title], map.owner != null ? cells[map.owner] : '', map.priority != null ? cells[map.priority] : ''); continue; }
      const off = (CHECK.test(cells[0]) || /^(ok|)$/i.test(cells[0])) ? 1 : 0; // 맨 앞 체크박스 칸
      item(cells[off], cells[off + 1], cells[off + 3] ?? cells[off + 2]);
    } else {
      if (CHECK.test(line) || /^\s*[-•*]\s+/.test(line)) item(line.replace(/^\s*[-•*]\s+/, ''), '', '');
      else if (/^\d+[.)]\s+\S/.test(line)) section(line.replace(/^\d+[.)]\s*/, (m) => m));
      else item(line, '', '');
    }
  }
  const out = sections.filter(s => s.items.length); // 항목이 없는 제목(머리말·운영 원칙 등)은 버린다
  return { sections: out, itemCount: out.reduce((n, s) => n + s.items.length, 0), skipped };
}
