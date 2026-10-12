-- Checks for 20261012100002_update_loan.sql. LOCAL database only, with 20261012100001 and it
-- applied: everything runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/update_loan.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".
-- Dates are fixed: each case says when the loan was added and the day it is edited on. What the
-- recorders would write is worked out the way record_due_charges does (plan_occurrences from the
-- bill's floor to that day, one charge a month), so no case depends on the real date.

\set ON_ERROR_STOP on
begin;

-- e1 edits; e3 is someone else, whose loan e1 must not reach.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'update-loan@test.local'),
  ('00000000-0000-0000-0000-0000000000e3', 'update-loan-other@test.local');
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

-- A loan as the add flow saves it, added on p_added (its created_at, which is the day it was added).
create or replace function pg_temp.save_on(
  p_name text, p_first date, p_term integer, p_added date, p_extra text default '')
returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  execute format(
    $f$select (public.save_loan(
       p_name => %L, p_icon_id => 'loan-personal', p_principal => 5000, p_annual_rate => 9,
       p_term_months => %s, p_monthly_payment => 420, p_total_interest => 260,
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

-- The edit page's call: the same figures as save_on unless the case changes them.
create or replace function pg_temp.edit(
  p_name text, p_first date, p_term integer, p_today date,
  p_in_spending boolean default null, p_extra text default '', p_new_name text default null)
returns public.bills
language plpgsql as $$
declare
  v_bill public.bills;
begin
  execute format(
    $f$select * from public.update_loan(
       p_bill_id => %L, p_name => %L, p_icon_id => 'loan-personal', p_principal => 5000,
       p_annual_rate => 9, p_term_months => %s, p_monthly_payment => 420, p_total_interest => 260,
       p_first_payment_on => %L, p_funded_on => null, p_day_count_basis => 'actual/365',
       p_card_id => '00000000-0000-0000-0000-0000000c00e1', p_bank_account_id => null,
       p_in_spending => %L, p_today => %L%s)$f$,
    (pg_temp.bill(p_name)).id, coalesce(p_new_name, p_name), p_term, p_first, p_in_spending,
    p_today, p_extra)
    into v_bill;
  return v_bill;
end $$;

-- A bill and its loan as stored, all but updated_at.
create or replace function pg_temp.row_of(p_name text) returns jsonb
language sql as $$
  select (to_jsonb(b) - 'updated_at') || jsonb_build_object('loan', to_jsonb(l) - 'updated_at')
  from public.bills b join public.loans l on l.bill_id = b.id where b.name = p_name
$$;

create or replace function pg_temp.dates(p_name text) returns text
language sql as $$
  select starts_on || ' ' || coalesce(next_due_on::text, '-') || ' ' || ends_on
  from public.bills where name = p_name
$$;

-- What the recorders would write for the bill by p_on: record_due_charges's walk, one a month.
-- As its owner, because plan_occurrences is the scheduler's alone.
create or replace function pg_temp.would_record(p_name text, p_on date) returns text
language sql security definer as $$
  select coalesce(string_agg(o.d::text, ' ' order by o.d), '-')
  from public.bills b
  cross join lateral public.plan_occurrences(
    b.next_due_on, b.recurrence::text, coalesce(b.starts_on, b.created_at::date),
    least(p_on, coalesce(b.ends_on, p_on))) o(d)
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

-- ---------------------------------------------------------------- the function
select pg_temp.check(
  (select count(*) = 1 from pg_proc where proname = 'update_loan' and pronamespace = 'public'::regnamespace),
  'there is one update_loan');
select pg_temp.check(
  (select not p.prosecdef and p.proconfig = array['search_path=public'] and p.proowner::regrole::text = 'postgres'
     from pg_proc p where p.proname = 'update_loan' and p.pronamespace = 'public'::regnamespace),
  'it runs as the caller, on search_path public, owned by postgres, as save_loan');
select pg_temp.check(
  has_function_privilege('authenticated', 'public.update_loan(uuid,text,text,numeric,numeric,integer,numeric,numeric,date,date,text,uuid,uuid,boolean,integer,jsonb,date,date)', 'execute')
  and not has_function_privilege('anon', 'public.update_loan(uuid,text,text,numeric,numeric,integer,numeric,numeric,date,date,text,uuid,uuid,boolean,integer,jsonb,date,date)', 'execute')
  and not has_function_privilege('public', 'public.update_loan(uuid,text,text,numeric,numeric,integer,numeric,numeric,date,date,text,uuid,uuid,boolean,integer,jsonb,date,date)', 'execute'),
  'signed-in people may call it, signed-out ones may not');
select pg_temp.check(
  (select array_agg(p.parameter_name::text order by p.ordinal_position)
     from information_schema.parameters p
     join information_schema.routines r on r.specific_name = p.specific_name
    where r.routine_schema = 'public' and r.routine_name = 'update_loan')
  = array['p_bill_id', 'p_name', 'p_icon_id', 'p_principal', 'p_annual_rate', 'p_term_months',
          'p_monthly_payment', 'p_total_interest', 'p_first_payment_on', 'p_funded_on',
          'p_day_count_basis', 'p_card_id', 'p_bank_account_id', 'p_in_spending', 'p_payment_day',
          'p_payment_overrides', 'p_last_payment_on', 'p_today'],
  'its parameters, in the order the app names them');
select pg_temp.check(
  (select array_agg(p.parameter_name::text order by p.ordinal_position)
     from information_schema.parameters p
     join information_schema.routines r on r.specific_name = p.specific_name
    where r.routine_schema = 'public' and r.routine_name = 'update_loan' and p.parameter_default is not null)
  = array['p_payment_day', 'p_payment_overrides', 'p_last_payment_on', 'p_today'],
  'only the optional four have defaults; every figure must be sent');
select pg_temp.check(
  (select count(*) = 1 from pg_proc where proname = 'save_loan' and pronamespace = 'public'::regnamespace)
  and to_regprocedure('public.save_loan(text,text,numeric,numeric,integer,numeric,numeric,date,public.bill_recurrence,uuid,uuid,date,text,date,numeric,jsonb,date,boolean,integer,date)') is not null,
  'save_loan is still the one 20-argument function');

-- ---------------------------------------------------------------- loans nobody edits
select pg_temp.as_user('e1');
select pg_temp.save_on('Untouched: running', '2024-01-27', 48, '2026-10-12', $x$, p_counts_from => '2026-10-12'$x$);
select pg_temp.save_on('Untouched: not started', '2026-11-27', 48, '2026-10-12');
select pg_temp.save_on('Untouched: kept out', '2026-11-27', 12, '2026-10-12', $x$, p_in_spending => false$x$);
reset role;
with b as (
  insert into public.bills (user_id, name, amount, category_id, icon_id, recurrence, next_due_on, starts_on, ends_on, card_id)
  values ('00000000-0000-0000-0000-0000000000e3', 'Theirs', 400, 'loans', 'loan-car', 'monthly',
          '2026-11-01', '2026-11-01', '2028-10-01', '00000000-0000-0000-0000-0000000c00e3')
  returning id
)
insert into public.loans (user_id, bill_id, principal, annual_rate, term_months, monthly_payment, total_interest, first_payment_on)
select '00000000-0000-0000-0000-0000000000e3', b.id, 9000, 5, 24, 400, 600, '2026-11-01' from b;
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on)
values ('00000000-0000-0000-0000-0000000000e1', 'Rent, not a loan', 1500, 'housing', 'monthly', '2026-11-01', '2026-11-01');
create temp table untouched as
  select b.id, to_jsonb(b) as bill, to_jsonb(l) as loan
  from public.bills b left join public.loans l on l.bill_id = b.id
  where b.name like 'Untouched: %' or b.name in ('Theirs', 'Rent, not a loan');
grant select on untouched to authenticated;

-- ---------------------------------------------------------------- an edit with no change
select pg_temp.as_user('e1');
select pg_temp.save_on('Same: added late', '2024-01-27', 48, '2026-10-12', $x$, p_counts_from => '2026-10-12'$x$);
select pg_temp.save_on('Same: not started', '2026-11-27', 48, '2026-10-12');
select pg_temp.save_on('Same: paid off before', '2019-01-15', 24, '2026-10-12', $x$, p_counts_from => '2026-10-12'$x$);
select pg_temp.save_on('Same: day 31', '2025-02-28', 36, '2026-10-12',
  $x$, p_payment_day => 31, p_counts_from => '2026-10-12'$x$);
select pg_temp.save_on('Same: kept out', '2026-11-27', 12, '2026-10-12', $x$, p_in_spending => false$x$);
create temp table same_before as
  select name, pg_temp.row_of(name) as row from public.bills where name like 'Same: %';

select pg_temp.edit('Same: added late', '2024-01-27', 48, '2026-10-20');
select pg_temp.edit('Same: not started', '2026-11-27', 48, '2026-10-20');
select pg_temp.edit('Same: paid off before', '2019-01-15', 24, '2026-10-20');
select pg_temp.edit('Same: day 31', '2025-02-28', 36, '2026-10-20', p_extra => $x$, p_payment_day => 31$x$);
select pg_temp.edit('Same: kept out', '2026-11-27', 12, '2026-10-20');
select pg_temp.check(
  (select bool_and(pg_temp.row_of(name) = row) from same_before),
  'saving the edit page unchanged leaves the bill and the loan exactly as save_loan stored them');
select pg_temp.check(
  (select array_agg(name || ' ' || pg_temp.dates(name) order by name) from same_before)
  = array['Same: added late 2026-10-12 2026-10-27 2027-12-27',
          'Same: day 31 2026-10-12 2026-10-31 2028-01-31',
          'Same: kept out 2026-11-27 2026-11-27 2027-10-27',
          'Same: not started 2026-11-27 2026-11-27 2030-10-27',
          'Same: paid off before 2019-01-15 - 2020-12-15'],
  'and those are the dates save_loan gave them');
select pg_temp.edit('Same: kept out', '2026-11-27', 12, '2026-10-20', false);
select pg_temp.check(
  pg_temp.row_of('Same: kept out') = (select row from same_before where name = 'Same: kept out'),
  'a loan kept out, saved kept out, is unchanged too');

-- ---------------------------------------------------------------- every field changed
select pg_temp.save_on('Changed', '2026-11-27', 48, '2026-10-12');
insert into public.reminders (user_id, bill_id, lead_days, remind_at)
values ('00000000-0000-0000-0000-0000000000e1', (pg_temp.bill('Changed')).id, 3, '09:00');
create temp table changed_id as select (pg_temp.bill('Changed')).id as id;
grant select on changed_id to authenticated;

create temp table changed_returned as
select * from public.update_loan(
  p_bill_id => (select id from changed_id), p_name => 'Changed, car', p_icon_id => 'loan-car',
  p_principal => 32001, p_annual_rate => 7.4995, p_term_months => 60, p_monthly_payment => 641.23,
  p_total_interest => 6472.80, p_first_payment_on => '2027-01-31', p_funded_on => '2026-12-15',
  p_day_count_basis => 'monthly', p_card_id => null,
  p_bank_account_id => '00000000-0000-0000-0000-0000000a00e1', p_in_spending => false,
  p_payment_day => 31, p_payment_overrides => '{"1": 612.40, "14": 1000}'::jsonb,
  p_last_payment_on => '2031-06-30', p_today => '2026-10-20');
select pg_temp.check(
  (select b.id = (select id from changed_id) and b.name = 'Changed, car' and b.icon_id = 'loan-car'
          and b.amount = 641.23 and b.category_id = 'loans' and b.recurrence = 'monthly'
          and b.card_id is null and b.bank_account_id = '00000000-0000-0000-0000-0000000a00e1'
          and not b.in_spending
          and b.starts_on = '2027-01-31' and b.next_due_on = '2027-01-31' and b.ends_on = '2031-06-30'
          and l.principal = 32001 and l.annual_rate::text = '7.499500000' and l.term_months = 60
          and l.monthly_payment = 641.23 and l.total_interest = 6472.80
          and l.first_payment_on = '2027-01-31' and l.funded_on = '2026-12-15'
          and l.day_count_basis = 'monthly' and l.payment_day = 31
          and (l.payment_overrides->>'1')::numeric = 612.40
          and (l.payment_overrides->>'14')::numeric = 1000
     from public.bills b join public.loans l on l.bill_id = b.id where b.id = (select id from changed_id)),
  'every field reads back as sent, on the same bill, the rate as printed');
select pg_temp.check(
  (select id = (select id from changed_id) and name = 'Changed, car' from changed_returned),
  'it returns the bill as now stored');
select pg_temp.check(
  (select count(*) = 1 from public.reminders where bill_id = (select id from changed_id))
  and (select count(*) = 1 from public.bills where name like 'Changed%')
  and (select count(*) = 1 from public.loans where bill_id = (select id from changed_id)),
  'its reminder stays, and no second bill or loan is filed');

-- Back to a card, payments on the first payment's day, nothing changed, no early end.
select * from public.update_loan(
  p_bill_id => (select id from changed_id), p_name => 'Changed, car', p_icon_id => 'loan-car',
  p_principal => 32001, p_annual_rate => 7.4995, p_term_months => 60, p_monthly_payment => 641.23,
  p_total_interest => 6472.80, p_first_payment_on => '2027-01-15', p_funded_on => null,
  p_day_count_basis => null, p_card_id => '00000000-0000-0000-0000-0000000c00e1',
  p_bank_account_id => null, p_in_spending => true, p_today => '2026-10-20');
select pg_temp.check(
  (select b.card_id = '00000000-0000-0000-0000-0000000c00e1' and b.bank_account_id is null
          and b.in_spending and b.ends_on = '2031-12-15'
          and l.payment_day is null and l.payment_overrides is null
          and l.funded_on = '2026-12-15' and l.day_count_basis = 'actual/365'
     from public.bills b join public.loans l on l.bill_id = b.id where b.id = (select id from changed_id)),
  'clearing the payment day, the changes and the last payment clears them; funding and basis default as save_loan');

-- ---------------------------------------------------------------- the count floor
-- Added 12 Oct after paying since Jan 2024, then the first payment and the payment day moved
-- earlier on 20 Oct: nothing before the day it was added counts.
select pg_temp.save_on('Floor: earlier', '2024-01-27', 48, '2026-10-12', $x$, p_counts_from => '2026-10-12'$x$);
select pg_temp.edit('Floor: earlier', '2023-06-05', 60, '2026-10-20', p_extra => $x$, p_payment_day => 5$x$);
select pg_temp.check(
  pg_temp.dates('Floor: earlier') = '2026-10-12 2026-11-05 2028-05-05'
  and pg_temp.would_record('Floor: earlier', '2026-10-20') = '-',
  'dates moved earlier on a loan added late back-fill nothing');

-- Added 12 Oct before its first payment (27 Nov), which is then moved earlier on 20 Oct.
select pg_temp.save_on('Floor: first still to come', '2026-11-27', 48, '2026-10-12');
select pg_temp.edit('Floor: first still to come', '2026-10-27', 48, '2026-10-20');
select pg_temp.check(
  pg_temp.dates('Floor: first still to come') = '2026-10-27 2026-10-27 2030-09-27'
  and pg_temp.would_record('Floor: first still to come', '2026-10-27') = '2026-10-27',
  'a first payment moved earlier but still to come counts (the stored first payment is no floor)');

select pg_temp.save_on('Floor: first since added', '2026-11-27', 48, '2026-10-12');
select pg_temp.edit('Floor: first since added', '2026-10-15', 48, '2026-10-20');
select pg_temp.check(
  pg_temp.dates('Floor: first since added') = '2026-10-15 2026-11-15 2030-09-15'
  and pg_temp.would_record('Floor: first since added', '2026-10-20') = '2026-10-15',
  'one moved to a day after the loan was added counts, as it would have if saved so (F1)');

select pg_temp.save_on('Floor: first before added', '2026-11-27', 48, '2026-10-12');
select pg_temp.edit('Floor: first before added', '2026-09-27', 48, '2026-10-20');
select pg_temp.check(
  pg_temp.dates('Floor: first before added') = '2026-10-12 2026-10-27 2030-08-27'
  and pg_temp.would_record('Floor: first before added', '2026-10-20') = '-',
  'one moved to before the loan was added does not');

-- Charged on 27 Sep and 27 Oct, then the payment day moved on 29 Oct.
select pg_temp.save_on('Floor: charged, later day', '2026-09-27', 24, '2026-09-01');
select pg_temp.save_on('Floor: charged, earlier day', '2026-09-27', 24, '2026-09-01');
select pg_temp.charge(name, d) from (values ('Floor: charged, later day'), ('Floor: charged, earlier day')) n(name)
  cross join (values ('2026-09-27'::date), ('2026-10-27'::date)) v(d);
select pg_temp.edit('Floor: charged, later day', '2026-09-27', 24, '2026-10-29', p_extra => $x$, p_payment_day => 28$x$);
select pg_temp.edit('Floor: charged, earlier day', '2026-09-05', 24, '2026-10-29', p_extra => $x$, p_payment_day => 5$x$);
select pg_temp.check(
  pg_temp.dates('Floor: charged, later day') = '2026-11-01 2026-11-28 2028-08-28'
  and pg_temp.would_record('Floor: charged, later day', '2026-10-29') = '-'
  and pg_temp.dates('Floor: charged, earlier day') = '2026-11-01 2026-11-05 2028-08-05'
  and pg_temp.would_record('Floor: charged, earlier day', '2026-10-29') = '-',
  'a month already charged is never charged or projected again, whichever way the day moves');
select pg_temp.check(
  (select count(*) = 4 from public.charges c join public.bills b on b.id = c.bill_id
    where b.name like 'Floor: charged, %'),
  'and the charges recorded stay');

-- Off on 1 Oct after one charge, on again on 10 Nov, then the day moved on 15 Nov.
select pg_temp.save_on('Floor: off and on', '2026-09-27', 24, '2026-09-01');
select pg_temp.charge('Floor: off and on', '2026-09-27');
select pg_temp.edit('Floor: off and on', '2026-09-27', 24, '2026-10-01', false);
select pg_temp.check(
  not (pg_temp.bill('Floor: off and on')).in_spending
  and (select count(*) = 1 from public.charges where bill_id = (pg_temp.bill('Floor: off and on')).id)
  and pg_temp.would_record('Floor: off and on', '2026-11-09') = '-',
  'switched off: it keeps the charge it recorded and records nothing new');
select pg_temp.edit('Floor: off and on', '2026-09-27', 24, '2026-11-10', true);
select pg_temp.check(
  pg_temp.dates('Floor: off and on') = '2026-11-10 2026-11-27 2028-08-27'
  and pg_temp.would_record('Floor: off and on', '2026-11-27') = '2026-11-27',
  'switched on: it counts from that day, and the payment made while it was off is not filled in');
select pg_temp.edit('Floor: off and on', '2026-09-05', 24, '2026-11-15', p_extra => $x$, p_payment_day => 5$x$);
select pg_temp.check(
  pg_temp.dates('Floor: off and on') = '2026-11-10 2026-12-05 2028-08-05'
  and pg_temp.would_record('Floor: off and on', '2026-12-05') = '2026-12-05',
  'a later edit keeps the day it was switched on as its floor (5 Nov stays uncounted)');
select pg_temp.edit('Floor: off and on', '2026-09-05', 24, '2026-11-16');
select pg_temp.check(
  pg_temp.dates('Floor: off and on') = '2026-11-10 2026-12-05 2028-08-05',
  'saying nothing about the switch leaves it on');

-- Saved with every payment behind it (added 12 Oct), then the term found to run longer.
select pg_temp.save_on('Floor: brought back', '2019-01-15', 24, '2026-10-12', $x$, p_counts_from => '2026-10-12'$x$);
select pg_temp.check(pg_temp.dates('Floor: brought back') = '2019-01-15 - 2020-12-15', 'saved with nothing to come');
select pg_temp.edit('Floor: brought back', '2019-01-15', 120, '2026-10-20');
select pg_temp.check(
  pg_temp.dates('Floor: brought back') = '2026-10-12 2026-11-15 2028-12-15'
  and pg_temp.would_record('Floor: brought back', '2026-10-20') = '2026-10-15',
  'brought back, it counts from the day it was added, never from its old first payment');

-- Charged January to September, then found to have ended earlier, or on 27 Oct.
select pg_temp.save_on('Floor: ended before', '2026-01-27', 12, '2026-01-20');
select pg_temp.save_on('Floor: ends this month', '2026-01-27', 12, '2026-01-20');
select pg_temp.charge(name, ('2026-01-27'::date + make_interval(months => m))::date)
  from (values ('Floor: ended before'), ('Floor: ends this month')) n(name), generate_series(0, 8) m;
select pg_temp.edit('Floor: ended before', '2026-01-27', 12, '2026-10-20', p_extra => $x$, p_last_payment_on => '2026-09-27'$x$);
select pg_temp.edit('Floor: ends this month', '2026-01-27', 12, '2026-10-29', p_extra => $x$, p_last_payment_on => '2026-10-27'$x$);
select pg_temp.check(
  pg_temp.dates('Floor: ended before') = '2026-01-27 - 2026-09-27'
  and (select count(*) = 9 from public.charges where bill_id = (pg_temp.bill('Floor: ended before')).id),
  'ended before the last charge: nothing left to count, and every charge stays');
select pg_temp.check(
  pg_temp.dates('Floor: ends this month') = '2026-10-01 2026-10-27 2026-10-27'
  and pg_temp.would_record('Floor: ends this month', '2026-10-29') = '2026-10-27',
  'ended two days ago: the last payment is still written down, not lost with the next date');

-- Day 31 clamped: the next payment and the last one on short months.
select pg_temp.save_on('Floor: day 31', '2026-11-30', 6, '2026-10-12', $x$, p_payment_day => 31$x$);
select pg_temp.edit('Floor: day 31', '2026-01-31', 14, '2027-02-10', p_extra => $x$, p_payment_day => 31$x$);
select pg_temp.check(
  pg_temp.dates('Floor: day 31') = '2026-10-12 2027-02-28 2027-02-28',
  'a day-31 loan is next due on the 28th of February, its last payment');

-- With no day sent, today is the person's own, from their profile.
reset role;
update public.profiles set timezone = 'Pacific/Kiritimati' where id = '00000000-0000-0000-0000-0000000000e1';
select pg_temp.as_user('e1');
select pg_temp.save_on('Floor: today from profile', '2026-01-15', 600, '2026-01-01', $x$, p_in_spending => false$x$);
select * from public.update_loan(
  p_bill_id => (pg_temp.bill('Floor: today from profile')).id, p_name => 'Floor: today from profile',
  p_icon_id => 'loan-personal', p_principal => 5000, p_annual_rate => 9, p_term_months => 600,
  p_monthly_payment => 420, p_total_interest => 260, p_first_payment_on => '2026-01-15',
  p_funded_on => null, p_day_count_basis => 'actual/365',
  p_card_id => '00000000-0000-0000-0000-0000000c00e1', p_bank_account_id => null, p_in_spending => true);
select pg_temp.check(
  (pg_temp.bill('Floor: today from profile')).starts_on = (now() at time zone 'Pacific/Kiritimati')::date,
  'switched on with no day sent, it counts from today in the person''s timezone');
reset role;
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000e1';

-- ---------------------------------------------------------------- refusals change nothing
select pg_temp.as_user('e1');
select pg_temp.save_on('Refused', '2026-11-27', 48, '2026-10-12', $x$, p_payment_overrides => '{"2": 500}'::jsonb$x$);
create temp table refused_before as select pg_temp.row_of('Refused') as row;
grant select on refused_before to authenticated;

select pg_temp.expect_error($s$select pg_temp.edit('Refused', '2026-11-27', 24, '2026-10-20', p_new_name => 'Renamed',
  p_extra => $x$, p_payment_overrides => '{"30": 500}'::jsonb$x$)$s$, '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error($s$select pg_temp.edit('Refused', '2026-11-27', 1, '2026-10-20', p_new_name => 'Renamed',
  p_extra => $x$, p_payment_overrides => '{"2": 500}'::jsonb$x$)$s$, '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error($s$select pg_temp.edit('Refused', '2026-11-27', 48, '2026-10-20', p_new_name => 'Renamed',
  p_extra => $x$, p_payment_day => 0$x$)$s$, 'P0001', 'the payment day must be between 1 and 31');
