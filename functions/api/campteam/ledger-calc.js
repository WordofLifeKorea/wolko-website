import { moneyGate, json, badRequest } from '../../lib/campteamLedger.js';
import { sanitizeModel } from '../../../public/portal/campteam/calc-core.js';
import { uuid, nowIso, text, audit } from '../../lib/campteamDb.js';

/**
 * 예산 계산기 시나리오 저장. 계산 자체는 화면에서 하고(같은 계산 코드 public/portal/campteam/calc-core.js), 서버는 모양을 검사해 저장만 한다.
 *  GET            목록 — 금액 조회 권한자(월코 재정·일반 팀원 포함, 보기만)
 *  POST/PATCH/DELETE  캠프 재정 담당·디렉터
 */
const MAX_SCENARIOS = 60;
const parse = (row) => { let model = null; try { model = JSON.parse(row.model); } catch { /* 깨진 저장값은 건너뛴다 */ } return model ? { id: row.id, name: row.name, campId: row.campId, periodId: row.periodId, model, updatedAt: row.updatedAt, updatedBy: row.updatedBy, isTest: row.isTest } : null; };

export async function onRequestGet({ env, request }) {
  const { res } = await moneyGate(env, request, 'read'); if (res) return res;
  const rows = (await env.DB.prepare('SELECT id, name, campId, periodId, model, updatedAt, updatedBy, isTest FROM calc_scenarios WHERE deletedAt IS NULL ORDER BY updatedAt DESC LIMIT 100').all()).results;
  return json({ items: rows.map(parse).filter(Boolean) });
}
async function refs(env, b) {
  if (b.campId && !(await env.DB.prepare('SELECT 1 AS x FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.campId)).first())) return '캠프를 찾을 수 없어요.';
  if (b.periodId && !(await env.DB.prepare('SELECT 1 AS x FROM ledger_periods WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.periodId)).first())) return '기간을 찾을 수 없어요.';
  return null;
}
export async function onRequestPost({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const name = text(b.name, 80); if (!name) return badRequest('계산 이름을 입력해 주세요.');
  const m = sanitizeModel(b.model); if (m.error) return badRequest(m.error);
  const bad = await refs(env, b); if (bad) return badRequest(bad);
  if ((await env.DB.prepare('SELECT COUNT(*) AS n FROM calc_scenarios WHERE deletedAt IS NULL').first()).n >= MAX_SCENARIOS) return json({ error: `계산은 ${MAX_SCENARIOS}개까지 저장할 수 있어요. 안 쓰는 것을 지워 주세요.` }, 409);
  const id = uuid(), now = nowIso();
  await env.DB.prepare('INSERT INTO calc_scenarios (id,name,campId,periodId,model,createdAt,updatedAt,createdBy,updatedBy) VALUES (?1,?2,?3,?4,?5,?6,?6,?7,?7)').bind(id, name, b.campId || null, b.periodId || null, JSON.stringify(m.model), now, s.email).run();
  await audit(env, s.email, 'create', 'calc_scenario', id, name);
  return json({ id }, 201);
}
export async function onRequestPatch({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  const id = new URL(request.url).searchParams.get('id');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const row = await env.DB.prepare('SELECT * FROM calc_scenarios WHERE id = ?1 AND deletedAt IS NULL').bind(String(id || '')).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  const name = 'name' in b ? text(b.name, 80) : row.name; if (!name) return badRequest('계산 이름을 입력해 주세요.');
  let model = row.model; if ('model' in b) { const m = sanitizeModel(b.model); if (m.error) return badRequest(m.error); model = JSON.stringify(m.model); }
  const bad = await refs(env, b); if (bad) return badRequest(bad);
  await env.DB.prepare('UPDATE calc_scenarios SET name=?2, model=?3, campId=?4, periodId=?5, updatedAt=?6, updatedBy=?7 WHERE id=?1').bind(id, name, model, 'campId' in b ? b.campId || null : row.campId, 'periodId' in b ? b.periodId || null : row.periodId, nowIso(), s.email).run();
  await audit(env, s.email, 'update', 'calc_scenario', id, name);
  return json({ ok: true });
}
export async function onRequestDelete({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  const id = new URL(request.url).searchParams.get('id');
  const row = await env.DB.prepare('SELECT name FROM calc_scenarios WHERE id = ?1 AND deletedAt IS NULL').bind(String(id || '')).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  await env.DB.prepare('UPDATE calc_scenarios SET deletedAt = ?2 WHERE id = ?1').bind(id, nowIso()).run();
  await audit(env, s.email, 'delete', 'calc_scenario', id, row.name);
  return json({ ok: true });
}
