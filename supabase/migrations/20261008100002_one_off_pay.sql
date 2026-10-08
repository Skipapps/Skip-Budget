-- 20261008100002 · What a pay paid once means to the money figures
--
-- A 'once' pay (20261008100001) is worth nothing a month as a schedule: it counts in full in the
-- month it lands, and never again. It has no next payday, so no payday reminder. And it is a record
-- of money in, not a second income, so the free plan's one-income limit counts schedules only.

-- ----------------------------------------------------------------------------
-- 1. As a schedule, a one-off pay adds nothing to a month.
-- ----------------------------------------------------------------------------
create or replace function public.monthly_from_salary(
  p_amount    numeric,
  p_frequency public.pay_frequency
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case p_frequency
    when 'weekly'      then p_amount * 52.0 / 12.0
    when 'biweekly'    then p_amount * 26.0 / 12.0
    when 'semimonthly' then p_amount * 2.0
    when 'monthly'     then p_amount
    -- Counted in the month it was paid instead: public.income_for_month.
    when 'once'        then 0
  end;
$$;

-- ----------------------------------------------------------------------------
-- 2. A month's income: every schedule normalised to a month, plus the one-off pays that landed in it.
--    The year's pay is summed first and divided once: dividing each schedule separately leaves the
--    total a hair under an exact half cent, and the month would round down where the app rounds up.
-- ----------------------------------------------------------------------------
create or replace function public.income_for_month(p_user uuid, p_month date)
returns numeric
language sql
stable
set search_path = ''
as $$
  select round(
           coalesce((select sum(s.amount * case s.frequency
                                              when 'weekly'      then 52
                                              when 'biweekly'    then 26
                                              when 'semimonthly' then 24
                                              when 'monthly'     then 12
                                              else 0
                                            end)
                       from public.salary_sources s
                      where s.user_id = p_user), 0) / 12.0
         + coalesce((select sum(s.amount)
                       from public.salary_sources s
                      where s.user_id = p_user
                        and s.frequency = 'once'
                        and s.last_payday >= date_trunc('month', p_month)::date
                        and s.last_payday < (date_trunc('month', p_month) + interval '1 month')::date), 0)
         , 2);
$$;

-- It takes any user id: only the server's own functions may ask.
revoke all on function public.income_for_month(uuid, date) from public, anon, authenticated;

-- The standing monthly income, summed the same way.
create or replace view public.v_monthly_income as
  select user_id,
         round(coalesce(sum(amount * case frequency
                                       when 'weekly'      then 52
                                       when 'biweekly'    then 26
                                       when 'semimonthly' then 24
                                       when 'monthly'     then 12
                                       else 0
                                     end), 0) / 12.0, 2) as monthly_income
    from public.salary_sources
   group by user_id;

-- ----------------------------------------------------------------------------
-- 3. The savings record counts each month's own one-off pays.
-- ----------------------------------------------------------------------------
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

  -- The same arithmetic the dashboard uses, so the two figures cannot disagree about what a month
  -- earns; one-off pays count in the month they landed.
  v_income := public.income_for_month(p_user, v_start);

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

create or replace function public.close_savings_for(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first  date;
  v_born   date;
  v_count  integer;
begin
  select least(
           coalesce((select min(charged_on)   from public.charges  where user_id = p_user), current_date),
           coalesce((select min(purchased_on) from public.receipts where user_id = p_user), current_date)
         )
    into v_first;

  select date_trunc('month', coalesce(created_at, now()))::date
    into v_born
    from public.profiles
   where id = p_user;

  with months as (
    select generate_series(
             greatest(
               date_trunc('month', v_first),
               coalesce(v_born, date_trunc('month', current_date)::date),
               date_trunc('month', current_date) - interval '24 months'
             ),
             date_trunc('month', current_date) - interval '1 month',
             interval '1 month'
           )::date as month
  ),
  spend as (
    select date_trunc('month', charged_on)::date as month, sum(amount) as amount
      from public.charges where user_id = p_user
     group by 1
    union all
    select date_trunc('month', purchased_on)::date, sum(amount)
      from public.receipts where user_id = p_user
     group by 1
  ),
  totals as (
    select m.month,
           round(coalesce(sum(s.amount), 0), 2) as spent,
           public.income_for_month(p_user, m.month) as income
      from months m
      left join spend s on s.month = m.month
     group by m.month
  )
  insert into public.monthly_savings (user_id, month, income, spent, saved, closed_at)
  select p_user, t.month, t.income, t.spent, round(t.income - t.spent, 2), now()
    from totals t
  on conflict (user_id, month) do update
    set income    = excluded.income,
        spent     = excluded.spent,
        saved     = excluded.saved,
        closed_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. A one-off pay has no next payday: due only while its own day is still ahead.
-- ----------------------------------------------------------------------------
create or replace function public.next_payday(p_last date, p_frequency public.pay_frequency, p_from date)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  d date := p_last;
  guard integer := 0;
begin
  if p_last is null then return null; end if;

  if p_frequency = 'once' then
    return case when p_last >= p_from then p_last end;
  end if;

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

-- ----------------------------------------------------------------------------
-- 5. Free keeps one income schedule; one-off pays are never counted against it.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_income_allowance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.frequency = 'once' or public.is_pro(new.user_id) then
    return new;
  end if;

  -- Already a schedule: changing how often is an edit, never a new income.
  if tg_op = 'UPDATE' and old.frequency <> 'once' then
    return new;
  end if;

  if exists (
    select 1 from public.salary_sources
     where user_id = new.user_id
       and frequency <> 'once'
       and id <> new.id
  ) then
    raise exception 'Free keeps one — Skip Pro removes the limit.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_income_allowance() from public, anon, authenticated;

drop trigger if exists salary_sources_free_allowance on public.salary_sources;
create trigger salary_sources_free_allowance
  before insert or update of frequency on public.salary_sources
  for each row execute function public.enforce_income_allowance();
