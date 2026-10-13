-- Checks for the next-due floor in 20261013600005_period_and_next_due_floor.sql. LOCAL database
-- only, with it applied: everything runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/next_due_floor.sql
--
-- A plan's floor is its start or the cycle after its newest charge, whichever is later; a stored
-- next date before it becomes the first date of the schedule on or after it, and the anchor stays
-- the day picked. The shared table below is src/__tests__/payments/next-due-hint.test.ts's
-- NEXT_DUE_FLOOR_TABLE, character for character (src/__tests__/api/next-due-parity.test.ts keeps
-- them equal); every row is put through the triggers. Then the report's cases
-- (.claude/team/dev/next-due-floor-report.md) through the tables as the app and the rollers write.
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED.

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b9', 'next-due@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000b9') on conflict (id) do nothing;
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000b9';

create or replace function pg_temp.check(p_ok boolean, p_what text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAILED: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

create or replace function pg_temp.bill(p_name text) returns public.bills
language sql as $$
  select * from public.bills where name = p_name and user_id = '00000000-0000-0000-0000-0000000000b9'
$$;

create or replace function pg_temp.sub(p_name text) returns public.subscriptions
language sql as $$
  select * from public.subscriptions where name = p_name and user_id = '00000000-0000-0000-0000-0000000000b9'
$$;

-- ---------------------------------------------------------------- the trigger order
select pg_temp.check(
  (select array_agg(t.tgname::text order by t.tgname) from pg_trigger t
    where t.tgrelid = 'public.bills'::regclass and not t.tgisinternal and t.tgtype & 2 = 2 and t.tgtype & 16 = 16)
  = array['bills_anchor_day', 'bills_next_due_floor', 'bills_own_sources', 'bills_set_updated_at']
  and (select array_agg(t.tgname::text order by t.tgname) from pg_trigger t
        where t.tgrelid = 'public.subscriptions'::regclass and not t.tgisinternal and t.tgtype & 2 = 2 and t.tgtype & 16 = 16)
  = array['subscriptions_anchor_day', 'subscriptions_next_due_floor', 'subscriptions_own_sources',
          'subscriptions_set_updated_at'],
  'the floor runs after the anchor day on every write, by name, before the owner check');
select pg_temp.check(
  public.next_cycle_start('2026-10-15', 'weekly') = '2026-10-19'
  and public.next_cycle_start('2026-10-19', 'weekly') = '2026-10-26'
  and public.next_cycle_start('2026-10-31', 'monthly') = '2026-11-01'
  and public.next_cycle_start('2026-10-01', 'period') = '2026-11-01'
  and public.next_cycle_start('2026-11-30', 'quarterly') = '2027-01-01'
  and public.next_cycle_start('2026-01-05', 'yearly') = '2027-01-01'
  and public.next_cycle_start(null, 'monthly') is null,
  'the cycle after a charge: Monday-first weeks, months (a set period''s too), calendar quarters and years');

-- ---------------------------------------------------------------- the shared table
create temp table floor_table as select $nextdue$
# Due on the 1st, charged 1 Oct, moved to the 15th
2026-10-15  - monthly   2026-10-01 | 2026-11-01 2026-11-15 2026-10-01

# A 31st picked in a charged October lands on 30 Nov; kept on the 31st, the 30 Nov walks to 31 Dec
2026-10-31  - monthly   2026-10-01 | 2026-11-01 2026-11-30 2026-10-01
2026-11-30 31 monthly   2026-11-30 | 2026-12-01 2026-12-31 2026-11-01
2027-02-28 31 monthly   2027-02-28 | 2027-03-01 2027-03-31 2027-02-01

# Edited on the charge day with the date left as stored
2026-10-01  - monthly   2026-10-01 | 2026-11-01 2026-11-01 2026-10-01

# Picked before the floor: past every charged month, the newest one named
2026-09-15  - monthly   2026-10-01 | 2026-11-01 2026-11-15 2026-10-01
2026-09-25  - monthly   2026-09-20 | 2026-10-01 2026-10-25 2026-09-01

# On or after the floor: the date stands, no hint (a past one is recorded by the recorders)
2026-11-15  - monthly   2026-10-01 | 2026-11-15 2026-11-15 -
2026-11-01  - monthly   2026-10-01 | 2026-11-01 2026-11-01 -
2026-10-25  - monthly   2026-09-20 | 2026-10-25 2026-10-25 -
2026-10-05  - monthly   2026-09-20 | 2026-10-05 2026-10-05 -

# Across the new year
2026-12-20  - monthly   2026-12-01 | 2027-01-01 2027-01-20 2026-12-01

# A loan keeps its payment day whatever date the form holds
2026-10-20 15 monthly   2026-10-15 | 2026-11-01 2026-11-15 2026-10-01

# Weekly, Monday to Sunday; a day of the month means nothing to it
2026-10-15  - weekly    2026-10-12 | 2026-10-19 2026-10-22 2026-10-12
2026-10-15 31 weekly    2026-10-12 | 2026-10-19 2026-10-22 2026-10-12
2026-12-31  - weekly    2026-12-28 | 2027-01-04 2027-01-07 2026-12-28
2026-10-22  - weekly    2026-10-12 | 2026-10-22 2026-10-22 -

# Quarterly, calendar quarters
2026-11-15  - quarterly 2026-10-01 | 2027-01-01 2027-02-15 2026-10-01
2026-08-31  - quarterly 2026-11-30 | 2027-01-01 2027-02-28 2026-10-01
2027-01-15  - quarterly 2026-10-01 | 2027-01-15 2027-01-15 -

# Yearly, calendar years
2026-12-01  - yearly    2026-01-05 | 2027-01-01 2027-12-01 2026-01-01
2028-02-29 29 yearly    2028-02-29 | 2029-01-01 2029-02-28 2028-01-01
2027-03-01  - yearly    2026-01-05 | 2027-03-01 2027-03-01 -

# Never charged: no hint
2026-10-15  - monthly   -          | 2026-10-15 2026-10-15 -
2026-10-15  - weekly    -          | 2026-10-15 2026-10-15 -
2026-10-15  - quarterly -          | 2026-10-15 2026-10-15 -
2026-10-15  - yearly    -          | 2026-10-15 2026-10-15 -

# A set period paid monthly, as a monthly bill
2026-10-15  - period    2026-10-01 | 2026-11-01 2026-11-15 2026-10-01
2026-10-31  - period    2026-10-01 | 2026-11-01 2026-11-30 2026-10-01
2026-11-30 31 period    2026-11-30 | 2026-12-01 2026-12-31 2026-11-01
2026-10-01  - period    2026-10-01 | 2026-11-01 2026-11-01 2026-10-01
2026-11-15  - period    2026-10-01 | 2026-11-15 2026-11-15 -
2026-10-15  - period    -          | 2026-10-15 2026-10-15 -
$nextdue$::text as body;

create temp table floor_rows as
with lines as (
  select n, line
  from regexp_split_to_table((select body from floor_table), E'\n') with ordinality as t(line, n)
),
kept as (
  select n, line from lines where btrim(line) <> '' and left(btrim(line), 1) <> '#'
),
parts as (
  select n, line,
         regexp_split_to_array(btrim(split_part(line, '|', 1)), '\s+') as inputs,
         regexp_split_to_array(btrim(split_part(line, '|', 2)), '\s+') as outputs
  from kept
)
select
  n, line,
  inputs[1]::date as picked,
  case when inputs[2] = '-' then null else inputs[2]::integer end as anchor_day,
  inputs[3] as recurrence,
  case when inputs[4] = '-' then null else inputs[4]::date end as charged_on,
  outputs[1]::date as floor_on,
  outputs[2]::date as stored_on,
  case when outputs[3] = '-' then null else outputs[3]::date end as hint_month,
  array_length(inputs, 1) as n_inputs,
  array_length(outputs, 1) as n_outputs
from parts;

select pg_temp.check(
  (select count(*) = 33 and bool_and(n_inputs = 4 and n_outputs = 3) from floor_rows),
  'the table reads as 33 rows, as the app''s test reads it');

-- Each row as a plan saved on the day picked (its start, as a set period keeps it and an older
-- build writes it), its newest charge recorded, then edited with the date left as picked.
set local session_replication_role = replica;
insert into public.bills (id, user_id, name, amount, category_id, recurrence, next_due_on, starts_on, ends_on, anchor_day)
select gen_random_uuid(), '00000000-0000-0000-0000-0000000000b9', 'row ' || n, 10, 'other',
       recurrence::public.bill_recurrence, picked, picked,
       case when recurrence = 'period' then picked + 1000 end,
       coalesce(anchor_day, extract(day from picked)::integer)
from floor_rows;
insert into public.charges (user_id, bill_id, label, amount, charged_on)
select '00000000-0000-0000-0000-0000000000b9', (pg_temp.bill('row ' || n)).id, 'row ' || n, 10, charged_on
from floor_rows where charged_on is not null;
set local session_replication_role = origin;

update public.bills b
   set next_due_on = r.picked
  from floor_rows r
 where b.user_id = '00000000-0000-0000-0000-0000000000b9' and b.name = 'row ' || r.n;

do $$
declare
  r record;
  v_bill public.bills;
  v_floor date;
begin
  for r in select * from floor_rows order by n loop
    v_bill := pg_temp.bill('row ' || r.n);
    v_floor := greatest(r.picked, public.next_cycle_start(r.charged_on, r.recurrence));
    if v_floor is distinct from r.floor_on then
      raise exception 'FAILED: floor on line %: % gave %', r.n, r.line, v_floor;
    end if;
    if v_bill.next_due_on is distinct from r.stored_on then
      raise exception 'FAILED: stored on line %: % gave %', r.n, r.line, v_bill.next_due_on;
    end if;
    if v_bill.anchor_day is distinct from coalesce(r.anchor_day, extract(day from r.picked)::integer) then
      raise exception 'FAILED: anchor on line %: % gave %', r.n, r.line, v_bill.anchor_day;
    end if;
    -- The hint names the charged cycle exactly when the picked day was moved past it.
    if (r.picked < r.floor_on) is distinct from (r.hint_month is not null)
       or (r.hint_month is not null
           and r.hint_month <> date_trunc(case r.recurrence when 'period' then 'month'
                                             else rtrim(r.recurrence, 'ly') end, r.charged_on)::date) then
      raise exception 'FAILED: hint on line %: %', r.n, r.line;
    end if;
  end loop;
end $$;
select pg_temp.check(true,
  'every row of the table, through the triggers: its floor, the date stored, the anchor kept, and the hint''s month');

-- ---------------------------------------------------------------- the report's cases, as written
-- 1. The Founder's case: due on the 1st, charged 1 Oct, edited to the 15th (the form also moves
--    the start past the charge) → 15 Nov, anchor 15.
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on)
values ('00000000-0000-0000-0000-0000000000b9', 'Rent', 1200, 'housing', 'monthly', '2026-10-01', '2026-10-01');
insert into public.charges (user_id, bill_id, label, amount, charged_on)
values ('00000000-0000-0000-0000-0000000000b9', (pg_temp.bill('Rent')).id, 'Rent', 1200, '2026-10-01');
update public.bills set next_due_on = '2026-10-15', starts_on = '2026-11-01' where name = 'Rent';
select pg_temp.check(
  (pg_temp.bill('Rent')).next_due_on = '2026-11-15' and (pg_temp.bill('Rent')).anchor_day = 15
  and (pg_temp.bill('Rent')).starts_on = '2026-11-01',
  '1. charged 1 Oct, moved to the 15th: next due 15 Nov, anchor 15, the start as saved');

