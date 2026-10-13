-- Checks for 20261013600003_plan_edit_and_charges.sql. LOCAL database only, with it applied:
-- everything runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/plan_edit_and_charges.sql
--
-- A bill or subscription edit and the rewrite of its recorded charges are one call: both are
-- written or neither. Only the columns a person edits are written, every trigger still runs, and
-- someone else's plan is "not there".
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d5', 'plan-edit@test.local'),
  ('00000000-0000-0000-0000-0000000000d6', 'plan-edit-other@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000d5'), ('00000000-0000-0000-0000-0000000000d6')
on conflict (id) do nothing;
update public.profiles set timezone = 'UTC'
 where id in ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000d6');
-- Pro, for a second card to move the plans to.
insert into public.entitlements (user_id, pro, expires_at)
values ('00000000-0000-0000-0000-0000000000d5', true, null);
insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000c01d5', '00000000-0000-0000-0000-0000000000d5', 'Old card'),
  ('00000000-0000-0000-0000-0000000c02d5', '00000000-0000-0000-0000-0000000000d5', 'New card'),
  ('00000000-0000-0000-0000-0000000c00d6', '00000000-0000-0000-0000-0000000000d6', 'Theirs');
insert into public.bank_accounts (id, user_id, bank_name) values
  ('00000000-0000-0000-0000-0000000a01d5', '00000000-0000-0000-0000-0000000000d5', 'Mine');

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

-- A charge as the recorder writes it: the plan's name, amount and card on the day.
create or replace function pg_temp.charges_of(p_plan uuid) returns text
language sql as $$
  select coalesce(string_agg(charged_on || ' ' || label || ' ' || amount || ' ' || coalesce(card_id::text, '-'),
                             ', ' order by charged_on), '-')
  from public.charges where bill_id = p_plan or subscription_id = p_plan
$$;

-- ---------------------------------------------------------------- the functions
select pg_temp.check(
  bool_and(has_function_privilege('authenticated', f, 'execute')
           and not has_function_privilege('anon', f, 'execute')
           and not has_function_privilege('public', f, 'execute')),
  'signed-in people may call both, signed-out ones may not')
from unnest(array['public.update_bill_and_charges(uuid,jsonb,boolean)',
                  'public.update_subscription_and_charges(uuid,jsonb,boolean)']) f;
select pg_temp.check(
  (select bool_and(not p.prosecdef and p.proconfig = array['search_path=public'])
     from pg_proc p where p.pronamespace = 'public'::regnamespace
      and p.proname in ('update_bill_and_charges', 'update_subscription_and_charges')),
  'both run as the caller, so row security keeps each person to their own plans and charges');

-- ---------------------------------------------------------------- a bill
insert into public.bills (id, user_id, name, amount, category_id, recurrence, next_due_on, starts_on, card_id, note)
values ('00000000-0000-0000-0000-0000000b01d5', '00000000-0000-0000-0000-0000000000d5', 'Rent', 1000, 'housing',
        'monthly', '2026-11-01', '2026-08-01', '00000000-0000-0000-0000-0000000c01d5', 'flat 2'),
       ('00000000-0000-0000-0000-0000000b02d5', '00000000-0000-0000-0000-0000000000d5', 'Phone', 30, 'mobile',
        'monthly', '2026-11-10', '2026-08-10', '00000000-0000-0000-0000-0000000c01d5', null);
insert into public.charges (user_id, bill_id, label, amount, charged_on, card_id)
select '00000000-0000-0000-0000-0000000000d5', b.id, b.name, b.amount, d::date, b.card_id
from public.bills b, generate_series('2026-08-01'::date, '2026-10-01'::date, interval '1 month') d
where b.id = '00000000-0000-0000-0000-0000000b01d5';
insert into public.charges (user_id, bill_id, label, amount, charged_on, card_id)
values ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000b02d5', 'Phone', 30, '2026-10-10',
        '00000000-0000-0000-0000-0000000c01d5');

