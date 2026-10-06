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

async function generateToken(payload, secret) {
  const expires = Date.now() + 12 * 60 * 60 * 1000;
  const data = `wolko-camp-progress:${payload.role}:${payload.email || 'admin'}:${expires}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return btoa(`${data}:${toHex(new Uint8Array(sig))}`);
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.ADMIN_PASSWORD || !env.CAMP_KV) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400, headers: CORS });
  }

  const mode = String(body.mode || '').trim();
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');

  try {
    if (mode === 'adminLogin') {
      if (password !== env.ADMIN_PASSWORD) {
        return Response.json({ error: '관리자 비밀번호가 올바르지 않습니다.' }, { status: 401, headers: CORS });
      }
      const token = await generateToken({ role: 'admin' }, env.ADMIN_PASSWORD);
      return Response.json({ token, role: 'admin' }, { headers: CORS });
    }

    if (!email || !password) {
      return Response.json({ error: '이메일과 비밀번호가 필요합니다.' }, { status: 400, headers: CORS });
    }
    if (!PASSWORD_RE.test(password)) {
      return Response.json({ error: '비밀번호는 영문/숫자/특수문자 6자 이상으로 입력해주세요.' }, { status: 400, headers: CORS });
    }

    const key = accountKey(email);
    const existing = await env.CAMP_KV.get(key, 'json');

    if (mode === 'signup') {
      if (existing) {
        return Response.json({ error: '이미 등록된 계정입니다. 로그인해주세요.' }, { status: 409, headers: CORS });
      }
      const registrations = await listAllRegistrations(env);
      const staffMatches = registrations.filter(reg => isCounselorStaff(reg) && normalizeEmail(reg.email) === email);
      if (!staffMatches.length) {
        return Response.json({ error: '상담자 팀 스태프 신청 이메일과 일치해야 가입할 수 있습니다.' }, { status: 403, headers: CORS });
      }
      const salt = randomHex();
      const account = {
        email,
        name: String(body.name || staffMatches[0].name || '').trim(),
        salt,
        passwordHash: await hashPassword(password, salt),
        disabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await env.CAMP_KV.put(key, JSON.stringify(account));
      const token = await generateToken({ role: 'counselor', email }, env.ADMIN_PASSWORD);
      return Response.json({ token, role: 'counselor', account: { email, name: account.name } }, { headers: CORS });
    }

    if (mode === 'login') {
      if (!existing || existing.disabled) {
        return Response.json({ error: '계정을 찾을 수 없거나 비활성화되었습니다.' }, { status: 401, headers: CORS });
      }
      const passwordHash = await hashPassword(password, existing.salt);
      if (passwordHash !== existing.passwordHash) {
        return Response.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401, headers: CORS });
      }
      const token = await generateToken({ role: 'counselor', email }, env.ADMIN_PASSWORD);
      return Response.json({ token, role: 'counselor', account: { email, name: existing.name || '' } }, { headers: CORS });
    }

    return Response.json({ error: '지원하지 않는 요청입니다.' }, { status: 400, headers: CORS });
  } catch (error) {
    console.error('camp progress auth error:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
