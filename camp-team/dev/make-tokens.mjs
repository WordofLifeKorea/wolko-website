// 로컬 테스트용 로그인 토큰을 만든다. (운영 비밀번호가 아니라 로컬 전용 값으로 서명)
// 사용:  node camp-team/dev/make-tokens.mjs
import { createHubSessionToken } from '../../functions/lib/hubAccounts.js';
const SECRET = process.env.LOCAL_ADMIN_PASSWORD || 'local-dev-secret';
const users = { admin: 'test-admin@wolko.org', director: 'test-director@wolko.org', treasurer: 'test-treasurer@wolko.org', finance: 'test-finance@wolko.org', member: 'test-member@wolko.org', viewer: 'test-viewer@wolko.org' };
const out = {};
for (const [k, email] of Object.entries(users)) out[k] = { email, token: await createHubSessionToken(SECRET, email, 'counselor') };
console.log(JSON.stringify(out, null, 2));
