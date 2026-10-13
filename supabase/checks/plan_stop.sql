-- Checks that "Keep past" stops a plan on the server: what the scheduler records, rolls and reminds
-- about for a bill or loan stopped by stopBillValues (src/lib/plan-stop.ts, both shapes) and for a
-- subscription set inactive. No migration of its own: it reads record_due_charges,
-- roll_schedules_forward and reminders_due as they are. LOCAL database only, from 20261012100001
-- on: everything runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/plan_stop.sql
--
-- The scheduler works on the real clock, so dates are set from today (T) in UTC. send-push
-- announces only what record_due_charges inserts and what reminders_due returns, so these two
-- decide every push. Ends with ALL CHECKS PASSED; a failed check stops with FAILED.

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d7', 'plan-stop@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000d7')
on conflict (id) do nothing;
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000d7';
insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000c00d7', '00000000-0000-0000-0000-0000000000d7', 'Mine');

create or replace function pg_temp.check(p_ok boolean, p_what text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAILED: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

create or replace function pg_temp.today() returns date
language sql stable as $$ select (now() at time zone 'UTC')::date $$;

-- stopBillValues, as the app writes it: an end already come stays; a bill that counts from after
-- today stops with no next date; otherwise it ends today and keeps its next date.
create or replace function pg_temp.stop(p_name text) returns void
language sql as $$
  update public.bills b set
    starts_on   = case when b.ends_on <= pg_temp.today() then b.starts_on
                       when b.starts_on > pg_temp.today() then pg_temp.today()
                       else b.starts_on end,
    next_due_on = case when b.ends_on <= pg_temp.today() then b.next_due_on
                       when b.starts_on > pg_temp.today() then null
                       else b.next_due_on end,
    ends_on     = case when b.ends_on <= pg_temp.today() then b.ends_on
                       else pg_temp.today() end
  where b.name = p_name and b.user_id = '00000000-0000-0000-0000-0000000000d7'
$$;

create or replace function pg_temp.bill(p_name text) returns public.bills
language sql as $$
  select * from public.bills where name = p_name and user_id = '00000000-0000-0000-0000-0000000000d7'
$$;

create or replace function pg_temp.add_bill(p_name text, p_starts date, p_next date, p_ends date default null)
returns void
language sql as $$
  insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, ends_on, card_id)
  values ('00000000-0000-0000-0000-0000000000d7', p_name, 100, 'housing', 'monthly', p_next, p_starts,
          p_ends, '00000000-0000-0000-0000-0000000c00d7')
$$;

create or replace function pg_temp.add_subscription(p_name text, p_started date, p_next date, p_active boolean)
returns void
language sql as $$
  insert into public.subscriptions (user_id, name, amount, cycle, next_renewal_on, started_on, card_id, active)
  values ('00000000-0000-0000-0000-0000000000d7', p_name, 9.99, 'monthly', p_next, p_started,
          '00000000-0000-0000-0000-0000000c00d7', p_active)
$$;

-- ---------------------------------------------------------------- the plans
-- Bills ending today keep a payment due today; one due in 3 days, or one stopped 20 days ago with
-- a payment since, has nothing more. Each stopped plan has a running twin with the same dates.
select pg_temp.add_bill('Due today, stopped', pg_temp.today() - 10, pg_temp.today());
select pg_temp.add_bill('Due today, running', pg_temp.today() - 10, pg_temp.today());
select pg_temp.add_bill('Due in 3 days, stopped', pg_temp.today() - 10, pg_temp.today() + 3);
select pg_temp.add_bill('Due in 3 days, running', pg_temp.today() - 10, pg_temp.today() + 3);
select pg_temp.add_bill('Ended 20 days ago, stopped', pg_temp.today() - 30, pg_temp.today() - 5, pg_temp.today() - 20);
select pg_temp.add_bill('Due 5 days ago, running', pg_temp.today() - 30, pg_temp.today() - 5);
-- Counting from after today (an edit moved its start past the cycle already charged): it stops
-- with no next date. Running, its next date is the first one on or after its start, never the
-- day picked before it (20261013600005).
select pg_temp.add_bill('Counts from later, stopped', pg_temp.today() + 20, pg_temp.today() + 3);
select pg_temp.add_bill('Counts from later, running', pg_temp.today() + 20, pg_temp.today() + 3);
select pg_temp.check(
  (pg_temp.bill('Counts from later, running')).next_due_on
  = (select min(d) from public.plan_occurrences(pg_temp.today() + 3, 'monthly', pg_temp.today() + 20,
                                                 pg_temp.today() + 400, extract(day from pg_temp.today() + 3)::integer) d),
  'set up: a running bill counting from after today is next due on its first date from then on');

-- Loans as saved: one paying since 20 days ago, one added before its first payment.
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d7","role":"authenticated"}', true);
select public.save_loan(
  p_name => n, p_icon_id => 'loan-car', p_principal => 9000, p_annual_rate => 6, p_term_months => 24,
  p_monthly_payment => 400, p_total_interest => 600, p_first_payment_on => pg_temp.today() - 20,
  p_recurrence => 'monthly', p_card_id => '00000000-0000-0000-0000-0000000c00d7',
  p_bank_account_id => null, p_funded_on => null, p_day_count_basis => 'actual/365',
  p_counts_from => pg_temp.today() - 25)
  from (values ('Loan paying, stopped'), ('Loan paying, running')) v(n);
