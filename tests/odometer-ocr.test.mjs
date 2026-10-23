import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../functions/lib/hubAccounts.js';
import { parseOdometerReply, readOdometer, DEFAULT_ODOMETER_MODEL } from '../functions/lib/odometerOcr.js';
import * as O from '../functions/api/car/odometer.js';

const JPEG = new Uint8Array([0xff, 0xd8, ...Array(200).fill(7), 0xff, 0xd9]);

test('모델 답변 해석: 정상 · 코드블록 · 읽지 못함 · 마일 단위 · 범위 밖', () => {
  assert.deepEqual(parseOdometerReply('{"odometer": 52310, "unit": "km", "confidence": "high", "note": "ODO clear"}'), { odometer: 52310, unit: 'km', confidence: 'high', note: 'ODO clear' });
  assert.equal(parseOdometerReply('```json\n{"odometer": "52,310.4", "unit": null, "confidence": "medium"}\n```').odometer, 52310);
  const none = parseOdometerReply('{"odometer": null, "unit": null, "confidence": "high", "note": "blurry"}');
  assert.equal(none.odometer, null); assert.equal(none.confidence, 'low');
  const miles = parseOdometerReply('{"odometer": 30000, "unit": "mi", "confidence": "high"}');
  assert.equal(miles.odometer, null); assert.match(miles.note, /마일/);
  assert.equal(parseOdometerReply('{"odometer": 99999999}').odometer, null);
  assert.equal(parseOdometerReply('not json at all').odometer, null);
});

test('인식 요청: 설정된 키·모델·게이트웨이로 사진(base64)을 보내고 답을 해석한다', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return Response.json({ content: [{ type: 'text', text: '{"odometer": 41230, "unit": "km", "confidence": "high", "note": "ok"}' }] }); };
  const out = await readOdometer({ CAR_OCR_API_KEY: 'new-key', ANTHROPIC_API_KEY: 'old-key' }, JPEG, fetchImpl);
  assert.equal(out.odometer, 41230);
  assert.equal(calls[0].init.headers['x-api-key'], 'new-key', '전용 키가 있으면 그것을 쓴다');
  assert.equal(calls[0].body.model, DEFAULT_ODOMETER_MODEL);
  assert.equal(calls[0].body.messages[0].content[0].source.media_type, 'image/jpeg');
  assert.ok(calls[0].body.messages[0].content[0].source.data.length > 100);
  await readOdometer({ ANTHROPIC_API_KEY: 'old-key', AI_GATEWAY_URL: 'https://gw.example', CF_AIG_TOKEN: 't', ODOMETER_MODEL: 'custom-model' }, JPEG, fetchImpl);
  assert.equal(calls[1].init.headers['x-api-key'], 'old-key');
  assert.equal(calls[1].url, 'https://gw.example/anthropic/v1/messages');
  assert.equal(calls[1].body.model, 'custom-model');
  await assert.rejects(() => readOdometer({}, JPEG, fetchImpl), /설정되지/);
});

function endpoint(envExtra = {}, reply) {
  const store = new Map();
  const env = { CAMP_KV: { get: async k => store.get(k) ?? null, put: async (k, v) => store.set(k, v) }, ADMIN_PASSWORD: 'secret', ...envExtra };
  const fetchImpl = async () => reply ?? Response.json({ content: [{ type: 'text', text: '{"odometer": 52310, "unit": "km", "confidence": "high", "note": ""}' }] });
  const post = async (body = JPEG, token = true) => {
    const headers = token ? { Authorization: 'Bearer ' + await H.createHubSessionToken('secret', 'admin@wolko.org', 'master'), 'Content-Type': 'image/jpeg' } : {};
    const res = await O.onRequestPost({ env, request: new Request('https://t.co/api/car/odometer', { method: 'POST', headers, body }), fetchImpl });
    return { status: res.status, ...(await res.json()) };
  };
  return { post, store };
}

test('계기판 API: 로그인 필요 · 키 없으면 수동 안내 · 사진 검사 · 성공 · 하루 한도', async () => {
  const e = endpoint({ ANTHROPIC_API_KEY: 'k' });
  assert.equal((await e.post(JPEG, false)).status, 401);
  assert.equal((await e.post(new Uint8Array([1, 2, 3]))).status, 400);
  assert.equal((await e.post(new Uint8Array(300).fill(1))).status, 400, 'JPEG 이 아니면 거절');
  const ok = await e.post();
  assert.equal(ok.status, 200); assert.equal(ok.odometer, 52310);
  const noKey = endpoint({});
  const r = await noKey.post();
  assert.equal(r.status, 503); assert.equal(r.manual, true);
  const limited = endpoint({ ANTHROPIC_API_KEY: 'k' });
  for (let i = 0; i < 40; i++) assert.equal((await limited.post()).status, 200);
  assert.equal((await limited.post()).status, 429);
  const upstream = endpoint({ ANTHROPIC_API_KEY: 'k' }, new Response('boom', { status: 500 }));
  const u = await upstream.post();
  assert.equal(u.status, 500); assert.equal(u.manual, true);
});
