-- Month-end drift: what the walks that clamped from the last date left behind. Read only: four
-- selects in a read-only transaction that is rolled back. They need nothing from
-- 20261013300001, so they read the same before it as after it.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres < supabase/reports/month_end_drift.sql
--
-- "Today" is each person's own day (profiles.timezone, UTC when unset), as the recorders read it.
-- A typed balance counts what lands on or after its as-of day (src/lib/money-book.ts), so a move
-- changes it only when the as-of day falls after the old date and on or before the new one.

begin transaction read only;

-- A. Monthly pay written on a drifted day. The old walk clamped each payday from the one before,
-- so a pay in month m sits on the anchor day clamped by the shortest month since the last payday.
-- Listed when it is the salary's only pay that month, on exactly that drifted day, earlier than
-- the anchor day clamped to its own month, and that day has come. These are the rows a data step
-- would move; the right day cannot collide, since nothing else is recorded that month.
with sal as (
  select id, user_id, last_payday, extract(day from last_payday)::integer as anchor
  from public.salary_sources
  where frequency = 'monthly' and last_payday is not null
),
r as (
  select p.id, p.user_id, p.salary_source_id, p.paid_on, p.amount, p.bank_account_id,
         sal.last_payday, sal.anchor,
         date_trunc('month', p.paid_on)::date as m,
         count(*) over (partition by p.salary_source_id, date_trunc('month', p.paid_on)) as in_month
  from public.pay_received p
  join sal on sal.id = p.salary_source_id
  where p.paid_on > sal.last_payday
),
c as (
  select r.*,
         r.m + least(r.anchor, extract(day from (r.m + interval '1 month - 1 day'))::integer) - 1 as right_on,
         -- No month between (a pay in the last payday's own month): nothing clamped it.
         least(r.anchor, coalesce((
           select min(extract(day from (g + interval '1 month - 1 day'))::integer)
           from generate_series((date_trunc('month', r.last_payday) + interval '1 month')::timestamp,
                                r.m::timestamp, interval '1 month') g
         ), r.anchor)) as drifted_day
  from r
)
select c.user_id, c.salary_source_id, c.id, c.paid_on, c.right_on, c.amount,
       a.balance_as_of,
       -- Null: the pay landed in no account the app knows.
       case when a.id is null then null
            else coalesce(a.balance_as_of > c.paid_on and a.balance_as_of <= c.right_on, false)
       end as moves_current_balance
from c
join public.profiles pr on pr.id = c.user_id
left join public.bank_accounts a on a.id = c.bank_account_id
where c.in_month = 1
  and extract(day from c.paid_on)::integer = c.drifted_day
  and c.paid_on < c.right_on
  and c.right_on <= (now() at time zone coalesce(pr.timezone, 'UTC'))::date
order by 1, 4;

-- B. Loan instalments charged short of the payment day. The day is loans.payment_day, or the
-- first payment's day (the bill's start standing in for a loan saved without one), as the loan's
-- own schedule reads it. Listed when the charge is after the first payment's month, the only one
-- that month, earlier than the payment day clamped to that month, and that day has come and is
-- within the loan.
with loan as (
  select b.id as bill_id, b.ends_on,
         coalesce(l.first_payment_on, b.starts_on) as first_on,
         coalesce(l.payment_day::integer,
                  extract(day from coalesce(l.first_payment_on, b.starts_on))::integer) as anchor
  from public.loans l
  join public.bills b on b.id = l.bill_id
  where b.recurrence = 'monthly'
),
ch as (
  select c.id, c.user_id, c.bill_id, c.charged_on, c.amount, c.card_id, c.bank_account_id,
         loan.anchor, loan.ends_on,
         date_trunc('month', c.charged_on)::date as m,
         count(*) over (partition by c.bill_id, date_trunc('month', c.charged_on)) as in_month
  from public.charges c
  join loan on loan.bill_id = c.bill_id
  where loan.anchor is not null
    and loan.first_on is not null
    and date_trunc('month', c.charged_on) > date_trunc('month', loan.first_on)
),
x as (
  select ch.*,
         ch.m + least(ch.anchor, extract(day from (ch.m + interval '1 month - 1 day'))::integer) - 1 as right_on
  from ch
)
select x.user_id, x.bill_id, x.id, x.charged_on, x.right_on, x.amount,
       coalesce(cd.balance_as_of, a.balance_as_of) as source_balance_as_of,
       case when cd.id is null and a.id is null then null
            else coalesce(coalesce(cd.balance_as_of, a.balance_as_of) > x.charged_on
                          and coalesce(cd.balance_as_of, a.balance_as_of) <= x.right_on, false)
       end as moves_current_balance