select pg_temp.expect_error($s$select pg_temp.edit('Refused', '2026-11-27', 48, '2026-10-20', p_new_name => 'Renamed',
  p_extra => $x$, p_payment_day => 32$x$)$s$, 'P0001', 'the payment day must be between 1 and 31');
select pg_temp.expect_error($s$select pg_temp.edit('Refused', '2026-11-27', 48, '2026-10-20', p_new_name => 'Renamed',
  p_extra => $x$, p_last_payment_on => '2030-10-28'$x$)$s$, 'P0001', 'the last payment must fall within the term');
select pg_temp.expect_error($s$select pg_temp.edit('Refused', '2026-11-27', 48, '2026-10-20', p_new_name => 'Renamed',
  p_extra => $x$, p_last_payment_on => '2026-11-26'$x$)$s$, 'P0001', 'the last payment must fall within the term');
select pg_temp.expect_error($s$select pg_temp.edit('Refused', '2026-11-27', 0, '2026-10-20', p_new_name => 'Renamed')$s$,
  'P0001', 'a loan needs at least one payment');
select pg_temp.expect_error($s$select pg_temp.edit('Refused', null, 48, '2026-10-20', p_new_name => 'Renamed')$s$,
  'P0001', 'a loan needs its first payment date');
select pg_temp.expect_error(
  $s$select * from public.update_loan((pg_temp.bill('Refused')).id, 'Renamed', 'loan-personal', 5000,
     100.000000001, 48, 420, 260, '2026-11-27', null, 'actual/365', null, null, null)$s$,
  '23514', 'loans_annual_rate_check');
