import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/wolko-session.js', import.meta.url), 'utf8');
function storage(values = {}) {
  const data = new Map(Object.entries(values));
  return { get length() { return data.size; }, key:i=>[...data.keys()][i], getItem:k=>data.get(k) ?? null,
    setItem:(k,v)=>data.set(k,String(v)), removeItem:k=>data.delete(k) };
}
function setup(localValues={}, sessionValues={}) {
  const localStorage=storage(localValues), sessionStorage=storage(sessionValues), listeners={}, redirects=[];
  const window={addEventListener:(name,fn)=>listeners[name]=fn,location:{replace:url=>redirects.push(url)}};
  vm.runInNewContext(source,{window,localStorage,sessionStorage});
  return {api:window.WolkoSession,localStorage,sessionStorage,listeners,redirects};
}
test('remember email stores only normalized email and can be removed', () => {
  const {api,localStorage}=setup();
  assert.equal(api.rememberedEmail(),'');
  api.rememberEmail(' User@WOL.org ',true);
  assert.equal(api.rememberedEmail(),'user@wol.org'); assert.equal(localStorage.length,1);
  api.rememberEmail('',false); assert.equal(api.rememberedEmail(),'');
});
test('global logout clears all tool credentials, waits for Firebase cleanup, preserves preferences', async () => {
  const ctx=setup({'wolko-lang':'ko','wolko-remembered-email':'a@wol.org','wolko_qt_book_token':'qt'},
    {'wolko-hub-token':'hub','wolko-hub-email':'a@wol.org','wolko-hub-role':'admin','wolko-camp-progress-token':'camp','wolko-camp-progress-role':'counselor','wolko_team_token_kim':'team'});
  let signedOut=false;
  ctx.api.onLogout(async()=>{assert.equal(ctx.redirects.length,0); signedOut=true;});
  await ctx.api.logoutAll();
  assert.equal(signedOut,true); assert.deepEqual(ctx.redirects,['/portal']);
  for(const key of ['wolko-hub-token','wolko-hub-email','wolko-hub-role','wolko-camp-progress-token','wolko-camp-progress-role','wolko_team_token_kim']) assert.equal(ctx.sessionStorage.getItem(key),null);
  assert.equal(ctx.localStorage.getItem('wolko_qt_book_token'),null);
  assert.equal(ctx.api.rememberedEmail(),'a@wol.org'); assert.equal(ctx.localStorage.getItem('wolko-lang'),'ko');
  assert.ok(ctx.localStorage.getItem('wolko-logout-event'));
});
test('another tab receives logout and clears its independent session', async () => {
  const ctx=setup({}, {'wolko-hub-token':'other-tab'});
  ctx.localStorage.setItem('wolko-logout-event','new-event');
  ctx.listeners.storage({key:'wolko-logout-event',newValue:'new-event'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(ctx.sessionStorage.getItem('wolko-hub-token'),null);
  assert.deepEqual(ctx.redirects,['/portal']);
});
test('stale restored tab clears credentials, normal reload preserves current session', () => {
  const stale=setup({'wolko-logout-event':'new'}, {'wolko-logout-seen':'old','wolko-hub-token':'stale'});
  assert.equal(stale.api.invalidatedOnLoad,true); assert.equal(stale.sessionStorage.getItem('wolko-hub-token'),null);
  const current=setup({'wolko-logout-event':'new'}, {'wolko-logout-seen':'new','wolko-hub-token':'valid'});
  assert.equal(current.api.invalidatedOnLoad,false); assert.equal(current.sessionStorage.getItem('wolko-hub-token'),'valid');
});
