-- Checks for 20261012100003_loan_payoffs.sql. LOCAL database only, with 20261012100001,
-- 20261012100002, it and 20261013300001 applied: everything runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/loan_payoffs.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".
-- Dates are fixed (each call says which day it is), except the reminder case, which needs the real
-- day. What the recorders would write is worked out the way record_due_charges does
-- (plan_occurrences from the bill's floor to that day, one charge a month).

\set ON_ERROR_STOP on
begin;

-- Each case is set on its own day (p_today). update_loan and record_loan_payoff hold that day to
-- within one of person_today; in this transaction person_today knows no day, so each case's day
-- stands as given. supabase/checks/loan_ids.sql checks the hold itself, on the real day.
create or replace function public.person_today(p_user uuid) returns date
language sql stable as $$ select null::date $$;

-- e1 pays; e3 is someone else, whose loan, card and account e1 must not reach.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'loan-payoffs@test.local'),
  ('00000000-0000-0000-0000-0000000000e3', 'loan-payoffs-other@test.local');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000e3')
on conflict (id) do nothing;
update public.profiles set timezone = 'UTC'
 where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e3');
insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000c00e1', '00000000-0000-0000-0000-0000000000e1', 'Mine'),
  ('00000000-0000-0000-0000-0000000c00e3', '00000000-0000-0000-0000-0000000000e3', 'Theirs');
insert into public.bank_accounts (id, user_id, bank_name) values
  ('00000000-0000-0000-0000-0000000a00e1', '00000000-0000-0000-0000-0000000000e1', 'Mine'),
  ('00000000-0000-0000-0000-0000000a00e3', '00000000-0000-0000-0000-0000000000e3', 'Theirs');

create or replace function pg_temp.check(p_ok boolean, p_what text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAILED: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

create or replace function pg_temp.expect_error(p_sql text, p_state text, p_words text default null)
returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate <> p_state or (p_words is not null and position(p_words in sqlerrm) = 0) then
      raise exception 'wrong refusal: % % (wanted % %)', sqlstate, sqlerrm, p_state, p_words;
    end if;
    raise notice 'ok  refused: %', sqlerrm;
    return;
  end;
  raise exception 'expected a refusal for: %', p_sql;
end $$;

create or replace function pg_temp.as_user(p_user text) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_user), true);
end $$;

-- A loan as the add flow saves it, added on p_added (its created_at).
create or replace function pg_temp.save_on(
  p_name text, p_first date, p_term integer, p_added date, p_extra text default '')
returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  execute format(
    $f$select (public.save_loan(
       p_name => %L, p_icon_id => 'loan-car', p_principal => 18000, p_annual_rate => 6.25,
       p_term_months => %s, p_monthly_payment => 424.80, p_total_interest => 2390.10,
       p_first_payment_on => %L, p_recurrence => 'monthly',
       p_card_id => '00000000-0000-0000-0000-0000000c00e1', p_bank_account_id => null,
       p_funded_on => null, p_day_count_basis => 'actual/365'%s)).id$f$,
    p_name, p_term, p_first, p_extra)
    into v_id;
  update public.bills set created_at = p_added + time '12:00' where id = v_id;
  return v_id;
end $$;

create or replace function pg_temp.bill(p_name text) returns public.bills
language sql as $$ select * from public.bills where name = p_name $$;

create or replace function pg_temp.dates(p_name text) returns text
language sql as $$
  select starts_on || ' ' || coalesce(next_due_on::text, '-') || ' ' || coalesce(ends_on::text, '-')
  from public.bills where name = p_name
$$;

-- The app's call: from my card unless the case says otherwise.
create or replace function pg_temp.pay(
  p_name text, p_on date, p_amount numeric, p_kind text, p_today date,
  p_last date default null,
  p_card uuid default '00000000-0000-0000-0000-0000000c00e1', p_account uuid default null)
returns uuid
language sql as $$
  select (public.record_loan_payoff(
    p_bill_id => (pg_temp.bill(p_name)).id, p_paid_on => p_on, p_amount => p_amount, p_kind => p_kind,
    p_card_id => p_card, p_bank_account_id => p_account,
    p_last_payment_on => p_last, p_today => p_today)).id
$$;

-- What the recorders would write for the bill by p_on: record_due_charges's walk, one a month.
-- As its owner, because plan_occurrences is the scheduler's alone.
create or replace function pg_temp.would_record(p_name text, p_on date) returns text
language sql security definer as $$
  select coalesce(string_agg(o.d::text, ' ' order by o.d), '-')
  from public.bills b
  cross join lateral public.plan_occurrences(
    b.next_due_on, b.recurrence::text, coalesce(b.starts_on, b.created_at::date),
    least(p_on, coalesce(b.ends_on, p_on)), b.anchor_day) o(d)
  where b.name = p_name and b.next_due_on is not null and b.in_spending
    and not exists (
      select 1 from public.charges c
      where c.bill_id = b.id and date_trunc('month', c.charged_on) = date_trunc('month', o.d))
$$;

create or replace function pg_temp.charge(p_name text, p_on date) returns void
language sql as $$
  insert into public.charges (user_id, bill_id, label, amount, charged_on)
  select user_id, id, name, amount, p_on from public.bills where name = p_name
$$;

-- Where the bill's row lives: an update writes a new version of it, so this moves, which is what
-- the realtime feed hears (updated_at cannot show it: now() is fixed inside one transaction).
create or replace function pg_temp.version(p_name text) returns tid
language sql as $$ select ctid from public.bills where name = p_name $$;

create or replace function pg_temp.payoffs_of(p_name text) returns text
language sql as $$
  -- created_at ties inside one transaction; kind breaks them as the order they were made here.
  select coalesce(string_agg(p.paid_on || ' ' || p.amount || ' ' || p.kind, ', '
                             order by p.paid_on, p.created_at, p.kind desc), '-')
  from public.loan_payoffs p join public.bills b on b.id = p.bill_id where b.name = p_name
$$;

-- ---------------------------------------------------------------- the table
select pg_temp.check(
  (select relrowsecurity from pg_class where oid = 'public.loan_payoffs'::regclass),
  'loan_payoffs keeps row level security on');
