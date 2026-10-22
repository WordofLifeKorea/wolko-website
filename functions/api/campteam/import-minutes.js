import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, audit } from '../../lib/campteamDb.js';
import { parseMinutesText, mergeMinutes } from '../../lib/campteamMinutes.js';

/**
 * 회의록 붙여넣어 가져오기: { textKo?, textEn?, campId?, preview?, force? }
 * 한국어/영어 Word 회의록을 복사해 붙여넣으면 같은 번호의 구역끼리 짝지어 "한 회의"로 저장한다(한쪽만 있어도 됨).
 * 결정(제안/합의/확정)은 자동으로 만들지 않는다 — 회의록 문장만으로 결정을 추측하지 않고, 사람이 구역에서 직접 기록한다.
 * "다음 회의" 구역의 표는 다음 회의 안건 목록이 된다.
 */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'meetings')) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const tKo = String(b.textKo || ''), tEn = String(b.textEn || '');
  if (!tKo.trim() && !tEn.trim()) return badRequest('회의록 내용을 붙여넣어 주세요.');
  if (tKo.length > 300000 || tEn.length > 300000) return badRequest('내용이 너무 깁니다.');
  const merged = mergeMinutes(tKo.trim() ? parseMinutesText(tKo) : null, tEn.trim() ? parseMinutesText(tEn) : null);
  if (!merged.date) return badRequest('회의 날짜를 찾지 못했어요. 맨 위에 "일시:" 또는 "Date and time:" 줄이 있는지 확인해주세요.');
  if (!merged.sections.length) return badRequest('"1. 제목" 형태의 구역을 찾지 못했어요.');
  if (b.campId && !(await env.DB.prepare('SELECT 1 AS x FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.campId)).first())) return badRequest('캠프를 찾을 수 없습니다.');
  const title = merged.titleKo || merged.titleEn;
  const dup = await env.DB.prepare('SELECT id FROM meetings WHERE meetDate = ?1 AND (title = ?2 OR titleEn = ?3) AND deletedAt IS NULL').bind(merged.date, merged.titleKo || '\u0000', merged.titleEn || '\u0000').first();
  const summary = { date: merged.date, time: merged.time, attendees: merged.attendees, title, titleEn: merged.titleEn, languages: [tKo.trim() && 'ko', tEn.trim() && 'en'].filter(Boolean),
    sections: merged.sections.filter(x => !x.isNext).map(x => ({ no: x.no, kind: x.kind, titleKo: x.titleKo, titleEn: x.titleEn })), nextItems: merged.sections.flatMap(x => x.nextItems).length, duplicateOf: dup?.id || null };
  if (b.preview) return json({ preview: true, summary });
  if (dup && !b.force) return json({ error: '같은 날짜·제목의 회의가 이미 있어요.', code: 'duplicate', existingId: dup.id }, 409);
  const id = uuid(), now = nowIso(), sum = merged.sections.find(x => x.kind === 'summary');
  await env.DB.prepare(`INSERT INTO meetings (id,campId,meetDate,meetTime,title,titleEn,purpose,purposeEn,attendees,recordNote,sourcesNote,summaryKo,summaryEn,status,createdAt,updatedAt,createdBy)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,'draft',?14,?14,?15)`)
    .bind(id, b.campId || null, merged.date, merged.time, text(title, 160), text(merged.titleEn, 160), text(merged.purposeKo, 400), text(merged.purposeEn, 400), text(merged.attendees, 300), text(merged.recordNote, 200), text(merged.sourcesNote, 400),
      text(sum?.bodyKo, 4000), text(sum?.bodyEn, 4000), now, s.email).run();
  let order = 0;
  for (const sec of merged.sections) {
    if (!sec.isNext) {
      await env.DB.prepare(`INSERT INTO agenda_items (id,meetingId,campId,topic,titleEn,bodyKo,bodyEn,kind,sectionNo,status,nextMeeting,sortOrder,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'discussed',0,?10,?11,?11,?12)`)
        .bind(uuid(), id, b.campId || null, text(sec.titleKo || sec.titleEn, 200), text(sec.titleEn, 200), text(sec.bodyKo, 8000), text(sec.bodyEn, 8000), sec.kind, sec.no, ++order, now, s.email).run();
    } else {
      if (sec.bodyKo || sec.bodyEn) await env.DB.prepare(`INSERT INTO agenda_items (id,meetingId,campId,topic,titleEn,bodyKo,bodyEn,kind,sectionNo,status,nextMeeting,sortOrder,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,'other',?8,'discussed',0,?9,?10,?10,?11)`)
        .bind(uuid(), id, b.campId || null, text(sec.titleKo || sec.titleEn, 200), text(sec.titleEn, 200), text(sec.bodyKo, 8000), text(sec.bodyEn, 8000), sec.no, ++order, now, s.email).run();
      for (const it of sec.nextItems) await env.DB.prepare(`INSERT INTO agenda_items (id,meetingId,campId,topic,titleEn,bodyKo,bodyEn,kind,status,nextMeeting,sortOrder,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,'other','pending',1,?8,?9,?9,?10)`)
        .bind(uuid(), id, b.campId || null, text(it.topicKo || it.topicEn, 200), text(it.topicEn, 200), text(it.noteKo, 800), text(it.noteEn, 800), ++order, now, s.email).run();
    }
  }
  await audit(env, s.email, 'import_minutes', 'meeting', id, `${merged.sections.length} sections`);
  return json({ id, summary }, 201);
}