select pg_temp.as_user('d5');
create temp table rent_before as select to_jsonb(b) as row from public.bills b where b.id = '00000000-0000-0000-0000-0000000b01d5';
grant select on rent_before to authenticated;

-- Past and upcoming: the bill and every charge it recorded.
select public.update_bill_and_charges('00000000-0000-0000-0000-0000000b01d5',
  '{"name": "Rent (flat 2)", "amount": 1100, "card_id": "00000000-0000-0000-0000-0000000c02d5"}', true);
select pg_temp.check(
  (select name = 'Rent (flat 2)' and amount = 1100 and card_id = '00000000-0000-0000-0000-0000000c02d5'
          and note = 'flat 2' and next_due_on = '2026-11-01' and starts_on = '2026-08-01' and category_id = 'housing'
     from public.bills where id = '00000000-0000-0000-0000-0000000b01d5'),
  'the bill takes what was sent; every column left out keeps its value');
select pg_temp.check(
  pg_temp.charges_of('00000000-0000-0000-0000-0000000b01d5')
  = '2026-08-01 Rent (flat 2) 1100.00 00000000-0000-0000-0000-0000000c02d5, '
    || '2026-09-01 Rent (flat 2) 1100.00 00000000-0000-0000-0000-0000000c02d5, '
    || '2026-10-01 Rent (flat 2) 1100.00 00000000-0000-0000-0000-0000000c02d5',
  'its recorded charges take the name, amount and card it now has, on the days they landed');
select pg_temp.check(
  pg_temp.charges_of('00000000-0000-0000-0000-0000000b02d5') = '2026-10-10 Phone 30.00 00000000-0000-0000-0000-0000000c01d5',
  'another plan''s charges are left alone');

-- Upcoming only: the bill, not its past.
select public.update_bill_and_charges('00000000-0000-0000-0000-0000000b01d5', '{"amount": 1200}', false);
select pg_temp.check(
  (select amount = 1200 and name = 'Rent (flat 2)' from public.bills where id = '00000000-0000-0000-0000-0000000b01d5')
  and pg_temp.charges_of('00000000-0000-0000-0000-0000000b01d5') like '%1100.00%'
  and pg_temp.charges_of('00000000-0000-0000-0000-0000000b01d5') not like '%1200.00%',
  'upcoming only: the bill changes and its charges keep their figures');

-- The columns the database keeps are never taken from what is sent.
select public.update_bill_and_charges('00000000-0000-0000-0000-0000000b01d5',
  jsonb_build_object('id', gen_random_uuid(), 'user_id', '00000000-0000-0000-0000-0000000000d6',
                     'created_at', '2000-01-01T00:00:00Z', 'updated_at', '2000-01-01T00:00:00Z',
                     'anchor_day', 9, 'name', 'Rent'), false);
select pg_temp.check(
  (select b.id = (r.row->>'id')::uuid and b.user_id = '00000000-0000-0000-0000-0000000000d5'
          and b.created_at = (r.row->>'created_at')::timestamptz and b.updated_at > '2000-01-02'
          and b.anchor_day = 1 and b.name = 'Rent'
     from public.bills b, rent_before r where b.id = '00000000-0000-0000-0000-0000000b01d5'),
  'id, owner, created_at, updated_at and anchor_day sent in the values are ignored');

-- The triggers run: a moved date sets the anchor, as any edit does.
select public.update_bill_and_charges('00000000-0000-0000-0000-0000000b01d5', '{"next_due_on": "2026-11-15"}', false);
select pg_temp.check(
  (select next_due_on = '2026-11-15' and anchor_day = 15 from public.bills where id = '00000000-0000-0000-0000-0000000b01d5'),
  'a date moved through it sets the anchor, as a plain edit does');

-- An empty name: the charges read 'Bill', as the recorder writes them.
select public.update_bill_and_charges('00000000-0000-0000-0000-0000000b02d5', '{"name": ""}', true);
select pg_temp.check(
  pg_temp.charges_of('00000000-0000-0000-0000-0000000b02d5') = '2026-10-10 Bill 30.00 00000000-0000-0000-0000-0000000c01d5',
  'a bill with no name rewrites its charges as ''Bill''');

