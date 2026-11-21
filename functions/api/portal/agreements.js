/**
 * 서명 기록 — 포탈 admin/master 만 (이름 · 이메일 · 서명 그림이 들어 있다)
 * GET    /api/portal/agreements[?doc=faith]           목록(서명 그림 없이) — { items: [{ code, doc, version, role, name, email, camp, t }] }
 * GET    /api/portal/agreements?format=csv[&doc=]     목록을 엑셀(CSV)로
 * GET    /api/portal/agreements?code=AG-XXXXXX        한 건 전체(서명 그림 + 문서 글) — 보기 · 인쇄용
 * DELETE /api/portal/agreements?code=AG-XXXXXX        한 건 삭제(삭제 요청용)
 */
import { sessionFor, canWrite, error } from '../../lib/portalResources.js';
import { DOCS, AGREEMENT_PREFIX, ROLE_LABEL, docHash, docSections } from '../../lib/staffAgreements.js';
import { kstDateTime } from '../../lib/materials.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
const CODE_RE = /^AG-[A-Z0-9]{6}$/;

async function guard(env, request) {
  if (!env.CAMP_KV) return { res: error('서버 설정이 필요합니다.', 500) };
  const session = await sessionFor(request, env);
  if (!session) return { res: error('포탈 로그인이 필요합니다.', 401) };
  if (!canWrite(session)) return { res: error('서명 기록은 관리자만 볼 수 있습니다.', 403) };
  return { session };
}

async function listRows(env, doc = '') {
  const prefix = doc && DOCS[doc] ? `${AGREEMENT_PREFIX}${doc}:` : AGREEMENT_PREFIX;
  const rows = [];
  let cursor, complete = false;
  for (let page = 0; page < 100; page++) {
    const res = await env.CAMP_KV.list({ prefix, cursor, limit: 1000 });
    for (const k of res.keys || []) {
      const m = k.metadata || {};
      rows.push({ key: k.name, code: k.name.slice(k.name.lastIndexOf(':') + 1), doc: m.d || k.name.split(':')[2] || '', version: m.v || '', role: m.r || '', name: m.n || '', email: m.e || '', camp: m.c || '', t: Number(m.t) || 0 });
    }
    if (res.list_complete || !res.cursor) { complete = true; break; }
    cursor = res.cursor;
  }
  rows.sort((a, b) => b.t - a.t);
  return { rows, truncated: !complete };
}

const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // 엑셀에서 수식으로 읽히지 않게
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function onRequestGet({ env, request }) {
  const g = await guard(env, request);
  if (g.res) return g.res;
  const url = new URL(request.url);
  const code = (url.searchParams.get('code') || '').toUpperCase();
  if (code) {
    if (!CODE_RE.test(code)) return error('확인번호를 확인해 주세요.', 400);
    const { rows } = await listRows(env);
    const row = rows.find((r) => r.code === code);
    const record = row ? await env.CAMP_KV.get(row.key, 'json') : null;
    if (!record) return error('서명 기록을 찾을 수 없습니다.', 404);
    const doc = DOCS[record.doc];
    // 서명한 때의 문서 글과 지금 글이 같을 때(버전과 글 해시가 모두 같을 때)만 글을 같이 보낸다 — 버전을 안 올리고 문구만 고쳤어도 '서명한 글'로 잘못 보이지 않게
    const same = doc && doc.version === record.version && record.textHash === (await docHash(doc));
    return Response.json({ record, doc: same ? { ...doc, sections: docSections(doc) } : null }, { headers: CORS });
  }
  const { rows, truncated } = await listRows(env, url.searchParams.get('doc') || '');
  if (url.searchParams.get('format') === 'csv') {
    const head = ['서명 시각(한국시간)', '문서', '문서 버전', '캠프', '구분', '이름', '이메일', '확인번호'];
    const lines = [head.map(csvCell).join(',')];
    for (const r of rows) lines.push([csvCell(kstDateTime(r.t)), csvCell(DOCS[r.doc]?.ko.title || r.doc), csvCell(r.version), csvCell(r.camp), csvCell(ROLE_LABEL[r.role]?.ko || r.role), csvCell(r.name), csvCell(r.email), csvCell(r.code)].join(','));
    return new Response('﻿' + lines.join('\r\n') + '\r\n', { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'attachment; filename="wolko-agreements.csv"' } });
  }
  return Response.json({ items: rows.map(({ key, ...r }) => r), truncated, docs: Object.values(DOCS).map((d) => ({ id: d.id, version: d.version, title: d.ko.title, draft: !!d.draft })) }, { headers: CORS });
}

export async function onRequestDelete({ env, request }) {
  const g = await guard(env, request);
  if (g.res) return g.res;
  const code = (new URL(request.url).searchParams.get('code') || '').toUpperCase();
  if (!CODE_RE.test(code)) return error('확인번호를 확인해 주세요.', 400);
  const { rows } = await listRows(env);
  let removed = 0;
  for (const r of rows) if (r.code === code) { await env.CAMP_KV.delete(r.key); removed += 1; }
  return Response.json({ removed }, { headers: CORS });
}
