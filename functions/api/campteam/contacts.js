import { crud } from '../../lib/campteamCrud.js';
import { cleanContact } from '../../lib/campteamPrep.js';

/** 연락처 모음(교회·학교·업체·강사·장소). 캠프팀 명단에 있는 사람만 본다. GET ?kind=&q=&campId= · POST · PATCH ?id · DELETE ?id */
const h = crud({ table: 'contacts', entity: 'contact', area: 'camps', cols: ['kind', 'name', 'org', 'phone', 'email', 'notes', 'campId'], clean: cleanContact, order: 'kind, name COLLATE NOCASE', filters: { kind: 'kind', campId: 'campId' }, search: ['name', 'org', 'notes', 'phone', 'email'] });
export const onRequestGet = h.onRequestGet, onRequestPost = h.onRequestPost, onRequestPatch = h.onRequestPatch, onRequestDelete = h.onRequestDelete;
