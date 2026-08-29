-- 0024 · Clearing a notification without unspending the money
--
-- The notifications list is a view of `charges`, and charges are the seven-year
-- record of what actually went out. So "delete" on that screen cannot mean
-- delete: removing the row would take the money out of the dashboard, the
-- ledger and every total that has ever been shown, to tidy a list.
--
-- It marks the announcement as read instead. The charge stays exactly where it
-- was and still counts everywhere; only the notice about it goes away. The
-- column is named at length on purpose — a bare `dismissed_at` on this table
-- would read as the charge having been dismissed, which is the one thing it
-- must never mean.
--
-- Nothing expires these rows and nothing needs to. The screen shows a rolling
-- week, so a notification leaves on its own the day it turns eight days old,
-- and this only decides whether it leaves sooner.

alter table public.charges
  add column if not exists notification_dismissed_at timestamptz;

comment on column public.charges.notification_dismissed_at is
  'When the user cleared this from the notifications list. Hides the notice '
  'only — the charge itself is untouched and still counts in every total.';

-- Only ever read as "this user, not yet dismissed, recent", so the index
-- carries just the rows that can still appear.
create index if not exists charges_pending_notice
  on public.charges (user_id, charged_on desc)
  where notification_dismissed_at is null;
