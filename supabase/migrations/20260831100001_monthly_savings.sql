-- 0001 · What was left over, month by month
--
-- The home screen already shows "Left this month" — income for a month minus
-- the bills due in it. That figure is a forecast and it is answering "can I
-- afford this", which is a different question from "what did I actually keep".
--
-- This is the second question. When a month is over, what it really cost is
-- known: every bill and subscription that went out is a row in `charges`, and
-- every purchase is a row in `receipts`. Income minus that is what the month
-- left behind, and it stops being a projection the day the month ends.
--
-- Stored rather than derived, which is the opposite of the choice made for
-- group balances — and for a reason. A balance is a fact about now and must
-- never drift from its ledger. This is a fact about a month that has finished,
-- and the salary schedule it was computed against is editable: derive it live
-- and a raise today would quietly rewrite what somebody saved last March. So
-- the figures are captured when the month closes and left alone.
--
-- Closing is idempotent, so a month can be recomputed if a charge lands late,
-- and nothing is closed until it is genuinely over.

create table if not exists public.monthly_savings (
  user_id   uuid not null references auth.users (id) on delete cascade,

  -- Always the first of the month. The month is the identity of the row.
  month     date not null,

  -- Captured at close, not read back from the schedule afterwards.
  income    numeric(14,2) not null default 0,
  spent     numeric(14,2) not null default 0,

  -- income − spent. Allowed to be negative: a month somebody overspent is a
  -- fact, and rounding it up to zero would make the running total a lie.
  saved     numeric(14,2) not null default 0,

  closed_at timestamptz not null default now(),

  primary key (user_id, month),
  constraint monthly_savings_first_of_month check (month = date_trunc('month', month)::date)
);

alter table public.monthly_savings enable row level security;

drop policy if exists "monthly_savings_select_own" on public.monthly_savings;
create policy "monthly_savings_select_own" on public.monthly_savings
  for select using (auth.uid() = user_id);

-- No insert or update policy. Rows are written only by the closing function,
-- which computes them — a writable table here would let the figures be edited
-- away from what actually happened.

-- --------------------------------------------------------------------------

/*
 * Close one month for one person.
 *
 * Refuses to close a month that has not finished. A month in progress has
 * charges still to come, and writing it down early would record a saving that
 * the rest of the month then spends.
 */
create or replace function public.close_savings_month(p_user uuid, p_month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start  date := date_trunc('month', p_month)::date;
  v_end    date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_income numeric(14,2);
  v_spent  numeric(14,2);
begin
  if v_start >= date_trunc('month', current_date)::date then
    return;
  end if;

  -- The salary schedule normalised to a month, the same arithmetic the
  -- dashboard uses, so the two figures cannot disagree about what a month earns.
  select round(coalesce(sum(public.monthly_from_salary(amount, frequency)), 0), 2)
    into v_income
    from public.salary_sources
   where user_id = p_user;

  -- Both halves of what actually went out. Charges are the bills and
  -- subscriptions that landed; receipts are everything bought on top of them.
  select round(
           coalesce((select sum(c.amount) from public.charges c
                      where c.user_id = p_user
                        and c.charged_on >= v_start and c.charged_on < v_end), 0)
         + coalesce((select sum(r.amount) from public.receipts r
                      where r.user_id = p_user
                        and r.purchased_on >= v_start and r.purchased_on < v_end), 0)
         , 2)
    into v_spent;

  insert into public.monthly_savings (user_id, month, income, spent, saved, closed_at)
  values (p_user, v_start, v_income, v_spent, round(v_income - v_spent, 2), now())
  on conflict (user_id, month) do update
    set income    = excluded.income,
        spent     = excluded.spent,
        saved     = excluded.saved,
        closed_at = now();
end;
$$;

-- --------------------------------------------------------------------------

/*
 * Close every month this person has finished and not had closed.
 *
 * Starts from the earliest month they have any record in rather than from
 * their signup, so somebody who imported history gets it counted — and stops
 * at two years, because a savings page is read, not audited, and a hundred
 * rows would bury the months anybody cares about.
 */
create or replace function public.close_savings_for(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first  date;
  v_cursor date;
  v_closed integer := 0;
begin
  select least(
           coalesce((select min(charged_on)   from public.charges  where user_id = p_user), current_date),
           coalesce((select min(purchased_on) from public.receipts where user_id = p_user), current_date)
         )
    into v_first;

  v_cursor := greatest(
    date_trunc('month', v_first)::date,
    (date_trunc('month', current_date) - interval '24 months')::date
  );

  while v_cursor < date_trunc('month', current_date)::date loop
    perform public.close_savings_month(p_user, v_cursor);
    v_closed := v_closed + 1;
    v_cursor := (v_cursor + interval '1 month')::date;
  end loop;

  return v_closed;
end;
$$;

/*
 * The app's own way in.
 *
 * Opening the savings page closes anything outstanding, so a month that ended
 * while the phone was shut appears the moment somebody looks — rather than
 * whenever the job next runs.
 */
create or replace function public.close_my_savings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  return public.close_savings_for(auth.uid());
end;
$$;

/* Everyone, for the job. */
create or replace function public.close_savings_all()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid;
  v_total integer := 0;
begin
  for v_user in select id from public.profiles loop
    v_total := v_total + public.close_savings_for(v_user);
  end loop;
  return v_total;
end;
$$;

revoke all on function public.close_savings_month(uuid, date) from public, anon, authenticated;
revoke all on function public.close_savings_for(uuid)         from public, anon, authenticated;
revoke all on function public.close_savings_all()             from public, anon, authenticated;
revoke all on function public.close_my_savings()              from public, anon;
grant execute on function public.close_my_savings() to authenticated;

-- On the first of the month, once the month it is closing is actually over.
select cron.unschedule('skip-close-savings')
where exists (select 1 from cron.job where jobname = 'skip-close-savings');

select cron.schedule('skip-close-savings', '0 2 1 * *', $$ select public.close_savings_all(); $$);
