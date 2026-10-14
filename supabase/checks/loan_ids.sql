-- Checks for 20261013600001_loan_ids_and_today.sql. LOCAL database only, with it applied: everything
-- runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/loan_ids.sql
--
-- A loan and a payoff saved again with the visit's id are found, not filed twice; another person's
-- id is refused by the primary key. The day update_loan and record_loan_payoff are given is held
-- to within one of the person's own (person_today), on the real clock. Two saves of one id at once
-- wait on each other (save_loan's advisory lock, record_loan_payoff's bill lock); one session
-- cannot show that, so it is read, not run, here.
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'loan-ids@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'loan-ids-other@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000d2')
on conflict (id) do nothing;
update public.profiles set timezone = 'UTC'
 where id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000c00d1', '00000000-0000-0000-0000-0000000000d1', 'Mine');

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

create or replace function pg_temp.src(p_name text) returns text
language sql as $$ select prosrc from pg_proc where proname = p_name and pronamespace = 'public'::regnamespace $$;

create or replace function pg_temp.times(p_text text, p_piece text) returns integer
language sql immutable as $$ select (length(p_text) - length(replace(p_text, p_piece, ''))) / length(p_piece) $$;

create or replace function pg_temp.as_user(p_user text) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_user), true);
end $$;

create or replace function pg_temp.today() returns date
language sql stable as $$ select (now() at time zone 'UTC')::date $$;

-- The add flow's call, with the visit's id when there is one: funded a month ago, first paid in
-- forty days, so a payoff can be dated today.
create or replace function pg_temp.save(p_name text, p_id text default null, p_payment numeric default 300)
returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  execute format(
    $f$select (public.save_loan(
       p_name => %L, p_icon_id => 'loan-car', p_principal => 9000, p_annual_rate => 6,
       p_term_months => 36, p_monthly_payment => %s, p_total_interest => 600,
       p_first_payment_on => %L, p_recurrence => 'monthly',
       p_card_id => '00000000-0000-0000-0000-0000000c00d1', p_bank_account_id => null,
       p_funded_on => %L, p_day_count_basis => 'actual/365'%s)).id$f$,
    p_name, p_payment, (pg_temp.today() + 40)::text, (pg_temp.today() - 30)::text,
    case when p_id is null then '' else format(', p_id => %L', p_id) end)
    into v_id;
  return v_id;
end $$;

create or replace function pg_temp.bill(p_name text) returns public.bills
language sql as $$ select * from public.bills where name = p_name $$;

-- ---------------------------------------------------------------- each body is its source, with only its own lines
select pg_temp.check(
  pg_temp.times(pg_temp.src('save_loan'), $h$  end if;

  if p_id is not null then
    -- Two saves of one visit at once wait here, so the second finds the first.
    perform pg_advisory_xact_lock(hashtextextended('save_loan:' || p_id::text, 0));
    select * into v_bill from public.bills where id = p_id and user_id = v_user;
    if found then
      return v_bill;
    end if;
$h$) = 1
  and pg_temp.times(pg_temp.src('save_loan'), $h$    id, user_id, name, amount, category_id, icon_id,
$h$) = 1
  and pg_temp.times(pg_temp.src('save_loan'), $h$    coalesce(p_id, gen_random_uuid()), v_user, p_name, p_monthly_payment, 'loans', p_icon_id,
$h$) = 1
  and md5(replace(replace(replace(pg_temp.src('save_loan'),
        $h$  end if;

  if p_id is not null then
    -- Two saves of one visit at once wait here, so the second finds the first.
    perform pg_advisory_xact_lock(hashtextextended('save_loan:' || p_id::text, 0));
    select * into v_bill from public.bills where id = p_id and user_id = v_user;
    if found then
      return v_bill;
    end if;
$h$,
        $h$$h$),
        $h$    id, user_id, name, amount, category_id, icon_id,
$h$,
        $h$    user_id, name, amount, category_id, icon_id,
$h$),
        $h$    coalesce(p_id, gen_random_uuid()), v_user, p_name, p_monthly_payment, 'loans', p_icon_id,
$h$,
        $h$    v_user, p_name, p_monthly_payment, 'loans', p_icon_id,
$h$)) = '14b07e0df01c4714fcd07e01949229cb',
  'save_loan is 20261013300001''s with only the app''s id added: found again, or filed under it');
