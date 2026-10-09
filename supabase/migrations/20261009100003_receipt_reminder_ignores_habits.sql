-- 20261009100003 · A tapped habit day does not count as logging receipts
--
-- The daily receipts reminder stays quiet on a day the person created a
-- receipt (20260912100001). Tapping a day on a spending habit files a receipt
-- too, but one tap is not "I have logged today's receipts": the coffee is in,
-- the shopping may not be. So receipts with source 'habit' no longer silence
-- it; every other receipt still does.
--
-- Same function, same columns, same wording; only the skip changes. Needs
-- 20261009100001 committed first: the body names the enum value 'habit', and
-- a SQL function's body is checked when it is created.

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
         and r.source <> 'habit'
         and (r.created_at at time zone ctx.zone)::date = ctx.local_date
    );
$$;

-- Replacing keeps the privileges; restated so this file holds on its own.
revoke all on function public.receipt_reminders_due() from public, anon, authenticated;
