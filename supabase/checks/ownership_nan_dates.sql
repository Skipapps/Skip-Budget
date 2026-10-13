-- Checks for 20261013600004_ownership_nan_dates.sql. LOCAL database only, with it applied:
-- everything runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/ownership_nan_dates.sql
--
-- Every numeric column refuses NaN (its precision already refuses ±Infinity); a bill, subscription, receipt, payment, charge,
-- reminder and loan may only name the same person's card, account, bill or subscription; a receipt
-- or payment dated before the person's first kept day is refused; and the seven-year job adds a
-- deleted row only into its own person's card or account. Rows that break the new rules are seeded
-- with triggers off, as rows written before the rules existed would be.
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owners@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'owners-other@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000e2')
on conflict (id) do nothing;
update public.profiles set timezone = 'UTC'
 where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2');
-- Pro, for a second card.
insert into public.entitlements (user_id, pro, expires_at)
values ('00000000-0000-0000-0000-0000000000e1', true, null);

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

-- Both people are in UTC, so their first kept day is the job's.
create temp table day as
select (now() at time zone 'UTC')::date as today,
       public.retention_cutoff('00000000-0000-0000-0000-0000000000e1') as kept_from;
grant select on day to authenticated;
create or replace function pg_temp.today() returns date language sql stable as $$ select today from day $$;
create or replace function pg_temp.c() returns date language sql stable as $$ select kept_from from day $$;

-- e1: two cards (c01, c02), an account (a01), a bill (b01), a stopped bill (b02), a subscription (s01).
-- e2: a card (c00), an account (a00), a bill (b00), a subscription switched off (s00) and one on (s01).
insert into public.cards (id, user_id, holder, balance) values
  ('00000000-0000-0000-0000-0000000c01e1', '00000000-0000-0000-0000-0000000000e1', 'Mine', 1000),
  ('00000000-0000-0000-0000-0000000c02e1', '00000000-0000-0000-0000-0000000000e1', 'Mine too', 0),
  ('00000000-0000-0000-0000-0000000c00e2', '00000000-0000-0000-0000-0000000000e2', 'Theirs', 500);
insert into public.bank_accounts (id, user_id, bank_name, balance) values
  ('00000000-0000-0000-0000-0000000a01e1', '00000000-0000-0000-0000-0000000000e1', 'Mine', 2000),
  ('00000000-0000-0000-0000-0000000a00e2', '00000000-0000-0000-0000-0000000000e2', 'Theirs', 300);
insert into public.bills (id, user_id, name, amount, category_id, recurrence, next_due_on, starts_on, card_id)
select v.id, v.user_id, v.name, 20, 'other', 'monthly', v.next_due_on, pg_temp.today() - 60, v.card_id
from (values
  ('00000000-0000-0000-0000-0000000b01e1'::uuid, '00000000-0000-0000-0000-0000000000e1'::uuid, 'My bill',
   pg_temp.today() + 10, '00000000-0000-0000-0000-0000000c01e1'::uuid),
  ('00000000-0000-0000-0000-0000000b02e1', '00000000-0000-0000-0000-0000000000e1', 'My stopped bill',
   null, '00000000-0000-0000-0000-0000000c01e1'),
  ('00000000-0000-0000-0000-0000000b00e2', '00000000-0000-0000-0000-0000000000e2', 'Their bill',
   pg_temp.today() + 10, '00000000-0000-0000-0000-0000000c00e2')) v(id, user_id, name, next_due_on, card_id);
insert into public.subscriptions (id, user_id, name, amount, cycle, next_renewal_on, started_on, card_id, active)
values ('00000000-0000-0000-0000-0000000501e1', '00000000-0000-0000-0000-0000000000e1', 'My stream', 9.99, 'monthly',
        pg_temp.today() + 10, pg_temp.today() - 60, '00000000-0000-0000-0000-0000000c01e1', true),
       ('00000000-0000-0000-0000-0000000500e2', '00000000-0000-0000-0000-0000000000e2', 'Their stream', 9.99, 'monthly',
        pg_temp.today() + 10, pg_temp.today() - 60, '00000000-0000-0000-0000-0000000c00e2', false),
       ('00000000-0000-0000-0000-0000000501e2', '00000000-0000-0000-0000-0000000000e2', 'Their walked stream', 4.99,
        'monthly', pg_temp.today() + 10, pg_temp.today() - 60, '00000000-0000-0000-0000-0000000c00e2', true);