select pg_temp.check(
  (select count(*) = 1 from pg_policies
    where schemaname = 'public' and tablename = 'loan_payoffs' and cmd = 'ALL'
      and qual = '(auth.uid() = user_id)' and with_check = '(auth.uid() = user_id)')
  and (select count(*) = 1 from pg_policies where schemaname = 'public' and tablename = 'loan_payoffs'),
  'its one policy keeps each person to their own rows, for every command');
select pg_temp.check(
  (select array_agg(column_name || ':' || data_type || ':' || is_nullable order by ordinal_position)
     from information_schema.columns where table_schema = 'public' and table_name = 'loan_payoffs')
  = array['id:uuid:NO', 'user_id:uuid:NO', 'bill_id:uuid:NO', 'paid_on:date:NO', 'amount:numeric:NO',
          'kind:text:NO', 'card_id:uuid:YES', 'bank_account_id:uuid:YES', 'counted:boolean:NO',
          'bill_ends_on_before:date:YES', 'bill_next_due_on_before:date:YES',
          'created_at:timestamp with time zone:NO'],
  'its columns, in order');
select pg_temp.check(
  (select numeric_precision = 14 and numeric_scale = 2 from information_schema.columns
    where table_schema = 'public' and table_name = 'loan_payoffs' and column_name = 'amount'),
  'the amount is numeric(14,2), as every other amount');
select pg_temp.check(
  (select confrelid = 'public.loans'::regclass and confdeltype = 'c'
          and (select attname from pg_attribute where attrelid = confrelid and attnum = confkey[1]) = 'bill_id'
     from pg_constraint where conrelid = 'public.loan_payoffs'::regclass and contype = 'f'
      and conkey = array[(select attnum from pg_attribute where attrelid = 'public.loan_payoffs'::regclass and attname = 'bill_id')]),
  'a payoff hangs off its loan by the loan''s bill id, and goes with it');
select pg_temp.check(
  (select count(*) = 2 from pg_constraint
    where conrelid = 'public.loan_payoffs'::regclass and contype = 'f' and confdeltype = 'n'
      and confrelid in ('public.cards'::regclass, 'public.bank_accounts'::regclass)),
  'a deleted card or account leaves its payoffs on Skip');
select pg_temp.check(
  (select indisunique and pg_get_expr(indpred, indrelid) = '(kind = ''full''::text)'
     from pg_index where indexrelid = 'public.loan_payoffs_one_full'::regclass),
  'a loan is paid off in full once');
