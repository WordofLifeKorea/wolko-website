const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const PASSWORD_RE = /^[\x21-\x7E]{6,72}$/;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function accountKey(email) {
  return `camp-progress:account:${email}`;
}

function isCounselorStaff(reg) {
  const teams = String(reg?.serviceArea || reg?.notes || '').split(',').map(team => team.trim());
  return reg?.registrationType === 'staff' && teams.includes('상담자');
}

function toHex(bytes) {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function randomHex(length = 16) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
}

async function verifyAdmin(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !env.ADMIN_PASSWORD) return false;
  try {
    const decoded = atob(token);
    const lastColon = decoded.lastIndexOf(':');
    const sigHex = decoded.slice(lastColon + 1);
    const data = decoded.slice(0, lastColon);
    const parts = data.split(':');
    if (parts[0] !== 'wolko-camp-progress' || parts[1] !== 'admin') return false;
    const expires = parseInt(parts[3], 10);
    if (!expires || Date.now() > expires) return false;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.ADMIN_PASSWORD),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sig = new Uint8Array(sigHex.match(/.{2}/g).map(part => parseInt(part, 16)));
    return await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
  } catch {
    return false;
  }
}

async function listAllRegistrations(env) {
  const registrations = [];
  let cursor;
  do {
    const result = await env.CAMP_KV.list({ prefix: 'camp:', ...(cursor ? { cursor } : {}), limit: 1000 });
    const regKeys = result.keys.filter(key => key.name.includes(':reg:'));
    const regs = await Promise.all(regKeys.map(key => env.CAMP_KV.get(key.name, 'json')));
    registrations.push(...regs.filter(Boolean));
    cursor = result.list_complete ? null : result.cursor;
  } while (cursor);
  return registrations;
}

async function listAccounts(env) {
  const accounts = [];
  let cursor;
  do {
    const result = await env.CAMP_KV.list({ prefix: 'camp-progress:account:', ...(cursor ? { cursor } : {}), limit: 1000 });
    const values = await Promise.all(result.keys.map(key => env.CAMP_KV.get(key.name, 'json')));
    accounts.push(...values.filter(Boolean).map(account => ({
      email: normalizeEmail(account.email),
      name: account.name || '',
      disabled: !!account.disabled,
      createdAt: account.createdAt || '',
      updatedAt: account.updatedAt || '',
    })));
    cursor = result.list_complete ? null : result.cursor;
  } while (cursor);
  return accounts;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!await verifyAdmin(request, env)) {
    return Response.json({ error: '관리자 로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  try {
    const registrations = await listAllRegistrations(env);
    const counselorStaff = registrations
      .filter(isCounselorStaff)
      .map(reg => ({
        email: normalizeEmail(reg.email),
        name: reg.name || '',
        campId: reg.campId || '',
        regId: reg.regId || '',
      }))
      .filter(staff => staff.email);
    return Response.json({ accounts: await listAccounts(env), counselorStaff }, { headers: CORS });
  } catch (error) {
    console.error('camp progress account list error:', error);
    return Response.json({ error: '계정 정보를 불러오지 못했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!await verifyAdmin(request, env)) {
    return Response.json({ error: '관리자 로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400, headers: CORS });
  }
  const action = String(body.action || '').trim();
  const email = normalizeEmail(body.email);
  if (!email) {
    return Response.json({ error: '이메일이 필요합니다.' }, { status: 400, headers: CORS });
  }
  const key = accountKey(email);

  try {
    if (action === 'delete') {
      await env.CAMP_KV.delete(key);
      return Response.json({ ok: true }, { headers: CORS });
    }

    const existing = await env.CAMP_KV.get(key, 'json');
    if (action === 'disable' || action === 'enable') {
      if (!existing) return Response.json({ error: '계정을 찾을 수 없습니다.' }, { status: 404, headers: CORS });
      const account = { ...existing, disabled: action === 'disable', updatedAt: new Date().toISOString() };
      await env.CAMP_KV.put(key, JSON.stringify(account));
      return Response.json({ ok: true, account: { email, name: account.name || '', disabled: account.disabled } }, { headers: CORS });
    }

    if (action === 'resetPassword' || action === 'upsert') {
      const password = String(body.password || '');
      if (!PASSWORD_RE.test(password)) {
        return Response.json({ error: '비밀번호는 영문/숫자/특수문자 6자 이상으로 입력해주세요.' }, { status: 400, headers: CORS });
      }
      const salt = randomHex();
      const account = {
        ...(existing || {}),
        email,
        name: String(body.name || existing?.name || '').trim(),
        salt,
        passwordHash: await hashPassword(password, salt),
        disabled: !!body.disabled,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await env.CAMP_KV.put(key, JSON.stringify(account));
      return Response.json({ ok: true, account: { email, name: account.name, disabled: account.disabled } }, { headers: CORS });
    }

    return Response.json({ error: '지원하지 않는 작업입니다.' }, { status: 400, headers: CORS });
  } catch (error) {
    console.error('camp progress account update error:', error);
    return Response.json({ error: '계정 정보를 저장하지 못했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