-- ---------------------------------------------------------------- the job's body is its source, with only its own lines
select pg_temp.check(
  pg_temp.times(pg_temp.src('prune_expired_data'), $h$    returning pm.user_id, pm.card_id, pm.bank_account_id, pm.from_bank_account_id, pm.amount, pm.paid_on
$h$) = 1
  and pg_temp.times(pg_temp.src('prune_expired_data'), $h$    returning c.user_id, c.bill_id, c.subscription_id, c.card_id, c.bank_account_id, c.amount, c.charged_on
$h$) = 1
  and pg_temp.times(pg_temp.src('prune_expired_data'), $h$    left join public.bills b on b.id = g.bill_id and b.user_id = g.user_id
    left join public.subscriptions s on s.id = g.subscription_id and s.user_id = g.user_id
$h$) = 1
  and pg_temp.times(pg_temp.src('prune_expired_data'), $h$    select 'account' as kind, user_id, bank_account_id as source_id, paid_on as on_day, amount as delta
$h$) = 1
  and pg_temp.times(pg_temp.src('prune_expired_data'), $h$    select 'account', user_id, from_bank_account_id, paid_on, -amount
$h$) = 1
  and pg_temp.times(pg_temp.src('prune_expired_data'), $h$    select 'card', user_id, card_id, paid_on, -amount
$h$) = 1
  and pg_temp.times(pg_temp.src('prune_expired_data'), $h$    select 'account', user_id, bank_account_id, charged_on, -amount
$h$) = 1
  and pg_temp.times(pg_temp.src('prune_expired_data'), $h$    select 'card', user_id, card_id, charged_on, amount
$h$) = 1
  and pg_temp.times(pg_temp.src('prune_expired_data'), $h$    join public.bank_accounts a on a.id = e.source_id and a.user_id = e.user_id
$h$) = 1
  and pg_temp.times(pg_temp.src('prune_expired_data'), $h$    join public.cards c on c.id = e.source_id and c.user_id = e.user_id
$h$) = 1
  and md5(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(pg_temp.src('prune_expired_data'),
        $h$    returning pm.user_id, pm.card_id, pm.bank_account_id, pm.from_bank_account_id, pm.amount, pm.paid_on
$h$,
        $h$    returning pm.card_id, pm.bank_account_id, pm.from_bank_account_id, pm.amount, pm.paid_on
$h$),
        $h$    returning c.user_id, c.bill_id, c.subscription_id, c.card_id, c.bank_account_id, c.amount, c.charged_on
$h$,
        $h$    returning c.bill_id, c.subscription_id, c.card_id, c.bank_account_id, c.amount, c.charged_on
$h$),
        $h$    left join public.bills b on b.id = g.bill_id and b.user_id = g.user_id
    left join public.subscriptions s on s.id = g.subscription_id and s.user_id = g.user_id
$h$,
        $h$    left join public.bills b on b.id = g.bill_id
    left join public.subscriptions s on s.id = g.subscription_id
$h$),
        $h$    select 'account' as kind, user_id, bank_account_id as source_id, paid_on as on_day, amount as delta
$h$,
        $h$    select 'account' as kind, bank_account_id as source_id, paid_on as on_day, amount as delta
$h$),
        $h$    select 'account', user_id, from_bank_account_id, paid_on, -amount
$h$,
        $h$    select 'account', from_bank_account_id, paid_on, -amount
$h$),
        $h$    select 'card', user_id, card_id, paid_on, -amount
$h$,
        $h$    select 'card', card_id, paid_on, -amount
$h$),
        $h$    select 'account', user_id, bank_account_id, charged_on, -amount
$h$,
        $h$    select 'account', bank_account_id, charged_on, -amount
$h$),
        $h$    select 'card', user_id, card_id, charged_on, amount
$h$,
        $h$    select 'card', card_id, charged_on, amount
$h$),
        $h$    join public.bank_accounts a on a.id = e.source_id and a.user_id = e.user_id
$h$,
        $h$    join public.bank_accounts a on a.id = e.source_id
$h$),
        $h$    join public.cards c on c.id = e.source_id and c.user_id = e.user_id
$h$,
        $h$    join public.cards c on c.id = e.source_id
$h$)) = '917089e69adee667728ed25b1e7002bb',
  'prune_expired_data is 20261013300002''s with only the owner joined in');

-- ---------------------------------------------------------------- finite amounts
select pg_temp.check(
  (select array_agg(c.table_name || '.' || c.column_name order by c.table_name || '.' || c.column_name)
     from information_schema.columns c
     join pg_class r on r.relname = c.table_name and r.relnamespace = 'public'::regnamespace and r.relkind = 'r'
    where c.table_schema = 'public' and c.data_type in ('numeric', 'real', 'double precision'))
  = (select array_agg(k.conrelid::regclass::text || '.' || a.attname order by k.conrelid::regclass::text || '.' || a.attname)
       from pg_constraint k
       join pg_attribute a on a.attrelid = k.conrelid and a.attnum = k.conkey[1]
      where k.contype = 'c' and k.conname like '%\_finite' and k.connamespace = 'public'::regnamespace),
  'every number column of the app''s tables has a finite check, and every finite check is on one');
select pg_temp.check(
  (select count(*) = 35
          and bool_and(k.convalidated
                       and k.conname = k.conrelid::regclass::text || '_' || a.attname || '_finite'
                       and pg_get_constraintdef(k.oid)
                           = format('CHECK ((%s <> ALL (ARRAY[''NaN''::numeric, ''Infinity''::numeric, ''-Infinity''::numeric])))',
                                    a.attname))
     from pg_constraint k
     join pg_attribute a on a.attrelid = k.conrelid and a.attnum = k.conkey[1]
    where k.contype = 'c' and k.conname like '%\_finite' and k.connamespace = 'public'::regnamespace),
  'all 35 are validated, named for their column, and refuse exactly NaN, Infinity and -Infinity');

select pg_temp.check(
  (select bool_and(c.numeric_precision is not null)
     from information_schema.columns c
     join pg_class r on r.relname = c.table_name and r.relnamespace = 'public'::regnamespace and r.relkind = 'r'
    where c.table_schema = 'public' and c.data_type = 'numeric'),
  'each has a precision, which already refuses Infinity: NaN is what the checks add today');

select pg_temp.as_user('e1');
-- A receipt or payment amount must be above 0, which NaN is, as numeric sorts it.
select pg_temp.expect_error(
  $s$insert into public.receipts (user_id, merchant, amount) values ('00000000-0000-0000-0000-0000000000e1', 'Shop', 'NaN')$s$,
  '23514', 'receipts_amount_finite');
