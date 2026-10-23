import { moneyGate, json, badRequest } from '../../lib/campteamLedger.js';
import { uuid, nowIso, text, audit } from '../../lib/campteamDb.js';

/** 항목 목록(엑셀의 "목록" 탭). 조회: 금액 조회 권한자 · 추가·수정·삭제: 캠프 재정 담당·디렉터 */
export async function onRequestGet({ env, request }) {
  const { res } = await moneyGate(env, request, 'read'); if (res) return res;
  const rows = (await env.DB.prepare(`SELECT c.id, c.kind, c.name, c.sortOrder, c.active,
      (SELECT COUNT(*) FROM ledger_entries e WHERE e.category = c.name AND e.kind = c.kind AND e.deletedAt IS NULL) AS used,
      (SELECT COUNT(*) FROM ledger_plan p WHERE p.category = c.name AND p.kind = c.kind) AS planned
    FROM ledger_categories c ORDER BY c.kind DESC, c.sortOrder, c.name`).all()).results;
  return json({ income: rows.filter((r) => r.kind === 'income'), expense: rows.filter((r) => r.kind === 'expense') });
}

export async function onRequestPost({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const kind = b.kind, name = text(b.name, 40);
  if (!['income', 'expense'].includes(kind)) return badRequest('수입/지출을 골라 주세요.');
  if (!name) return badRequest('항목 이름을 입력해 주세요.');
  const dup = await env.DB.prepare('SELECT id, active FROM ledger_categories WHERE kind = ?1 AND name = ?2').bind(kind, name).first();
  if (dup) {
    if (dup.active) return json({ error: '이미 있는 항목이에요.' }, 409);
    await env.DB.prepare('UPDATE ledger_categories SET active = 1, updatedAt = ?2 WHERE id = ?1').bind(dup.id, nowIso()).run(); // 사용 안 함이던 항목을 다시 켠다
    await audit(env, s.email, 'create', 'ledger_category', dup.id, `${kind}:${name} (다시 사용)`);
    return json({ id: dup.id, reactivated: true }, 201);
  }
  const max = (await env.DB.prepare('SELECT COALESCE(MAX(sortOrder),0) AS m FROM ledger_categories WHERE kind = ?1').bind(kind).first()).m;
  const id = uuid(), now = nowIso();
  await env.DB.prepare('INSERT INTO ledger_categories (id,kind,name,sortOrder,active,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,1,?5,?5,?6)').bind(id, kind, name, max + 10, now, s.email).run();
  await audit(env, s.email, 'create', 'ledger_category', id, `${kind}:${name}`);
  return json({ id }, 201);
}

/** 이름 바꾸기 / 사용 안 함·다시 사용 / 순서 바꾸기. 이름을 바꾸면 이미 쓴 거래·기간 예산의 항목 이름도 함께 바뀐다(표시 이름만). */
export async function onRequestPatch({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  const id = new URL(request.url).searchParams.get('id');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const row = await env.DB.prepare('SELECT * FROM ledger_categories WHERE id = ?1').bind(String(id || '')).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  const now = nowIso();
  if ('name' in b) {
    const name = text(b.name, 40); if (!name) return badRequest('항목 이름을 입력해 주세요.');
    if (name !== row.name) {
      if (await env.DB.prepare('SELECT 1 AS x FROM ledger_categories WHERE kind = ?1 AND name = ?2').bind(row.kind, name).first()) return json({ error: '같은 이름의 항목이 이미 있어요.' }, 409);
      await env.DB.prepare('UPDATE ledger_entries SET category = ?3 WHERE kind = ?1 AND category = ?2').bind(row.kind, row.name, name).run();
      await env.DB.prepare('UPDATE ledger_plan SET category = ?3 WHERE kind = ?1 AND category = ?2').bind(row.kind, row.name, name).run();
      await env.DB.prepare('UPDATE ledger_categories SET name = ?2, updatedAt = ?3 WHERE id = ?1').bind(id, name, now).run();
      await audit(env, s.email, 'rename', 'ledger_category', id, `${row.name} → ${name}`);
    }
  }
  if ('active' in b) { await env.DB.prepare('UPDATE ledger_categories SET active = ?2, updatedAt = ?3 WHERE id = ?1').bind(id, b.active ? 1 : 0, now).run(); await audit(env, s.email, b.active ? 'enable' : 'disable', 'ledger_category', id, row.name); }
  if ('sortOrder' in b && Number.isInteger(b.sortOrder)) await env.DB.prepare('UPDATE ledger_categories SET sortOrder = ?2, updatedAt = ?3 WHERE id = ?1').bind(id, b.sortOrder, now).run();
  return json({ ok: true });
}

/** 삭제: 한 번도 안 쓴 항목만. 쓴 적이 있으면 "사용 안 함"으로 바꿔야 한다. */
export async function onRequestDelete({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  const id = new URL(request.url).searchParams.get('id');
  const row = await env.DB.prepare('SELECT * FROM ledger_categories WHERE id = ?1').bind(String(id || '')).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  const used = (await env.DB.prepare('SELECT COUNT(*) AS n FROM ledger_entries WHERE kind = ?1 AND category = ?2').bind(row.kind, row.name).first()).n
    + (await env.DB.prepare('SELECT COUNT(*) AS n FROM ledger_plan WHERE kind = ?1 AND category = ?2').bind(row.kind, row.name).first()).n;
  if (used) return json({ error: '이미 장부나 기간 예산에서 쓴 항목이라 지울 수 없어요. 대신 "사용 안 함"으로 바꿔 주세요.' }, 409);
  await env.DB.prepare('DELETE FROM ledger_categories WHERE id = ?1').bind(id).run();
  await audit(env, s.email, 'delete', 'ledger_category', id, `${row.kind}:${row.name}`);
  return json({ ok: true });
}