select pg_temp.check(
  pg_temp.times(pg_temp.src('update_loan'), $h$  v_profile_today date;
$h$) = 1
  and pg_temp.times(pg_temp.src('update_loan'), $h$  -- A day the app sends is held to within one of the person's own: a phone a zone
  -- away still saves, and no other day can be claimed.
  v_profile_today := public.person_today(v_user);
  v_today := least(greatest(coalesce(p_today, v_profile_today), v_profile_today - 1), v_profile_today + 1);
  -- The zone also reads the day the loan was added; one Postgres does not know reads as UTC.
  begin
    perform now() at time zone v_tz;
  exception when invalid_parameter_value then
    v_tz := 'UTC';
  end;
$h$) = 1
  and md5(replace(replace(pg_temp.src('update_loan'),
        $h$  v_profile_today date;
$h$,
        $h$$h$),
        $h$  -- A day the app sends is held to within one of the person's own: a phone a zone
  -- away still saves, and no other day can be claimed.
  v_profile_today := public.person_today(v_user);
  v_today := least(greatest(coalesce(p_today, v_profile_today), v_profile_today - 1), v_profile_today + 1);
  -- The zone also reads the day the loan was added; one Postgres does not know reads as UTC.
  begin
    perform now() at time zone v_tz;
  exception when invalid_parameter_value then
    v_tz := 'UTC';
  end;
$h$,
        $h$  v_today := coalesce(p_today, (now() at time zone v_tz)::date);
$h$)) = '1f26263135df0d33b5ec0a77d6619d38',
  'update_loan is 20261013300001''s with only the day held to the person''s');
select pg_temp.check(
  pg_temp.times(pg_temp.src('record_loan_payoff'), $h$  v_profile_today date;
$h$) = 1
  and pg_temp.times(pg_temp.src('record_loan_payoff'), $h$  -- After the bill's lock, so a repeat racing the first waits for it and finds it.
  if p_id is not null then
    select * into v_payoff from public.loan_payoffs where id = p_id and user_id = v_user;
    if found then
      return v_payoff;
    end if;
  end if;

$h$) = 1
  and pg_temp.times(pg_temp.src('record_loan_payoff'), $h$  -- A day the app sends is held to within one of the person's own: a phone a zone
  -- away still saves, and no other day can be claimed.
  v_profile_today := public.person_today(v_user);
  v_today := least(greatest(coalesce(p_today, v_profile_today), v_profile_today - 1), v_profile_today + 1);
  -- The zone also reads the day the loan was added; one Postgres does not know reads as UTC.
  begin
    perform now() at time zone v_tz;
  exception when invalid_parameter_value then
    v_tz := 'UTC';
  end;
$h$) = 1
  and pg_temp.times(pg_temp.src('record_loan_payoff'), $h$    id, user_id, bill_id, paid_on, amount, kind, card_id, bank_account_id, counted,
$h$) = 1
  and pg_temp.times(pg_temp.src('record_loan_payoff'), $h$    coalesce(p_id, gen_random_uuid()), v_user, p_bill_id, p_paid_on, p_amount, p_kind, p_card_id, p_bank_account_id,
$h$) = 1
  and md5(replace(replace(replace(replace(replace(pg_temp.src('record_loan_payoff'),
        $h$  v_profile_today date;
$h$,
        $h$$h$),
        $h$  -- After the bill's lock, so a repeat racing the first waits for it and finds it.
  if p_id is not null then
    select * into v_payoff from public.loan_payoffs where id = p_id and user_id = v_user;
    if found then
      return v_payoff;
    end if;
  end if;

$h$,
        $h$$h$),
        $h$  -- A day the app sends is held to within one of the person's own: a phone a zone
  -- away still saves, and no other day can be claimed.
  v_profile_today := public.person_today(v_user);
  v_today := least(greatest(coalesce(p_today, v_profile_today), v_profile_today - 1), v_profile_today + 1);
  -- The zone also reads the day the loan was added; one Postgres does not know reads as UTC.
  begin
    perform now() at time zone v_tz;
  exception when invalid_parameter_value then
    v_tz := 'UTC';
  end;
$h$,
        $h$  v_today := coalesce(p_today, (now() at time zone v_tz)::date);
$h$),
        $h$    id, user_id, bill_id, paid_on, amount, kind, card_id, bank_account_id, counted,
$h$,
        $h$    user_id, bill_id, paid_on, amount, kind, card_id, bank_account_id, counted,
$h$),
        $h$    coalesce(p_id, gen_random_uuid()), v_user, p_bill_id, p_paid_on, p_amount, p_kind, p_card_id, p_bank_account_id,
$h$,
        $h$    v_user, p_bill_id, p_paid_on, p_amount, p_kind, p_card_id, p_bank_account_id,
$h$)) = '204b8f94c756989257be3abe5eae0fd6',
  'record_loan_payoff is 20261012100003''s with only the app''s id and the day held to the person''s');
