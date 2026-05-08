export async function onRequestGet(context) {
  const { env } = context;
  return Response.json({
    hasAdminPassword: !!env.ADMIN_PASSWORD,
    hasTeamPassword: !!env.TEAM_PASSWORD,
    hasGithubToken: !!env.GITHUB_TOKEN,
    hasGithubRepo: !!env.GITHUB_REPO,
    hasCampKV: !!env.CAMP_KV,
  }, {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
