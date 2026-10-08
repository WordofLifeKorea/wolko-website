# Kitchen Reminder Scheduler

Production Worker: `wolko-kitchen-scheduler` in the existing Cloudflare account.
Source: `workers/kitchen-scheduler/index.js`.

## Schedule

- Cron: `*/5 21-23,0-12 * * *` (UTC).
- Checks every five minutes, 06:00 through 21:55 Asia/Seoul.
- Calls the existing production Pages API. Meal settings, recipient grouping,
  SMS fallback, late-registration rules and the per-person/per-meal KV ledger
  stay in `functions/api/kitchen/reminders.js`.
- Failed requests fail the Cron invocation. The next five-minute check retries
  unsent recipients; there is no immediate retry of an ambiguous network result.
- The GitHub workflow is manual-only to avoid overlapping schedulers. KV is not
  an atomic lock, so do not run manual live checks alongside the Cron Trigger.

## Deployment

The initial deployment was made through the Cloudflare dashboard. Later changes
must also deploy this Worker; the Pages Git build does not deploy it automatically.
From `workers/kitchen-scheduler`, authenticated Wrangler can run `npx wrangler deploy`.

Set the same encrypted `KITCHEN_SCHEDULER_SECRET` on the production Pages project
`wolko-website` and on this Worker. Redeploy Pages after changing its secret.
Never commit the key. Existing reminder secrets are left unchanged.

## Verification

- `GET /health`: configuration presence only, no recipient data.
- Authenticated `POST /check`: always a dry run, even if force/date parameters are
  supplied. It returns summary counts, never recipient names or phone numbers.
- Cron invocations are visible in Worker Observability. Summary logs include date,
  time, accepted-send count, failures and skip reasons. A successful API response
  confirms provider submission, not final delivery; consult Solapi for delivery.
- Cron configuration propagation can take up to 15 minutes per Cloudflare docs.

## Rollback

Remove the Worker Cron Trigger first, then restore the GitHub scheduled trigger
and the `KITCHEN_REMINDERS_ENABLED` condition from Git history. Keep only one
automatic scheduler active.
