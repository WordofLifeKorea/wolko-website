# Unified Reminder Scheduler

Production Worker: `wolko-kitchen-scheduler` in the existing Cloudflare account.
Source: `workers/kitchen-scheduler/index.js`.

## Schedule

- Cron: `*/5 21-23,0-12 * * *` (UTC).
- Checks every five minutes, 06:00 through 21:55 Asia/Seoul.
- Calls the existing production Pages API. Meal settings, recipient grouping,
  SMS fallback, late-registration rules and the per-person/per-meal KV ledger
  stay in the individual Pages reminder APIs.
- The Worker calls `/api/reminders/run`. The authenticated dispatcher runs
  kitchen and drive checks every tick, CRS after 09:17 KST (first tick 09:20),
  and weekly staffing on Monday after 09:30. Late checks resume until 21:55.
- CRS processes one existing ten-message batch per tick until complete, retains
  its atomic Firebase delivery claims and surfaces ambiguous deliveries for
  manual review. Its daily completion marker expires after two days.
- Each job is isolated: kitchen or drive failure cannot stop staffing or CRS.
  `reminders:run:last` contains only summary counts/statuses (seven-day TTL).
  Recipient details and provider credentials never leave the dispatcher.
- Camp application/deposit notices already run immediately in Cloudflare Pages;
  they are not delayed until a scheduled tick. Camp content auto-opening remains
  a separate repository-maintenance workflow, not a notification scheduler.
- Failed requests fail the Cron invocation. The next five-minute check retries
  unsent recipients; there is no immediate retry of an ambiguous network result.
- All four reminder GitHub workflows are manual-only to avoid overlapping schedulers. KV is not
  an atomic lock, so do not run manual live checks alongside the Cron Trigger.

## Deployment

The initial deployment was made through the Cloudflare dashboard. Later changes
must also deploy this Worker; the Pages Git build does not deploy it automatically.
From `workers/kitchen-scheduler`, authenticated Wrangler can run `npx wrangler deploy`.

Set the same encrypted `KITCHEN_SCHEDULER_SECRET` on the production Pages project
`wolko-website` and on this Worker. Redeploy Pages after changing its secret.
Never commit the key. Existing reminder secrets are left unchanged.
CRS also accepts this scheduler credential when no legacy `CRS_REMINDER_SECRET`
is configured; Firebase and mail credentials stay solely in Pages.

## Verification

- `GET /health`: configuration presence only, no recipient data.
- Authenticated `POST /check`: always a dry run, even if force/date parameters are
  supplied. It returns summary counts, never recipient names or phone numbers.
- Cron invocations are visible in Worker Observability. Summary logs include date,
  time, accepted-send count, per-job failures and skip reasons. A successful API response
  confirms provider submission, not final delivery; consult Solapi for delivery.
- Cron configuration propagation can take up to 15 minutes per Cloudflare docs.

## Rollback

Remove the Worker Cron Trigger first, then restore the four GitHub notification
schedules and their enabled conditions from Git history. Keep only one automatic
scheduler active for each job.
