const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const PLAN_KEY = 'schedule-planner:data:v1';
const TYPE_SET = new Set(['program', 'meeting', 'meal', 'transport', 'prep', 'free']);

function toHex(bytes) {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyToken(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !env.ADMIN_PASSWORD) return false;
  try {
    const decoded = atob(token);
    const lastColon = decoded.lastIndexOf(':');
    const sigHex = decoded.slice(lastColon + 1);
    const data = decoded.slice(0, lastColon);
    const parts = data.split(':');
    if (parts[0] !== 'wolko-schedule-planner' || parts[1] !== 'admin') return false;
    const expires = parseInt(parts[2], 10);
    if (!expires || Date.now() > expires) return false;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.ADMIN_PASSWORD),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sig = new Uint8Array(sigHex.match(/.{2}/g).map(part => parseInt(part, 16)));
    return crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
  } catch {
    return false;
  }
}

function text(value, max = 240) {
  return String(value || '').trim().slice(0, max);
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function isTime(value) {
  return /^\d{2}:\d{2}$/.test(String(value || ''));
}

function timeText(value, fallback = '') {
  return text(value || fallback, 40);
}

function cleanVan(van, index) {
  const name = text(van?.name, 80) || `Van ${index + 1}`;
  return {
    id: text(van?.id, 80) || crypto.randomUUID(),
    name,
    seats: Math.max(0, Math.min(parseInt(van?.seats, 10) || 0, 99)),
    driver: text(van?.driver, 80),
    memo: text(van?.memo, 160),
  };
}

function cleanEvent(event) {
  const date = text(event?.date, 10);
  const start = text(event?.start, 5);
  const end = text(event?.end, 5);
  const displayTime = timeText(event?.timeText, start && end ? `${start}-${end}` : start);
  if (!isDate(date) || !displayTime) return null;
  return {
    id: text(event?.id, 80) || crypto.randomUUID(),
    title: text(event?.title, 120) || '제목 없음',
    type: TYPE_SET.has(event?.type) ? event.type : 'program',
    date,
    timeText: displayTime,
    start: isTime(start) ? start : '',
    end: isTime(end) ? end : '',
    staff: text(event?.staff, 120),
    vanId: text(event?.vanId, 80),
    from: text(event?.from, 120),
    to: text(event?.to, 120),
    passengers: text(event?.passengers, 160),
    notes: text(event?.notes, 700),
  };
}

function cleanPerson(person, index) {
  return {
    id: text(person?.id, 80) || crypto.randomUUID(),
    group: ['sf', 'wolko'].includes(person?.group) ? person.group : 'sf',
    no: Math.max(0, Math.min(parseInt(person?.no, 10) || index + 1, 999)),
    name: text(person?.name, 120),
    gender: text(person?.gender, 40),
    age: text(person?.age, 20),
    shirt: text(person?.shirt, 20),
    birthday: text(person?.birthday, 40),
    note: text(person?.note, 500),
  };
}

function cleanTransportPlan(plan, index, vans) {
  const assignments = {};
  const source = plan?.assignments && typeof plan.assignments === 'object' && !Array.isArray(plan.assignments) ? plan.assignments : {};
  vans.forEach(van => {
    const row = source[van.id] && typeof source[van.id] === 'object' && !Array.isArray(source[van.id]) ? source[van.id] : {};
    assignments[van.id] = {
      driver: text(row.driver || van.driver, 80),
      passengers: text(row.passengers, 1200),
      notes: text(row.notes, 500),
    };
  });
  return {
    id: text(plan?.id, 80) || crypto.randomUUID(),
    title: text(plan?.title, 120) || `Vehicle Plan ${index + 1}`,
    date: isDate(plan?.date) ? text(plan.date, 10) : '',
    description: text(plan?.description, 300),
    assignments,
  };
}

function cleanSchedulePdf(pdf) {
  if (!pdf || typeof pdf !== 'object' || Array.isArray(pdf)) return null;
  const url = text(pdf.url, 500);
  if (!url || !/^\/api\/schedule-planner\/file\/|^https?:\/\//.test(url)) return null;
  return {
    date: isDate(pdf.date) ? text(pdf.date, 10) : '',
    url,
    filename: text(pdf.filename, 160) || 'schedule.pdf',
    uploadedAt: text(pdf.uploadedAt, 40),
  };
}

function cleanSchedulePdfs(source) {
  const list = Array.isArray(source.schedulePdfs)
    ? source.schedulePdfs.slice(0, 120).map(cleanSchedulePdf).filter(Boolean)
    : [];
  const legacy = cleanSchedulePdf(source.schedulePdf);
  if (legacy && !list.some(pdf => pdf.url === legacy.url)) list.unshift(legacy);
  return list
    .filter(pdf => pdf.date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.filename.localeCompare(b.filename));
}

function emptyPlan() {
  return {
    title: 'WOLKO Staff Schedule',
    vans: [
      { id: 'van-1', name: 'Van 1', seats: 0, driver: '', memo: '' },
      { id: 'van-2', name: 'Van 2', seats: 0, driver: '', memo: '' },
    ],
    events: [],
    people: [],
    transportPlans: [],
    schedulePdf: null,
    schedulePdfs: [],
    updatedAt: '',
  };
}

function cleanPlan(input, touch = true) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const vans = Array.isArray(source.vans) ? source.vans.slice(0, 30).map(cleanVan) : emptyPlan().vans;
  const events = Array.isArray(source.events)
    ? source.events.slice(0, 1500).map(cleanEvent).filter(Boolean)
    : [];
  const people = Array.isArray(source.people)
    ? source.people.slice(0, 1000).map(cleanPerson).filter(person => person.name)
    : [];
  const transportPlans = Array.isArray(source.transportPlans)
    ? source.transportPlans.slice(0, 100).map((plan, index) => cleanTransportPlan(plan, index, vans))
    : [];
  return {
    title: text(source.title, 120) || 'WOLKO Staff Schedule',
    vans,
    events,
    people,
    transportPlans,
    schedulePdf: cleanSchedulePdf(source.schedulePdf),
    schedulePdfs: cleanSchedulePdfs(source),
    updatedAt: touch ? new Date().toISOString() : text(source.updatedAt, 40),
  };
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.CAMP_KV) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }
  const plan = await env.CAMP_KV.get(PLAN_KEY, 'json');
  return Response.json({ plan: cleanPlan(plan || emptyPlan(), false) }, { headers: CORS });
}

export async function onRequestPut(context) {
  const { env, request } = context;
  if (!env.ADMIN_PASSWORD || !env.CAMP_KV) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }
  if (!(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }

  try {
    const body = await request.json();
    const plan = cleanPlan(body.plan);
    await env.CAMP_KV.put(PLAN_KEY, JSON.stringify(plan));
    return Response.json({ plan }, { headers: CORS });
  } catch (error) {
    console.error('schedule planner save error:', error);
    return Response.json({ error: '저장하지 못했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