select pg_temp.check(
  md5(pg_temp.src('update_loan_and_charges')) = '2302c2388e8e1f01dac6f2c78c57648b'
  and md5(pg_temp.src('delete_loan_payoff')) = 'e4c933f54c09d6dfa3d19ac0a59d3b46',
  'update_loan_and_charges and delete_loan_payoff are untouched');

-- ---------------------------------------------------------------- signatures and grants
select pg_temp.check(
  (select count(*) = 1 from pg_proc where proname = 'save_loan' and pronamespace = 'public'::regnamespace)
  and to_regprocedure('public.save_loan(text,text,numeric,numeric,integer,numeric,numeric,date,public.bill_recurrence,uuid,uuid,date,text,date,numeric,jsonb,date,boolean,integer,date)') is null
  and (select pg_get_function_arguments(p.oid) like '%p_counts_from date DEFAULT NULL::date, p_id uuid DEFAULT NULL::uuid'
         from pg_proc p where p.proname = 'save_loan' and p.pronamespace = 'public'::regnamespace),
  'one save_loan: the 20-argument one is gone, and the id comes last with no default but none');
select pg_temp.check(
  (select count(*) = 1 from pg_proc where proname = 'record_loan_payoff' and pronamespace = 'public'::regnamespace)
  and to_regprocedure('public.record_loan_payoff(uuid,date,numeric,text,uuid,uuid,date,date)') is null
  and (select pg_get_function_arguments(p.oid) like '%p_today date DEFAULT NULL::date, p_id uuid DEFAULT NULL::uuid'
         from pg_proc p where p.proname = 'record_loan_payoff' and p.pronamespace = 'public'::regnamespace),
  'one record_loan_payoff: the 8-argument one is gone, and the id comes last');
select pg_temp.check(
  bool_and(has_function_privilege('authenticated', f, 'execute')
           and not has_function_privilege('anon', f, 'execute')
           and not has_function_privilege('public', f, 'execute')),
  'signed-in people may call each, signed-out ones may not')
from unnest(array[
  'public.save_loan(text,text,numeric,numeric,integer,numeric,numeric,date,public.bill_recurrence,uuid,uuid,date,text,date,numeric,jsonb,date,boolean,integer,date,uuid)',
  'public.record_loan_payoff(uuid,date,numeric,text,uuid,uuid,date,date,uuid)',
  'public.update_loan(uuid,text,text,numeric,numeric,integer,numeric,numeric,date,date,text,uuid,uuid,boolean,integer,jsonb,date,date)'
]) f;
select pg_temp.check(
  (select bool_and(not p.prosecdef and p.proconfig = array['search_path=public'])
     from pg_proc p where p.pronamespace = 'public'::regnamespace
      and p.proname in ('save_loan', 'update_loan', 'record_loan_payoff', 'person_today')),
  'all four run as the caller');