select pg_temp.expect_error(
  $s$select * from public.update_loan((pg_temp.bill('Refused')).id, 'Renamed', 'loan-personal', -1,
     9, 48, 420, 260, '2026-11-27', null, 'actual/365', null, null, null)$s$,
  '23514', 'loans_principal_check');
select pg_temp.expect_error(
  $s$select * from public.update_loan((pg_temp.bill('Refused')).id, 'Renamed', 'loan-personal', 5000,
     9, 48, 420, 260, '2026-11-27', null, 'daily', null, null, null)$s$,
  '23514', 'loans_day_count_basis_check');
select pg_temp.expect_error(
  $s$select * from public.update_loan((pg_temp.bill('Refused')).id, 'Renamed', 'loan-personal', 5000,
     9, 48, 420, 260, '2026-11-27', null, 'actual/365', '00000000-0000-0000-0000-0000000c00e1',
     '00000000-0000-0000-0000-0000000a00e1', null)$s$,
  '23514', 'bills_single_source');
select pg_temp.expect_error(
  $s$select * from public.update_loan((pg_temp.bill('Refused')).id, 'Renamed', 'loan-personal', 5000,
     9, 48, 420, 260, '2026-11-27', null, 'actual/365', '00000000-0000-0000-0000-0000000c00e3', null, null)$s$,
  'P0001', 'the card is not one of yours');