select pg_temp.expect_error(
  $s$insert into public.payments (user_id, card_id, amount)
     values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000c01e1', 'NaN')$s$,
  '23514', 'payments_amount_finite');
select pg_temp.expect_error(
  $s$update public.cards set balance = 'NaN' where id = '00000000-0000-0000-0000-0000000c01e1'$s$,
  '23514', 'cards_balance_finite');
select pg_temp.expect_error(
  $s$update public.cards set balance = '-Infinity' where id = '00000000-0000-0000-0000-0000000c01e1'$s$,
  '22003', 'numeric field overflow');
select pg_temp.expect_error(
  $s$update public.cards set credit_limit = 'NaN' where id = '00000000-0000-0000-0000-0000000c01e1'$s$,
  '23514', 'cards_credit_limit_finite');
update public.cards set credit_limit = 2500 where id = '00000000-0000-0000-0000-0000000c01e1';
update public.cards set credit_limit = null where id = '00000000-0000-0000-0000-0000000c01e1';
select pg_temp.check(
  (select balance = 1000 and credit_limit is null from public.cards where id = '00000000-0000-0000-0000-0000000c01e1'),
  'a number saves, and a column that may be empty still takes no value');
reset role;

-- ---------------------------------------------------------------- owners: the triggers
select pg_temp.check(
  (select array_agg(t.tgname::text || ' ' || t.tgrelid::regclass::text || ' ' || p.proname
                    || ' ' || (t.tgtype & 2 = 2)::text || ' ' || (t.tgtype & 4 = 4)::text || ' ' || (t.tgtype & 16 = 16)::text
                    || ' ' || (select string_agg(a.attname, ',' order by a.attname)
                                 from pg_attribute a where a.attrelid = t.tgrelid and a.attnum = any (t.tgattr))
                    order by t.tgname)
     from pg_trigger t join pg_proc p on p.oid = t.tgfoid
    where not t.tgisinternal and t.tgname in ('bills_own_sources', 'subscriptions_own_sources', 'receipts_own_sources',
                                              'payments_own_target', 'charges_own_rows', 'reminders_own_target', 'loans_own_bill'))
  = array['bills_own_sources bills bills_own_sources true true true bank_account_id,card_id,user_id',
          'charges_own_rows charges charges_own_rows true true true bank_account_id,bill_id,card_id,subscription_id,user_id',
          'loans_own_bill loans loans_own_bill true true true bill_id,user_id',
          'payments_own_target payments payments_own_target true true true bank_account_id,card_id,user_id',
          'receipts_own_sources receipts receipts_own_sources true true true bank_account_id,card_id,user_id',
          'reminders_own_target reminders reminders_own_target true true true bank_account_id,bill_id,card_id,subscription_id,user_id',
          'subscriptions_own_sources subscriptions subscriptions_own_sources true true true bank_account_id,card_id,user_id'],
  'seven owner checks, each before a row is added or one of the columns it checks changes');
select pg_temp.check(
  (select count(*) = 7 and bool_and(not p.prosecdef and p.proconfig = array['search_path=public'])
     from pg_proc p where p.pronamespace = 'public'::regnamespace
      and p.proname in ('bills_own_sources', 'subscriptions_own_sources', 'receipts_own_sources', 'payments_own_target',
                        'charges_own_rows', 'reminders_own_target', 'loans_own_bill')),
  'they run as the writer: a person sees only their own rows, the recorder sees every row and its owner');

-- ---------------------------------------------------------------- owners: a person in the app
select pg_temp.as_user('e1');
select pg_temp.expect_error(
  $s$insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, card_id)
     values ('00000000-0000-0000-0000-0000000000e1', 'Bill', 1, 'other', 'monthly', current_date + 5,
             '00000000-0000-0000-0000-0000000c00e2')$s$,
  '23514', 'A bill can only be paid with one of your own cards.');
select pg_temp.expect_error(
  $s$update public.bills set bank_account_id = '00000000-0000-0000-0000-0000000a00e2', card_id = null
      where id = '00000000-0000-0000-0000-0000000b01e1'$s$,
  '23514', 'A bill can only be paid from one of your own accounts.');
select pg_temp.expect_error(
  $s$insert into public.subscriptions (user_id, name, amount, cycle, next_renewal_on, card_id)
     values ('00000000-0000-0000-0000-0000000000e1', 'Sub', 1, 'monthly', current_date + 5,
             '00000000-0000-0000-0000-0000000c00e2')$s$,
  '23514', 'A subscription can only be paid with one of your own cards.');
select pg_temp.expect_error(
  $s$update public.subscriptions set bank_account_id = '00000000-0000-0000-0000-0000000a00e2', card_id = null
      where id = '00000000-0000-0000-0000-0000000501e1'$s$,
  '23514', 'A subscription can only be paid from one of your own accounts.');
select pg_temp.expect_error(
  $s$insert into public.receipts (user_id, merchant, amount, card_id)
     values ('00000000-0000-0000-0000-0000000000e1', 'Shop', 5, '00000000-0000-0000-0000-0000000c00e2')$s$,
  '23514', 'A receipt can only be paid with one of your own cards.');
select pg_temp.expect_error(
  $s$insert into public.receipts (user_id, merchant, amount, bank_account_id)
     values ('00000000-0000-0000-0000-0000000000e1', 'Shop', 5, '00000000-0000-0000-0000-0000000a00e2')$s$,
  '23514', 'A receipt can only be paid from one of your own accounts.');