-- 2. A 31st picked in a charged October → 30 Nov, anchor 31; the walk goes on to 31 Dec.
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on)
values ('00000000-0000-0000-0000-0000000000b9', 'Thirty-first', 50, 'other', 'monthly', '2026-10-05', '2026-10-05');
insert into public.charges (user_id, bill_id, label, amount, charged_on)
values ('00000000-0000-0000-0000-0000000000b9', (pg_temp.bill('Thirty-first')).id, 'Thirty-first', 50, '2026-10-05');
update public.bills set next_due_on = '2026-10-31' where name = 'Thirty-first';
select pg_temp.check(
  (pg_temp.bill('Thirty-first')).next_due_on = '2026-11-30' and (pg_temp.bill('Thirty-first')).anchor_day = 31
  and (select array_agg(d order by d) from public.plan_occurrences('2026-11-30', 'monthly', '2026-11-01', '2027-01-31', 31) d)
      = array['2026-11-30', '2026-12-31', '2027-01-31']::date[],
  '2. a 31st in a charged October is stored as 30 Nov with anchor 31, and walks on to 31 Dec');

-- 3. Weekly: charged this week, moved to Thursday → the Thursday after the charged week.
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on)
values ('00000000-0000-0000-0000-0000000000b9', 'Cleaner', 40, 'other', 'weekly', '2026-10-12', '2026-10-12');
insert into public.charges (user_id, bill_id, label, amount, charged_on)
values ('00000000-0000-0000-0000-0000000000b9', (pg_temp.bill('Cleaner')).id, 'Cleaner', 40, '2026-10-12');
update public.bills set next_due_on = '2026-10-15' where name = 'Cleaner';
select pg_temp.check((pg_temp.bill('Cleaner')).next_due_on = '2026-10-22',
  '3. weekly, charged Monday 12 Oct, moved to Thursday 15 Oct: next due Thursday 22 Oct');

