-- Checks for 20261013300002_retention_schedule.sql. LOCAL database only, with it applied:
-- everything runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/retention_schedule.sql
--
-- The job works on each person's own real day, so every date is set from it: C is the first day
-- still kept (seven years before today) for a person in UTC. In each table the job prunes there is
-- a row dated C - 1 (goes), one dated C (stays: exactly seven years old) and a recent one (stays).
-- Rows dated before C are seeded with triggers off, as rows written before the guards existed are.
--
-- The balance rule is checked on Drew's money-book scenario (money-book-prune.test.ts), seeded as
-- rows with every date moved by the same number of days, so its cutoff (15 Nov 2026) lands on C:
-- only which side of the cutoff and of each as-of day a row falls matters, and that is kept. Then a
-- person east and one west of UTC: at any hour one of them is on another day than UTC.
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED or "expected".

\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.check(p_ok boolean, p_what text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAILED: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

create temp table day as
select current_date as today,
       (current_date - make_interval(years => 7))::date as kept_from;
-- Read again below as the person.
grant select on day to authenticated;
create or replace function pg_temp.c() returns date language sql stable as $$ select kept_from from day $$;
create or replace function pg_temp.today() returns date language sql stable as $$ select today from day $$;

-- ---------------------------------------------------------------- the schedule
select pg_temp.check(
  (select count(*) = 1 from cron.job where jobname = 'skip-prune-expired-data'),
  'there is one deletion job');
select pg_temp.check(
  (select schedule = '7 8 * * *' and btrim(command) = 'select public.prune_expired_data();'
          and active and username = 'postgres' and database = 'postgres'
     from cron.job where jobname = 'skip-prune-expired-data'),
  'it runs daily at 08:07 UTC, calling prune_expired_data() with its default of seven years');
select pg_temp.check(
  not exists (select 1 from cron.job where jobname = 'prune-expired-data'),
  'and nothing under the name 0017 suggested arming it by hand');
select pg_temp.check(
  (select count(*) = 1 from cron.job where jobname = 'skip-send-push' and schedule = '*/15 * * * *'),
  'the push job is untouched');

-- ---------------------------------------------------------------- the functions
select pg_temp.check(
  (select md5(p.prosrc) = '16046a4f201271cdafd2758b436dc07b' and p.prosecdef
          and p.proconfig = array['search_path=public']
          and pg_get_function_identity_arguments(p.oid) = 'p_years integer'
     from pg_proc p where p.proname = 'prune_expired_data' and p.pronamespace = 'public'::regnamespace),
  'prune_expired_data is the one 20261013600004 left (the balance rule, folded into the same person''s sources only), same signature, run as its owner');
select pg_temp.check(
  not has_function_privilege('authenticated', 'public.prune_expired_data(integer)', 'execute')
  and not has_function_privilege('anon', 'public.prune_expired_data(integer)', 'execute')
  and not has_function_privilege('public', 'public.prune_expired_data(integer)', 'execute'),
  'and nobody but the scheduler can call it');
select pg_temp.check(
  public.retention_cutoff('00000000-0000-0000-0000-00000000ffff') = pg_temp.c()
  and public.retention_cutoff('00000000-0000-0000-0000-00000000ffff', 999) < '1100-01-01',
  'retention_cutoff() is seven years before today, in UTC for someone with no profile; 999 years is before anything');
select pg_temp.check(
  (select count(*) = 1 from pg_proc where proname = 'retention_cutoff' and pronamespace = 'public'::regnamespace),
  'there is one retention_cutoff, taking the person');
select pg_temp.check(
  ('2032-02-29'::date - make_interval(years => 7))::date = '2025-02-28'
  and ('2033-03-01'::date - make_interval(years => 7))::date = '2026-03-01',
  'on 29 Feb the first day kept is 28 Feb seven years back; a 29 Feb row goes the day after');
select pg_temp.check(
  (select array_agg(t.tgname::text || ' ' || t.tgrelid::regclass::text || ' ' || (t.tgtype & 2 = 2)::text
                    || ' ' || (t.tgtype & 4 = 4)::text || ' ' || (t.tgtype & 16 = 16)::text order by t.tgname)
     from pg_trigger t
    where t.tgname in ('charges_within_retention', 'pay_received_within_retention') and not t.tgisinternal)
  = array['charges_within_retention charges true true false',
          'pay_received_within_retention pay_received true true false'],
  'charges and pay are guarded before every insert');

-- ---------------------------------------------------------------- seeded history and plans
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a7', 'retention@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000a7') on conflict (id) do nothing;
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000a7';

-- Triggers off: rows dated before C, as the guards would refuse them now and as a live database
-- already holds them. Superuser, so row security is not in the way either.
set local session_replication_role = replica;

insert into public.cards (id, user_id, holder, created_at) values
  ('00000000-0000-0000-0000-0000000c00a7', '00000000-0000-0000-0000-0000000000a7', 'Old card', now() - interval '9 years');
insert into public.bank_accounts (id, user_id, bank_name, account_type, created_at) values
  ('00000000-0000-0000-0000-0000000ba0a7', '00000000-0000-0000-0000-0000000000a7', 'Checking', 'checking', now() - interval '9 years'),
  ('00000000-0000-0000-0000-0000000ba0a8', '00000000-0000-0000-0000-0000000000a7', 'Savings', 'savings', now() - interval '9 years');

-- Plans, each set up long ago. A bill and a subscription that no longer run, so the recorders
-- leave them alone here.
insert into public.bills (id, user_id, name, amount, category_id, recurrence, next_due_on, starts_on, card_id, created_at) values
  ('00000000-0000-0000-0000-00000000b0a7', '00000000-0000-0000-0000-0000000000a7', 'Rent', 100, 'housing', 'monthly',
   null, pg_temp.c() - 400, '00000000-0000-0000-0000-0000000c00a7', now() - interval '9 years'),
  ('00000000-0000-0000-0000-00000000b0a8', '00000000-0000-0000-0000-0000000000a7', 'Car loan', 300, 'loans', 'monthly',
   null, pg_temp.c() - 400, null, now() - interval '9 years');
insert into public.loans (user_id, bill_id, principal, annual_rate, term_months, monthly_payment, total_interest, first_payment_on, payment_day) values
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-00000000b0a8', 10000, 5, 120, 300, 100,
   pg_temp.c() - 400, 1);