select pg_temp.expect_error(
  $s$insert into public.payments (user_id, card_id, amount)
     values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000c00e2', 5)$s$,
  '23514', 'A payment can only go to one of your own cards.');
select pg_temp.expect_error(
  $s$insert into public.payments (user_id, bank_account_id, amount)
     values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000a00e2', 5)$s$,
  '23514', 'A payment can only go to one of your own accounts.');
-- Their own: each saves.
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, bank_account_id)
values ('00000000-0000-0000-0000-0000000000e1', 'Water', 30, 'other', 'monthly', pg_temp.today() + 5,
        '00000000-0000-0000-0000-0000000a01e1');
insert into public.receipts (user_id, merchant, amount, card_id)
values ('00000000-0000-0000-0000-0000000000e1', 'Shop', 5, '00000000-0000-0000-0000-0000000c01e1');
insert into public.payments (user_id, card_id, amount, from_bank_account_id)
values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000c01e1', 5,
        '00000000-0000-0000-0000-0000000a01e1');
select pg_temp.check(
  (select count(*) = 1 from public.bills where name = 'Water' and user_id = '00000000-0000-0000-0000-0000000000e1')
  and (select count(*) = 1 from public.receipts where user_id = '00000000-0000-0000-0000-0000000000e1')
  and (select count(*) = 1 from public.payments where user_id = '00000000-0000-0000-0000-0000000000e1'),
  'a bill, receipt and payment on the person''s own card or account save as before');
reset role;

-- ---------------------------------------------------------------- owners: code running as the owner
-- It sees every row, so only the owner in the check tells theirs from someone else's.
select pg_temp.expect_error(
  $s$insert into public.charges (user_id, bill_id, label, amount, charged_on)
     values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000b00e2', 'x', 1, current_date)$s$,
  '23514', 'A charge can only be for one of your own bills.');
select pg_temp.expect_error(
  $s$insert into public.charges (user_id, subscription_id, label, amount, charged_on)
     values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000500e2', 'x', 1, current_date)$s$,
  '23514', 'A charge can only be for one of your own subscriptions.');
select pg_temp.expect_error(
  $s$insert into public.charges (user_id, bill_id, label, amount, charged_on, card_id)
     values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000b01e1', 'x', 1, current_date,
             '00000000-0000-0000-0000-0000000c00e2')$s$,
  '23514', 'A charge can only be paid with one of your own cards.');
select pg_temp.expect_error(
  $s$insert into public.charges (user_id, bill_id, label, amount, charged_on, bank_account_id)
     values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000b01e1', 'x', 1, current_date,
             '00000000-0000-0000-0000-0000000a00e2')$s$,
  '23514', 'A charge can only be paid from one of your own accounts.');
select pg_temp.expect_error(
  $s$insert into public.reminders (user_id, bill_id) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000b00e2')$s$,
  '23514', 'A reminder can only be for one of your own bills.');
select pg_temp.expect_error(
  $s$insert into public.reminders (user_id, subscription_id) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000500e2')$s$,
  '23514', 'A reminder can only be for one of your own subscriptions.');
select pg_temp.expect_error(
  $s$insert into public.reminders (user_id, card_id) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000c00e2')$s$,
  '23514', 'A reminder can only be for one of your own cards.');
select pg_temp.expect_error(
  $s$insert into public.reminders (user_id, bank_account_id) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000a00e2')$s$,
  '23514', 'A reminder can only be for one of your own accounts.');
select pg_temp.expect_error(
  $s$insert into public.loans (user_id, bill_id, principal, annual_rate, term_months, monthly_payment, total_interest)
     values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000b00e2', 1000, 5, 12, 90, 20)$s$,
  '23514', 'A loan can only belong to one of your own bills.');
-- Moving a row to another person leaves it naming the first person's card.
select pg_temp.expect_error(
  $s$update public.bills set user_id = '00000000-0000-0000-0000-0000000000e2' where id = '00000000-0000-0000-0000-0000000b01e1'$s$,
  '23514', 'A bill can only be paid with one of your own cards.');

insert into public.charges (user_id, bill_id, label, amount, charged_on, card_id)
values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000b01e1', 'My bill', 20, pg_temp.today() - 30,
        '00000000-0000-0000-0000-0000000c01e1');
insert into public.reminders (user_id, bill_id) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000b01e1');
insert into public.reminders (user_id, card_id) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000c01e1');
insert into public.loans (id, user_id, bill_id, principal, annual_rate, term_months, monthly_payment, total_interest)
values ('00000000-0000-0000-0000-0000000001e1', '00000000-0000-0000-0000-0000000000e1',
        '00000000-0000-0000-0000-0000000b01e1', 1000, 5, 12, 90, 20);
select pg_temp.expect_error(
  $s$update public.loans set bill_id = '00000000-0000-0000-0000-0000000b00e2' where id = '00000000-0000-0000-0000-0000000001e1'$s$,
  '23514', 'A loan can only belong to one of your own bills.');
select pg_temp.check(
  (select count(*) = 1 from public.charges where user_id = '00000000-0000-0000-0000-0000000000e1')
  and (select count(*) = 2 from public.reminders where user_id = '00000000-0000-0000-0000-0000000000e1')
  and (select bill_id = '00000000-0000-0000-0000-0000000b01e1' from public.loans where id = '00000000-0000-0000-0000-0000000001e1'),
  'a charge, reminders and a loan naming the person''s own rows save as before');