select pg_temp.check(
  exists (select 1 from pg_publication_tables
           where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loan_payoffs')
  and (select relreplident = 'f' from pg_class where oid = 'public.loan_payoffs'::regclass),
  'it is published for realtime, whole rows');

-- ---------------------------------------------------------------- the functions
select pg_temp.check(
  (select bool_and(not p.prosecdef and p.proconfig = array['search_path=public']
                   and p.proowner::regrole::text = 'postgres')
     from pg_proc p where p.pronamespace = 'public'::regnamespace
      and p.proname in ('record_loan_payoff', 'delete_loan_payoff', 'update_loan'))
  and (select count(*) = 3 from pg_proc p where p.pronamespace = 'public'::regnamespace
      and p.proname in ('record_loan_payoff', 'delete_loan_payoff', 'update_loan')),
  'record, delete and update_loan are one function each, run as the caller, on search_path public');
select pg_temp.check(
  bool_and(has_function_privilege('authenticated', f, 'execute')
           and not has_function_privilege('anon', f, 'execute')
           and not has_function_privilege('public', f, 'execute')),
  'signed-in people may call each, signed-out ones may not')
from unnest(array[
  'public.record_loan_payoff(uuid,date,numeric,text,uuid,uuid,date,date,uuid)',
  'public.delete_loan_payoff(uuid,date)',
  'public.update_loan(uuid,text,text,numeric,numeric,integer,numeric,numeric,date,date,text,uuid,uuid,boolean,integer,jsonb,date,date)'
]) f;
select pg_temp.check(
  (select array_agg(p.parameter_name::text || coalesce('=' || p.parameter_default, '') order by p.ordinal_position)
     from information_schema.parameters p
     join information_schema.routines r on r.specific_name = p.specific_name
    where r.routine_schema = 'public' and r.routine_name = 'record_loan_payoff')
  = array['p_bill_id', 'p_paid_on', 'p_amount', 'p_kind', 'p_card_id', 'p_bank_account_id',
          'p_last_payment_on=NULL::date', 'p_today=NULL::date', 'p_id=NULL::uuid'],
  'record_loan_payoff''s parameters, in the order the app names them, the app''s own id last');
select pg_temp.check(
  (select array_agg(p.parameter_name::text || coalesce('=' || p.parameter_default, '') order by p.ordinal_position)
     from information_schema.parameters p
     join information_schema.routines r on r.specific_name = p.specific_name
    where r.routine_schema = 'public' and r.routine_name = 'delete_loan_payoff')
  = array['p_id', 'p_last_payment_on=NULL::date'],
  'delete_loan_payoff''s parameters');

-- ---------------------------------------------------------------- partial payoffs
-- The wireframe's car loan, added on 12 Oct after paying since Jan 2025, charged on 27 Oct.
select pg_temp.as_user('e1');
select pg_temp.save_on('Partial', '2025-01-27', 48, '2026-10-12', $x$, p_counts_from => '2026-10-12'$x$);
select pg_temp.charge('Partial', '2026-10-27');
select pg_temp.check(pg_temp.dates('Partial') = '2026-10-12 2026-10-27 2028-12-27', 'saved as the add flow saves it');

create temp table v as select pg_temp.version('Partial') as before;
create temp table first_partial as
  select pg_temp.pay('Partial', '2026-11-03', 3000, 'partial', '2026-11-03', '2028-05-27',
    p_card => null, p_account => '00000000-0000-0000-0000-0000000a00e1') as id;
grant select on v, first_partial to authenticated;
select pg_temp.check(
  (select p.user_id = '00000000-0000-0000-0000-0000000000e1' and p.bill_id = (pg_temp.bill('Partial')).id
          and p.paid_on = '2026-11-03' and p.amount = 3000 and p.kind = 'partial'
          and p.card_id is null and p.bank_account_id = '00000000-0000-0000-0000-0000000a00e1'
          and p.counted and p.bill_ends_on_before = '2028-12-27' and p.bill_next_due_on_before is null
     from public.loan_payoffs p where p.id = (select id from first_partial)),
  'a partial payoff is stored as paid, from its own account, counted, with the end it replaced');
-- Its next date was still October's, already charged, as the sweep had not run; the bill's update
-- moves it on to November's, as the sweep would (the next-due floor, 20261013600005).
select pg_temp.check(
  pg_temp.dates('Partial') = '2026-10-12 2026-11-27 2028-05-27',
  'it ends the bill on the schedule''s new last payment; its next payment is the one after October''s charge');
select pg_temp.check(
  pg_temp.would_record('Partial', '2029-12-31') like '2026-11-27 % 2028-05-27',
  'so the instalments the loan no longer has are never charged');
select pg_temp.check(
  (select count(*) = 1 from public.charges where bill_id = (pg_temp.bill('Partial')).id),
  'and it is no charge: the instalments stay one a month');

select pg_temp.pay('Partial', '2026-11-10', 500.55, 'partial', '2026-11-10', '2028-04-27', p_card => null);
select pg_temp.check(
  pg_temp.payoffs_of('Partial') = '2026-11-03 3000.00 partial, 2026-11-10 500.55 partial'
  and (pg_temp.bill('Partial')).ends_on = '2028-04-27'
  and (select card_id is null and bank_account_id is null from public.loan_payoffs where paid_on = '2026-11-10'),
  'a second partial payoff, paid with Skip, is kept beside the first and shortens the loan again');

select pg_temp.check((select before from v) <> pg_temp.version('Partial'), 'the bill was written');
update v set before = pg_temp.version('Partial');
select pg_temp.pay('Partial', '2026-11-12', 1, 'partial', '2026-11-12');
select pg_temp.check(
  (pg_temp.bill('Partial')).ends_on = '2028-04-27' and (select before from v) <> pg_temp.version('Partial'),
  'one with no new last payment keeps the end, and still writes the bill, for the other phones');

-- Kept out of monthly spending: its payoff is not counted.
select pg_temp.save_on('Kept out', '2026-11-27', 48, '2026-10-12', $x$, p_in_spending => false$x$);
select pg_temp.pay('Kept out', '2026-10-28', 2000, 'partial', '2026-10-30', '2030-03-27');
select pg_temp.check(
  (select not counted from public.loan_payoffs p join public.bills b on b.id = p.bill_id where b.name = 'Kept out'),
  'a payoff on a loan kept out of monthly spending is kept out too');

-- Paid before the day the loan was added: it lowers the balance, but is not this app's spending
-- (F1, as its instalments). The add day is the person's own: 12:00 UTC on 12 Oct is 13 Oct in
-- Kiritimati.
select pg_temp.save_on('Before add day', '2026-01-27', 24, '2026-10-12');
select pg_temp.pay('Before add day', '2026-10-11', 100, 'partial', '2026-10-20', '2027-12-27');
select pg_temp.pay('Before add day', '2026-10-12', 100, 'partial', '2026-10-20', '2027-12-27');
select pg_temp.check(
  (select string_agg(paid_on || ' ' || counted, ', ' order by paid_on) from public.loan_payoffs p
     join public.bills b on b.id = p.bill_id where b.name = 'Before add day')
  = '2026-10-11 false, 2026-10-12 true',
  'a payoff before the day the loan was added is not counted; one on that day is');
reset role;
update public.profiles set timezone = 'Pacific/Kiritimati' where id = '00000000-0000-0000-0000-0000000000e1';
select pg_temp.as_user('e1');
select pg_temp.save_on('Add day in their zone', '2026-01-27', 24, '2026-10-12');
select pg_temp.pay('Add day in their zone', '2026-10-12', 100, 'partial', '2026-10-20', '2027-12-27');
select pg_temp.pay('Add day in their zone', '2026-10-13', 100, 'partial', '2026-10-20', '2027-12-27');
select pg_temp.check(
  (select string_agg(paid_on || ' ' || counted, ', ' order by paid_on) from public.loan_payoffs p
     join public.bills b on b.id = p.bill_id where b.name = 'Add day in their zone')
  = '2026-10-12 false, 2026-10-13 true',
  'the add day is the person''s own, in their timezone');
reset role;
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000e1';
select pg_temp.as_user('e1');

-- ---------------------------------------------------------------- full payoffs
-- Charged January to October, paid off on 3 Nov. These loans keep January's next date while their
-- months are charged, as no sweep runs here; the first write to the bill moves it on to the month
-- after the newest charge, as the sweep would (the next-due floor, 20261013600005). Nothing reads
-- a next date past the bill's end as due.
select pg_temp.save_on('Full', '2026-01-27', 24, '2026-01-20');
select pg_temp.charge('Full', ('2026-01-27'::date + make_interval(months => m))::date) from generate_series(0, 9) m;
select pg_temp.check(pg_temp.would_record('Full', '2026-11-27') = '2026-11-27', 'before: November is still to be charged');
update v set before = pg_temp.version('Full');
create temp table full_id as select pg_temp.pay('Full', '2026-11-03', 8900.12, 'full', '2026-11-03', '2026-11-03') as id;
grant select on full_id to authenticated;
select pg_temp.check(
  pg_temp.dates('Full') = '2026-01-27 2026-11-27 2026-11-03'
  and (select before from v) <> pg_temp.version('Full'),
  'a full payoff ends the bill on its date');
select pg_temp.check(
  pg_temp.would_record('Full', '2027-12-31') = '-'
  and (select count(*) = 10 from public.charges where bill_id = (pg_temp.bill('Full')).id),
  'so nothing after it is charged, and the ten charges made stay');
select pg_temp.check(
  (select kind = 'full' and counted and bill_ends_on_before = '2027-12-27' and card_id = '00000000-0000-0000-0000-0000000c00e1'
     from public.loan_payoffs where id = (select id from full_id)),
  'it keeps the end it replaced, for removing it to put back');

select pg_temp.expect_error($s$select pg_temp.pay('Full', '2026-11-03', 1, 'partial', '2026-11-04')$s$,
  'P0001', 'the loan is already paid off');
select pg_temp.expect_error($s$select pg_temp.pay('Full', '2026-11-04', 1, 'full', '2026-11-04')$s$,
  'P0001', 'the loan is already paid off');

-- Paid off before its first payment, on the payment day of the month before it: the bill must not
-- walk to that day, nor to the first payment.
select pg_temp.save_on('Before first', '2026-11-27', 48, '2026-10-12');
select pg_temp.check(pg_temp.dates('Before first') = '2026-11-27 2026-11-27 2030-10-27', 'saved before its first payment');
create temp table before_first as select pg_temp.pay('Before first', '2026-10-27', 18030.55, 'full', '2026-10-30') as id;
grant select on before_first to authenticated;
select pg_temp.check(
  pg_temp.dates('Before first') = '2026-11-27 - 2026-11-27'
  and pg_temp.would_record('Before first', '2031-01-01') = '-',
  'paid off before it counts at all: it stops, nothing is ever charged, and its floor stays');

-- Added late (12 Oct), paid off on 1 Oct, after the 27 Sep payment it was added after.
select pg_temp.save_on('Before added', '2025-01-27', 48, '2026-10-12', $x$, p_counts_from => '2026-10-12'$x$);
select pg_temp.pay('Before added', '2026-10-01', 10900, 'full', '2026-10-12');
select pg_temp.check(
  pg_temp.dates('Before added') = '2026-10-12 - 2026-10-12'
  and pg_temp.would_record('Before added', '2031-01-01') = '-'
  and (select not counted from public.loan_payoffs p join public.bills b on b.id = p.bill_id
        where b.name = 'Before added'),
  'paid off before the day it was added: it stops the same way, and is not counted as spending');

-- ---------------------------------------------------------------- nothing paid after a full payoff
select pg_temp.save_on('R5', '2026-01-27', 24, '2026-01-20');
select pg_temp.charge('R5', ('2026-01-27'::date + make_interval(months => m))::date) from generate_series(0, 9) m;
select pg_temp.expect_error($s$select pg_temp.pay('R5', '2026-10-20', 9000, 'full', '2026-11-03')$s$,
  'P0001', 'a full payoff must come after the last payment made');
select pg_temp.expect_error($s$select pg_temp.pay('R5', '2026-09-27', 9000, 'full', '2026-11-03')$s$,
  'P0001', 'a full payoff must come after the last payment made');
select pg_temp.pay('R5', '2026-10-20', 900, 'partial', '2026-11-03', '2027-10-27');
select pg_temp.check(pg_temp.payoffs_of('R5') = '2026-10-20 900.00 partial',
  'a partial payoff may come before a payment made');

-- On the payment day itself: the payoff posts after that day's instalment, which counts once.
select pg_temp.save_on('Payment day', '2026-01-27', 24, '2026-01-20');
select pg_temp.charge('Payment day', ('2026-01-27'::date + make_interval(months => m))::date) from generate_series(0, 9) m;
select pg_temp.pay('Payment day', '2026-10-27', 9000, 'full', '2026-11-03');
select pg_temp.check(
  pg_temp.dates('Payment day') = '2026-01-27 2026-11-27 2026-10-27'
  and pg_temp.would_record('Payment day', '2027-12-31') = '-'
  and (select count(*) = 1 from public.charges
        where bill_id = (pg_temp.bill('Payment day')).id and charged_on = '2026-10-27'),
  'a full payoff on a payment day ends the bill that day, its instalment charged once, nothing after');

-- Kept out, so nothing is charged: the schedule says what was made.
select pg_temp.save_on('R5 schedule', '2026-01-27', 24, '2026-01-20', $x$, p_in_spending => false$x$);
select pg_temp.expect_error($s$select pg_temp.pay('R5 schedule', '2026-10-20', 9000, 'full', '2026-11-03')$s$,
  'P0001', 'a full payoff must come after the last payment made');
select pg_temp.expect_error($s$select pg_temp.pay('R5 schedule', '2026-10-28', 9000, 'full', '2026-10-27')$s$,
  'P0001', 'a payoff cannot be dated after today');
select pg_temp.pay('R5 schedule', '2026-10-27', 9000, 'full', '2026-10-27');
select pg_temp.check(pg_temp.dates('R5 schedule') = '2026-01-27 2026-01-27 2026-10-27',
  'with nothing charged, a scheduled payment up to today is a payment made, and its own day may take the payoff');

-- Day 31: payments on 31 Jan, 28 Feb, 31 Mar.
select pg_temp.save_on('R5 day 31', '2026-01-31', 12, '2026-01-20', $x$, p_payment_day => 31, p_in_spending => false$x$);
select pg_temp.expect_error($s$select pg_temp.pay('R5 day 31', '2026-02-27', 5000, 'full', '2026-03-01')$s$,
  'P0001', 'a full payoff must come after the last payment made');
select pg_temp.pay('R5 day 31', '2026-03-01', 5000, 'full', '2026-03-30');
select pg_temp.check((pg_temp.bill('R5 day 31')).ends_on = '2026-03-01',
  'a day-31 loan''s clamped 28 Feb is a payment made, and 31 Mar is still to come on the 30th');

-- A day-31 loan whose bill drifted to the 28th (the roll forward keeps a clamped day): March was
-- charged on the 28th, before the schedule's 31st. Only the charge says that payment was made.
select pg_temp.save_on('R5 drifted', '2026-01-31', 12, '2026-01-20', $x$, p_payment_day => 31$x$);
select pg_temp.charge('R5 drifted', d) from (values ('2026-01-31'::date), ('2026-02-28'), ('2026-03-28')) v(d);
select pg_temp.expect_error($s$select pg_temp.pay('R5 drifted', '2026-03-27', 5000, 'full', '2026-03-30')$s$,
  'P0001', 'a full payoff must come after the last payment made');
select pg_temp.pay('R5 drifted', '2026-03-28', 5000, 'full', '2026-03-30');
select pg_temp.check((pg_temp.bill('R5 drifted')).ends_on = '2026-03-28',
  'a payment charged off the schedule''s day is a payment made too');

-- A first payment pinned off the payment day: 10 Jan, then the 27th from February.
select pg_temp.save_on('R5 pinned', '2026-01-10', 12, '2026-01-01', $x$, p_payment_day => 27, p_in_spending => false$x$);
select pg_temp.pay('R5 pinned', '2026-01-15', 5000, 'full', '2026-02-01');
select pg_temp.check((pg_temp.bill('R5 pinned')).ends_on = '2026-01-15',
  'there is no payment on 27 Jan when the first was pinned to the 10th');

-- Another payoff after the full one would be after the loan ended.
select pg_temp.save_on('R5 later payoff', '2026-11-27', 48, '2026-10-12');
select pg_temp.pay('R5 later payoff', '2026-11-02', 100, 'partial', '2026-11-05');
select pg_temp.expect_error($s$select pg_temp.pay('R5 later payoff', '2026-11-01', 9000, 'full', '2026-11-05')$s$,
  'P0001', 'a full payoff must come after the last payment made');
select pg_temp.pay('R5 later payoff', '2026-11-02', 9000, 'full', '2026-11-05');
select pg_temp.check(pg_temp.payoffs_of('R5 later payoff') = '2026-11-02 100.00 partial, 2026-11-02 9000.00 full',
  'the same day as a partial payoff is fine');

-- ---------------------------------------------------------------- refusals change nothing
select pg_temp.save_on('Refused', '2026-11-27', 48, '2026-10-12');
create temp table refused_before as
  select to_jsonb(b) - 'updated_at' as row from public.bills b where b.name = 'Refused';
grant select on refused_before to authenticated;
select pg_temp.expect_error($s$select pg_temp.pay('Refused', '2026-10-21', 100, 'partial', '2026-10-20')$s$,
  'P0001', 'a payoff cannot be dated after today');
select pg_temp.expect_error($s$select pg_temp.pay('Refused', '2026-10-26', 100, 'partial', '2026-10-30')$s$,
  'P0001', 'a payoff cannot be dated before the loan started');
select pg_temp.expect_error($s$select pg_temp.pay('Refused', '2026-10-27', 0, 'partial', '2026-10-30')$s$,
  'P0001', 'a payoff is an amount above zero, in whole cents');
select pg_temp.expect_error($s$select pg_temp.pay('Refused', '2026-10-27', -5, 'partial', '2026-10-30')$s$,
  'P0001', 'a payoff is an amount above zero, in whole cents');
select pg_temp.expect_error($s$select pg_temp.pay('Refused', '2026-10-27', 10.001, 'partial', '2026-10-30')$s$,
  'P0001', 'a payoff is an amount above zero, in whole cents');
select pg_temp.expect_error($s$select pg_temp.pay('Refused', '2026-10-27', 100, 'some', '2026-10-30')$s$,
  'P0001', 'a payoff is full or partial');
select pg_temp.expect_error($s$select pg_temp.pay('Refused', null, 100, 'partial', '2026-10-30')$s$,
  'P0001', 'a payoff needs its date');
select pg_temp.expect_error($s$select pg_temp.pay('Refused', '2026-10-27', 100, 'partial', '2026-10-30', '2030-10-28')$s$,
  'P0001', 'the last payment must fall within the term');
select pg_temp.expect_error($s$select pg_temp.pay('Refused', '2026-10-27', 100, 'partial', '2026-10-30', '2026-10-26')$s$,
  'P0001', 'the last payment must fall within the term');
select pg_temp.expect_error($s$select pg_temp.pay('Refused', '2026-12-01', 100, 'partial', '2026-12-30', '2026-11-27')$s$,
  'P0001', 'the last payment must fall within the term');
select pg_temp.expect_error($s$select pg_temp.pay('Refused', '2026-10-27', 100, 'partial', '2026-10-30',
  p_card => '00000000-0000-0000-0000-0000000c00e3')$s$, '23514', 'one of your own cards');
select pg_temp.expect_error($s$select pg_temp.pay('Refused', '2026-10-27', 100, 'partial', '2026-10-30',
  p_card => null, p_account => '00000000-0000-0000-0000-0000000a00e3')$s$, '23514', 'one of your own accounts');
select pg_temp.expect_error($s$select pg_temp.pay('Refused', '2026-10-27', 100, 'partial', '2026-10-30',
  p_account => '00000000-0000-0000-0000-0000000a00e1')$s$, '23514', 'loan_payoffs_single_source');
select pg_temp.check(
  (select to_jsonb(b) - 'updated_at' from public.bills b where b.name = 'Refused') = (select row from refused_before)
  and pg_temp.payoffs_of('Refused') = '-',
  'every refused payoff leaves the bill as it was and records nothing');

-- Ended on 27 Sep: a payoff dated after it is after the loan.
select pg_temp.save_on('Finished', '2025-10-27', 12, '2025-10-01');
select pg_temp.expect_error($s$select pg_temp.pay('Finished', '2026-10-01', 100, 'partial', '2026-10-30')$s$,
  'P0001', 'the loan had already finished by then');

reset role;
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on)
values ('00000000-0000-0000-0000-0000000000e1', 'Rent, not a loan', 1500, 'housing', 'monthly', '2026-11-01', '2026-11-01');
with b as (
  insert into public.bills (user_id, name, amount, category_id, icon_id, recurrence, next_due_on, starts_on, ends_on)
  values ('00000000-0000-0000-0000-0000000000e3', 'Theirs', 400, 'loans', 'loan-car', 'monthly',
          '2026-11-01', '2026-11-01', '2028-10-01')
  returning id
)
insert into public.loans (user_id, bill_id, principal, annual_rate, term_months, monthly_payment, total_interest, first_payment_on)
select '00000000-0000-0000-0000-0000000000e3', b.id, 9000, 5, 24, 400, 600, '2026-11-01' from b;
insert into public.loan_payoffs (user_id, bill_id, paid_on, amount, kind, counted)
select '00000000-0000-0000-0000-0000000000e3', id, '2026-10-02', 50, 'partial', true from public.bills where name = 'Theirs';
create temp table theirs as
  select b.id as bill_id, p.id as payoff_id, to_jsonb(b) as bill, to_jsonb(p) as payoff
  from public.bills b join public.loan_payoffs p on p.bill_id = b.id where b.name = 'Theirs';
