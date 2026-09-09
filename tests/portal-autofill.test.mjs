import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const portal = readFileSync(new URL('../src/pages/portal.astro', import.meta.url), 'utf8');
const campResources = readFileSync(new URL('../src/pages/camp-resources/index.astro', import.meta.url), 'utf8');
const qtBook = readFileSync(new URL('../src/pages/resources/qt-book.astro', import.meta.url), 'utf8');

test('portal exposes a standard password-manager login form', () => {
  assert.match(portal, /<form[^>]+id="portalLoginForm"[^>]+action="\/api\/hub\/account-login"[^>]+method="post"/);
  assert.match(portal, /id="emailInput"[^>]+name="username"[^>]+autocomplete="username"/);
  assert.match(portal, /id="loginPwInput"[^>]+name="password"[^>]+autocomplete="current-password"/);
  assert.match(portal, /id="emailBtn"[^>]+type="submit"/);
  assert.match(portal, /portalLoginForm'\)\.addEventListener\('submit'/);
});

test('wrong portal passwords do not fall through to counselor authentication', () => {
  assert.match(portal, /if \(res\.status === 404 \|\| \(res\.ok && data\.role === 'counselor'\)\)/);
  assert.doesNotMatch(portal, /res\.status === 404 \|\| res\.status === 401/);
});

test('successful login gives password managers a credential update signal', () => {
  assert.match(portal, /new window\.PasswordCredential\(\$\('portalLoginForm'\)\)/);
  assert.match(portal, /await navigator\.credentials\.store\(credential\)/);
  assert.match(portal, /await offerCredentialUpdate\(\);\s*location\.replace\('\/portal\/\?signed-in=1'\)/);
  assert.doesNotMatch(portal, /\$\('loginPwInput'\)\.value = '';\s*applySession\(data\)/);
});

test('shared resource passwords are excluded from account autofill', () => {
  for (const source of [campResources, qtBook]) {
    assert.match(source, /id="passwordInput"[^>]+name="resource-access-code"[^>]+autocomplete="off"/);
  }
});
