-- 0027 · Working out which reminders are due right now
--
-- Each of the four kinds is answered by a different date, and two of them have
-- to be walked rather than read:
--
--   bill          bills.next_due_on              stored
--   subscription  subscriptions.next_renewal_on  stored
--   card          cards.bill_due_day             a day of the month, so the
--                                                next one is found and clamped
--   account       the next payday landing in it, which means walking a pay
--                 cycle forward from the last one recorded
--
-- Everything is decided in the user's own zone. remind_at is a bare local time
-- on purpose — "half past five" means half past five where they are — so the
-- comparison happens after now() has been converted, never before.

-- "today" / "tomorrow" / "in 3 days", so a notice reads like a sentence.
create or replace function public.when_words(p_days integer)
returns text
language sql
immutable
as $$
  select case
    when p_days <= 0 then 'today'
    when p_days = 1  then 'tomorrow'
    else 'in ' || p_days || ' days'
  end;
$$;

-- The next time a day of the month comes round, clamped to short months so a
-- payment due on the 31st falls on the 30th rather than skidding into the
-- month after.
create or replace function public.next_month_day(p_day integer, p_from date)
returns date
language plpgsql
immutable
as $$
declare
  start date;
  last_day integer;
begin
  -- A card with no payment day set has no next one; say so rather than
  -- inventing a date from a null.
  if p_day is null then return null; end if;

  start := case
    when p_day >= extract(day from p_from)::int then date_trunc('month', p_from)
    else date_trunc('month', p_from) + interval '1 month'
  end;

  last_day := extract(day from (start + interval '1 month - 1 day'))::int;
  return (start + make_interval(days => least(p_day, last_day) - 1))::date;
end;
$$;

-- The first payday on or after a date, walking the cycle forward from the last
-- one recorded. Bounded: a last_payday left years behind must not spin here.
create or replace function public.next_payday(
  p_last date,
  p_frequency public.pay_frequency,
  p_from date
)
returns date
language plpgsql
immutable
as $$
declare
  d date := p_last;
  guard integer := 0;
begin
  if p_last is null then return null; end if;

  while d < p_from and guard < 800 loop
    guard := guard + 1;
    d := case p_frequency
      when 'weekly'   then d + 7
      when 'biweekly' then d + 14
      -- Keeps the original day of the month, clamped to the next month's length.
      when 'monthly'  then (
        date_trunc('month', d) + interval '1 month'
        + make_interval(days => least(
            extract(day from p_last)::int,
            extract(day from (date_trunc('month', d) + interval '2 month - 1 day'))::int
          ) - 1)
      )::date
      -- Paid on the 15th and the last day of the month.
      when 'semimonthly' then case
        when extract(day from d)::int < 15
          then (date_trunc('month', d) + interval '14 days')::date
        when d < (date_trunc('month', d) + interval '1 month - 1 day')::date
          then (date_trunc('month', d) + interval '1 month - 1 day')::date
        else (date_trunc('month', d) + interval '1 month 14 days')::date
      end
    end;
  end loop;

  return d;
end;
$$;

/**
 * Every reminder that should go out now, with the words to send.
 *
 * "Now" is per user: one instant is a different wall clock in every zone, and
 * remind_at is written in theirs.
 *
 * Due means the time has passed today and nothing has been sent today — not
 * that the time falls inside the last few minutes. The difference shows when
 * the job misses a run: late is a reminder, never is a bug.
 */
create or replace function public.reminders_due()
returns table (
  reminder_id uuid,
  user_id     uuid,
  local_date  date,
  title       text,
  body        text
)
language sql
security definer
set search_path = public
as $$
  with ctx as (
    select
      r.id as reminder_id,
      r.user_id,
      r.lead_days,
      r.remind_at,
      r.last_sent_on,
      (now() at time zone coalesce(p.timezone, 'UTC'))::date as local_date,
      (now() at time zone coalesce(p.timezone, 'UTC'))::time as local_time,
      coalesce(b.name, s.name, c.holder, a.nickname, a.bank_name, 'Skip') as label,
      coalesce(b.amount, s.amount) as amount,
      case
        when r.bill_id is not null         then b.next_due_on
        when r.subscription_id is not null then s.next_renewal_on
        when r.card_id is not null         then public.next_month_day(
          c.bill_due_day, (now() at time zone coalesce(p.timezone, 'UTC'))::date)
        else (
          select min(public.next_payday(
            sal.last_payday, sal.frequency,
            (now() at time zone coalesce(p.timezone, 'UTC'))::date))
          from public.salary_source_accounts ssa
          join public.salary_sources sal on sal.id = ssa.salary_source_id
          where ssa.bank_account_id = r.bank_account_id
        )
      end as due_on,
      case
        when r.bill_id is not null         then 'bill'
        when r.subscription_id is not null then 'subscription'
        when r.card_id is not null         then 'card'
        else 'account'
      end as kind
    from public.reminders r
    join public.profiles p on p.id = r.user_id
    left join public.bills b         on b.id = r.bill_id
    left join public.subscriptions s on s.id = r.subscription_id and s.active
    left join public.cards c         on c.id = r.card_id
    left join public.bank_accounts a on a.id = r.bank_account_id
    where r.enabled
  )
  select
    ctx.reminder_id,
    ctx.user_id,
    ctx.local_date,
    case when ctx.kind = 'account' then 'Payday' else ctx.label end as title,
    case ctx.kind
      when 'account' then 'Your pay lands ' || public.when_words(ctx.due_on - ctx.local_date)
      when 'card'    then 'Payment due ' || public.when_words(ctx.due_on - ctx.local_date)
      when 'subscription' then 'Renews ' || public.when_words(ctx.due_on - ctx.local_date)
        || coalesce(' · $' || to_char(ctx.amount, 'FM999,999,990.00'), '')
      else 'Due ' || public.when_words(ctx.due_on - ctx.local_date)
        || coalesce(' · $' || to_char(ctx.amount, 'FM999,999,990.00'), '')
    end as body
  from ctx
  where ctx.due_on is not null
    -- The day it fires is the due date brought forward by the lead.
    and ctx.due_on - ctx.lead_days = ctx.local_date
    and ctx.remind_at <= ctx.local_time
    and (ctx.last_sent_on is null or ctx.last_sent_on <> ctx.local_date);
$$;

-- Only the scheduler runs these.
revoke all on function public.reminders_due() from public, anon, authenticated;
revoke all on function public.when_words(integer) from public, anon, authenticated;
revoke all on function public.next_month_day(integer, date) from public, anon, authenticated;
revoke all on function public.next_payday(date, public.pay_frequency, date) from public, anon, authenticated;