grant select on theirs to authenticated;

select pg_temp.as_user('e1');
select pg_temp.expect_error($s$select pg_temp.pay('Rent, not a loan', '2026-10-27', 100, 'partial', '2026-10-30')$s$,
  'P0002', 'there is no such loan');
select pg_temp.expect_error($s$select public.record_loan_payoff(gen_random_uuid(), '2026-10-27', 100, 'partial', null, null)$s$,
  'P0002', 'there is no such loan');
select pg_temp.expect_error($s$select public.record_loan_payoff((select bill_id from theirs), '2026-10-27', 100, 'partial', null, null)$s$,
  'P0002', 'there is no such loan');
select pg_temp.check(
  (select count(*) = 0 from public.loan_payoffs where id = (select payoff_id from theirs)),
  'another person''s payoffs are not seen');
select pg_temp.check(
  (select public.delete_loan_payoff((select payoff_id from theirs))) = false,
  'nor removed: their payoff reads as already gone');

-- Written straight to the table, not through the function: own rows only.
select pg_temp.expect_error(
  $s$insert into public.loan_payoffs (user_id, bill_id, paid_on, amount, kind, counted)
     values ('00000000-0000-0000-0000-0000000000e1', (select bill_id from theirs), '2026-10-02', 50, 'partial', true)$s$,
  '23514', 'one of your own loans');
