-- 0001 · A daily nudge to log receipts
--
-- The four existing reminder kinds all point at a row: a bill, a subscription,
-- a card, an account. reminders_one_target is
-- num_nonnulls(bill_id, subscription_id, card_id, bank_account_id) = 1, and the
-- upsert in src/api/reminders.ts resolves against all four columns — that
-- constraint is what makes "one reminder per thing" true, and it is not being
-- relaxed. A receipts reminder points at nothing: it is about the habit, not
-- about a row, and there is exactly one per account.
--
-- So it lives on the profile. The row already exists for every account, the
-- scheduler already joins profiles for the timezone, and the RLS there is
-- already right — a separate table would need its own policies to hold one row
-- per user.
--
-- The time is `time` with no zone, for the same reason reminders.remind_at is:
-- eight in the evening means eight in the evening wherever they are. The
-- default is stored rather than applied in JS so the server and the app cannot
-- disagree about what "the default" is. Enabled defaults to false — nobody who
-- has not asked gets messaged.

alter table public.profiles
  add column if not exists receipt_reminder_enabled      boolean not null default false,
  add column if not exists receipt_reminder_at           time    not null default '20:00',
  add column if not exists receipt_reminder_last_sent_on date;

comment on column public.profiles.receipt_reminder_enabled is
  'Whether this account has asked for the daily receipts reminder. Off until '
  'somebody turns it on.';

comment on column public.profiles.receipt_reminder_at is
  'Local wall-clock time the reminder should land, e.g. 20:00. No zone: it is '
  'read against profiles.timezone the same way reminders.remind_at is.';

comment on column public.profiles.receipt_reminder_last_sent_on is
  'Local date this reminder was last delivered. Stamped by the sender only '
  'after a successful push, so a day nobody could be reached stays due.';

/**
 * Every account whose daily receipts reminder should go out now.
 *
 * Mirrors reminders_due() exactly, including its "late is a reminder, never is
 * a bug" semantics: due means the time has passed today in the user's own zone
 * and nothing has been sent today — not that the time falls inside the last
 * few minutes. The difference shows when the job misses a run.
 *
 * The skip is the Founder's decision: a day on which a receipt was *created*
 * stays quiet. Created, not dated — receipts are often entered for a past day,
 * and "I have logged something today" is the question this reminder actually
 * asks. Asking somebody who logged three receipts an hour ago whether they
 * have any receipts is how a notification teaches people to ignore it.
 *
 * local_date is returned rather than computed by the caller, so the stamp the
 * sender writes into receipt_reminder_last_sent_on is the same date this
 * function tested against — the sender has no zone of its own to get wrong.
 */
create or replace function public.receipt_reminders_due()
returns table (
  user_id    uuid,
  local_date date,
  title      text,
  body       text
)
language sql
security definer
set search_path = public
as $$
  with ctx as (
    select
      p.id as user_id,
      p.receipt_reminder_at as remind_at,
      p.receipt_reminder_last_sent_on as last_sent_on,
      (now() at time zone coalesce(p.timezone, 'UTC'))::date as local_date,
      (now() at time zone coalesce(p.timezone, 'UTC'))::time as local_time,
      coalesce(p.timezone, 'UTC') as zone
    from public.profiles p
    where p.receipt_reminder_enabled
  )
  select
    ctx.user_id,
    ctx.local_date,
    'Receipts'::text as title,
    'Add today''s receipts while they are still in your pocket.'::text as body
  from ctx
  where ctx.remind_at <= ctx.local_time
    and (ctx.last_sent_on is null or ctx.last_sent_on <> ctx.local_date)
    and not exists (
      select 1
        from public.receipts r
       where r.user_id = ctx.user_id
         and (r.created_at at time zone ctx.zone)::date = ctx.local_date
    );
$$;

-- Only the scheduler runs this. Definer functions are executable by PUBLIC
-- unless revoked, and this one reads every profile on the instance.
revoke all on function public.receipt_reminders_due() from public, anon, authenticated;