insert into public.loan_payoffs (user_id, bill_id, paid_on, amount, kind, counted) values
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-00000000b0a8', pg_temp.c() - 1, 500, 'partial', true);
insert into public.subscriptions (id, user_id, name, amount, cycle, next_renewal_on, started_on, active, created_at) values
  ('00000000-0000-0000-0000-00000000c0a7', '00000000-0000-0000-0000-0000000000a7', 'Stream', 9.99, 'monthly',
   null, pg_temp.c() - 400, false, now() - interval '9 years');
insert into public.salary_sources (id, user_id, name, amount, frequency, last_payday, created_at) values
  ('00000000-0000-0000-0000-00000000aaa7', '00000000-0000-0000-0000-0000000000a7', 'Job', 2500, 'semimonthly',
   pg_temp.c() - 400, now() - interval '9 years');
insert into public.habits (id, user_id, name, icon_id, color, price, started_on, saved_from, created_at) values
  ('00000000-0000-0000-0000-00000000ffa7', '00000000-0000-0000-0000-0000000000a7', 'Coffee', 'coffee', 'caramel', 4.5,
   pg_temp.c() - 400, pg_temp.c() - 400, now() - interval '9 years');
insert into public.receipt_books (user_id, name, created_at) values
  ('00000000-0000-0000-0000-0000000000a7', 'Work', now() - interval '9 years');
insert into public.savings_pots (id, user_id, name, amount, kind, month, earned, spent, added_on, created_at) values
  ('00000000-0000-0000-0000-00000000dda7', '00000000-0000-0000-0000-0000000000a7', 'Savings', 400, 'month',
   date_trunc('month', pg_temp.c() - 40)::date, 900, 500, pg_temp.c() - 40, now() - interval '8 years');
insert into public.goals (id, user_id, name, icon_id, target, created_at) values
  ('00000000-0000-0000-0000-00000000eea7', '00000000-0000-0000-0000-0000000000a7', 'Trip', 'trip', 1000, now() - interval '8 years');
insert into public.goal_moves (user_id, goal_id, pot_id, amount, batch_id, created_at) values
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-00000000eea7', '00000000-0000-0000-0000-00000000dda7',
   200, gen_random_uuid(), now() - interval '8 years');

-- What happened: in each pruned table, one row per date: C - 1, C and ten days ago.
create temp table dates as
select * from (values ('old', pg_temp.c() - 1), ('edge', pg_temp.c()), ('recent', pg_temp.today() - 10)) as d(kind, on_date);

insert into public.charges (user_id, bill_id, label, amount, charged_on, card_id)
select '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-00000000b0a7', 'Rent ' || kind, 100, on_date,
       '00000000-0000-0000-0000-0000000c00a7'
from dates;
insert into public.receipts (user_id, merchant, amount, purchased_on, card_id)
select '00000000-0000-0000-0000-0000000000a7', 'Shop ' || kind, 12.34, on_date, '00000000-0000-0000-0000-0000000c00a7'
from dates;
-- A habit day is a receipt on its habit.
insert into public.receipts (user_id, merchant, amount, purchased_on, source, habit_id)
select '00000000-0000-0000-0000-0000000000a7', 'Coffee ' || kind, 4.5, on_date, 'habit',
       '00000000-0000-0000-0000-00000000ffa7'
from dates;
-- A card payment and a transfer between accounts.
insert into public.payments (user_id, card_id, amount, paid_on, note)
select '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000c00a7', 50, on_date, 'Card ' || kind
from dates;
insert into public.payments (user_id, bank_account_id, from_bank_account_id, amount, paid_on, note)
select '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000ba0a8',
       '00000000-0000-0000-0000-0000000ba0a7', 75, on_date, 'Transfer ' || kind
from dates;
insert into public.pay_received (user_id, salary_source_id, label, amount, paid_on, bank_account_id)
select '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-00000000aaa7', 'Job ' || kind, 2500, on_date,
       '00000000-0000-0000-0000-0000000ba0a7'
from dates;

set local session_replication_role = origin;

-- Everything the person set up, counted before the job runs.
create temp table plans_before as
select 'bills' as t, count(*) as n from public.bills where user_id = '00000000-0000-0000-0000-0000000000a7'
union all select 'subscriptions', count(*) from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000a7'
union all select 'loans', count(*) from public.loans where user_id = '00000000-0000-0000-0000-0000000000a7'
union all select 'loan_payoffs', count(*) from public.loan_payoffs where user_id = '00000000-0000-0000-0000-0000000000a7'
union all select 'cards', count(*) from public.cards where user_id = '00000000-0000-0000-0000-0000000000a7'
union all select 'bank_accounts', count(*) from public.bank_accounts where user_id = '00000000-0000-0000-0000-0000000000a7'
union all select 'salary_sources', count(*) from public.salary_sources where user_id = '00000000-0000-0000-0000-0000000000a7'
union all select 'habits', count(*) from public.habits where user_id = '00000000-0000-0000-0000-0000000000a7'
union all select 'receipt_books', count(*) from public.receipt_books where user_id = '00000000-0000-0000-0000-0000000000a7'
union all select 'savings_pots', count(*) from public.savings_pots where user_id = '00000000-0000-0000-0000-0000000000a7'
union all select 'goals', count(*) from public.goals where user_id = '00000000-0000-0000-0000-0000000000a7'
union all select 'goal_moves', count(*) from public.goal_moves where user_id = '00000000-0000-0000-0000-0000000000a7'
union all select 'profiles', count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000a7';

