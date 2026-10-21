// 로컬 테스트 전용 "역할 바꿔 로그인" 페이지를 빌드 결과물(dist)에만 만든다. 소스(src/public)에는 들어가지 않아 배포되지 않는다.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHubSessionToken } from '../../functions/lib/hubAccounts.js';
const SECRET = process.env.LOCAL_ADMIN_PASSWORD || 'local-dev-secret';
const users = [
  ['admin', 'test-admin@wolko.org', '관리자 (admin)', '모든 것 + 팀 명단 관리'],
  ['finance', 'test-finance@wolko.org', '재정 담당', '일반 자료는 조회만 · 금액 조회/작성'],
  ['member', 'test-member@wolko.org', '캠프팀 팀원', '일반 자료 작성 · 금액 조회/작성'],
  ['viewer', 'test-viewer@wolko.org', '그 외 포털 사용자', '조회만 · 금액은 안 보임'],
];
const list = [];
for (const [k, email, label, desc] of users) list.push({ k, email, label, desc, token: await createHubSessionToken(SECRET, email, 'counselor') });
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>테스트 로그인 (로컬 전용)</title>
<style>body{font-family:'Noto Sans KR',sans-serif;background:#f4f6f8;color:#1a2d38;margin:0;padding:28px}main{max-width:560px;margin:0 auto}h1{font-size:20px;margin:0 0 4px}p{color:#5a7585;font-size:13px;line-height:1.6}
.warn{background:#fff4e5;color:#9a5a00;border-radius:10px;padding:10px 12px;font-size:12.5px;margin:12px 0}
button{display:block;width:100%;text-align:left;background:#fff;border:1px solid #e4eaee;border-radius:12px;padding:14px 16px;margin:10px 0;cursor:pointer;font:inherit}
button b{display:block;font-size:15px;color:#004f68}button small{color:#5a7585}button:hover{border-color:#004f68}
.go{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.go a{background:#004f68;color:#fff;text-decoration:none;border-radius:10px;padding:9px 14px;font-size:13px}</style>
<main><h1>테스트 로그인</h1><p>역할을 고르면 그 계정으로 로그인한 상태가 되고 캠프팀 홈으로 이동해요. 언제든 이 페이지로 돌아와 다른 역할로 바꿔 볼 수 있어요.</p>
<div class="warn">이 페이지는 내 컴퓨터에서만 열리는 개발용이에요. 운영 사이트에는 없고, 테스트(더미) 자료만 보여요.</div>
<div id="list"></div><div class="go"><a href="/campteam/">캠프팀 홈</a><a href="/campteam/camps/">캠프별 공간</a><a href="/campteam/files/">자료실</a><a href="/campteam/settings/">설정(관리자만)</a></div></main>
<script>const U=${JSON.stringify(list)};const el=document.getElementById('list');
U.forEach(u=>{const b=document.createElement('button');b.innerHTML='<b>'+u.label+'</b><small>'+u.email+' · '+u.desc+'</small>';b.onclick=()=>{sessionStorage.setItem('wolko-hub-token',u.token);try{localStorage.setItem('wolko-lang','ko')}catch(e){}location.href='/campteam/'};el.appendChild(b)});</script></html>`;
mkdirSync('dist/dev-login', { recursive: true });
writeFileSync('dist/dev-login/index.html', html);
console.log('dev-login page written to dist/dev-login/');