-- The recorder writes every person's charges in one statement, each copying its own plan's card.
update public.bills set next_due_on = pg_temp.today(), starts_on = pg_temp.today()
 where id = '00000000-0000-0000-0000-0000000b02e1';
update public.bills set next_due_on = pg_temp.today(), starts_on = pg_temp.today()
 where id = '00000000-0000-0000-0000-0000000b00e2';
create temp table recorded as
select r.user_id, r.label, r.charged_on from public.record_due_charges() r
 where r.user_id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2');
select pg_temp.check(
  (select array_agg(c.user_id::text || ' ' || c.label || ' ' || c.card_id::text order by c.label)
     from public.charges c where c.charged_on = pg_temp.today()
      and c.user_id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2'))
  = array['00000000-0000-0000-0000-0000000000e1 My stopped bill 00000000-0000-0000-0000-0000000c01e1',
          '00000000-0000-0000-0000-0000000000e2 Their bill 00000000-0000-0000-0000-0000000c00e2'],
  'the recorder still writes two people''s charges at once, each on its own plan''s card');
update public.bills set next_due_on = null where id = '00000000-0000-0000-0000-0000000b02e1';
delete from public.charges where charged_on = pg_temp.today()
   and user_id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2');
update public.bills set next_due_on = pg_temp.today() + 10 where id = '00000000-0000-0000-0000-0000000b00e2';

-- Deleting a card empties it from the rows that name it (its own triggers run with no card).
insert into public.bills (id, user_id, name, amount, category_id, recurrence, next_due_on, card_id)
values ('00000000-0000-0000-0000-0000000b03e1', '00000000-0000-0000-0000-0000000000e1', 'On card two', 10, 'other',
        'monthly', pg_temp.today() + 3, '00000000-0000-0000-0000-0000000c02e1');
insert into public.charges (user_id, bill_id, label, amount, charged_on, card_id)
values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000b03e1', 'On card two', 10,
        pg_temp.today() - 28, '00000000-0000-0000-0000-0000000c02e1');
insert into public.subscriptions (user_id, name, amount, cycle, next_renewal_on, card_id)
values ('00000000-0000-0000-0000-0000000000e1', 'On card two', 3, 'monthly', pg_temp.today() + 3,
        '00000000-0000-0000-0000-0000000c02e1');
insert into public.receipts (user_id, merchant, amount, card_id)
values ('00000000-0000-0000-0000-0000000000e1', 'On card two', 4, '00000000-0000-0000-0000-0000000c02e1');
select pg_temp.as_user('e1');
delete from public.cards where id = '00000000-0000-0000-0000-0000000c02e1';
reset role;
select pg_temp.check(
  (select card_id is null from public.bills where name = 'On card two')
  and (select card_id is null from public.charges where label = 'On card two')
  and (select card_id is null from public.subscriptions where name = 'On card two')
  and (select card_id is null from public.receipts where merchant = 'On card two'),
  'a deleted card leaves its bills, charges, subscriptions and receipts with no card, as before');

-- ---------------------------------------------------------------- seven years
select pg_temp.check(
  (select array_agg(t.tgname::text || ' ' || t.tgrelid::regclass::text
                    || ' ' || (t.tgtype & 2 = 2)::text || ' ' || (t.tgtype & 4 = 4)::text || ' ' || (t.tgtype & 16 = 16)::text
                    || ' ' || (select string_agg(a.attname, ',' order by a.attname)
                                 from pg_attribute a where a.attrelid = t.tgrelid and a.attnum = any (t.tgattr))
                    order by t.tgname)
     from pg_trigger t
    where not t.tgisinternal and t.tgname in ('receipts_within_retention', 'payments_within_retention'))
  = array['payments_within_retention payments true true true paid_on,user_id',
          'receipts_within_retention receipts true true true purchased_on,user_id'],
  'a receipt''s and a payment''s day is checked when one is added and when its day or owner changes');

select pg_temp.as_user('e1');
select pg_temp.expect_error(
  format($s$insert into public.receipts (user_id, merchant, amount, purchased_on)
            values ('00000000-0000-0000-0000-0000000000e1', 'Too old', 5, %L)$s$, pg_temp.c() - 1),
  'SK007', 'Pick a day in the last seven years.');