-- 4. Quarterly: charged 1 Oct, moved to 15 Nov → 15 Feb 2027 (calendar quarters).
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on)
values ('00000000-0000-0000-0000-0000000000b9', 'Water', 90, 'water', 'quarterly', '2026-10-01', '2026-10-01');
insert into public.charges (user_id, bill_id, label, amount, charged_on)
values ('00000000-0000-0000-0000-0000000000b9', (pg_temp.bill('Water')).id, 'Water', 90, '2026-10-01');
update public.bills set next_due_on = '2026-11-15' where name = 'Water';
select pg_temp.check((pg_temp.bill('Water')).next_due_on = '2027-02-15',
  '4. quarterly, charged 1 Oct, moved to 15 Nov: next due 15 Feb 2027');

-- 5. Yearly, moved within its charged year → the same day next year.
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on)
values ('00000000-0000-0000-0000-0000000000b9', 'Insurance', 600, 'insurance', 'yearly', '2026-01-05', '2026-01-05');
insert into public.charges (user_id, bill_id, label, amount, charged_on)
values ('00000000-0000-0000-0000-0000000000b9', (pg_temp.bill('Insurance')).id, 'Insurance', 600, '2026-01-05');
update public.bills set next_due_on = '2026-12-01' where name = 'Insurance';
select pg_temp.check((pg_temp.bill('Insurance')).next_due_on = '2027-12-01',
  '5. yearly, charged 5 Jan, moved to 1 Dec of the same year: next due 1 Dec 2027');