-- update_loan and record_loan_payoff call person_today as the signed-in caller.
select pg_temp.check(
  has_function_privilege('authenticated', 'public.person_today(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.person_today(uuid)', 'execute')
  and not has_function_privilege('public', 'public.person_today(uuid)', 'execute'),
  'person_today: signed-in people may call it, signed-out ones may not');
set local role anon;
select pg_temp.expect_error(
  $s$select public.person_today('00000000-0000-0000-0000-0000000000d1')$s$, '42501', 'permission denied');
reset role;
select pg_temp.as_user('d1');
select pg_temp.save('Own day');
select public.update_loan(
  p_bill_id => (pg_temp.bill('Own day')).id, p_name => 'Own day', p_icon_id => 'loan-car',
  p_principal => 9000, p_annual_rate => 6, p_term_months => 36, p_monthly_payment => 310,
  p_total_interest => 600, p_first_payment_on => pg_temp.today() + 40, p_funded_on => pg_temp.today() - 30,
  p_day_count_basis => 'actual/365', p_card_id => null, p_bank_account_id => null, p_in_spending => true);
select public.record_loan_payoff((pg_temp.bill('Own day')).id, pg_temp.today(), 10, 'partial', null, null, null, null);
select pg_temp.check(
  (pg_temp.bill('Own day')).amount = 310
  and (select count(*) = 1 from public.loan_payoffs
        where bill_id = (pg_temp.bill('Own day')).id and paid_on = pg_temp.today()),
  'signed in, update_loan and record_loan_payoff with no day sent read the person''s own through it');
reset role;

-- ---------------------------------------------------------------- the person's own day
update public.profiles set timezone = 'Pacific/Kiritimati' where id = '00000000-0000-0000-0000-0000000000d2';
select pg_temp.check(
  public.person_today('00000000-0000-0000-0000-0000000000d1') = pg_temp.today()
  and public.person_today('00000000-0000-0000-0000-0000000000d2') = (now() at time zone 'Pacific/Kiritimati')::date
  and public.person_today('00000000-0000-0000-0000-00000000ffff') = pg_temp.today(),
  'person_today is the day in the profile''s zone; with no profile, UTC''s');
update public.profiles set timezone = 'Nowhere/Never' where id = '00000000-0000-0000-0000-0000000000d1';
select pg_temp.check(public.person_today('00000000-0000-0000-0000-0000000000d1') = pg_temp.today(),
  'a zone Postgres does not know reads as UTC');
select pg_temp.as_user('d1');
select pg_temp.check(public.person_today('00000000-0000-0000-0000-0000000000d2') = pg_temp.today(),
  'and someone else''s profile, which the caller cannot read, is UTC''s day too');

-- An unknown zone stops nothing: a loan saved, edited and paid on it.
select pg_temp.save('Zone test');
select public.update_loan(
  p_bill_id => (pg_temp.bill('Zone test')).id, p_name => 'Zone test', p_icon_id => 'loan-car',
  p_principal => 9000, p_annual_rate => 6, p_term_months => 36, p_monthly_payment => 300,
  p_total_interest => 600, p_first_payment_on => (pg_temp.bill('Zone test')).starts_on,
  p_funded_on => pg_temp.today() - 30,
  p_day_count_basis => 'actual/365', p_card_id => '00000000-0000-0000-0000-0000000c00d1',
  p_bank_account_id => null, p_in_spending => true);