-- Every column a person edits, at once. Its dates are past the floor its October charge sets.
select public.update_bill_and_charges('00000000-0000-0000-0000-0000000b02d5', jsonb_build_object(
  'name', 'Phone plan', 'amount', 35.5, 'category_id', 'internet', 'icon_id', 'wifi',
  'recurrence', 'quarterly', 'next_due_on', '2027-01-20', 'starts_on', '2027-01-01', 'ends_on', '2027-12-31',
  'card_id', null, 'bank_account_id', '00000000-0000-0000-0000-0000000a01d5', 'note', 'family plan',
  'brand_id', '1password', 'logo_domain', 'example.com', 'logo_hidden', true, 'in_spending', false), false);
select pg_temp.check(
  (select name = 'Phone plan' and amount = 35.50 and category_id = 'internet' and icon_id = 'wifi'
          and recurrence = 'quarterly' and next_due_on = '2027-01-20' and starts_on = '2027-01-01'
          and ends_on = '2027-12-31' and card_id is null and bank_account_id = '00000000-0000-0000-0000-0000000a01d5'
          and note = 'family plan' and brand_id = '1password' and logo_domain = 'example.com' and logo_hidden
          and not in_spending and anchor_day = 20
     from public.bills where id = '00000000-0000-0000-0000-0000000b02d5'),
  'every column a person edits on a bill is written, and the anchor follows the new date');

-- ---------------------------------------------------------------- all or nothing
create temp table before_failures as
select (select to_jsonb(b) from public.bills b where b.id = '00000000-0000-0000-0000-0000000b01d5') as bill,
       pg_temp.charges_of('00000000-0000-0000-0000-0000000b01d5') as charges;
grant select on before_failures to authenticated;

-- The bill refused (its end before its start): no charge is rewritten.
select pg_temp.expect_error(
  $s$select public.update_bill_and_charges('00000000-0000-0000-0000-0000000b01d5',
       '{"amount": 1, "ends_on": "2026-01-01"}', true)$s$,
  '23514', 'bills_period_order');
-- Someone else's card: refused by the bill's owner check, nothing written.
select pg_temp.expect_error(
  $s$select public.update_bill_and_charges('00000000-0000-0000-0000-0000000b01d5',
       '{"amount": 1, "card_id": "00000000-0000-0000-0000-0000000c00d6"}', true)$s$,
  '23514', 'one of your own cards');
-- The rewrite refused: the bill is not saved either.
reset role;
create function pg_temp.refuse_rewrite() returns trigger language plpgsql as $$
begin
  raise exception 'rewrite refused here' using errcode = 'P0001';
end $$;
create trigger zz_refuse_rewrite before update on public.charges
  for each row execute function pg_temp.refuse_rewrite();
select pg_temp.as_user('d5');
select pg_temp.expect_error(
  $s$select public.update_bill_and_charges('00000000-0000-0000-0000-0000000b01d5', '{"amount": 2}', true)$s$,
  'P0001', 'rewrite refused here');
reset role;
drop trigger zz_refuse_rewrite on public.charges;
select pg_temp.check(
  (select (select to_jsonb(b) from public.bills b where b.id = '00000000-0000-0000-0000-0000000b01d5') = bill
          and pg_temp.charges_of('00000000-0000-0000-0000-0000000b01d5') = charges from before_failures),
  'any refusal, from the bill or the rewrite, leaves both as they were');

-- ---------------------------------------------------------------- refusals
select pg_temp.as_user('d6');
select pg_temp.expect_error(
  $s$select public.update_bill_and_charges('00000000-0000-0000-0000-0000000b01d5', '{"name": "Mine"}', true)$s$,
  'P0002', 'there is no such bill');
select pg_temp.as_user('d5');
select pg_temp.expect_error(
  $s$select public.update_bill_and_charges(gen_random_uuid(), '{"name": "Gone"}', false)$s$,
  'P0002', 'there is no such bill');