create or replace function pg_temp.happened() returns text[]
language sql as $$
  select array_agg(x order by x) from (
    select 'charge ' || label as x from public.charges where user_id = '00000000-0000-0000-0000-0000000000a7'
    union all select 'receipt ' || merchant from public.receipts where user_id = '00000000-0000-0000-0000-0000000000a7'
    union all select 'payment ' || note from public.payments where user_id = '00000000-0000-0000-0000-0000000000a7'
    union all select 'pay ' || label from public.pay_received where user_id = '00000000-0000-0000-0000-0000000000a7'
  ) rows
$$;

select pg_temp.check(cardinality(pg_temp.happened()) = 18, 'seeded: 18 rows of history, 6 of them older than seven years');

-- ---------------------------------------------------------------- the dry run
create temp table dry as select * from public.prune_expired_data(999);
select pg_temp.check(
  (select array_agg(table_name || ' ' || removed order by table_name) from dry)
  = array['charges 0', 'pay_received 0', 'payments 0', 'receipts 0'],
  'the 999-year run reports zeroes: it shows the function runs, and previews nothing');
select pg_temp.check(cardinality(pg_temp.happened()) = 18, 'and touches nothing');

create or replace function pg_temp.balances(p_user uuid) returns text[]
language sql as $$
  select array_agg(x order by x) from (
    select 'card ' || holder || ' ' || balance || ' ' || coalesce(balance_as_of::text, '-') as x
      from public.cards where user_id = p_user
    union all
    select 'account ' || bank_name || ' ' || balance || ' ' || coalesce(balance_as_of::text, '-')
      from public.bank_accounts where user_id = p_user
  ) sources
$$;
select pg_temp.check(
  pg_temp.balances('00000000-0000-0000-0000-0000000000a7')
  = array['account Checking 0.00 -', 'account Savings 0.00 -', 'card Old card 0.00 -'],
  'and moves no balance');

-- ---------------------------------------------------------------- the job, as cron runs it
create temp table first_run as select * from public.prune_expired_data();
select pg_temp.check(
  (select array_agg(table_name || ' ' || removed order by table_name) from first_run)
  = array['charges 1', 'pay_received 1', 'payments 2', 'receipts 2'],
  'the job removes the charge, both receipts (one a habit day), both payments (one a transfer) and the pay dated before C');
select pg_temp.check(
  pg_temp.happened() = array[
    'charge Rent edge', 'charge Rent recent',
    'pay Job edge', 'pay Job recent',
    'payment Card edge', 'payment Card recent', 'payment Transfer edge', 'payment Transfer recent',
    'receipt Coffee edge', 'receipt Coffee recent', 'receipt Shop edge', 'receipt Shop recent'],
  'what is exactly seven years old (dated C) stays, and so does everything recent');
select pg_temp.check(
  not exists (
    select 1 from plans_before b
    join (
      select 'bills' as t, count(*) as n from public.bills where user_id = '00000000-0000-0000-0000-0000000000a7'
      union all select 'subscriptions', count(*) from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000a7'
      union all select 'loans', count(*) from public.loans where user_id = '00000000-0000-0000-0000-0000000000a7'
      union all select 'loan_payoffs', count(*) from public.loan_payoffs where user_id = '00000000-0000-0000-0000-0000000000a7'
      union all select 'cards', count(*) from public.cards where user_id = '00000000-0000-0000-0000-0000000000a7'
      union all select 'bank_accounts', count(*) from public.bank_accounts where user_id = '00000000-0000-0000-0000-0000000000a7'
      union all select 'salary_sources', count(*) from public.salary_sources where user_id = '00000000-0000-0000-0000-0000000000a7'
      union all select 'habits', count(*) from public.habits where user_id = '00000000-0000-0000-0000-0000000000a7'
      union all select 'receipt_books', count(*) from public.receipt_books where user_id = '00000000-0000-0000-0000-0000000000a7'
      union all select 'savings_pots', count(*) from public.savings_pots where user_id = '00000000-0000-0000-0000-0000000000a7'
      union all select 'goals', count(*) from public.goals where user_id = '00000000-0000-0000-0000-0000000000a7'
      union all select 'goal_moves', count(*) from public.goal_moves where user_id = '00000000-0000-0000-0000-0000000000a7'
      union all select 'profiles', count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000a7'
    ) a using (t)
    where a.n is distinct from b.n)
  and (select count(*) = 13 from plans_before where n = 1 or (t = 'bills' and n = 2) or (t = 'bank_accounts' and n = 2)),
  'every plan stays: bills, subscriptions, the loan and its old payoff, cards, accounts, salary, habit, book, savings, goal and its move, profile');
