/**
 * fill-verses.mjs
 * verse_ref가 있는 모든 팀원 .md 파일에 개역개정4판(Sonnet) + NIV(api.bible) 본문 자동 채우기
 *
 * 실행 전:
 *   export ANTHROPIC_API_KEY="..."
 *   export BIBLE_API_KEY="..."
 *   export NIV_BIBLE_ID="..."
 *
 * 실행:
 *   node scripts/fill-verses.mjs
 *   node scripts/fill-verses.mjs --overwrite   # 기존 본문도 덮어쓰기
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const TEAM_DIR = new URL('../src/content/team', import.meta.url).pathname;
const OVERWRITE = process.argv.includes('--overwrite');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BIBLE_API_KEY     = process.env.BIBLE_API_KEY;
const NIV_BIBLE_ID      = process.env.NIV_BIBLE_ID;

if (!ANTHROPIC_API_KEY || !BIBLE_API_KEY || !NIV_BIBLE_ID) {
  console.error('❌ 환경변수 누락: ANTHROPIC_API_KEY, BIBLE_API_KEY, NIV_BIBLE_ID 모두 필요합니다.');
  process.exit(1);
}

// ── USFM 변환 ──────────────────────────────────────────────────────
async function toUsfm(verseRef) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      system: `Convert a Bible verse reference to a USFM passage ID. Output only the ID, nothing else.
Examples:
"John 3:16" → JHN.3.16
"Psalm 96:2-3" → PSA.96.2-PSA.96.3
"시편 96:2-3" → PSA.96.2-PSA.96.3
"요한복음 3:16" → JHN.3.16
"Romans 8:28" → ROM.8.28
"고린도후서 12:9" → 2CO.12.9
"디모데후서 2:22" → 2TI.2.22`,
      messages: [{ role: 'user', content: verseRef }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text?.trim();
}

// ── NIV 본문 ───────────────────────────────────────────────────────
async function fetchNiv(passageId) {
  const url = `https://rest.api.bible/v1/bibles/${NIV_BIBLE_ID}/passages/${encodeURIComponent(passageId)}?content-type=text&include-verse-numbers=false&include-titles=false`;
  const res = await fetch(url, { headers: { 'api-key': BIBLE_API_KEY } });
  if (!res.ok) {
    console.warn(`  ⚠️  NIV API 오류 ${res.status}`);
    return '';
  }
  const data = await res.json();
  return (data.data?.content || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// ── 개역개정4판 본문 (Sonnet) ──────────────────────────────────────
async function fetchKorean(verseRef, nivText) {
  const prompt = nivText
    ? `다음 NIV 영어 본문에 해당하는 개역개정4판 한국어 본문을 정확히 출력해주세요. 절 번호 없이 본문만, 설명 없이.\n\n${nivText}`
    : `개역개정4판 ${verseRef} 본문을 절 번호 없이 출력해주세요.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: '개역개정4판 한국어 성경 본문을 정확히 출력합니다. 절 번호 없이 본문만 출력하세요. 설명이나 부연 없이.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || '';
}

// ── frontmatter 값 업데이트 ────────────────────────────────────────
function updateFrontmatter(content, key, value) {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const line = `${key}: "${escaped}"`;
  const regex = new RegExp(`^${key}:.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  // 필드 없으면 verse_ref 바로 아래에 추가
  return content.replace(/^(verse_ref:.*)$/m, `$1\n${line}`);
}

// ── 메인 ──────────────────────────────────────────────────────────
const files = (await readdir(TEAM_DIR)).filter(f => f.endsWith('.md'));
let updated = 0, skipped = 0, failed = 0;

for (const file of files) {
  const path = join(TEAM_DIR, file);
  const raw = await readFile(path, 'utf-8');

  const refMatch = raw.match(/^verse_ref:\s*["']?(.+?)["']?\s*$/m);
  if (!refMatch || !refMatch[1].trim()) continue;

  const verseRef = refMatch[1].trim();
  const hasKo = /^verse_ko:\s*".+"/m.test(raw);
  const hasEn = /^verse_en:\s*".+"/m.test(raw);

  if ((hasKo && hasEn) && !OVERWRITE) {
    console.log(`⏭️  ${file} — 이미 채워짐, 건너뜀 (--overwrite로 덮어쓰기 가능)`);
    skipped++;
    continue;
  }

  console.log(`\n📖 ${file} — "${verseRef}"`);

  try {
    // 1. USFM 변환
    const passageId = await toUsfm(verseRef);
    console.log(`   USFM: ${passageId}`);

    // 2. NIV
    const en = passageId ? await fetchNiv(passageId) : '';
    console.log(`   NIV: ${en ? en.slice(0, 60) + '…' : '❌ 실패'}`);

    // 3. 개역개정4판
    const ko = await fetchKorean(verseRef, en);
    console.log(`   KO:  ${ko ? ko.slice(0, 60) + '…' : '❌ 실패'}`);

    if (!ko && !en) { failed++; continue; }

    // 4. 파일 업데이트
    let updated_content = raw;
    if (ko) updated_content = updateFrontmatter(updated_content, 'verse_ko', ko);
    if (en) updated_content = updateFrontmatter(updated_content, 'verse_en', en);
    await writeFile(path, updated_content, 'utf-8');
    console.log(`   ✅ 저장 완료`);
    updated++;

    // API rate limit 방지
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {
    console.error(`   ❌ 오류: ${e.message}`);
    failed++;
  }
}

console.log(`\n✅ 완료 — 업데이트: ${updated}, 건너뜀: ${skipped}, 실패: ${failed}`);