select pg_temp.expect_error(
  $s$insert into public.loan_payoffs (user_id, bill_id, paid_on, amount, kind, counted)
     values ('00000000-0000-0000-0000-0000000000e3', (pg_temp.bill('Refused')).id, '2026-10-02', 50, 'partial', true)$s$,
  '23514', 'one of your own loans');
update public.loan_payoffs set amount = 1 where id = (select payoff_id from theirs);
delete from public.loan_payoffs where id = (select payoff_id from theirs);
select pg_temp.expect_error(
  $s$insert into public.loan_payoffs (user_id, bill_id, paid_on, amount, kind, counted)
     values ('00000000-0000-0000-0000-0000000000e1', (pg_temp.bill('Refused')).id, '2026-10-02', 50, 'full', true),
            ('00000000-0000-0000-0000-0000000000e1', (pg_temp.bill('Refused')).id, '2026-10-03', 50, 'full', true)$s$,
  '23505', 'loan_payoffs_one_full');

set local role anon;
select pg_temp.expect_error($s$select public.record_loan_payoff(gen_random_uuid(), '2026-10-27', 100, 'partial', null, null)$s$,
  '42501', 'permission denied for function record_loan_payoff');
select pg_temp.expect_error($s$select public.delete_loan_payoff(gen_random_uuid())$s$,
  '42501', 'permission denied for function delete_loan_payoff');
