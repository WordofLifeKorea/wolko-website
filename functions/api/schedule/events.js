/**
 * GET /api/schedule/events?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Authorization: Bearer <허브 세션 토큰> — role 무관, 유효한 허브 계정이면 누구나
 * (관리자/상담사 모두 스태프 캘린더는 볼 수 있어야 하므로 role 체크 없음).
 *
 * 서비스 계정으로 구글 캘린더 이벤트를 읽기 전용으로 가져와 반환한다.
 * 캘린더는 이 서비스 계정에만 "보기" 권한으로 공유되어 있어 비공개 상태를
 * 유지하면서도(개별 스태프 구글 계정을 하나씩 공유 목록에 추가할 필요 없이)
 * 허브에 로그인한 사람이면 이 페이지를 통해 조회할 수 있다.
 */
import { parseHubSessionToken } from '../../lib/hubAccounts.js';
import { listCalendarEvents } from '../../lib/googleCalendar.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.ADMIN_PASSWORD) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }

  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const session = token ? await parseHubSessionToken(env.ADMIN_PASSWORD, token) : null;
  if (!session) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }

  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON || !env.GOOGLE_STAFF_CALENDAR_ID) {
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

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