select pg_temp.expect_error(
  format($s$insert into public.payments (user_id, card_id, amount, paid_on)
            values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000c01e1', 5, %L)$s$, pg_temp.c() - 1),
  'SK007', 'Pick a day in the last seven years.');
insert into public.receipts (user_id, merchant, amount, purchased_on)
values ('00000000-0000-0000-0000-0000000000e1', 'First kept day', 5, pg_temp.c());
insert into public.payments (user_id, card_id, amount, paid_on, note)
values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000c01e1', 5, pg_temp.c(), 'First kept day');
select pg_temp.check(
  (select count(*) = 1 from public.receipts where merchant = 'First kept day' and purchased_on = pg_temp.c())
  and (select count(*) = 1 from public.payments where note = 'First kept day' and paid_on = pg_temp.c()),
  'the first kept day, exactly seven years back, is taken');
select pg_temp.expect_error(
  format($s$update public.receipts set purchased_on = %L where merchant = 'First kept day'$s$, pg_temp.c() - 1),
  'SK007', 'Pick a day in the last seven years.');
select pg_temp.expect_error(
  format($s$update public.payments set paid_on = %L where note = 'First kept day'$s$, pg_temp.c() - 1),
  'SK007', 'Pick a day in the last seven years.');
reset role;
-- One already stored before the rule (the job deletes it overnight): editing anything but its day still saves.
set local session_replication_role = replica;
insert into public.receipts (user_id, merchant, amount, purchased_on)
values ('00000000-0000-0000-0000-0000000000e1', 'Stored before', 5, pg_temp.c() - 1);
set local session_replication_role = origin;
select pg_temp.as_user('e1');
update public.receipts set note = 'still there' where merchant = 'Stored before';
reset role;
select pg_temp.check(
  (select note = 'still there' from public.receipts where merchant = 'Stored before'),
  'a stored receipt older than that can still be edited without touching its day');
delete from public.receipts where merchant = 'Stored before';

-- ---------------------------------------------------------------- spending a goal files its receipt
-- "I spent it" writes the receipt as its owner, so these triggers check that call too.
do $$
declare
  v_today date := pg_temp.today();
  v_kept  date := pg_temp.c();
  v_goal  uuid;
  v_two   uuid;
  v_three uuid;
begin
  if to_regprocedure('public.spend_goal(uuid,uuid,text,date,uuid,uuid,uuid)') is null then
    raise notice 'ok  spend_goal is not in this database: its cases are skipped';
    return;
  end if;
  perform pg_temp.as_user('e1');
  v_goal := public.save_goal(null, 'Bike', 'trip', 500, null, 120);
  v_two := public.save_goal(null, 'Shoes', 'trip', 100, null, 40);
  v_three := public.save_goal(null, 'Desk', 'trip', 300, null, 75);

  perform pg_temp.check(
    public.spend_goal(v_goal, '00000000-0000-0000-0000-00000000f1e1', 'Bike shop', v_today,
                      '00000000-0000-0000-0000-0000000c01e1', null, null) = '00000000-0000-0000-0000-00000000f1e1',
    'a goal spent on the person''s own card today files its receipt');
  perform pg_temp.check(
    (select user_id = '00000000-0000-0000-0000-0000000000e1' and amount = 120 and purchased_on = v_today
            and card_id = '00000000-0000-0000-0000-0000000c01e1' and merchant = 'Bike shop'
       from public.receipts where id = '00000000-0000-0000-0000-00000000f1e1')
    and (select closed_at is not null and receipt_id = '00000000-0000-0000-0000-00000000f1e1'
           from public.goals where id = v_goal),
    'the receipt holds what the goal held, on that card and day, and the goal closes naming it');
  perform public.spend_goal(v_two, '00000000-0000-0000-0000-00000000f2e1', 'Shoe shop', v_today,
                            null, '00000000-0000-0000-0000-0000000a01e1', null);
  -- A statement of its own: one statement reads the rows as they were when it began.
  perform pg_temp.check(
    (select bank_account_id = '00000000-0000-0000-0000-0000000a01e1' and amount = 40 and purchased_on = v_today
       from public.receipts where id = '00000000-0000-0000-0000-00000000f2e1'),
    'and from the person''s own account');

  perform pg_temp.expect_error(
    format('select public.spend_goal(%L, %L, %L, %L, %L, null, null)', v_three, '00000000-0000-0000-0000-00000000f3e1',
           'Desk shop', v_today, '00000000-0000-0000-0000-0000000c00e2'),
    '23514', 'A receipt can only be paid with one of your own cards.');
  perform pg_temp.expect_error(
    format('select public.spend_goal(%L, %L, %L, %L, %L, null, null)', v_three, '00000000-0000-0000-0000-00000000f3e1',
           'Desk shop', v_kept - 1, '00000000-0000-0000-0000-0000000c01e1'),
    'SK007', 'Pick a day in the last seven years.');
  perform pg_temp.check(
    (select closed_at is null and receipt_id is null from public.goals where id = v_three)
    and not exists (select 1 from public.receipts where id = '00000000-0000-0000-0000-00000000f3e1'),
    'refused for someone else''s card or a day too old, the goal stays open and no receipt is filed');
  perform pg_temp.check(
    public.spend_goal(v_three, '00000000-0000-0000-0000-00000000f3e1', 'Desk shop', v_kept,
                      '00000000-0000-0000-0000-0000000c01e1', null, null) = '00000000-0000-0000-0000-00000000f3e1',
    'the first kept day is taken there too');

  if to_regprocedure('public.link_goal_receipt(uuid,uuid)') is not null then
    v_goal := public.save_goal(null, 'Lamp', 'trip', 60, null, 25);
    insert into public.receipts (id, user_id, merchant, amount, purchased_on, card_id)
    values ('00000000-0000-0000-0000-00000000f4e1', '00000000-0000-0000-0000-0000000000e1', 'Lamp shop', 25, v_today,
            '00000000-0000-0000-0000-0000000c01e1');
    perform public.link_goal_receipt(v_goal, '00000000-0000-0000-0000-00000000f4e1');
    perform pg_temp.check(
      (select receipt_id = '00000000-0000-0000-0000-00000000f4e1' and closed_at is not null
         from public.goals where id = v_goal),
      'a receipt added on the person''s own card links to a goal as before');
  end if;
end $$;
reset role;

-- ---------------------------------------------------------------- the seven-year job, one person's sources each
-- Rows from before the rules: e1's payments into e2's card and account, e1's charge on e2's card,
-- and e1's charges filed under e2's bill and e2's subscription. Each is deleted; none moves e2's
-- balances, and e2's plans are not read for them. e1's own rows and e2's own charge fold in as before.
set local session_replication_role = replica;
insert into public.payments (user_id, card_id, bank_account_id, amount, paid_on, note) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000c00e2', null, 40, pg_temp.c() - 1, 'into their card'),
  ('00000000-0000-0000-0000-0000000000e1', null, '00000000-0000-0000-0000-0000000a00e2', 25, pg_temp.c() - 1, 'into their account'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000c01e1', null, 100, pg_temp.c() - 1, 'into my card');
insert into public.charges (user_id, bill_id, subscription_id, label, amount, charged_on, card_id, bank_account_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000b02e1', null, 'my plan, their card',
   9, pg_temp.c() - 1, '00000000-0000-0000-0000-0000000c00e2', null),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000b02e1', null, 'my plan, my account',
   11, pg_temp.c() - 2, null, '00000000-0000-0000-0000-0000000a01e1'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000b00e2', null, 'their plan, my card',
   7, pg_temp.c() - 1, '00000000-0000-0000-0000-0000000c01e1', null),
  ('00000000-0000-0000-0000-0000000000e1', null, '00000000-0000-0000-0000-0000000501e2', 'their renewal, my account',
   3, pg_temp.c() - 1, null, '00000000-0000-0000-0000-0000000a01e1'),
  ('00000000-0000-0000-0000-0000000000e2', null, '00000000-0000-0000-0000-0000000500e2', 'their own',
   5, pg_temp.c() - 1, '00000000-0000-0000-0000-0000000c00e2', null);
insert into public.receipts (id, user_id, merchant, amount, purchased_on, source)
values ('00000000-0000-0000-0000-00000000f9e1', '00000000-0000-0000-0000-0000000000e1', 'Scanned long ago', 8,
        pg_temp.c() - 1, 'scan');
set local session_replication_role = origin;
do $$
begin
  if to_regclass('public.capture_usage') is not null then
    execute $i$insert into public.capture_usage (user_id, source, receipt_id)
               values ('00000000-0000-0000-0000-0000000000e1', 'scan', '00000000-0000-0000-0000-00000000f9e1')$i$;
  end if;
end $$;

create temp table balances_before as
select id, balance from public.cards where user_id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2')
union all
select id, balance from public.bank_accounts where user_id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2');
create or replace function pg_temp.moved(p_id uuid) returns numeric language sql stable as $$
  select coalesce((select balance from public.cards where id = p_id), (select balance from public.bank_accounts where id = p_id))
         - (select balance from balances_before where id = p_id)
$$;

create temp table pruned as select * from public.prune_expired_data();

select pg_temp.check(
  not exists (select 1 from public.payments where paid_on < pg_temp.c()
               and user_id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2'))
  and not exists (select 1 from public.charges where charged_on < pg_temp.c()
                   and user_id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2'))
  and not exists (select 1 from public.receipts where id = '00000000-0000-0000-0000-00000000f9e1'),
  'every row older than seven years is deleted, whoever''s card or plan it names');
select pg_temp.check(
  pg_temp.moved('00000000-0000-0000-0000-0000000c00e2') = 5
  and pg_temp.moved('00000000-0000-0000-0000-0000000a00e2') = 0,
  'the other person''s card takes only their own charge, and their account nothing: not the 40, 25 or 9 filed by someone else');
select pg_temp.check(
  pg_temp.moved('00000000-0000-0000-0000-0000000c01e1') = -93
  and pg_temp.moved('00000000-0000-0000-0000-0000000a01e1') = -14,
  'the person''s own card takes their payment (-100) and the charge filed under someone else''s bill (+7), '
  || 'whose plan is not theirs to read, so it counts as a charge with no walked plan; their account takes '
  || 'their own charge (-11) and the one under someone else''s subscription (-3), the same way');
select pg_temp.check(
  (select next_due_on = pg_temp.today() + 10 and card_id = '00000000-0000-0000-0000-0000000c00e2'
     from public.bills where id = '00000000-0000-0000-0000-0000000b00e2'),
  'the other person''s bill is untouched');
do $$
begin
  if to_regclass('public.capture_usage') is not null then
    perform pg_temp.check(
      (select count(*) = 1 and bool_and(receipt_id is null) from public.capture_usage
        where user_id = '00000000-0000-0000-0000-0000000000e1'),
      'the scan it counted stays counted: deleting its receipt only empties capture_usage.receipt_id');
  end if;
end $$;

-- ---------------------------------------------------------------- deleting an account
-- delete_my_account deletes the person from auth.users and everything of theirs cascades. A card
-- or account deleted first empties itself from the rows naming it, which runs the owner checks on
-- rows whose plan may already be going; none of that may stop the delete.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e3', 'leaving@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000e3') on conflict (id) do nothing;
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000e3';
insert into public.entitlements (user_id, pro, expires_at) values ('00000000-0000-0000-0000-0000000000e3', true, null);
insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000c01e3', '00000000-0000-0000-0000-0000000000e3', 'One'),
  ('00000000-0000-0000-0000-0000000c02e3', '00000000-0000-0000-0000-0000000000e3', 'Two');
insert into public.bank_accounts (id, user_id, bank_name) values
  ('00000000-0000-0000-0000-0000000a01e3', '00000000-0000-0000-0000-0000000000e3', 'Main');
insert into public.bills (id, user_id, name, amount, category_id, recurrence, next_due_on, starts_on, card_id)
values ('00000000-0000-0000-0000-0000000b01e3', '00000000-0000-0000-0000-0000000000e3', 'Rent', 900, 'housing',
        'monthly', pg_temp.today() + 10, pg_temp.today() - 60, '00000000-0000-0000-0000-0000000c01e3');
insert into public.subscriptions (id, user_id, name, amount, cycle, next_renewal_on, started_on, bank_account_id, active)
values ('00000000-0000-0000-0000-0000000501e3', '00000000-0000-0000-0000-0000000000e3', 'Stream', 9.99, 'monthly',
        pg_temp.today() + 10, pg_temp.today() - 60, '00000000-0000-0000-0000-0000000a01e3', true);
insert into public.charges (user_id, bill_id, subscription_id, label, amount, charged_on, card_id, bank_account_id) values
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000b01e3', null, 'Rent', 900,
   pg_temp.today() - 20, '00000000-0000-0000-0000-0000000c01e3', null),
  ('00000000-0000-0000-0000-0000000000e3', null, '00000000-0000-0000-0000-0000000501e3', 'Stream', 9.99,
   pg_temp.today() - 20, null, '00000000-0000-0000-0000-0000000a01e3');
insert into public.receipts (user_id, merchant, amount, card_id) values
  ('00000000-0000-0000-0000-0000000000e3', 'Shop', 12, '00000000-0000-0000-0000-0000000c02e3');
insert into public.receipts (user_id, merchant, amount, bank_account_id) values
  ('00000000-0000-0000-0000-0000000000e3', 'Market', 30, '00000000-0000-0000-0000-0000000a01e3');
insert into public.payments (user_id, card_id, amount, from_bank_account_id) values
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000c01e3', 100, '00000000-0000-0000-0000-0000000a01e3');
insert into public.reminders (user_id, bill_id, subscription_id, card_id, bank_account_id) values
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000b01e3', null, null, null),
  ('00000000-0000-0000-0000-0000000000e3', null, '00000000-0000-0000-0000-0000000501e3', null, null),
  ('00000000-0000-0000-0000-0000000000e3', null, null, '00000000-0000-0000-0000-0000000c02e3', null),
  ('00000000-0000-0000-0000-0000000000e3', null, null, null, '00000000-0000-0000-0000-0000000a01e3');
select pg_temp.as_user('e3');
create temp table leaving_loan as
select (public.save_loan(
  p_name => 'Car', p_icon_id => 'loan-car', p_principal => 9000, p_annual_rate => 6, p_term_months => 36,
  p_monthly_payment => 300, p_total_interest => 600, p_first_payment_on => pg_temp.today() + 20,
  p_card_id => '00000000-0000-0000-0000-0000000c02e3', p_funded_on => pg_temp.today() - 30)).id;
select public.record_loan_payoff((select id from leaving_loan), pg_temp.today(), 500, 'partial',
  '00000000-0000-0000-0000-0000000c02e3', null, null, pg_temp.today());
select public.spend_goal(public.save_goal(null, 'Bike', 'trip', 500, null, 120),
  '00000000-0000-0000-0000-00000000f1e3', 'Bike shop', pg_temp.today(), '00000000-0000-0000-0000-0000000c01e3', null, null);
reset role;
select pg_temp.check(
  (select count(*) = 2 from public.bills where user_id = '00000000-0000-0000-0000-0000000000e3')
  and (select count(*) = 1 from public.loans where user_id = '00000000-0000-0000-0000-0000000000e3')
  and (select count(*) = 1 from public.loan_payoffs where user_id = '00000000-0000-0000-0000-0000000000e3')
  and (select count(*) = 3 from public.receipts where user_id = '00000000-0000-0000-0000-0000000000e3')
  and (select count(*) = 4 from public.reminders where user_id = '00000000-0000-0000-0000-0000000000e3'),
  'a person with bills, a subscription, charges, receipts, a payment, reminders, a loan and a payoff');

create temp table others_before as
select (select count(*) from public.bills where user_id <> '00000000-0000-0000-0000-0000000000e3') as bills,
       (select count(*) from public.charges where user_id <> '00000000-0000-0000-0000-0000000000e3') as charges,
       (select count(*) from public.receipts where user_id <> '00000000-0000-0000-0000-0000000000e3') as receipts,
       (select count(*) from public.cards where user_id <> '00000000-0000-0000-0000-0000000000e3') as cards;
grant select on others_before to authenticated;

select pg_temp.as_user('e3');
select public.delete_my_account();
reset role;

select pg_temp.check(
  not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000e3')
  and not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000e3')
  and (select count(*) = 0 from (
         select user_id from public.bills union all select user_id from public.subscriptions
         union all select user_id from public.charges union all select user_id from public.receipts
         union all select user_id from public.payments union all select user_id from public.reminders
         union all select user_id from public.loans union all select user_id from public.loan_payoffs
         union all select user_id from public.cards union all select user_id from public.bank_accounts
         union all select user_id from public.goals) r
        where r.user_id = '00000000-0000-0000-0000-0000000000e3'),
  'delete_my_account removes the person and every row of theirs under the owner, finite and seven-year rules');
select pg_temp.check(
  (select bills = (select count(*) from public.bills) and charges = (select count(*) from public.charges)
          and receipts = (select count(*) from public.receipts) and cards = (select count(*) from public.cards)
     from others_before),
  'and nobody else''s');

rollback;
\echo ALL CHECKS PASSED