reset role;
select set_config('request.jwt.claims', '', true);
set local role authenticated;
select pg_temp.expect_error($s$select public.record_loan_payoff(gen_random_uuid(), '2026-10-27', 100, 'partial', null, null)$s$,
  'P0001', 'not authenticated');
select pg_temp.expect_error($s$select public.delete_loan_payoff(gen_random_uuid())$s$,
  'P0001', 'not authenticated');
reset role;
select pg_temp.check(
  (select bool_and(to_jsonb(b) = t.bill and to_jsonb(p) = t.payoff)
     from theirs t join public.bills b on b.id = t.bill_id join public.loan_payoffs p on p.id = t.payoff_id),
  'another person''s loan and payoff are exactly as they were');

-- ---------------------------------------------------------------- removing a payoff
select pg_temp.as_user('e1');
update v set before = pg_temp.version('Full');
select pg_temp.check((select public.delete_loan_payoff((select id from full_id))), 'removing a payoff says it did');
select pg_temp.check(
  pg_temp.dates('Full') = '2026-01-27 2026-11-27 2027-12-27'
  and pg_temp.would_record('Full', '2026-11-27') = '2026-11-27'
  and (select before from v) <> pg_temp.version('Full')
  and pg_temp.payoffs_of('Full') = '-',
  'removing a full payoff puts the end back, and the instalment it stood in for is charged again');
select pg_temp.check((select not public.delete_loan_payoff((select id from full_id))),
  'removing it again is nothing, not an error');

create temp table refull as select pg_temp.pay('Full', '2026-11-03', 8900.12, 'full', '2026-11-03') as id;
grant select on refull to authenticated;
select pg_temp.expect_error($s$select public.delete_loan_payoff((select id from refull), '2028-01-28')$s$,
  'P0001', 'the last payment must fall within the term');
select pg_temp.check(pg_temp.dates('Full') = '2026-01-27 2026-11-27 2026-11-03', 'a refused removal keeps the payoff');
select public.delete_loan_payoff((select id from refull), '2027-11-27');
select pg_temp.check(pg_temp.dates('Full') = '2026-01-27 2026-11-27 2027-11-27',
  'with the last payment the app sends, the bill ends there');

select public.delete_loan_payoff((select id from before_first));
select pg_temp.check(
  pg_temp.dates('Before first') = '2026-11-27 2026-11-27 2030-10-27'
  and pg_temp.would_record('Before first', '2026-11-27') = '2026-11-27',
  'removing the payoff that stopped a loan starts it again from its next due date and its floor');

create temp table partial_before as select to_jsonb(b) - 'updated_at' as row from public.bills b where b.name = 'Partial';
grant select on partial_before to authenticated;
select pg_temp.expect_error($s$select public.delete_loan_payoff((select id from first_partial), '2028-05-27')$s$,
  'P0001', 'only the latest payoff can be removed');
select pg_temp.check(
  pg_temp.payoffs_of('Partial') = '2026-11-03 3000.00 partial, 2026-11-10 500.55 partial, 2026-11-12 1.00 partial'
  and (select to_jsonb(b) - 'updated_at' from public.bills b where b.name = 'Partial') = (select row from partial_before),
  'an earlier payoff cannot be removed while a later one stands; nothing changes');
update v set before = pg_temp.version('Partial');
select public.delete_loan_payoff((select id from public.loan_payoffs where paid_on = '2026-11-12' and amount = 1));
select pg_temp.check(
  (pg_temp.bill('Partial')).ends_on = '2028-04-27' and (select before from v) <> pg_temp.version('Partial'),
  'the latest, removed without a last payment, leaves the end, and still writes the bill');