-- 6. A subscription, as case 1.
insert into public.subscriptions (user_id, name, amount, cycle, next_renewal_on, started_on, active)
values ('00000000-0000-0000-0000-0000000000b9', 'Stream', 15.99, 'monthly', '2026-10-01', '2026-10-01', true);
insert into public.charges (user_id, subscription_id, label, amount, charged_on)
values ('00000000-0000-0000-0000-0000000000b9', (pg_temp.sub('Stream')).id, 'Stream', 15.99, '2026-10-01');
update public.subscriptions set next_renewal_on = '2026-10-15', started_on = '2026-11-01' where name = 'Stream';
select pg_temp.check(
  (pg_temp.sub('Stream')).next_renewal_on = '2026-11-15' and (pg_temp.sub('Stream')).anchor_day = 15,
  '6. a subscription charged 1 Oct, moved to the 15th: renews 15 Nov, anchor 15');
-- The same with its start left in January, so only the charge holds it.
insert into public.subscriptions (user_id, name, amount, cycle, next_renewal_on, started_on, active)
values ('00000000-0000-0000-0000-0000000000b9', 'Stream two', 15.99, 'monthly', '2026-10-01', '2026-01-01', true);
insert into public.charges (user_id, subscription_id, label, amount, charged_on)
values ('00000000-0000-0000-0000-0000000000b9', (pg_temp.sub('Stream two')).id, 'Stream two', 15.99, '2026-10-01');
update public.subscriptions set next_renewal_on = '2026-10-15' where name = 'Stream two';
select pg_temp.check(
  (pg_temp.sub('Stream two')).next_renewal_on = '2026-11-15' and (pg_temp.sub('Stream two')).anchor_day = 15,
  '6b. the same with its start in January: the charge alone moves it to 15 Nov');

-- 7. A roller writing 15 Oct over a stale 15 Sep, the start 1 Nov → 15 Nov.
set local session_replication_role = replica;
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, anchor_day)
values ('00000000-0000-0000-0000-0000000000b9', 'Stale', 70, 'other', 'monthly', '2026-09-15', '2026-11-01', 15);
set local session_replication_role = origin;
update public.bills set next_due_on = '2026-10-15' where name = 'Stale';
select pg_temp.check(
  (pg_temp.bill('Stale')).next_due_on = '2026-11-15' and (pg_temp.bill('Stale')).anchor_day = 15,
  '7. a roller''s 15 Oct over a stale 15 Sep, the start 1 Nov: stored 15 Nov, anchor 15');

