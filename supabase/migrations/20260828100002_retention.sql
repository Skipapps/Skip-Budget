-- 0017 · Seven-year retention
--
-- Transaction history is kept for seven years and then let go a day at a time.
-- Run daily, each pass removes only the single day that has just crossed the
-- boundary, so the table never faces one enormous delete and the cost stays
-- flat forever.
--
-- Only things that HAPPENED are pruned. Bills and subscriptions are plans, not
-- events: a standing order set up eight years ago is still running today, and
-- deleting it because it is old would stop the app dead. Cards, accounts and
-- salary sources are the same — they describe the present.

create or replace function public.prune_expired_data(p_years integer default 7)
returns table (table_name text, removed bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff date := current_date - make_interval(years => p_years);
  n bigint;
begin
  delete from public.charges where charged_on < cutoff;
  get diagnostics n = row_count;
  table_name := 'charges'; removed := n; return next;

  delete from public.receipts where purchased_on < cutoff;
  get diagnostics n = row_count;
  table_name := 'receipts'; removed := n; return next;

  delete from public.payments where paid_on < cutoff;
  get diagnostics n = row_count;
  table_name := 'payments'; removed := n; return next;
end;
$$;

comment on function public.prune_expired_data(integer) is
  'Deletes transaction rows older than p_years. Returns what it removed, so a '
  'dry run is: select * from prune_expired_data(999) — a period nothing can '
  'be older than, which reports zeroes without touching anything.';

-- Nobody but the scheduler should be able to call this.
revoke all on function public.prune_expired_data(integer) from public, anon, authenticated;

-- Scheduling is left switched off on purpose.
--
-- This function deletes permanently and cannot be undone, so it should be
-- armed deliberately rather than by whoever happens to run a migration. When
-- you want it on, enable pg_cron under Database → Extensions, then:
--
--   select cron.schedule(
--     'prune-expired-data',
--     '30 3 * * *',                      -- 03:30 daily, off-peak
--     $$select public.prune_expired_data()$$
--   );
--
-- To check what it would do first:   select * from public.prune_expired_data(999);
-- To see the schedule:               select * from cron.job;
-- To turn it off again:              select cron.unschedule('prune-expired-data');