select pg_temp.expect_error(
  $s$select public.update_bill_and_charges('00000000-0000-0000-0000-0000000b01d5', null, false)$s$,
  '22023', 'the values to save are missing');
select pg_temp.expect_error(
  $s$select public.update_bill_and_charges('00000000-0000-0000-0000-0000000b01d5', '[1]', false)$s$,
  '22023', 'the values to save are missing');
reset role;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error(
  $s$select public.update_bill_and_charges('00000000-0000-0000-0000-0000000b01d5', '{"name": "x"}', false)$s$,
  '42501', 'not authenticated');
select pg_temp.check(
  (select (select to_jsonb(b) from public.bills b where b.id = '00000000-0000-0000-0000-0000000b01d5') = bill
     from before_failures),
  'and none of those wrote anything');

-- ---------------------------------------------------------------- a subscription
insert into public.subscriptions (id, user_id, name, amount, cycle, next_renewal_on, started_on, card_id, active)
values ('00000000-0000-0000-0000-0000000501d5', '00000000-0000-0000-0000-0000000000d5', 'Stream', 15.99, 'monthly',
        '2026-11-05', '2026-09-05', '00000000-0000-0000-0000-0000000c01d5', true);
insert into public.charges (user_id, subscription_id, label, amount, charged_on, card_id)
values ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000501d5', 'Stream', 15.99, '2026-09-05',
        '00000000-0000-0000-0000-0000000c01d5'),
       ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000501d5', 'Stream', 15.99, '2026-10-05',
        '00000000-0000-0000-0000-0000000c01d5');
select pg_temp.as_user('d5');
select public.update_subscription_and_charges('00000000-0000-0000-0000-0000000501d5',
  '{"name": "", "amount": 17.99, "card_id": "00000000-0000-0000-0000-0000000c02d5"}', true);
select pg_temp.check(
  (select name = '' and amount = 17.99 and card_id = '00000000-0000-0000-0000-0000000c02d5' and active
          and next_renewal_on = '2026-11-05'
     from public.subscriptions where id = '00000000-0000-0000-0000-0000000501d5')
  and pg_temp.charges_of('00000000-0000-0000-0000-0000000501d5')
      = '2026-09-05 Subscription 17.99 00000000-0000-0000-0000-0000000c02d5, '
        || '2026-10-05 Subscription 17.99 00000000-0000-0000-0000-0000000c02d5',
  'a subscription and its renewals, in one call; with no name its renewals read ''Subscription''');
select public.update_subscription_and_charges('00000000-0000-0000-0000-0000000501d5', jsonb_build_object(
  'brand_id', '1password', 'name', 'Passwords', 'amount', 36, 'cycle', 'yearly', 'next_renewal_on', '2027-02-05',
  'category_id', 'software', 'card_id', null, 'bank_account_id', '00000000-0000-0000-0000-0000000a01d5',
  'started_on', '2027-01-01', 'active', false, 'note', 'shared', 'logo_domain', 'example.com', 'logo_hidden', true),
  false);
select pg_temp.check(
  (select brand_id = '1password' and name = 'Passwords' and amount = 36 and cycle = 'yearly'
          and next_renewal_on = '2027-02-05' and category_id = 'software' and card_id is null
          and bank_account_id = '00000000-0000-0000-0000-0000000a01d5' and started_on = '2027-01-01' and not active
          and note = 'shared' and logo_domain = 'example.com' and logo_hidden and anchor_day = 5
     from public.subscriptions where id = '00000000-0000-0000-0000-0000000501d5')
  and pg_temp.charges_of('00000000-0000-0000-0000-0000000501d5') like '%Subscription 17.99%',
  'every column a person edits on a subscription is written; upcoming only leaves its renewals');
select pg_temp.as_user('d6');
select pg_temp.expect_error(
  $s$select public.update_subscription_and_charges('00000000-0000-0000-0000-0000000501d5', '{"name": "Mine"}', true)$s$,
  'P0002', 'there is no such subscription');

reset role;
rollback;
\echo ALL CHECKS PASSED