-- None of these sources has an as-of day, so each counted its old rows: the card the old Rent
-- charge (a bill no longer walked, +100.00 owed) and the old card payment (-50.00); Checking the
-- old transfer out (-75.00) and Savings the same transfer in (+75.00). Receipts and pay take nothing.
select pg_temp.check(
  pg_temp.balances('00000000-0000-0000-0000-0000000000a7')
  = array['account Checking -75.00 -', 'account Savings 75.00 -', 'card Old card 50.00 -'],
  'what the app still counted of the deleted rows is now in the typed balances');
select pg_temp.check(
  (select count(*) = 1 from public.loan_payoffs where paid_on = pg_temp.c() - 1),
  'the loan''s payoff dated before C is kept, as part of what is still owed');
select pg_temp.check(
  (select count(*) = 1 from public.habits where id = '00000000-0000-0000-0000-00000000ffa7'),
  'the habit stays when its old day goes');

create temp table second_run as select * from public.prune_expired_data();
select pg_temp.check(
  (select array_agg(table_name || ' ' || removed order by table_name) from second_run)
  = array['charges 0', 'pay_received 0', 'payments 0', 'receipts 0'],
  'a second run removes nothing');

-- The cron job's own command, run as it is stored.
do $$ begin execute (select command from cron.job where jobname = 'skip-prune-expired-data'); end $$;
select pg_temp.check(cardinality(pg_temp.happened()) = 12, 'the stored command runs, and finds nothing more to do');

-- ---------------------------------------------------------------- the guards
-- A bill and a salary with nothing recorded, so nothing but the guard can drop what is written
-- (a second charge in a month, or a second monthly pay, is dropped by its own rule).
insert into public.bills (id, user_id, name, amount, category_id, recurrence, next_due_on, starts_on, card_id)
values ('00000000-0000-0000-0000-00000000b0aa', '00000000-0000-0000-0000-0000000000a7', 'Guarded', 60, 'other',
        'monthly', null, pg_temp.c() - 400, '00000000-0000-0000-0000-0000000c00a7');
insert into public.salary_sources (id, user_id, name, amount, frequency, last_payday)
values ('00000000-0000-0000-0000-00000000aaa8', '00000000-0000-0000-0000-0000000000a7', 'Guarded job', 900, 'monthly',
        pg_temp.c() - 400);

-- As the app writes: signed in, row security on, catch-up upserts.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a7","role":"authenticated"}', true);

create or replace function pg_temp.write_charge(p_on date) returns integer
language plpgsql as $$
declare n integer;
begin
  insert into public.charges (user_id, bill_id, label, amount, charged_on, card_id)
  values ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-00000000b0aa', 'Guarded', 60, p_on,
          '00000000-0000-0000-0000-0000000c00a7')
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function pg_temp.write_pay(p_on date) returns integer
language plpgsql as $$
declare n integer;
begin
  insert into public.pay_received (user_id, salary_source_id, label, amount, paid_on)
  values ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-00000000aaa8', 'Guarded job', 900, p_on)
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

select pg_temp.check(pg_temp.write_charge(pg_temp.c() - 1) = 0,
  'a charge dated the day before C is dropped, without an error');
select pg_temp.check(pg_temp.write_charge(pg_temp.c() - 3650) = 0, 'and one seventeen years old');
select pg_temp.check(pg_temp.write_pay(pg_temp.c() - 1) = 0, 'the same for pay');
select pg_temp.check(pg_temp.write_charge(pg_temp.c()) = 1 and pg_temp.write_pay(pg_temp.c()) = 1,
  'a charge and a pay dated C, exactly seven years old, are written, as the job keeps them');

-- Receipts and payments are only ever written by a person: one dated older than seven years is
-- refused with its reason (20261013600004), so there is nothing of it to delete.
do $$
begin
  insert into public.receipts (user_id, merchant, amount, purchased_on, card_id)
  values ('00000000-0000-0000-0000-0000000000a7', 'Typed in late', 1, pg_temp.c() - 1,
          '00000000-0000-0000-0000-0000000c00a7');
  raise exception 'FAILED: a receipt older than seven years was saved';
exception when sqlstate 'SK007' then
  if sqlerrm <> 'Pick a day in the last seven years.' then raise; end if;
end $$;
select pg_temp.check(
  not exists (select 1 from public.receipts where merchant = 'Typed in late'),
  'a receipt typed in with a date older than seven years is refused (SK007): Pick a day in the last seven years.');

reset role;
select set_config('request.jwt.claims', '', true);

-- ---------------------------------------------------------------- the server recorder
-- A rent started more than seven years ago and never recorded: the recorder walks every due date
-- from its start, and only those from C on are written. So the job has nothing of it to delete,
-- and the recorder nothing to write back.
insert into public.bills (id, user_id, name, amount, category_id, recurrence, next_due_on, starts_on, card_id, anchor_day)
values ('00000000-0000-0000-0000-00000000b0a9', '00000000-0000-0000-0000-0000000000a7', 'Long rent', 800, 'housing',
        'monthly', date_trunc('month', pg_temp.today())::date + 9,
        (date_trunc('month', pg_temp.c()) - interval '2 months')::date + 9,
        '00000000-0000-0000-0000-0000000c00a7', 10);

create temp table want as
select array_agg(d order by d) as dates
from public.plan_occurrences(date_trunc('month', pg_temp.today())::date + 9, 'monthly', pg_temp.c(), pg_temp.today(), 10) d;

select public.record_due_charges();
select pg_temp.check(
  (select array_agg(charged_on order by charged_on) from public.charges
    where bill_id = '00000000-0000-0000-0000-00000000b0a9')
  = (select dates from want)
  and (select min(charged_on) >= pg_temp.c() from public.charges where bill_id = '00000000-0000-0000-0000-00000000b0a9'),
  'the server recorder writes the rent from C on, every month, and nothing before C');
