-- 0006 · Savings begin when the account does
--
-- Closing started from the earliest month with any recorded charge or receipt,
-- on the theory that imported history deserved counting. In practice it
-- manufactured money: a single receipt backdated to March grew a run of
-- "closed" months before the account existed, each crediting today's salary
-- schedule to a month Skip never saw. A savings page that invents a past is
-- not a record, and the figure it feeds sits at the top of Insights.
--
-- A month now has to clear three bars to close: it is over, it is not before
-- the account was created, and it is not before the first thing the account
-- ever recorded. The creation month itself qualifies — it closes when it ends,
-- like any other. Months already fabricated are deleted outright, corrections
-- and all: a correction to a month that never happened is as fictional as the
-- month.

create or replace function public.close_savings_for(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_income numeric(14,2);
  v_first  date;
  v_born   date;
  v_count  integer;
begin
  select round(coalesce(sum(public.monthly_from_salary(amount, frequency)), 0), 2)
    into v_income
    from public.salary_sources
   where user_id = p_user;

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
    select m.month, round(coalesce(sum(s.amount), 0), 2) as spent
      from months m
      left join spend s on s.month = m.month
     group by m.month
  )
  insert into public.monthly_savings (user_id, month, income, spent, saved, closed_at)
  select p_user, t.month, v_income, t.spent, round(v_income - t.spent, 2), now()
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

-- The months already invented, gone. Recorded spending is untouched — only
-- the monthly summaries that predate the account itself.
delete from public.monthly_savings ms
 where ms.month < (
   select date_trunc('month', p.created_at)::date
     from public.profiles p
    where p.id = ms.user_id
 );
