#!/usr/bin/env node
/**
 * 팀원 소개 페이지의 말씀(verse_ko / verse_en)을 실제 성경 데이터로 다시 채운다.
 *   node scripts/refresh-verses.mjs            미리보기(파일을 바꾸지 않는다)
 *   node scripts/refresh-verses.mjs --write    verse_ko 를 개역한글 본문으로 교체
 *   ESV_API_KEY=... node scripts/refresh-verses.mjs --write --english   verse_en 도 ESV 로 교체 (키가 없으면 영어는 건드리지 않는다)
 * 기존에 말씀 본문이 있는 파일만 바꾼다(주소만 있고 본문이 비어 있으면 그대로 두고 알려 준다). 다른 줄은 한 글자도 바꾸지 않는다.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import matter from 'gray-matter';
import { parseReference, fetchKrv, fetchEsv } from '../functions/lib/bibleLookup.js';

const DIR = new URL('../src/content/team/', import.meta.url);
const WRITE = process.argv.includes('--write');
const ENGLISH = process.argv.includes('--english');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const kvStore = new Map();
const env = { ...process.env, CAMP_KV: { get: async k => kvStore.get(k) ?? null, put: async (k, v) => kvStore.set(k, v) } };

/** frontmatter 안의 `key:` 항목(한 줄 값 또는 | 블록)을 새 값 한 줄로 바꾼다 */
function replaceField(source, key, value) {
  const lines = source.split('\n');
  const start = lines.findIndex((line, i) => i > 0 && line.startsWith(`${key}:`));
  if (start < 0) return source;
  let end = start + 1;
  if (/^[^#]*:\s*[|>][-+]?\s*$/.test(lines[start])) while (end < lines.length && (/^\s+/.test(lines[end]) || lines[end] === '')) end++;
  lines.splice(start, end - start, `${key}: ${JSON.stringify(value)}`);
  return lines.join('\n');
}

let changed = 0;
const report = [];
for (const name of readdirSync(DIR).filter(f => f.endsWith('.md')).sort()) {
  const path = new URL(name, DIR);
  const source = readFileSync(path, 'utf8');
  const { data } = matter(source);
  const person = data.name_ko || name;
  if (!data.verse_ref) { report.push(`- ${person}: 구절 주소 없음 → 건드리지 않음`); continue; }
  if (!String(data.verse_ko || '').trim() && !String(data.verse_en || '').trim()) { report.push(`- ${person} (${data.verse_ref}): 주소만 있고 본문이 비어 있음 → 건드리지 않음`); continue; }
  let ref;
  try { ref = parseReference(data.verse_ref); } catch (e) { report.push(`- ${person} (${data.verse_ref}): 주소를 해석하지 못함 → 건드리지 않음`); continue; }
  const ko = await fetchKrv(env, ref);
  if (!ko) { report.push(`- ${person} (${data.verse_ref}): 개역한글 본문을 찾지 못함 → 건드리지 않음`); continue; }
  let next = source;
  const updates = {};
  if (String(data.verse_ko || '').trim() !== ko) { next = replaceField(next, 'verse_ko', ko); updates.verse_ko = ko; }
  if (ENGLISH && env.ESV_API_KEY) {
    const en = await fetchEsv(env, ref);
    await sleep(3500);                                          // ESV API 는 짧은 시간에 많이 부르면 막는다(분당 약 20회) — 간격을 둔다
    if (en && String(data.verse_en || '').trim() !== en) { next = replaceField(next, 'verse_en', en); updates.verse_en = en; }
  }
  if (ENGLISH && env.ESV_API_KEY && !updates.verse_en && !/\(ESV\)\s*$/.test(String(data.verse_en || '').trim())) report.push(`- ${person} (${data.verse_ref}): ESV 본문을 받지 못함(요청 한도·오류) → 영어는 그대로, 다시 실행해 주세요`);
  if (!Object.keys(updates).length) { report.push(`- ${person} (${data.verse_ref}): 이미 같음`); continue; }
  // 바꾼 뒤에도 파일이 올바르게 읽히고, 말씀 말고는 아무것도 달라지지 않았는지 확인한다
  const after = matter(next).data;
  const before = { ...data };
  for (const k of Object.keys(updates)) { before[k] = updates[k]; }
  if (JSON.stringify(after) !== JSON.stringify(before)) { report.push(`- ${person}: 검증 실패(다른 항목이 달라짐) → 건드리지 않음`); continue; }
  changed++;
  report.push(`- ${person} (${data.verse_ref}): ${Object.keys(updates).join(', ')} 교체\n    이전: ${String(data.verse_ko || '').replace(/\s+/g, ' ').slice(0, 70)}\n    이후: ${ko.slice(0, 70)}`);
  if (WRITE) writeFileSync(path, next);
}
console.log(report.join('\n'));
console.log(`\n${WRITE ? '교체 완료' : '미리보기'}: ${changed}개 파일${WRITE ? '' : ' (파일은 바뀌지 않았습니다. --write 로 적용)'}`);
