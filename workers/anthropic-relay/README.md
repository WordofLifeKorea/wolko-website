# Anthropic 중계 Worker

홈페이지(Cloudflare Pages)의 Anthropic 호출(소개글 번역·주행거리계 인식)이 홍콩 데이터센터에서 403 으로 막힐 때 쓴다.

## 배포 (한 번만)
```bash
cd workers/anthropic-relay
npx wrangler login          # 브라우저로 Cloudflare 로그인(키를 입력하지 않는다)
npx wrangler deploy         # 주소가 출력된다: https://wolko-anthropic-relay.<계정>.workers.dev
npx wrangler secret put RELAY_TOKEN   # 긴 임의 문자열(예: openssl rand -hex 24)을 입력
```

## 홈페이지(Pages) 환경변수
- `AI_GATEWAY_URL` = 위 주소 (끝에 `/` 나 `/anthropic` 을 붙이지 않는다)
- `CF_AIG_TOKEN`   = 위에서 정한 `RELAY_TOKEN` 과 같은 값
- `ANTHROPIC_API_KEY` 는 그대로 둔다. 바꾼 뒤 Pages 를 재배포한다.