select pg_temp.expect_error(
  $s$select * from public.update_loan((pg_temp.bill('Refused')).id, 'Renamed', 'loan-personal', 5000,
     9, 48, 420, 260, '2026-11-27', null, 'actual/365', null, '00000000-0000-0000-0000-0000000a00e3', null)$s$,
  'P0001', 'the account is not one of yours');
select pg_temp.check(
  pg_temp.row_of('Refused') = (select row from refused_before)
  and (select count(*) = 0 from public.bills where name = 'Renamed'),
  'every refused edit leaves the bill and the loan exactly as they were');

select pg_temp.expect_error(
  $s$select * from public.update_loan((pg_temp.bill('Rent, not a loan')).id, 'Renamed', 'loan-personal', 5000,
     9, 48, 420, 260, '2026-11-27', null, 'actual/365', null, null, null)$s$,
  'P0002', 'there is no such loan');
select pg_temp.expect_error(
  $s$select * from public.update_loan(gen_random_uuid(), 'Renamed', 'loan-personal', 5000,
     9, 48, 420, 260, '2026-11-27', null, 'actual/365', null, null, null)$s$,
  'P0002', 'there is no such loan');

-- ---------------------------------------------------------------- someone else's loan
create temp table theirs_id as select id from untouched where bill->>'name' = 'Theirs';
grant select on theirs_id to authenticated;
select pg_temp.expect_error(
  $s$select * from public.update_loan((select id from theirs_id), 'Mine now', 'loan-car', 1,
     9, 24, 1, 0, '2026-11-01', null, 'actual/365', null, null, false)$s$,
  'P0002', 'there is no such loan');