select pg_temp.check(
  (select count(*) >= 84 from public.charges where bill_id = '00000000-0000-0000-0000-00000000b0a9'),
  'which is seven years of rent');

create temp table third_run as select * from public.prune_expired_data();
create temp table recorded_again as select * from public.record_due_charges();
select pg_temp.check(
  (select sum(removed) = 0 from third_run)
  and not exists (select 1 from recorded_again where user_id = '00000000-0000-0000-0000-0000000000a7'),
  'the job then deletes none of it, and the recorder writes nothing back');

-- ---------------------------------------------------------------- the balance rule, Drew's scenario
-- Everyday 1,000.00 and Visa 0.00 owed, both typed on 1 Oct 2026; Joint 500.00 with no typed day.
-- A running rent; a gym bill no longer walked; two subscriptions switched off; receipts, pay and
-- payments either side of the cutoff. Dates are his, moved by the same number of days so that his
-- cutoff, 15 Nov 2026, is this person's.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f7', 'retention-book@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000f7') on conflict (id) do nothing;
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000f7';

create temp table shift as
select public.retention_cutoff('00000000-0000-0000-0000-0000000000f7') - '2026-11-15'::date as days;
create or replace function pg_temp.d(p_day text) returns date
language sql stable as $$ select p_day::date + (select days from shift) $$;

set local session_replication_role = replica;

insert into public.bank_accounts (id, user_id, bank_name, account_type, balance, balance_as_of) values
  ('00000000-0000-0000-0000-0000000ba0f7', '00000000-0000-0000-0000-0000000000f7', 'Everyday', 'checking', 1000, pg_temp.d('2026-10-01')),
  ('00000000-0000-0000-0000-0000000ba0f8', '00000000-0000-0000-0000-0000000000f7', 'Joint', 'checking', 500, null);
insert into public.cards (id, user_id, holder, balance, balance_as_of) values
  ('00000000-0000-0000-0000-0000000c00f7', '00000000-0000-0000-0000-0000000000f7', 'Visa', 0, pg_temp.d('2026-10-01'));

insert into public.bills (id, user_id, name, amount, category_id, recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id) values
  ('00000000-0000-0000-0000-00000000b0f7', '00000000-0000-0000-0000-0000000000f7', 'rent', 1200, 'housing', 'monthly',
   pg_temp.d('2033-11-30'), pg_temp.d('2026-10-30'), null, null, '00000000-0000-0000-0000-0000000ba0f7'),
  ('00000000-0000-0000-0000-00000000b0f8', '00000000-0000-0000-0000-0000000000f7', 'gym', 39.99, 'other', 'monthly',
   null, pg_temp.d('2026-10-10'), pg_temp.d('2026-12-31'), '00000000-0000-0000-0000-0000000c00f7', null);
insert into public.subscriptions (id, user_id, name, amount, cycle, next_renewal_on, active, bank_account_id) values
  ('00000000-0000-0000-0000-00000000c0f7', '00000000-0000-0000-0000-0000000000f7', 'stream', 15.99, 'monthly', null, false,
   '00000000-0000-0000-0000-0000000ba0f7'),
  ('00000000-0000-0000-0000-00000000c0f8', '00000000-0000-0000-0000-0000000000f7', 'magazine', 7.5, 'monthly', null, false,
   '00000000-0000-0000-0000-0000000ba0f8');

insert into public.receipts (user_id, merchant, amount, purchased_on, card_id, bank_account_id) values
  ('00000000-0000-0000-0000-0000000000f7', 'shoes', 200, pg_temp.d('2026-10-05'), '00000000-0000-0000-0000-0000000c00f7', null),
  ('00000000-0000-0000-0000-0000000000f7', 'books', 25, pg_temp.d('2019-06-01'), null, '00000000-0000-0000-0000-0000000ba0f8'),
  ('00000000-0000-0000-0000-0000000000f7', 'groceries', 40, pg_temp.d('2033-11-01'), null, '00000000-0000-0000-0000-0000000ba0f7');

insert into public.charges (user_id, bill_id, subscription_id, label, amount, charged_on, card_id, bank_account_id) values
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-00000000b0f7', null, 'rent-2026-10-30', 1200, pg_temp.d('2026-10-30'), null, '00000000-0000-0000-0000-0000000ba0f7'),
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-00000000b0f7', null, 'rent-2033-10-30', 1200, pg_temp.d('2033-10-30'), null, '00000000-0000-0000-0000-0000000ba0f7'),
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-00000000b0f8', null, 'gym-2026-10-10', 39.99, pg_temp.d('2026-10-10'), '00000000-0000-0000-0000-0000000c00f7', null),
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-00000000b0f8', null, 'gym-2026-11-10', 39.99, pg_temp.d('2026-11-10'), '00000000-0000-0000-0000-0000000c00f7', null),
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-00000000b0f8', null, 'gym-2026-12-10', 39.99, pg_temp.d('2026-12-10'), '00000000-0000-0000-0000-0000000c00f7', null),
  ('00000000-0000-0000-0000-0000000000f7', null, '00000000-0000-0000-0000-00000000c0f7', 'stream-2026-11-09', 15.99, pg_temp.d('2026-11-09'), null, '00000000-0000-0000-0000-0000000ba0f7'),
  ('00000000-0000-0000-0000-0000000000f7', null, '00000000-0000-0000-0000-00000000c0f7', 'stream-2027-01-09', 15.99, pg_temp.d('2027-01-09'), null, '00000000-0000-0000-0000-0000000ba0f7'),
  ('00000000-0000-0000-0000-0000000000f7', null, '00000000-0000-0000-0000-00000000c0f8', 'magazine-2020-03-03', 7.5, pg_temp.d('2020-03-03'), null, '00000000-0000-0000-0000-0000000ba0f8');