-- 8. Left as they are: a date on or after the floor; both stop shapes; a loan as saved and edited.
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on)
values ('00000000-0000-0000-0000-0000000000b9', 'Ahead', 20, 'other', 'monthly', '2026-11-20', '2026-10-20');
insert into public.charges (user_id, bill_id, label, amount, charged_on)
values ('00000000-0000-0000-0000-0000000000b9', (pg_temp.bill('Ahead')).id, 'Ahead', 20, '2026-10-20');
update public.bills set amount = 21 where name = 'Ahead';
update public.bills set ends_on = '2026-11-05' where name = 'Ahead';
select pg_temp.check(
  (pg_temp.bill('Ahead')).next_due_on = '2026-11-20' and (pg_temp.bill('Ahead')).ends_on = '2026-11-05',
  '8. a date already on or after the floor, and a stop that writes the end only, leave it');
update public.bills set starts_on = '2026-10-20', ends_on = '2026-10-20', next_due_on = null where name = 'Ahead';
select pg_temp.check((pg_temp.bill('Ahead')).next_due_on is null, '8. a stop with no next date keeps none');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b9","role":"authenticated"}', true);
select public.save_loan(
  p_name => 'Loan', p_icon_id => 'loan-car', p_principal => 5000, p_annual_rate => 6, p_term_months => 24,
  p_monthly_payment => 220, p_total_interest => 280, p_first_payment_on => '2025-02-28', p_recurrence => 'monthly',
  p_payment_day => 31, p_counts_from => '2026-10-12');
reset role;
select set_config('request.jwt.claims', '', true);
select pg_temp.check(
  (pg_temp.bill('Loan')).next_due_on = '2026-10-31' and (pg_temp.bill('Loan')).starts_on = '2026-10-12'
  and (pg_temp.bill('Loan')).anchor_day = 31,
  '8. save_loan''s dates are already past its floor: next due 31 Oct, as before');

-- 9. Rows stored before their floor are put right by the one-off, anchors kept. Planted with
--    triggers off, as rows written before it; then the migration's own statements.
set local session_replication_role = replica;
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, anchor_day)
values ('00000000-0000-0000-0000-0000000000b9', 'Planted', 30, 'other', 'monthly', '2026-10-15', '2026-11-01', 15),
       ('00000000-0000-0000-0000-0000000000b9', 'Planted, charged', 30, 'other', 'monthly', '2026-10-31', '2026-10-01', 31),
       ('00000000-0000-0000-0000-0000000000b9', 'Planted, fine', 30, 'other', 'monthly', '2026-11-30', '2026-10-01', 31);
insert into public.subscriptions (user_id, name, amount, cycle, next_renewal_on, started_on, active, anchor_day)
values ('00000000-0000-0000-0000-0000000000b9', 'Planted', 9, 'monthly', '2026-10-15', '2026-11-01', true, 15);
insert into public.charges (user_id, bill_id, label, amount, charged_on)
values ('00000000-0000-0000-0000-0000000000b9', (pg_temp.bill('Planted, charged')).id, 'x', 30, '2026-10-31');
set local session_replication_role = origin;

create temp table planted_before as select id, updated_at from public.bills where name = 'Planted, fine';

-- Rows already stored before their floor. The date is written as it is, so the
-- anchor-day trigger keeps the anchor and the floor trigger moves the date.
update public.bills b
   set next_due_on = b.next_due_on
 where b.next_due_on < greatest(
         b.starts_on,
         public.next_cycle_start(
           (select max(c.charged_on) from public.charges c where c.bill_id = b.id),
           b.recurrence::text));
update public.subscriptions s
   set next_renewal_on = s.next_renewal_on
 where s.next_renewal_on < greatest(
         s.started_on,
         public.next_cycle_start(
           (select max(c.charged_on) from public.charges c where c.subscription_id = s.id),
           s.cycle::text));

select pg_temp.check(
  (pg_temp.bill('Planted')).next_due_on = '2026-11-15' and (pg_temp.bill('Planted')).anchor_day = 15
  and (pg_temp.bill('Planted, charged')).next_due_on = '2026-11-30' and (pg_temp.bill('Planted, charged')).anchor_day = 31
  and (pg_temp.sub('Planted')).next_renewal_on = '2026-11-15' and (pg_temp.sub('Planted')).anchor_day = 15,
  '9. stored before the start, or inside a charged month: moved on by the one-off, the anchor kept');
select pg_temp.check(
  (select b.updated_at = p.updated_at from public.bills b join planted_before p on p.id = b.id),
  '9. a row already past its floor is not written at all');

rollback;
\echo ALL CHECKS PASSED
