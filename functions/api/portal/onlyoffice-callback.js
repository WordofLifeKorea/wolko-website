import { text, readData, saveData, filesOf } from '../../lib/portalResources.js';
import { getAccount } from '../../lib/hubAccounts.js';
import { callbackToken, onlyOfficeOrigin, onlyOfficeSecret, verifyJwt } from '../../lib/onlyoffice.js';
import { readStoredResourceFile, replaceWithEditedFile, sha256Hex } from '../../lib/portalResourceVersions.js';

const MAX_FILE_BYTES = 24 * 1024 * 1024;
const json = error => Response.json({ error });

export async function onRequestPost({ env, request }) {
  try {
    if (!env.CAMP_KV) return json(1);
    const secret = onlyOfficeSecret(env);
    if (!secret) return json(1);
    const body = await request.json();
    if (!await verifyJwt(callbackToken(request, body), secret)) return json(1);
    if (![2, 6].includes(Number(body.status)) || !body.url) return json(0);

    const downloadUrl = new URL(body.url);
    if (downloadUrl.origin !== onlyOfficeOrigin(env)) return json(1);
    const response = await fetch(downloadUrl.toString());
    if (!response.ok) return json(1);
    const editedBytes = new Uint8Array(await response.arrayBuffer());
    if (!editedBytes.byteLength || editedBytes.byteLength > MAX_FILE_BYTES) return json(1);

    const params = new URL(request.url).searchParams;
    const id = text(params.get('id'), 80);
    const fileId = text(params.get('fileId'), 80);
    const actorEmail = text(params.get('actor'), 160);
    const expectedRevision = Number(params.get('revision') || 0);
    const data = await readData(env);
    const itemIndex = data.items.findIndex(entry => entry.id === id);
    if (itemIndex < 0) return json(1);
    const item = { ...data.items[itemIndex] };
    const files = filesOf(item);
    const fileIndex = files.findIndex(file => file.id === fileId);
    if (fileIndex < 0) return json(1);
    if (Number(files[fileIndex].documentRevision || 0) !== expectedRevision) return json(0);
    const current = await readStoredResourceFile(env, id, fileId);
    if (!current) return json(1);

    const account = actorEmail ? await getAccount(env, actorEmail) : null;
    const saveId = await sha256Hex(new TextEncoder().encode(String(body.url)));
    const result = await replaceWithEditedFile(env, {
      id,
      file: files[fileIndex],
      currentBytes: current.bytes,
      editedBytes,
      actorEmail,
      actorName: account?.name || actorEmail,
      saveId,
      finalSave: Number(body.status) === 2,
    });
    if (!result.changed && !result.finalized) return json(0);
    item.files = files.map((file, index) => index === fileIndex ? result.file : file);
    item.updatedAt = new Date().toISOString();
    data.items[itemIndex] = item;
    await saveData(env, data.items);
    return json(0);
  } catch (error) {
    console.error('ONLYOFFICE callback failed', error);
    return json(1);
  }
}