-- From Everyday to the Visa card (twice), into Joint from outside, into Everyday before its typed day.
insert into public.payments (user_id, card_id, bank_account_id, from_bank_account_id, amount, paid_on, note) values
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000c00f7', null, '00000000-0000-0000-0000-0000000ba0f7', 200, pg_temp.d('2026-11-01'), 'visa-nov'),
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000c00f7', null, '00000000-0000-0000-0000-0000000ba0f7', 100, pg_temp.d('2033-11-02'), 'visa-late'),
  ('00000000-0000-0000-0000-0000000000f7', null, '00000000-0000-0000-0000-0000000ba0f8', null, 300, pg_temp.d('2020-05-05'), 'gift'),
  ('00000000-0000-0000-0000-0000000000f7', null, '00000000-0000-0000-0000-0000000ba0f7', null, 50, pg_temp.d('2026-09-15'), 'before-typed');

insert into public.pay_received (user_id, salary_source_id, label, amount, paid_on, bank_account_id) values
  ('00000000-0000-0000-0000-0000000000f7', null, 'pay-2026', 2500, pg_temp.d('2026-10-31'), '00000000-0000-0000-0000-0000000ba0f7'),
  ('00000000-0000-0000-0000-0000000000f7', null, 'pay-2033', 2500, pg_temp.d('2033-10-31'), '00000000-0000-0000-0000-0000000ba0f7');

set local session_replication_role = origin;

create temp table book_run as select * from public.prune_expired_data();
select pg_temp.check(
  (select array_agg(table_name || ' ' || removed order by table_name) from book_run)
  = array['charges 5', 'pay_received 1', 'payments 3', 'receipts 2'],
  'the job deletes what the policy says: 5 charges, 2 receipts, 3 payments, 1 pay');
select pg_temp.check(
  (select array_agg(label order by label) from public.charges where user_id = '00000000-0000-0000-0000-0000000000f7')
    = array['gym-2026-12-10', 'rent-2033-10-30', 'stream-2027-01-09']
  and (select array_agg(merchant order by merchant) from public.receipts where user_id = '00000000-0000-0000-0000-0000000000f7')
    = array['groceries']
  and (select array_agg(note order by note) from public.payments where user_id = '00000000-0000-0000-0000-0000000000f7')
    = array['visa-late']
  and (select array_agg(label order by label) from public.pay_received where user_id = '00000000-0000-0000-0000-0000000000f7')
    = array['pay-2033'],
  'and leaves exactly what his scenario leaves');
-- Everyday: 1,000.00 - stream 15.99 - 200.00 to Visa = 784.01 (the running rent and the payment
-- before its typed day are not taken). Visa: 0.00 + gym 39.99 x 2 - 200.00 = -120.02. Joint: 500.00
-- - magazine 7.50 + gift 300.00 = 792.50 (no typed day: everything counted). As-of days unchanged.
select pg_temp.check(
  pg_temp.balances('00000000-0000-0000-0000-0000000000f7')
  = array['account Everyday 784.01 ' || pg_temp.d('2026-10-01'),
          'account Joint 792.50 -',
          'card Visa -120.02 ' || pg_temp.d('2026-10-01')],
  'the typed balances take in what the app counted: Everyday 784.01, Visa -120.02, Joint 792.50, as-of days kept');

create temp table book_again as select * from public.prune_expired_data();
select pg_temp.check(
  (select sum(removed) = 0 from book_again)
  and pg_temp.balances('00000000-0000-0000-0000-0000000000f7')
      = array['account Everyday 784.01 ' || pg_temp.d('2026-10-01'),
              'account Joint 792.50 -',
              'card Visa -120.02 ' || pg_temp.d('2026-10-01')],
  'a second run deletes nothing and moves no balance');

-- ---------------------------------------------------------------- the balance rule at its edges
-- An account and a card typed 30 days before C (X). A payment into the account the day before X
-- (not counted) and on X (counted); a stopped bill's charges on the card the day before X and on
-- X; a subscription switched off that still shows its renewal date (counted, it is not walked);
-- one still running (its charge is not counted).
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b7', 'retention-edges@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000b7') on conflict (id) do nothing;
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000b7';

set local session_replication_role = replica;
insert into public.bank_accounts (id, user_id, bank_name, account_type, balance, balance_as_of) values
  ('00000000-0000-0000-0000-0000000ba0b7', '00000000-0000-0000-0000-0000000000b7', 'Edge', 'checking', 0, pg_temp.c() - 30);
insert into public.cards (id, user_id, holder, balance, balance_as_of) values
  ('00000000-0000-0000-0000-0000000c00b7', '00000000-0000-0000-0000-0000000000b7', 'Edge card', 0, pg_temp.c() - 30);
insert into public.bills (id, user_id, name, amount, category_id, recurrence, next_due_on, card_id) values
  ('00000000-0000-0000-0000-00000000b0b7', '00000000-0000-0000-0000-0000000000b7', 'Stopped', 4, 'other', 'monthly',
   null, '00000000-0000-0000-0000-0000000c00b7');