select public.delete_loan_payoff((select id from public.loan_payoffs where paid_on = '2026-11-10'), '2028-05-27');
select public.delete_loan_payoff((select id from first_partial), '2028-12-27');
select pg_temp.check(
  pg_temp.dates('Partial') = '2026-10-12 2026-11-27 2028-12-27' and pg_temp.payoffs_of('Partial') = '-',
  'removed latest first, each ends the bill where the app says the others leave it');

-- Added late (20 May), charged in May and June, a partial payoff on 1 Jun, then stopped early by
-- an edit (last payment 27 Jun). Removing the payoff with no last payment, as the page does for a
-- stopped loan, leaves the bill stopped: restarting it from its old next date would write January
-- to April, from before it was added.
select pg_temp.save_on('Stopped early', '2026-01-27', 24, '2026-05-20', $x$, p_counts_from => '2026-05-20'$x$);
select pg_temp.charge('Stopped early', d) from (values ('2026-05-27'::date), ('2026-06-27')) v(d);
create temp table stopped_partial as
  select pg_temp.pay('Stopped early', '2026-06-01', 3000, 'partial', '2026-06-01', '2027-08-27') as id;
grant select on stopped_partial to authenticated;
select pg_temp.check(
  (select bill_next_due_on_before is null and bill_ends_on_before = '2027-12-27'
     from public.loan_payoffs where id = (select id from stopped_partial)),
  'a partial payoff that stops nothing takes no next due date');
select * from public.update_loan(
  p_bill_id => (pg_temp.bill('Stopped early')).id, p_name => 'Stopped early', p_icon_id => 'loan-car',
  p_principal => 18000, p_annual_rate => 6.25, p_term_months => 24, p_monthly_payment => 424.80,
  p_total_interest => 2390.10, p_first_payment_on => '2026-01-27', p_funded_on => null,
  p_day_count_basis => 'actual/365', p_card_id => '00000000-0000-0000-0000-0000000c00e1',
  p_bank_account_id => null, p_in_spending => true, p_last_payment_on => '2026-06-27',
  p_today => '2026-10-20');
select pg_temp.check(pg_temp.dates('Stopped early') = '2026-01-27 - 2026-06-27', 'the edit stopped it');
update v set before = pg_temp.version('Stopped early');
select pg_temp.check((select public.delete_loan_payoff((select id from stopped_partial))), 'removed');
select pg_temp.check(
  pg_temp.dates('Stopped early') = '2026-01-27 - 2026-06-27'
  and pg_temp.would_record('Stopped early', '2026-10-20') = '-'
  and (select before from v) <> pg_temp.version('Stopped early'),
  'a loan stopped early stays stopped where it was, nothing back-filled, and the bill is still written');

-- A partial, then the full payoff: the full one goes first, back to the partial's end.
select pg_temp.save_on('Both', '2026-01-27', 24, '2026-01-20');
select pg_temp.pay('Both', '2026-03-03', 2000, 'partial', '2026-03-03', '2027-08-27');
select pg_temp.pay('Both', '2026-04-03', 9000, 'full', '2026-04-03');
select pg_temp.expect_error($s$select public.delete_loan_payoff((select p.id from public.loan_payoffs p
  join public.bills b on b.id = p.bill_id where b.name = 'Both' and p.kind = 'partial'), '2027-12-27')$s$,
  'P0001', 'only the latest payoff can be removed');
select public.delete_loan_payoff((select p.id from public.loan_payoffs p join public.bills b on b.id = p.bill_id
  where b.name = 'Both' and p.kind = 'full'));
select pg_temp.check(
  (pg_temp.bill('Both')).ends_on = '2027-08-27' and pg_temp.payoffs_of('Both') = '2026-03-03 2000.00 partial',
  'the full payoff removed, the bill ends where the partial left it');

