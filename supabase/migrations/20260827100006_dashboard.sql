-- 0006 · Dashboard figures
--
-- Three numbers on the home screen:
--   Payday          — income normalised to a month
--   Expenses        — recurring outgoings normalised to a month
--   Left this month — payday minus expenses
--
-- Named "left this month", not "balance": it is cash flow, not what sits in an
-- account. Receipts and subscriptions join the expense side once those tables
-- exist; the view is written so adding them is one union, not a rewrite.

-- Recurrences arrive on different cycles, so nothing can be summed until it is
-- expressed per month. 52/12 and 26/12 rather than 4 and 2 — a "weekly" bill is
-- 4.33 payments a month, and using 4 understates the year by a full month.
create or replace function public.monthly_from_bill(
  p_amount numeric,
  p_recurrence public.bill_recurrence
)
returns numeric
language sql
immutable
as $$
  select case p_recurrence
    when 'weekly'    then p_amount * 52.0 / 12.0
    when 'monthly'   then p_amount
    when 'quarterly' then p_amount / 3.0
    when 'yearly'    then p_amount / 12.0
    when 'period'    then p_amount
  end;
$$;

create or replace function public.monthly_from_salary(
  p_amount numeric,
  p_frequency public.pay_frequency
)
returns numeric
language sql
immutable
as $$
  select case p_frequency
    when 'weekly'      then p_amount * 52.0 / 12.0
    when 'biweekly'    then p_amount * 26.0 / 12.0
    when 'semimonthly' then p_amount * 2.0
    when 'monthly'     then p_amount
  end;
$$;

create or replace view public.v_monthly_income
with (security_invoker = true) as
  select
    user_id,
    round(coalesce(sum(public.monthly_from_salary(amount, frequency)), 0), 2) as monthly_income
  from public.salary_sources
  group by user_id;

create or replace view public.v_monthly_expenses
with (security_invoker = true) as
  select
    user_id,
    round(coalesce(sum(public.monthly_from_bill(amount, recurrence)), 0), 2) as monthly_expenses
  from public.bills
  -- A fixed-period bill only counts while it is actually running.
  where (starts_on is null or starts_on <= current_date)
    and (ends_on   is null or ends_on   >= current_date)
  group by user_id;

create or replace view public.v_dashboard
with (security_invoker = true) as
  select
    p.id as user_id,
    coalesce(i.monthly_income,   0) as payday,
    coalesce(e.monthly_expenses, 0) as expenses,
    coalesce(i.monthly_income, 0) - coalesce(e.monthly_expenses, 0) as left_this_month
  from public.profiles p
  left join public.v_monthly_income   i on i.user_id = p.id
  left join public.v_monthly_expenses e on e.user_id = p.id;

grant select on public.v_monthly_income, public.v_monthly_expenses, public.v_dashboard to authenticated;