insert into public.subscriptions (id, user_id, name, amount, cycle, next_renewal_on, active, bank_account_id) values
  ('00000000-0000-0000-0000-00000000c0b7', '00000000-0000-0000-0000-0000000000b7', 'Cancelled', 16, 'monthly',
   pg_temp.today(), false, '00000000-0000-0000-0000-0000000ba0b7'),
  ('00000000-0000-0000-0000-00000000c0b8', '00000000-0000-0000-0000-0000000000b7', 'Running', 32, 'monthly',
   pg_temp.today(), true, '00000000-0000-0000-0000-0000000ba0b7');
insert into public.payments (user_id, bank_account_id, amount, paid_on, note) values
  ('00000000-0000-0000-0000-0000000000b7', '00000000-0000-0000-0000-0000000ba0b7', 1, pg_temp.c() - 31, 'day before typed'),
  ('00000000-0000-0000-0000-0000000000b7', '00000000-0000-0000-0000-0000000ba0b7', 2, pg_temp.c() - 30, 'on typed day');
insert into public.charges (user_id, bill_id, subscription_id, label, amount, charged_on, card_id, bank_account_id) values
  ('00000000-0000-0000-0000-0000000000b7', '00000000-0000-0000-0000-00000000b0b7', null, 'stopped before', 4, pg_temp.c() - 31,
   '00000000-0000-0000-0000-0000000c00b7', null),
  ('00000000-0000-0000-0000-0000000000b7', '00000000-0000-0000-0000-00000000b0b7', null, 'stopped on', 8, pg_temp.c() - 30,
   '00000000-0000-0000-0000-0000000c00b7', null),
  ('00000000-0000-0000-0000-0000000000b7', null, '00000000-0000-0000-0000-00000000c0b7', 'cancelled', 16, pg_temp.c() - 29,
   null, '00000000-0000-0000-0000-0000000ba0b7'),
  ('00000000-0000-0000-0000-0000000000b7', null, '00000000-0000-0000-0000-00000000c0b8', 'running', 32, pg_temp.c() - 28,
   null, '00000000-0000-0000-0000-0000000ba0b7');
set local session_replication_role = origin;

select public.prune_expired_data();
select pg_temp.check(
  not exists (select 1 from public.payments where user_id = '00000000-0000-0000-0000-0000000000b7')
  and not exists (select 1 from public.charges where user_id = '00000000-0000-0000-0000-0000000000b7'),
  'every one of them is deleted');
-- Edge: +2.00 (on its typed day) - 16.00 (the switched-off subscription); the 1.00 before its
-- typed day and the running subscription's 32.00 are not taken. Edge card: +8.00 owed (on its
-- typed day); the 4.00 before it is not taken.
select pg_temp.check(
  pg_temp.balances('00000000-0000-0000-0000-0000000000b7')
  = array['account Edge -14.00 ' || (pg_temp.c() - 30), 'card Edge card 8.00 ' || (pg_temp.c() - 30)],
  'a row on the typed day is taken in and one the day before is not, on an account and on a card; a switched-off subscription is, a running one is not');

-- ---------------------------------------------------------------- charges from no card or account
-- A stopped plan's charge paid with Skip (no source), and one whose card was deleted since (its
-- card_id went null with it). The app counts them against no card or account, so no typed
-- balance can take them in: they go, every card and account stays where it was, and only Home's
-- no-account part moves, by exactly these two.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c7', 'retention-loose@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000c7') on conflict (id) do nothing;
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000c7';

set local session_replication_role = replica;
insert into public.bank_accounts (id, user_id, bank_name, account_type, balance) values
  ('00000000-0000-0000-0000-0000000ba0c7', '00000000-0000-0000-0000-0000000000c7', 'Loose account', 'checking', 20);
insert into public.cards (id, user_id, holder, balance) values
  ('00000000-0000-0000-0000-0000000c00c7', '00000000-0000-0000-0000-0000000000c7', 'Loose card', 10),
  ('00000000-0000-0000-0000-0000000c00c8', '00000000-0000-0000-0000-0000000000c7', 'Card to delete', 5);
insert into public.bills (id, user_id, name, amount, category_id, recurrence, next_due_on) values
  ('00000000-0000-0000-0000-00000000b0c7', '00000000-0000-0000-0000-0000000000c7', 'Paid with Skip', 6, 'other', 'monthly', null);
insert into public.charges (user_id, bill_id, label, amount, charged_on, card_id, bank_account_id) values
  ('00000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-00000000b0c7', 'no source', 6, pg_temp.c() - 60, null, null),
  ('00000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-00000000b0c7', 'card deleted', 7, pg_temp.c() - 20,
   '00000000-0000-0000-0000-0000000c00c8', null);
set local session_replication_role = origin;
delete from public.cards where id = '00000000-0000-0000-0000-0000000c00c8';

select pg_temp.check(
  (select count(*) = 2 from public.charges
    where user_id = '00000000-0000-0000-0000-0000000000c7' and card_id is null and bank_account_id is null),
  'two old charges of a stopped plan now come from no card or account');
select public.prune_expired_data();
select pg_temp.check(
  not exists (select 1 from public.charges where user_id = '00000000-0000-0000-0000-0000000000c7')
  and pg_temp.balances('00000000-0000-0000-0000-0000000000c7')
      = array['account Loose account 20.00 -', 'card Loose card 10.00 -'],
  'they are deleted, and no card or account balance changes (only Home''s no-account part can, by 13.00)');

-- ---------------------------------------------------------------- east and west of UTC
-- Kiritimati is UTC+14, Pago Pago UTC-11. Before 11:00 UTC Pago Pago is still on yesterday; from
-- 10:00 UTC Kiritimati is on tomorrow; so at any hour at least one of them is not on UTC's day,
-- and a server-wide date would delete a day too early for one or keep one too long for the other.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e7', 'retention-east@test.local'),
  ('00000000-0000-0000-0000-0000000000d7', 'retention-west@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000e7'), ('00000000-0000-0000-0000-0000000000d7')