select public.record_loan_payoff((pg_temp.bill('Zone test')).id, pg_temp.today(), 10, 'partial',
  '00000000-0000-0000-0000-0000000c00d1', null);
select pg_temp.check(
  (select count(*) = 1 from public.loan_payoffs where bill_id = (pg_temp.bill('Zone test')).id),
  'a profile with a zone Postgres does not know still saves, edits and pays a loan');
reset role;
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000d1';

-- ---------------------------------------------------------------- the loan, filed once
select pg_temp.as_user('d1');
create temp table first_save as
select pg_temp.save('Car', '00000000-0000-0000-0000-00000000a1d1') as id;
create temp table loan_before as
select to_jsonb(b) as bill, to_jsonb(l) - 'updated_at' as loan
from public.bills b join public.loans l on l.bill_id = b.id where b.id = '00000000-0000-0000-0000-00000000a1d1';
grant select on first_save, loan_before to authenticated;
select pg_temp.check(
  (select id = '00000000-0000-0000-0000-00000000a1d1' from first_save),
  'a loan saved with the visit''s id is filed under it');

-- Saved again after a lost answer, even with a figure changed meanwhile.
select pg_temp.check(
  pg_temp.save('Car', '00000000-0000-0000-0000-00000000a1d1', 350) = '00000000-0000-0000-0000-00000000a1d1',
  'saved again with that id, the same loan comes back');
select pg_temp.check(
  (select count(*) = 1 from public.bills where name = 'Car')
  and (select count(*) = 1 from public.loans where bill_id = '00000000-0000-0000-0000-00000000a1d1')
  and (select bill from loan_before)
      = (select to_jsonb(b) from public.bills b where b.id = '00000000-0000-0000-0000-00000000a1d1')
  and (select loan from loan_before)
      = (select to_jsonb(l) - 'updated_at' from public.loans l where l.bill_id = '00000000-0000-0000-0000-00000000a1d1'),
  'one bill and one loan, exactly as the first save filed them');

select pg_temp.save('Van');
select pg_temp.save('Van');
select pg_temp.check((select count(*) = 2 from public.bills where name = 'Van'),
  'with no id, each save files a loan, as before');

reset role;
select pg_temp.as_user('d2');
select pg_temp.expect_error(
  $s$select public.save_loan(p_name => 'Taken', p_icon_id => 'loan-car', p_principal => 1, p_annual_rate => 1,
       p_term_months => 1, p_monthly_payment => 1, p_total_interest => 0, p_first_payment_on => '2026-12-01',
       p_id => '00000000-0000-0000-0000-00000000a1d1')$s$,
  '23505', 'bills_pkey');
reset role;
select pg_temp.check(
  (select bill from loan_before)
  = (select to_jsonb(b) from public.bills b where b.id = '00000000-0000-0000-0000-00000000a1d1'),
  'another person''s id is refused by the key, and the loan behind it is untouched');

-- ---------------------------------------------------------------- the payoff, recorded once
select pg_temp.as_user('d1');
create temp table bill_before_payoff as select to_jsonb(b) - 'updated_at' as bill from public.bills b where b.name = 'Car';
grant select on bill_before_payoff to authenticated;
create temp table partial_payoff as
select (public.record_loan_payoff(
  p_bill_id => '00000000-0000-0000-0000-00000000a1d1', p_paid_on => pg_temp.today(), p_amount => 500,
  p_kind => 'partial', p_card_id => '00000000-0000-0000-0000-0000000c00d1', p_bank_account_id => null,
  p_id => '00000000-0000-0000-0000-00000000b1d1')).*;
grant select on partial_payoff to authenticated;
create temp table bill_after_payoff as select to_jsonb(b) - 'updated_at' as bill from public.bills b where b.name = 'Car';
grant select on bill_after_payoff to authenticated;
select pg_temp.check((select id = '00000000-0000-0000-0000-00000000b1d1' from partial_payoff),
  'a payoff recorded with the visit''s id is filed under it');