from x
join public.profiles pr on pr.id = x.user_id
left join public.cards cd on cd.id = x.card_id
left join public.bank_accounts a on a.id = x.bank_account_id
where x.in_month = 1
  and x.charged_on < x.right_on
  and (x.ends_on is null or x.right_on <= x.ends_on)
  and x.right_on <= (now() at time zone coalesce(pr.timezone, 'UTC'))::date
order by 1, 4;

-- C. Bills and subscriptions (not loans) stored on the 28th to 30th that were charged on a later
-- day before. Their own day is not stored anywhere, so these are for a person to decide: the
-- later day may be the drift, or a date someone chose to move.
select 'bill' as kind, b.user_id, b.id, b.name, b.recurrence::text as recurrence, b.next_due_on as stored_on,
       max(extract(day from c.charged_on))::integer as latest_day_charged,
       array_agg(c.charged_on order by c.charged_on)
         filter (where extract(day from c.charged_on) > extract(day from b.next_due_on)) as later_day_charges
from public.bills b
join public.charges c on c.bill_id = b.id
where b.recurrence in ('monthly', 'quarterly', 'yearly')
  and extract(day from b.next_due_on) in (28, 29, 30)
  and c.charged_on < b.next_due_on
  and not exists (select 1 from public.loans l where l.bill_id = b.id)
group by b.id
having max(extract(day from c.charged_on)) > extract(day from b.next_due_on)
union all
select 'subscription', s.user_id, s.id, s.name, s.cycle::text, s.next_renewal_on,
       max(extract(day from c.charged_on))::integer,
       array_agg(c.charged_on order by c.charged_on)
         filter (where extract(day from c.charged_on) > extract(day from s.next_renewal_on))
from public.subscriptions s
join public.charges c on c.subscription_id = s.id
where s.active
  and s.cycle in ('monthly', 'quarterly', 'yearly')
  and extract(day from s.next_renewal_on) in (28, 29, 30)
  and c.charged_on < s.next_renewal_on
group by s.id
having max(extract(day from c.charged_on)) > extract(day from s.next_renewal_on)
order by 2, 6;

-- D. Loan bills whose stored next date is off the loan's schedule: neither the first payment nor
-- the payment day clamped to its month. That covers a first payment already clamped (day 31
-- first paid on 28 Feb) and a date rolled short since. moved_by_migration is what 20261013300001
-- does to it: a date short of the payment day goes onto it, unless that would carry it past the
-- bill's end while it is still within it. A date past the payment day (an off-day first payment
-- later in its month than the payment day, rolled on) is left, and listed here.
with loan as (
  select b.user_id, b.id as bill_id, b.name, b.next_due_on, b.ends_on,
         l.payment_day, l.first_payment_on,
         coalesce(l.first_payment_on, b.starts_on) as first_on,
         coalesce(l.payment_day::integer,
                  extract(day from coalesce(l.first_payment_on, b.starts_on))::integer,
                  extract(day from b.next_due_on)::integer) as anchor
  from public.loans l
  join public.bills b on b.id = l.bill_id
  where b.next_due_on is not null
),
x as (
  select loan.*,
         date_trunc('month', loan.next_due_on)::date
           + least(loan.anchor,
                   extract(day from (date_trunc('month', loan.next_due_on) + interval '1 month - 1 day'))::integer)
           - 1 as right_on
  from loan
)
select x.user_id, x.bill_id, x.name, x.payment_day, x.first_payment_on, x.next_due_on, x.right_on, x.ends_on,
       coalesce(x.payment_day <> extract(day from x.first_payment_on), false) as first_payment_off_day,
       coalesce(x.next_due_on > x.first_on and x.next_due_on < x.right_on
                and (x.ends_on is null or x.right_on <= x.ends_on or x.next_due_on > x.ends_on), false)
         as moved_by_migration
from x
where x.next_due_on <> x.right_on
  and x.next_due_on is distinct from x.first_on
order by 1, 6;

rollback;