on conflict (id) do nothing;
update public.profiles set timezone = 'Pacific/Kiritimati' where id = '00000000-0000-0000-0000-0000000000e7';
update public.profiles set timezone = 'Pacific/Pago_Pago' where id = '00000000-0000-0000-0000-0000000000d7';

create temp table zones as
select p.id as user_id, p.timezone,
       ((now() at time zone p.timezone)::date - make_interval(years => 7))::date as kept_from
from public.profiles p
where p.id in ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000d7');
grant select on zones to authenticated;

select pg_temp.check(
  (select bool_and(public.retention_cutoff(user_id) = kept_from) from zones),
  'each person''s first day kept is seven years before their own today');
-- The same rule at fixed moments, so both sides are pinned whatever the hour of this run.
select pg_temp.check(
  (('2033-11-15 05:00+00'::timestamptz at time zone 'Pacific/Pago_Pago')::date - make_interval(years => 7))::date = '2026-11-14'
  and (('2033-11-15 12:00+00'::timestamptz at time zone 'Pacific/Kiritimati')::date - make_interval(years => 7))::date = '2026-11-16'
  and (('2033-11-15 12:00+00'::timestamptz at time zone 'UTC')::date - make_interval(years => 7))::date = '2026-11-15',
  'at 05:00 UTC on 15 Nov 2033 Pago Pago keeps from 14 Nov 2026; at noon Kiritimati from 16 Nov; UTC from 15 Nov');
select pg_temp.check(
  (select kept_from from zones where timezone = 'Pacific/Pago_Pago') < pg_temp.c()
  or (select kept_from from zones where timezone = 'Pacific/Kiritimati') > pg_temp.c(),
  'and right now at least one of them is a day off from UTC''s');

set local session_replication_role = replica;
insert into public.bank_accounts (id, user_id, bank_name, account_type, balance) values
  ('00000000-0000-0000-0000-0000000ba0e7', '00000000-0000-0000-0000-0000000000e7', 'East', 'checking', 0),
  ('00000000-0000-0000-0000-0000000ba0d7', '00000000-0000-0000-0000-0000000000d7', 'West', 'checking', 0);
-- Into each person's account from outside: on their day before the cutoff, on their cutoff, and
-- on UTC's cutoff day.
insert into public.payments (user_id, bank_account_id, amount, paid_on, note)
select z.user_id, a.id, v.amount, v.on_day, v.note
from zones z
join public.bank_accounts a on a.user_id = z.user_id
cross join lateral (values (10.00, z.kept_from - 1, 'their day before'),
                           (20.00, z.kept_from, 'their cutoff'),
                           (40.00, pg_temp.c(), 'UTC cutoff')) as v(amount, on_day, note)
on conflict do nothing;
set local session_replication_role = origin;

select public.prune_expired_data();
select pg_temp.check(
  (select bool_and(not exists (select 1 from public.payments p where p.user_id = z.user_id and p.paid_on < z.kept_from)
                   and exists (select 1 from public.payments p where p.user_id = z.user_id and p.paid_on = z.kept_from))
     from zones z),
  'each person loses what is older than seven years by their own day, and keeps their cutoff day');
select pg_temp.check(
  (select bool_and(
            a.balance = (select coalesce(sum(p.amount), 0) from (values (10.00, z.kept_from - 1), (20.00, z.kept_from),
                                                                         (40.00, pg_temp.c())) as p(amount, on_day)
                         where p.on_day < z.kept_from))
     from zones z join public.bank_accounts a on a.user_id = z.user_id),
  'and each account takes in exactly what went from it');
select pg_temp.check(
  case when (select kept_from from zones where timezone = 'Pacific/Pago_Pago') < pg_temp.c()
       then exists (select 1 from public.payments where note = 'UTC cutoff' and user_id = '00000000-0000-0000-0000-0000000000d7')
         and exists (select 1 from public.payments where note = 'their cutoff' and user_id = '00000000-0000-0000-0000-0000000000d7'
                       and paid_on < pg_temp.c())
       else true end
  and case when (select kept_from from zones where timezone = 'Pacific/Kiritimati') > pg_temp.c()
       then not exists (select 1 from public.payments where note = 'UTC cutoff' and user_id = '00000000-0000-0000-0000-0000000000e7')
       else true end,
  'west of UTC a day UTC would delete is kept; east of UTC a day UTC would keep is deleted');

-- The guards on the same rule: a charge on each person's day before their cutoff is dropped, one
-- on their cutoff written.
set local session_replication_role = replica;
insert into public.bills (id, user_id, name, amount, category_id, recurrence, next_due_on)
select gen_random_uuid(), user_id, 'Zone bill', 5, 'other', 'monthly', null
from zones;
set local session_replication_role = origin;
insert into public.charges (user_id, bill_id, label, amount, charged_on)
select b.user_id, b.id, 'zone ' || v.note, 5, v.on_day
from zones z join public.bills b on b.user_id = z.user_id and b.name = 'Zone bill'
cross join lateral (values (z.kept_from - 1, 'before'), (z.kept_from + 40, 'kept')) as v(on_day, note);
select pg_temp.check(
  (select array_agg(c.label order by c.label) from public.charges c join zones z on z.user_id = c.user_id)
  = array['zone kept', 'zone kept'],
  'the guards drop a charge dated before each person''s own cutoff, and write one after it');

rollback;
\echo ALL CHECKS PASSED