select pg_temp.check(
  (select (public.record_loan_payoff(
     p_bill_id => '00000000-0000-0000-0000-00000000a1d1', p_paid_on => pg_temp.today(), p_amount => 999,
     p_kind => 'partial', p_card_id => null, p_bank_account_id => null,
     p_id => '00000000-0000-0000-0000-00000000b1d1')).amount = 500),
  'recorded again, the first payoff comes back as it was');
-- Statements of their own: one statement reads the rows as they were when it began.
select pg_temp.check(
  (select count(*) = 1 from public.loan_payoffs where bill_id = '00000000-0000-0000-0000-00000000a1d1')
  and (select bill from bill_after_payoff) = (select to_jsonb(b) - 'updated_at' from public.bills b where b.name = 'Car'),
  'one payoff, and no date of the bill moved');

create temp table full_payoff as
select (public.record_loan_payoff(
  p_bill_id => '00000000-0000-0000-0000-00000000a1d1', p_paid_on => pg_temp.today(), p_amount => 8000,
  p_kind => 'full', p_card_id => null, p_bank_account_id => null,
  p_id => '00000000-0000-0000-0000-00000000b2d1')).*;
grant select on full_payoff to authenticated;
select pg_temp.check(
  (select (public.record_loan_payoff(
     p_bill_id => '00000000-0000-0000-0000-00000000a1d1', p_paid_on => pg_temp.today(), p_amount => 8000,
     p_kind => 'full', p_card_id => null, p_bank_account_id => null,
     p_id => '00000000-0000-0000-0000-00000000b2d1')).id = '00000000-0000-0000-0000-00000000b2d1'),
  'a full payoff recorded again is the first one, not "already paid off"');
select pg_temp.check(
  (select count(*) = 1 from public.loan_payoffs
    where bill_id = '00000000-0000-0000-0000-00000000a1d1' and kind = 'full'),
  'and there is still one full payoff');
select pg_temp.expect_error(
  $s$select public.record_loan_payoff(p_bill_id => '00000000-0000-0000-0000-00000000a1d1', p_paid_on => pg_temp.today(),
       p_amount => 8000, p_kind => 'full', p_card_id => null, p_bank_account_id => null,
       p_id => '00000000-0000-0000-0000-00000000b3d1')$s$,
  'P0001', 'the loan is already paid off');

-- ---------------------------------------------------------------- the day held to the person's
select pg_temp.save('Clamp');
select pg_temp.expect_error(
  $s$select public.record_loan_payoff((pg_temp.bill('Clamp')).id, pg_temp.today() + 2, 10, 'partial',
       null, null, null, pg_temp.today() + 30)$s$,
  'P0001', 'a payoff cannot be dated after today');
select public.record_loan_payoff((pg_temp.bill('Clamp')).id, pg_temp.today() + 1, 10, 'partial',
  null, null, null, pg_temp.today() + 30);
select pg_temp.check(
  (select count(*) = 1 from public.loan_payoffs where bill_id = (pg_temp.bill('Clamp')).id and paid_on = pg_temp.today() + 1),
  'a day sent 30 days ahead is held to tomorrow: a payoff dated tomorrow is taken, one after it is not');

-- Switched back on with a day 30 days ahead: it counts from tomorrow, not from then.
select pg_temp.save('Clamp, kept out');
select public.update_loan(
  p_bill_id => (pg_temp.bill('Clamp, kept out')).id, p_name => 'Clamp, kept out', p_icon_id => 'loan-car',
  p_principal => 9000, p_annual_rate => 6, p_term_months => 36, p_monthly_payment => 300,
  p_total_interest => 600, p_first_payment_on => pg_temp.today() - 200, p_funded_on => null,
  p_day_count_basis => 'actual/365', p_card_id => null, p_bank_account_id => null,
  p_in_spending => false, p_today => pg_temp.today());
