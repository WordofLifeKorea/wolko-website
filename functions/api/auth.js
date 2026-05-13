/**
 * GET /api/auth  — GitHub OAuth proxy for Decap CMS
 *
 * Flow:
 *   1) CMS opens popup → /api/auth?provider=github&site_id=...
 *      → we redirect to GitHub OAuth page
 *   2) GitHub redirects back → /api/auth?code=...&state=...
 *      → we exchange code for token, postMessage to CMS popup
 *
 * Required env vars (Cloudflare Pages → Settings → Environment variables):
 *   GITHUB_CLIENT_ID     — GitHub OAuth App client ID
 *   GITHUB_CLIENT_SECRET — GitHub OAuth App client secret
 *
 * GitHub OAuth App callback URL must be set to: https://wolko.org/api/auth
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code     = url.searchParams.get('code');
  const provider = url.searchParams.get('provider');
  const scope    = url.searchParams.get('scope') || 'repo,user';

  const CLIENT_ID     = env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = env.GITHUB_CLIENT_SECRET;
  const REDIRECT_URI  = `${url.origin}/api/auth`;

  // ── Step 2: GitHub callback (code 파라미터 있을 때) ──
  if (code) {
    try {
      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
      });
      const json = await res.json();
      const token = json.access_token;

      if (!token) {
        return authHtml('error', JSON.stringify({ message: json.error_description || 'No token received' }));
      }
      return authHtml('success', JSON.stringify({ token, provider: 'github' }));
    } catch (e) {
      return authHtml('error', JSON.stringify({ message: String(e) }));
    }
  }

  // ── Step 1: CMS가 팝업 열 때 → GitHub OAuth 페이지로 리디렉트 ──
  if (provider === 'github' || !code) {
    if (!CLIENT_ID) {
      return new Response('GITHUB_CLIENT_ID 환경변수가 설정되지 않았습니다.', { status: 500 });
    }
    const githubUrl = new URL('https://github.com/login/oauth/authorize');
    githubUrl.searchParams.set('client_id', CLIENT_ID);
    githubUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    githubUrl.searchParams.set('scope', scope);
    return Response.redirect(githubUrl.toString(), 302);
  }

  return new Response('Bad Request', { status: 400 });
}

/** CMS 팝업 창에 postMessage를 보내는 HTML 반환 */
function authHtml(result, data) {
  const script = `
    (function() {
      var result = ${JSON.stringify(result)};
      var data   = ${data};
      function handleMessage(e) {
        window.opener.postMessage(
          'authorization:github:' + result + ':' + JSON.stringify(data),
          e.origin
        );
        window.removeEventListener('message', handleMessage);
      }
      window.addEventListener('message', handleMessage, false);
      window.opener.postMessage('authorizing:github', '*');
    })();
  `;
  return new Response(
    `<!DOCTYPE html><html><body><script>${script}</script></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
