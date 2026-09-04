/**
 * GET    /api/schedule/events?start=&end=  — 목록 조회. role 무관, 유효한 허브 계정이면 누구나.
 * POST   /api/schedule/events               — 새 일정 등록. admin/master만.
 * PUT    /api/schedule/events                — 일정 수정(body.id 필요). admin/master만.
 * DELETE /api/schedule/events?id=            — 일정 삭제. admin/master만.
 *
 * KV 저장은 없다 — 구글 캘린더 자체가 유일한 데이터 저장소. 조회는 항상
 * 캘린더에서 실시간으로 읽고, 쓰기도 캘린더에 바로 반영한다(차량 예약처럼
 * WOLKO 쪽 도메인 데이터가 따로 있는 게 아니라 제목/설명/시간이 전부라
 * 별도 레코드를 둘 이유가 없다).
 *
 * 수정은 기존 이벤트를 갱신하지 않고 삭제 후 새로 만든다 — 차량 예약과
 * 동일한 이유(요청 사항)와 동일한 방식.
 */
import { parseHubSessionToken } from '../../lib/hubAccounts.js';
import { listCalendarEvents, createCalendarEvent, deleteCalendarEventById } from '../../lib/googleCalendar.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

async function requireSession(request, env) {
  if (!env.ADMIN_PASSWORD) return null;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  return parseHubSessionToken(env.ADMIN_PASSWORD, token);
}
function canWrite(session) {
  return !!session && (session.role === 'admin' || session.role === 'master');
}
function calendarConfigured(env) {
  return !!(env.GOOGLE_SERVICE_ACCOUNT_JSON && env.GOOGLE_STAFF_CALENDAR_ID);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** body → { summary, description, location, allDay, startAt, endAt } (all-day면 startAt/endAt은 'YYYY-MM-DD', endAt은 구글 규칙대로 배타적으로 이미 +1일 되어있음) */
function parseEventInput(body) {
  const summary = String(body.summary || '').trim().slice(0, 200);
  const description = String(body.description || '').trim().slice(0, 2000);
  const location = String(body.location || '').trim().slice(0, 200);
  const allDay = !!body.allDay;
  const startDate = String(body.startDate || '').trim();
  const endDate = String(body.endDate || '').trim();

  if (!summary) throw new Error('제목을 입력해 주세요.');
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) throw new Error('날짜 형식이 올바르지 않습니다.');

  if (allDay) {
    if (endDate < startDate) throw new Error('종료일은 시작일보다 나중이어야 합니다.');
    return { summary, description, location, allDay: true, startAt: startDate, endAt: addDays(endDate, 1) };
  }

  const startTime = String(body.startTime || '09:00').trim();
  const endTime = String(body.endTime || '10:00').trim();
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) throw new Error('시간 형식이 올바르지 않습니다.');
  const startAt = `${startDate}T${startTime}:00`;
  const endAt = `${endDate}T${endTime}:00`;
  const startMs = Date.parse(startAt);
  const endMs = Date.parse(endAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) throw new Error('날짜/시간이 올바르지 않습니다.');
  if (endMs <= startMs) throw new Error('종료 일시는 시작 일시보다 나중이어야 합니다.');
  return { summary, description, location, allDay: false, startAt, endAt };
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const session = await requireSession(request, env);
  if (!session) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  if (!calendarConfigured(env)) {
    return Response.json({ error: '캘린더가 아직 연결되지 않았습니다. 관리자에게 문의해 주세요.' }, { status: 500, headers: CORS });
  }

  const url = new URL(request.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  if (!start || !end) {
    return Response.json({ error: 'start/end 파라미터가 필요합니다.' }, { status: 400, headers: CORS });
  }

  try {
    const events = await listCalendarEvents({
      serviceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON,
      calendarId: env.GOOGLE_STAFF_CALENDAR_ID,
      timeMin: new Date(`${start}T00:00:00+09:00`).toISOString(),
      timeMax: new Date(`${end}T23:59:59+09:00`).toISOString(),
    });
    return Response.json({ events }, { headers: CORS });
  } catch (error) {
    console.error('schedule events error:', error);
    return Response.json({ error: '캘린더를 불러오지 못했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const session = await requireSession(request, env);
  if (!session) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  if (!canWrite(session)) {
    return Response.json({ error: '관리자만 일정을 등록할 수 있습니다.' }, { status: 403, headers: CORS });
  }
  if (!calendarConfigured(env)) {
    return Response.json({ error: '캘린더가 아직 연결되지 않았습니다. 관리자에게 문의해 주세요.' }, { status: 500, headers: CORS });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400, headers: CORS });
  }

  try {
    const parsed = parseEventInput(body);
    const eventId = await createCalendarEvent({
      serviceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON,
      calendarId: env.GOOGLE_STAFF_CALENDAR_ID,
      summary: parsed.summary, description: parsed.description, location: parsed.location,
      startAt: parsed.startAt, endAt: parsed.endAt, allDay: parsed.allDay,
    });
    return Response.json({
      ok: true,
      event: { id: eventId, summary: parsed.summary, description: parsed.description, location: parsed.location, allDay: parsed.allDay, start: parsed.startAt, end: parsed.endAt },
    }, { headers: CORS });
  } catch (error) {
    console.error('schedule create error:', error);
    return Response.json({ error: error.message || '등록하지 못했습니다.' }, { status: 400, headers: CORS });
  }
}

export async function onRequestPut(context) {
  const { env, request } = context;
  const session = await requireSession(request, env);
  if (!session) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  if (!canWrite(session)) {
    return Response.json({ error: '관리자만 일정을 수정할 수 있습니다.' }, { status: 403, headers: CORS });
  }
  if (!calendarConfigured(env)) {
    return Response.json({ error: '캘린더가 아직 연결되지 않았습니다. 관리자에게 문의해 주세요.' }, { status: 500, headers: CORS });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400, headers: CORS });
  }

  const id = String(body.id || '').trim();
  if (!id) {
    return Response.json({ error: '일정 ID가 없습니다.' }, { status: 400, headers: CORS });
  }

  try {
    const parsed = parseEventInput(body);
    try {
      await deleteCalendarEventById({ serviceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON, calendarId: env.GOOGLE_STAFF_CALENDAR_ID, eventId: id });
    } catch (e) {
      console.error('schedule old-event delete failed (continuing to create new one):', e);
    }
    const newEventId = await createCalendarEvent({
      serviceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON,
      calendarId: env.GOOGLE_STAFF_CALENDAR_ID,
      summary: parsed.summary, description: parsed.description, location: parsed.location,
      startAt: parsed.startAt, endAt: parsed.endAt, allDay: parsed.allDay,
    });
    return Response.json({
      ok: true,
      event: { id: newEventId, summary: parsed.summary, description: parsed.description, location: parsed.location, allDay: parsed.allDay, start: parsed.startAt, end: parsed.endAt },
    }, { headers: CORS });
  } catch (error) {
    console.error('schedule update error:', error);
    return Response.json({ error: error.message || '수정하지 못했습니다.' }, { status: 400, headers: CORS });
  }
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  const session = await requireSession(request, env);
  if (!session) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  if (!canWrite(session)) {
    return Response.json({ error: '관리자만 일정을 삭제할 수 있습니다.' }, { status: 403, headers: CORS });
  }
  if (!calendarConfigured(env)) {
    return Response.json({ error: '캘린더가 아직 연결되지 않았습니다. 관리자에게 문의해 주세요.' }, { status: 500, headers: CORS });
  }

  const url = new URL(request.url);
  const id = String(url.searchParams.get('id') || '').trim();
  if (!id) {
    return Response.json({ error: '일정 ID가 없습니다.' }, { status: 400, headers: CORS });
  }

  try {
    await deleteCalendarEventById({ serviceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON, calendarId: env.GOOGLE_STAFF_CALENDAR_ID, eventId: id });
    return Response.json({ ok: true }, { headers: CORS });
  } catch (error) {
    console.error('schedule delete error:', error);
    return Response.json({ error: error.message || '삭제하지 못했습니다.' }, { status: 400, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