select public.update_loan(
  p_bill_id => (pg_temp.bill('Clamp, kept out')).id, p_name => 'Clamp, kept out', p_icon_id => 'loan-car',
  p_principal => 9000, p_annual_rate => 6, p_term_months => 36, p_monthly_payment => 300,
  p_total_interest => 600, p_first_payment_on => pg_temp.today() - 200, p_funded_on => null,
  p_day_count_basis => 'actual/365', p_card_id => null, p_bank_account_id => null,
  p_in_spending => true, p_today => pg_temp.today() + 30);
select pg_temp.check(
  (pg_temp.bill('Clamp, kept out')).starts_on = pg_temp.today() + 1,
  'switched back on with a day sent 30 days ahead, it counts from tomorrow');

-- And 30 days back: held to yesterday, on both.
select pg_temp.save('Clamp back');
select pg_temp.expect_error(
  $s$select public.record_loan_payoff((pg_temp.bill('Clamp back')).id, pg_temp.today(), 10, 'partial',
       null, null, null, pg_temp.today() - 30)$s$,
  'P0001', 'a payoff cannot be dated after today');
select public.record_loan_payoff((pg_temp.bill('Clamp back')).id, pg_temp.today() - 1, 10, 'partial',
  null, null, null, pg_temp.today() - 30);
select pg_temp.check(
  (select count(*) = 1 from public.loan_payoffs where bill_id = (pg_temp.bill('Clamp back')).id and paid_on = pg_temp.today() - 1),
  'a day sent 30 days back is held to yesterday: a payoff dated yesterday is taken, one dated today is not');

-- Added 60 days ago, so only the switch's day can be the floor.
select pg_temp.save('Clamp back, kept out');
reset role;
update public.bills set created_at = now() - interval '60 days' where name = 'Clamp back, kept out';
select pg_temp.as_user('d1');
select public.update_loan(
  p_bill_id => (pg_temp.bill('Clamp back, kept out')).id, p_name => 'Clamp back, kept out', p_icon_id => 'loan-car',
  p_principal => 9000, p_annual_rate => 6, p_term_months => 36, p_monthly_payment => 300,
  p_total_interest => 600, p_first_payment_on => pg_temp.today() - 200, p_funded_on => null,
  p_day_count_basis => 'actual/365', p_card_id => null, p_bank_account_id => null,
  p_in_spending => false, p_today => pg_temp.today());
select public.update_loan(
  p_bill_id => (pg_temp.bill('Clamp back, kept out')).id, p_name => 'Clamp back, kept out', p_icon_id => 'loan-car',
  p_principal => 9000, p_annual_rate => 6, p_term_months => 36, p_monthly_payment => 300,
  p_total_interest => 600, p_first_payment_on => pg_temp.today() - 200, p_funded_on => null,
  p_day_count_basis => 'actual/365', p_card_id => null, p_bank_account_id => null,
  p_in_spending => true, p_today => pg_temp.today() - 30);
select pg_temp.check(
  (pg_temp.bill('Clamp back, kept out')).starts_on = pg_temp.today() - 1,
  'switched back on with a day sent 30 days back, it counts from yesterday');

-- update_loan_and_charges, which calls update_loan by name, still saves.
select public.update_loan_and_charges(
  p_bill_id => (pg_temp.bill('Clamp, kept out')).id, p_name => 'Clamp, renamed', p_icon_id => 'loan-car',
  p_principal => 9000, p_annual_rate => 6, p_term_months => 36, p_monthly_payment => 310,
  p_total_interest => 600, p_first_payment_on => pg_temp.today() - 200, p_funded_on => null,
  p_day_count_basis => 'actual/365', p_card_id => null, p_bank_account_id => null,
  p_in_spending => true, p_today => pg_temp.today());
select pg_temp.check(
  (pg_temp.bill('Clamp, renamed')).amount = 310,
  'update_loan_and_charges still saves through update_loan');

reset role;
rollback;
\echo ALL CHECKS PASSED