select pg_temp.as_user('e3');
select pg_temp.expect_error(
  $s$select * from public.update_loan((select id from changed_id), 'Mine now', 'loan-car', 1,
     9, 24, 1, 0, '2026-11-01', null, 'actual/365', null, null, false)$s$,
  'P0002', 'there is no such loan');
reset role;
select set_config('request.jwt.claims', '', true);
select pg_temp.check(
  (select name = 'Changed, car' and amount = 641.23 from public.bills where id = (select id from changed_id)),
  'another person''s call leaves my loan as it was');

set local role anon;
select pg_temp.expect_error(
  $s$select * from public.update_loan(gen_random_uuid(), 'x', 'loan-car', 1, 9, 24, 1, 0, '2026-11-01',
     null, 'actual/365', null, null, null)$s$,
  '42501', 'permission denied for function update_loan');
reset role;
set local role authenticated;
select pg_temp.expect_error(
  $s$select * from public.update_loan(gen_random_uuid(), 'x', 'loan-car', 1, 9, 24, 1, 0, '2026-11-01',
     null, 'actual/365', null, null, null)$s$,
  'P0001', 'not authenticated');
reset role;

-- ---------------------------------------------------------------- what nobody edited
select pg_temp.check(
  (select bool_and(to_jsonb(b) = u.bill and to_jsonb(l) is not distinct from u.loan)
     from untouched u join public.bills b on b.id = u.id left join public.loans l on l.bill_id = b.id)
  and (select count(*) = 5 from untouched),
  'loans and bills nobody edited, mine and someone else''s, are exactly as they were');

rollback;
\echo ALL CHECKS PASSED