select public.save_loan(
  p_name => n, p_icon_id => 'loan-car', p_principal => 9000, p_annual_rate => 6, p_term_months => 24,
  p_monthly_payment => 400, p_total_interest => 600, p_first_payment_on => pg_temp.today() + 15,
  p_recurrence => 'monthly', p_card_id => '00000000-0000-0000-0000-0000000c00d7',
  p_bank_account_id => null, p_funded_on => null, p_day_count_basis => 'actual/365')
  from (values ('Loan not started, stopped'), ('Loan not started, running')) v(n);
reset role;
select set_config('request.jwt.claims', '', true);

select pg_temp.add_subscription('Renews in 3 days, cancelled', pg_temp.today() - 10, pg_temp.today() + 3, false);
select pg_temp.add_subscription('Renews in 3 days, active', pg_temp.today() - 10, pg_temp.today() + 3, true);
select pg_temp.add_subscription('Renewed 5 days ago, cancelled', pg_temp.today() - 30, pg_temp.today() - 5, false);
select pg_temp.add_subscription('Renewed 5 days ago, active', pg_temp.today() - 30, pg_temp.today() - 5, true);

select pg_temp.stop(name) from public.bills
 where user_id = '00000000-0000-0000-0000-0000000000d7' and name like '%stopped';

select pg_temp.check(
  (select ends_on = pg_temp.today() and next_due_on = pg_temp.today() from public.bills
    where name = 'Due today, stopped')
  and (select starts_on = pg_temp.today() and ends_on = pg_temp.today() and next_due_on is null
         from public.bills where name = 'Counts from later, stopped')
  and (select starts_on = pg_temp.today() and ends_on = pg_temp.today() and next_due_on is null
         from public.bills where name = 'Loan not started, stopped')
  and (select ends_on = pg_temp.today() - 20 from public.bills where name = 'Ended 20 days ago, stopped')
  and (select ends_on = pg_temp.today() and next_due_on is not null from public.bills
        where name = 'Loan paying, stopped'),
  'set up: each stop wrote the values stopBillValues gives, and the database took them');

insert into public.reminders (user_id, bill_id, lead_days, remind_at)
select user_id, id, 0, '00:00' from public.bills where user_id = '00000000-0000-0000-0000-0000000000d7';
insert into public.reminders (user_id, subscription_id, lead_days, remind_at)
select user_id, id, 0, '00:00' from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000d7';

-- ---------------------------------------------------------------- what is recorded
create temp table recorded as
  select r.label, r.charged_on - pg_temp.today() as day
  from public.record_due_charges() r where r.user_id = '00000000-0000-0000-0000-0000000000d7';

select pg_temp.check(
  (select array_agg(label || ' @' || day order by label) from recorded)
  = array['Due 5 days ago, running @-5', 'Due today, running @0', 'Due today, stopped @0',
          'Loan paying, running @-20', 'Loan paying, stopped @-20',
          'Renewed 5 days ago, active @-5'],
  'recorded: a payment due on the stop day, and payments made before the stop; nothing after, nothing for a cancelled subscription');

-- ---------------------------------------------------------------- what is rolled on
select public.roll_schedules_forward();
select pg_temp.check(
  (select next_due_on is null from public.bills where name = 'Counts from later, stopped')
  and (select next_due_on is null from public.bills where name = 'Loan not started, stopped')
  and (select next_renewal_on = pg_temp.today() - 5 from public.subscriptions
        where name = 'Renewed 5 days ago, cancelled')
  and (select next_renewal_on > pg_temp.today() from public.subscriptions
        where name = 'Renewed 5 days ago, active'),
  'a bill with no next date and a cancelled subscription are not rolled on');
select pg_temp.check(
  (select bool_and(next_due_on > ends_on) from public.bills
    where user_id = '00000000-0000-0000-0000-0000000000d7' and name like '%stopped' and next_due_on is not null
      and next_due_on > pg_temp.today()),
  'a stopped bill rolled on lands past its end, which nothing reads as due');

-- ---------------------------------------------------------------- what is reminded
-- Each reminder brought forward to fire today if its plan has a date coming up within 30 days.
update public.reminders r set lead_days = least(30, greatest(0, d.due - pg_temp.today()))
  from (
    select b.id as bill_id, null::uuid as subscription_id, b.next_due_on as due from public.bills b
     where b.user_id = '00000000-0000-0000-0000-0000000000d7' and b.next_due_on is not null
    union all
    select null, s.id, s.next_renewal_on from public.subscriptions s
     where s.user_id = '00000000-0000-0000-0000-0000000000d7' and s.next_renewal_on is not null
  ) d
 where r.user_id = '00000000-0000-0000-0000-0000000000d7'
   and (r.bill_id = d.bill_id or r.subscription_id = d.subscription_id)
   and d.due >= pg_temp.today();

create temp table reminded as
  select r.title from public.reminders_due() r where r.user_id = '00000000-0000-0000-0000-0000000000d7';

select pg_temp.check(
  (select array_agg(title order by title) from reminded)
  = array['Due 5 days ago, running', 'Due in 3 days, running',
          'Due today, running', 'Due today, stopped', 'Loan not started, running',
          'Loan paying, running', 'Renewed 5 days ago, active', 'Renews in 3 days, active'],
  'reminded: every running plan due within the month, and a stopped bill only for the payment due on its stop day');
select pg_temp.check(
  not exists (select 1 from reminded where title in (
    'Due in 3 days, stopped', 'Ended 20 days ago, stopped', 'Counts from later, stopped',
    'Loan paying, stopped', 'Loan not started, stopped',
    'Renews in 3 days, cancelled', 'Renewed 5 days ago, cancelled')),
  'no reminder for a stopped bill or loan, either shape, or a cancelled subscription');

rollback;
\echo ALL CHECKS PASSED