-- Recorded out of date order: a partial back-dated after another was recorded. The latest is the
-- one dated last (the schedule's order), not the one recorded last.
select pg_temp.save_on('Back-dated', '2026-01-27', 24, '2026-01-20');
select pg_temp.pay('Back-dated', '2026-11-10', 100, 'partial', '2026-11-12', '2027-12-27');
update public.loan_payoffs set created_at = created_at - interval '1 hour'
 where bill_id = (pg_temp.bill('Back-dated')).id;
select pg_temp.pay('Back-dated', '2026-11-03', 100, 'partial', '2026-11-12', '2027-12-27');
select pg_temp.expect_error($s$select public.delete_loan_payoff((select p.id from public.loan_payoffs p
  join public.bills b on b.id = p.bill_id where b.name = 'Back-dated' and p.paid_on = '2026-11-03'))$s$,
  'P0001', 'only the latest payoff can be removed');
select pg_temp.check((select public.delete_loan_payoff((select p.id from public.loan_payoffs p
  join public.bills b on b.id = p.bill_id where b.name = 'Back-dated' and p.paid_on = '2026-11-10'))),
  'the latest is the one dated last, even when another was recorded after it');

-- Two the same day, in the order recorded: the later one is the latest.
reset role;
select pg_temp.as_user('e1');
select pg_temp.save_on('Same day', '2026-01-27', 24, '2026-01-20');
select pg_temp.pay('Same day', '2026-03-03', 100, 'partial', '2026-03-03', '2027-12-27');
update public.loan_payoffs set created_at = created_at - interval '1 minute'
 where bill_id = (pg_temp.bill('Same day')).id;
select pg_temp.pay('Same day', '2026-03-03', 9000, 'full', '2026-03-03');
select pg_temp.expect_error($s$select public.delete_loan_payoff((select p.id from public.loan_payoffs p
  join public.bills b on b.id = p.bill_id where b.name = 'Same day' and p.kind = 'partial'))$s$,
  'P0001', 'only the latest payoff can be removed');
select pg_temp.check((select public.delete_loan_payoff((select p.id from public.loan_payoffs p
  join public.bills b on b.id = p.bill_id where b.name = 'Same day' and p.kind = 'full'))),
  'of two the same day, the one recorded last is the one that can go');

-- ---------------------------------------------------------------- an edit of a paid-off loan
select pg_temp.save_on('Edited', '2026-01-27', 24, '2026-01-20');
select pg_temp.charge('Edited', ('2026-01-27'::date + make_interval(months => m))::date) from generate_series(0, 9) m;
create temp table edited_full as select pg_temp.pay('Edited', '2026-11-03', 8900, 'full', '2026-11-03') as id;
grant select on edited_full to authenticated;
select * from public.update_loan(
  p_bill_id => (pg_temp.bill('Edited')).id, p_name => 'Edited', p_icon_id => 'loan-car',
  p_principal => 18000, p_annual_rate => 6.25, p_term_months => 36, p_monthly_payment => 424.80,
  p_total_interest => 2390.10, p_first_payment_on => '2026-01-27', p_funded_on => null,
  p_day_count_basis => 'actual/365', p_card_id => '00000000-0000-0000-0000-0000000c00e1',
  p_bank_account_id => null, p_in_spending => true, p_today => '2026-11-10');
select pg_temp.check(
  (pg_temp.bill('Edited')).ends_on = '2026-11-03'
  and pg_temp.would_record('Edited', '2027-12-31') = '-'
  and (select bill_ends_on_before = '2028-12-27' from public.loan_payoffs where id = (select id from edited_full)),
  'an edit keeps a paid-off loan ended on its payoff day, and the payoff keeps the edit''s end');
select public.delete_loan_payoff((select id from edited_full));
select pg_temp.check(
  (pg_temp.bill('Edited')).ends_on = '2028-12-27'
  and pg_temp.would_record('Edited', '2026-11-27') = '2026-11-27',
  'so removing the payoff afterwards ends the loan as edited');

select pg_temp.save_on('Edited before first', '2026-11-27', 48, '2026-10-12');
select pg_temp.pay('Edited before first', '2026-10-28', 18000, 'full', '2026-10-28');
select * from public.update_loan(
  p_bill_id => (pg_temp.bill('Edited before first')).id, p_name => 'Edited before first', p_icon_id => 'loan-car',
  p_principal => 18000, p_annual_rate => 6.25, p_term_months => 48, p_monthly_payment => 424.80,
  p_total_interest => 2390.10, p_first_payment_on => '2026-11-27', p_funded_on => null,
  p_day_count_basis => 'actual/365', p_card_id => null, p_bank_account_id => null,
  p_in_spending => true, p_today => '2026-10-30');
select pg_temp.check(
  pg_temp.dates('Edited before first') = '2026-11-27 - 2026-11-27'
  and pg_temp.would_record('Edited before first', '2031-01-01') = '-',
  'an edit of a loan paid off before it counted keeps it stopped');
select public.delete_loan_payoff((select p.id from public.loan_payoffs p join public.bills b on b.id = p.bill_id
  where b.name = 'Edited before first'));
select pg_temp.check(
  pg_temp.dates('Edited before first') = '2026-11-27 2026-11-27 2030-10-27'
  and pg_temp.would_record('Edited before first', '2026-11-27') = '2026-11-27',
  'removing that payoff after the edit starts it again from the next due date the edit gave it');

select pg_temp.save_on('Edited shorter', '2026-01-27', 24, '2026-01-20');
select pg_temp.pay('Edited shorter', '2026-11-03', 8900, 'full', '2026-11-03');
select * from public.update_loan(
  p_bill_id => (pg_temp.bill('Edited shorter')).id, p_name => 'Edited shorter', p_icon_id => 'loan-car',
  p_principal => 18000, p_annual_rate => 6.25, p_term_months => 9, p_monthly_payment => 424.80,
  p_total_interest => 2390.10, p_first_payment_on => '2026-01-27', p_funded_on => null,
  p_day_count_basis => 'actual/365', p_card_id => null, p_bank_account_id => null,
  p_in_spending => true, p_today => '2026-11-10');
select pg_temp.check(
  (pg_temp.bill('Edited shorter')).ends_on = '2026-09-27',
  'an edit that ends the contract before the payoff ends the bill there, never later');

-- ---------------------------------------------------------------- the reminder, on the real day
reset role;
create temp table real_today as select (now() at time zone 'UTC')::date as d;
grant select on real_today to authenticated;
-- Running: last month's payment made, the next in three days; added today.
select pg_temp.as_user('e1');
select pg_temp.save_on('Reminded', (select (d + 3 - interval '1 month')::date from real_today), 12,
  (select d from real_today),
  (select format(', p_payment_day => %s, p_counts_from => %L', extract(day from d + 3)::integer, d)
     from real_today));
reset role;
insert into public.reminders (user_id, bill_id, lead_days, remind_at)
values ('00000000-0000-0000-0000-0000000000e1', (pg_temp.bill('Reminded')).id, 3, '00:00');
select pg_temp.check(
  exists (select 1 from public.reminders_due() r join public.reminders m on m.id = r.reminder_id
           where m.bill_id = (pg_temp.bill('Reminded')).id),
  'before: the payment in three days is reminded today');
select pg_temp.as_user('e1');
select pg_temp.pay('Reminded', (select d from real_today), 18000, 'full', (select d from real_today));
reset role;
select pg_temp.check(
  (pg_temp.bill('Reminded')).ends_on = (select d from real_today)
  and (pg_temp.bill('Reminded')).next_due_on = (select d + 3 from real_today)
  and not exists (select 1 from public.reminders_due() r join public.reminders m on m.id = r.reminder_id
                   where m.bill_id = (pg_temp.bill('Reminded')).id),
  'paid off today, the payment in three days is not reminded');

-- ---------------------------------------------------------------- what goes with what
reset role;
delete from public.cards where id = '00000000-0000-0000-0000-0000000c00e1';
select pg_temp.check(
  (select count(*) > 0 from public.loan_payoffs where user_id = '00000000-0000-0000-0000-0000000000e1')
  and (select count(*) = 0 from public.loan_payoffs where card_id is not null and user_id = '00000000-0000-0000-0000-0000000000e1'),
  'a deleted card leaves its payoffs, on Skip');
select pg_temp.as_user('e1');
delete from public.bills where name = 'R5';
select pg_temp.check(
  (select count(*) = 0 from public.loan_payoffs p where not exists (select 1 from public.loans l where l.bill_id = p.bill_id)),
  'deleting a loan''s bill takes its loan and its payoffs with it');

rollback;
\echo ALL CHECKS PASSED
