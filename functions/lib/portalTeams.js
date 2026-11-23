/**
 * 포탈 팀 그룹 — 마스터 · 관리자가 팀을 만들고 멤버를 팀에 넣는다. 한 사람이 여러 팀에 들어갈 수 있다.
 * 지금은 업무관리의 '팀 프로젝트'(같은 팀 멤버가 함께 보고 고치는 보드)에 쓴다.
 * KV: portal:teams → { teams: [{ id, name, createdAt }], members: { <email>: [teamId, ...] } }
 */
import { listAccounts, normalizeEmail } from './hubAccounts.js';

export const TEAMS_KEY = 'portal:teams';
export const MAX_TEAMS = 60;
export const MAX_TEAM_NAME = 40;
const TEAM_ID = /^t[a-z0-9]{6,20}$/;

export const canManageTeams = session => !!session && (session.role === 'master' || session.role === 'admin');

export async function readTeams(env) {
  const raw = await env.CAMP_KV.get(TEAMS_KEY, 'json');
  const teams = (Array.isArray(raw?.teams) ? raw.teams : []).filter(t => t && TEAM_ID.test(String(t.id || '')) && t.name);
  const ids = new Set(teams.map(t => t.id));
  const members = {};
  for (const [email, list] of Object.entries(raw?.members && typeof raw.members === 'object' ? raw.members : {})) {
    const e = normalizeEmail(email);
    const mine = (Array.isArray(list) ? list : []).filter(id => ids.has(id));
    if (e && mine.length) members[e] = [...new Set(mine)];
  }
  return { teams, members };
}
const writeTeams = (env, data) => env.CAMP_KV.put(TEAMS_KEY, JSON.stringify(data));

/** 이 사람이 속한 팀 id 목록 */
export async function teamsOf(env, email) {
  const { members } = await readTeams(env);
  return members[normalizeEmail(email)] || [];
}

const cleanName = v => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEAM_NAME);
const newTeamId = () => 't' + crypto.getRandomValues(new Uint32Array(2)).reduce((s, n) => s + n.toString(36), '').slice(0, 12).padEnd(8, '0');

/** 화면에 보낼 모양. 관리자에게는 승인된 계정 목록(이름 · 이메일 · 팀)도 */
export async function teamsView(env, session) {
  const data = await readTeams(env);
  const email = normalizeEmail(session.email);
  const out = { teams: data.teams.map(t => ({ id: t.id, name: t.name })), mine: data.members[email] || [], canManage: canManageTeams(session) };
  if (out.canManage) {
    const accounts = (await listAccounts(env)).filter(a => a.status === 'approved');
    out.people = accounts.map(a => ({ email: normalizeEmail(a.email), name: a.name || '', campus: a.campus === 'jeju' ? 'jeju' : 'wolko', teams: data.members[normalizeEmail(a.email)] || [] }))
      .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, 'ko'));
  }
  return out;
}

/** 관리 동작: create · rename · delete · assign */
export async function manageTeams(env, session, body) {
  if (!canManageTeams(session)) return { error: '마스터 · 관리자만 팀을 관리할 수 있습니다.', status: 403 };
  const data = await readTeams(env);
  const action = String(body?.action || '');
  if (action === 'create') {
    const name = cleanName(body.name);
    if (!name) return { error: '팀 이름을 적어 주세요.', status: 400 };
    if (data.teams.length >= MAX_TEAMS) return { error: '팀이 너무 많습니다.', status: 400 };
    if (data.teams.some(t => t.name === name)) return { error: '같은 이름의 팀이 있습니다.', status: 409 };
    const team = { id: newTeamId(), name, createdAt: new Date().toISOString() };
    data.teams.push(team);
    await writeTeams(env, data);
    return { ok: true, team };
  }
  const id = String(body?.id || '');
  if (action === 'rename') {
    const team = data.teams.find(t => t.id === id); if (!team) return { error: '팀을 찾을 수 없습니다.', status: 404 };
    const name = cleanName(body.name);
    if (!name) return { error: '팀 이름을 적어 주세요.', status: 400 };
    if (data.teams.some(t => t.id !== id && t.name === name)) return { error: '같은 이름의 팀이 있습니다.', status: 409 };
    team.name = name;
    await writeTeams(env, data);
    return { ok: true };
  }
  if (action === 'delete') {
    if (!data.teams.some(t => t.id === id)) return { error: '팀을 찾을 수 없습니다.', status: 404 };
    data.teams = data.teams.filter(t => t.id !== id);
    for (const e of Object.keys(data.members)) { data.members[e] = data.members[e].filter(x => x !== id); if (!data.members[e].length) delete data.members[e]; }
    await writeTeams(env, data);
    return { ok: true };
  }
  if (action === 'assign') {
    const email = normalizeEmail(body.email);
    if (!email) return { error: '이메일이 필요합니다.', status: 400 };
    const ids = new Set(data.teams.map(t => t.id));
    const list = [...new Set((Array.isArray(body.teams) ? body.teams : []).map(String).filter(x => ids.has(x)))];
    if (list.length) data.members[email] = list; else delete data.members[email];
    await writeTeams(env, data);
    return { ok: true, assigned: list };
  }
  return { error: '알 수 없는 동작입니다.', status: 400 };
}
