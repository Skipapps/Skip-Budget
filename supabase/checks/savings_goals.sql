-- Checks for 20261011100001_savings_goals.sql. LOCAL database only, with it applied: everything
-- runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/savings_goals.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".
-- Figures are the design's: July 410, August 520, September 640 kept. The first send (Trip 300
-- from August; Emergency 420 from August's other 220 and 200 of July) leaves "September $640 ·
-- July $210", 850 ready. The second (Trip 400, Emergency 300, newest pot first) takes Trip
-- 300 -> 700 of 1,200 and Emergency 420 -> 720 of 1,000, and leaves 150.

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a9', 'savings-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b9', 'savings-b@test.local'),
  ('00000000-0000-0000-0000-0000000000c9', 'savings-c@test.local'),
  ('00000000-0000-0000-0000-0000000000d9', 'savings-d@test.local');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-0000000000a9'), ('00000000-0000-0000-0000-0000000000b9'),
  ('00000000-0000-0000-0000-0000000000c9'), ('00000000-0000-0000-0000-0000000000d9')
on conflict (id) do nothing;
-- A joined mid-July. B joined at 05:00 UTC on 1 Feb, still 31 Jan in the Americas. C joined a
-- minute before noon UTC on 1 Aug, still 31 Jul at UTC−12; D a minute after, 1 Aug everywhere.
update public.profiles set created_at = '2026-07-14 15:00:00+00' where id = '00000000-0000-0000-0000-0000000000a9';
update public.profiles set created_at = '2026-02-01 05:00:00+00' where id = '00000000-0000-0000-0000-0000000000b9';
update public.profiles set created_at = '2026-08-01 11:59:00+00' where id = '00000000-0000-0000-0000-0000000000c9';
update public.profiles set created_at = '2026-08-01 12:01:00+00' where id = '00000000-0000-0000-0000-0000000000d9';

create or replace function pg_temp.check(p_ok boolean, p_what text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAILED: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

-- Runs p_sql and expects it refused with p_code (and, when given, p_detail and p_hint).
create or replace function pg_temp.refused(
  p_sql text, p_code text, p_what text, p_detail text default null, p_hint text default null
) returns void
language plpgsql as $$
declare
  v_detail text;
  v_hint   text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_detail = pg_exception_detail, v_hint = pg_exception_hint;
    if sqlstate <> p_code then
      raise exception 'wrong refusal for %: % %', p_what, sqlstate, sqlerrm;
    end if;
    if p_detail is not null and v_detail is distinct from p_detail then
      raise exception 'wrong detail for %: % (wanted %)', p_what, v_detail, p_detail;
    end if;
    if p_hint is not null and v_hint is distinct from p_hint then
      raise exception 'wrong hint for %: % (wanted %)', p_what, v_hint, p_hint;
    end if;
    raise notice 'ok  % (refused %)', p_what, sqlstate;
    return;
  end;
  raise exception 'expected % to be refused', p_what;
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
create temp table sent (name text primary key, result jsonb) on commit drop;

create or replace function pg_temp.id(p_name text) returns uuid
language sql as $$ select id from ids where name = p_name $$;

-- Ready to use as the signed-in person can read it: every pot kept, less everything in goals.
create or replace function pg_temp.ready() returns numeric
language sql as $$
  select coalesce((select sum(amount) from public.savings_pots where removed_at is null), 0)
       - coalesce((select sum(amount) from public.goal_moves), 0)
$$;

create or replace function pg_temp.saved(p_goal text) returns numeric
language sql as $$
  select g.start_amount + coalesce((select sum(m.amount) from public.goal_moves m where m.goal_id = g.id), 0)
    from public.goals g where g.id = pg_temp.id(p_goal)
$$;

-- What a pot has left: its amount less what it has in goals.
create or replace function pg_temp.left_in(p_pot text) returns numeric
language sql as $$
  select p.amount - coalesce((select sum(m.amount) from public.goal_moves m where m.pot_id = p.id), 0)
    from public.savings_pots p where p.id = pg_temp.id(p_pot)
$$;

create or replace function pg_temp.line(p_goal text, p_pot text, p_amount numeric) returns jsonb
language sql as $$
  select jsonb_build_object('goal_id', pg_temp.id(p_goal), 'pot_id', pg_temp.id(p_pot), 'amount', p_amount)
$$;

create or replace function pg_temp.back(p_pot text, p_amount numeric) returns jsonb
language sql as $$
  select jsonb_build_object('pot_id', pg_temp.id(p_pot), 'amount', p_amount)
$$;

create or replace function pg_temp.by_goal(p_result jsonb) returns jsonb
language sql as $$
  select jsonb_build_object('batch_id', p_result -> 'batch_id', 'goals',
    (select jsonb_agg(x order by x ->> 'goal_id') from jsonb_array_elements(p_result -> 'goals') as x))
$$;

grant execute on all functions in schema pg_temp to authenticated, anon;
grant select, insert on ids, sent to authenticated;
grant select on ids to anon;

-- Closing months, as A -------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a9","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a9', true);

-- The month holding now() + 15 hours has not ended anywhere yet, even at UTC+14, whatever the hour.
select pg_temp.refused(
  $$select public.close_my_savings_month(date_trunc('month', now() + interval '15 hours')::date, 100, 50, false)$$,
  'SV005', 'closing the month still running');
select pg_temp.refused(
  $$select public.close_my_savings_month((date_trunc('month', now()) + interval '1 month')::date, 100, 50, false)$$,
  'SV005', 'closing a month to come');
select pg_temp.refused(
  $$select public.close_my_savings_month('2026-06-01', 3700, 3000, true)$$,
  'SV005', 'closing a month before the account');
select pg_temp.refused(
  $$select public.close_my_savings_month('2026-07-01', 3700.005, 3290, true)$$, '22023', 'a third decimal');
select pg_temp.refused(
  $$select public.close_my_savings_month('2026-07-01', -1, 3290, true)$$, '22023', 'a negative figure');

insert into ids values ('jul', public.close_my_savings_month('2026-07-15', 3700, 3290, true));
select pg_temp.check(
  (select (kind, month, earned, spent, amount, added_on, label)
     is not distinct from ('month', '2026-07-01'::date, 3700.00, 3290.00, 410.00, '2026-08-01'::date, null::text)
     from public.savings_pots where id = pg_temp.id('jul')),
  'July closes on its 1st with 410 moved, dated 1 Aug, from any day of it');
select pg_temp.check(
  (select wrap_up_seen_at is not null from public.savings_pots where id = pg_temp.id('jul')),
  'a filled-in month arrives seen');
select pg_temp.check(
  public.close_my_savings_month('2026-07-01', 9999, 1, false) = pg_temp.id('jul'),
  'closing July again answers with the same pot');
select pg_temp.check(
  (select (earned, spent, amount) = (3700.00, 3290.00, 410.00) and wrap_up_seen_at is not null
     from public.savings_pots where id = pg_temp.id('jul')),
  'and leaves its frozen figures alone');

insert into ids values ('aug', public.close_my_savings_month('2026-08-01', 3700, 3180, true));
insert into ids values ('sep', public.close_my_savings_month('2026-09-01', 3700, 3060, false));
select pg_temp.check(
  (select amount = 640 and wrap_up_seen_at is null from public.savings_pots where id = pg_temp.id('sep')),
  'the latest month is left for its wrap-up');
select pg_temp.check(pg_temp.ready() = 1570, 'ready to use is every month kept: 410 + 520 + 640');

-- Nobody writes around the functions ------------------------------------------
select pg_temp.refused(
  $$insert into public.savings_pots (user_id, kind, month, earned, spent, amount, added_on)
    values (auth.uid(), 'month', '2026-05-01', 1, 0, 1000000, '2026-06-01')$$,
  '42501', 'inserting a pot directly');
select pg_temp.refused($$update public.savings_pots set amount = 1000000$$, '42501', 'raising a pot directly');
select pg_temp.refused($$delete from public.savings_pots$$, '42501', 'deleting pots directly');
select pg_temp.refused(
  $$insert into public.goals (user_id, name, icon_id, target) values (auth.uid(), 'X', 'other', 1)$$,
  '42501', 'inserting a goal directly');
select pg_temp.refused($$update public.goals set closed_at = null$$, '42501', 'reopening a goal directly');
select pg_temp.refused(
  $$insert into public.goal_moves (user_id, goal_id, pot_id, amount, batch_id)
    values (auth.uid(), gen_random_uuid(), gen_random_uuid(), -5000, gen_random_uuid())$$,
  '42501', 'inserting a move directly');

-- Added savings ---------------------------------------------------------------
insert into ids values ('gift', public.save_savings_pot(null, '  Birthday gift ', 200, '2026-10-03', '  from Mum '));
select pg_temp.check(
  (select (kind, label, amount, added_on, note, month, earned, spent)
     is not distinct from ('added', 'Birthday gift', 200.00, '2026-10-03'::date, 'from Mum', null::date, null::numeric, null::numeric)
     from public.savings_pots where id = pg_temp.id('gift')),
  'added savings keep a trimmed name, the amount, the day and the note');
select pg_temp.check(pg_temp.ready() = 1770, 'added savings count toward ready to use');
select pg_temp.refused(
  $$select public.save_savings_pot(null, 'Cash', 20, (current_date + 3), null)$$, '22023', 'added savings dated days ahead');
select pg_temp.refused(
  $$select public.save_savings_pot(null, 'Cash', 0, current_date, null)$$, '22023', 'added savings of nothing');
select pg_temp.refused(
  $$select public.save_savings_pot(null, '   ', 20, current_date, null)$$, '23514', 'added savings without a name');
select pg_temp.refused(
  $$select public.save_savings_pot(null, repeat('x', 61), 20, current_date, null)$$, '23514', 'a name over 60');
select pg_temp.refused(
  $$select public.save_savings_pot(null, 'Cash', 20, current_date, repeat('x', 201))$$, '23514', 'a note over 200');
select pg_temp.refused(
  $$select public.save_savings_pot(null, 'Cash', 20.001, current_date, null)$$, '22023', 'added savings past the cent');
select pg_temp.refused(
  format($$select public.save_savings_pot(%L, 'Birthday gift', 0, '2026-10-03', null)$$, pg_temp.id('gift')),
  'SV006', 'added savings kept at $0');

-- Editing a month keeps its name and day, whatever is passed.
select public.save_savings_pot(pg_temp.id('jul'), 'Ignored', 400, '2020-01-01', 'Fixed a typo');
select pg_temp.check(
  (select (amount, note, label, added_on, earned, spent)
     is not distinct from (400.00, 'Fixed a typo', null::text, '2026-08-01'::date, 3700.00, 3290.00)
     from public.savings_pots where id = pg_temp.id('jul')),
  'a month takes a new amount and note, and keeps its figures');
select public.save_savings_pot(pg_temp.id('jul'), null, 410, null, null);
select pg_temp.check(
  (select amount = 410 and note is null from public.savings_pots where id = pg_temp.id('jul')),
  'and goes back, an empty note clearing it');
select pg_temp.refused(
  format($$select public.save_savings_pot(%L, null, 0, null, null)$$, pg_temp.id('jul')),
  'SV006', 'a month that left money, kept at $0');

select public.remove_savings_pot(pg_temp.id('gift'));
select pg_temp.check(
  (select removed_at is not null from public.savings_pots where id = pg_temp.id('gift')),
  'removing added savings keeps the row, marked removed');
select pg_temp.check(pg_temp.ready() = 1570, 'and it no longer counts');

-- Goals -----------------------------------------------------------------------
insert into ids values ('trip', public.save_goal(null, ' Trip ', 'trip', 1200, '2027-03-31', 0));
insert into ids values ('emergency', public.save_goal(null, 'Emergency fund', 'emergency', 1000, '2026-12-31', null));
insert into ids values ('small', public.save_goal(null, 'Small', 'a-type-from-a-later-build', 100, null, 0));
select pg_temp.check(
  (select (name, icon_id, target, target_date, start_amount, closed_at)
     is not distinct from ('Trip', 'trip', 1200.00, '2027-03-31'::date, 0.00, null::timestamptz)
     from public.goals where id = pg_temp.id('trip')),
  'a goal is saved with a trimmed name');
select pg_temp.check(
  (select start_amount = 0 and target_date is null from public.goals where id = pg_temp.id('small')),
  'a goal without a date or a start, of a type this database has never heard of');
select pg_temp.refused($$select public.save_goal(null, repeat('x', 41), 'trip', 10, null, 0)$$, '23514', 'a goal name over 40');
select pg_temp.refused($$select public.save_goal(null, 'X', '', 10, null, 0)$$, '23514', 'a goal without a type');
select pg_temp.refused($$select public.save_goal(null, 'X', 'trip', 0, null, 0)$$, '22023', 'a goal for nothing');
select pg_temp.refused($$select public.save_goal(null, 'X', 'trip', 10, null, 1.001)$$, '22023', 'a start past the cent');
select pg_temp.refused($$select public.save_goal(null, 'X', 'trip', 10, null, -1)$$, '22023', 'a negative start');
select pg_temp.refused($$select public.save_goal(gen_random_uuid(), 'X', 'trip', 10, null, 0)$$, 'P0002', 'editing a goal that is not there');

-- Sending, pot by pot -------------------------------------------------------------
insert into sent values ('first', public.send_to_goals(jsonb_build_array(
  pg_temp.line('trip', 'aug', 300),
  pg_temp.line('emergency', 'aug', 220),
  pg_temp.line('emergency', 'jul', 200)
)));
select pg_temp.check(pg_temp.ready() = 850, '850 ready, as designed');
select pg_temp.check(
  pg_temp.left_in('sep') = 640 and pg_temp.left_in('aug') = 0 and pg_temp.left_in('jul') = 210,
  'September $640 · July $210 left; August all sent');
select pg_temp.check(
  (select result -> 'goals' = jsonb_build_array(
     jsonb_build_object('goal_id', pg_temp.id('trip'), 'amount', 300, 'saved_before', 0, 'saved_after', 300),
     jsonb_build_object('goal_id', pg_temp.id('emergency'), 'amount', 420, 'saved_before', 0, 'saved_after', 420))
     from sent where name = 'first'),
  'a goal drawing on two pots is one line in the answer, in the order asked');

insert into sent values ('second', public.send_to_goals(jsonb_build_array(
  pg_temp.line('trip', 'sep', 400),
  pg_temp.line('emergency', 'sep', 240),
  pg_temp.line('emergency', 'jul', 60)
), '00000000-0000-0000-0000-00000000ba7c'));
select pg_temp.check(pg_temp.ready() = 150, 'sending 400 + 300 from 850 leaves 150');
select pg_temp.check(
  (select result -> 'goals' = jsonb_build_array(
     jsonb_build_object('goal_id', pg_temp.id('trip'), 'amount', 400, 'saved_before', 300, 'saved_after', 700),
     jsonb_build_object('goal_id', pg_temp.id('emergency'), 'amount', 300, 'saved_before', 420, 'saved_after', 720))
     and result ->> 'batch_id' = '00000000-0000-0000-0000-00000000ba7c'
     from sent where name = 'second'),
  'Trip 300 -> 700, Emergency 420 -> 720');
select pg_temp.check(
  (select count(*) = 3 from public.goal_moves where batch_id = '00000000-0000-0000-0000-00000000ba7c'),
  'one batch, a line per goal and pot');

insert into sent values ('replay', public.send_to_goals(jsonb_build_array(
  pg_temp.line('trip', 'sep', 400),
  pg_temp.line('emergency', 'sep', 240),
  pg_temp.line('emergency', 'jul', 60)
), '00000000-0000-0000-0000-00000000ba7c'));
select pg_temp.check(
  pg_temp.by_goal((select result from sent where name = 'replay'))
    = pg_temp.by_goal((select result from sent where name = 'second')),
  'the same send arriving twice answers the same');
select pg_temp.check(pg_temp.ready() = 150, 'and moves nothing more');
select pg_temp.check(
  pg_temp.by_goal(public.send_to_goals('[]', '00000000-0000-0000-0000-00000000ba7c'))
    = pg_temp.by_goal((select result from sent where name = 'second')),
  'a resent batch is answered whatever lines come with it');

select pg_temp.refused(
  format($$select public.send_to_goals(%L)$$, jsonb_build_array(pg_temp.line('small', 'sep', 0.01))),
  'SV001', 'a pot with nothing left', '0.00', pg_temp.id('sep')::text);
select pg_temp.refused(
  format($$select public.send_to_goals(%L)$$, jsonb_build_array(
    pg_temp.line('small', 'jul', 100), pg_temp.line('trip', 'jul', 50.01))),
  'SV001', 'two goals together asking a pot for more than it has', '150.00', pg_temp.id('jul')::text);
select pg_temp.refused(
  format($$select public.send_to_goals(%L)$$, jsonb_build_array(pg_temp.line('small', 'jul', 100.01))),
  'SV002', 'more than a goal needs', '100.00', pg_temp.id('small')::text);
select public.save_goal(pg_temp.id('emergency'), 'Emergency fund', 'emergency', 730, '2026-12-31', 0);
select pg_temp.refused(
  format($$select public.send_to_goals(%L)$$, jsonb_build_array(
    pg_temp.line('small', 'jul', 10), pg_temp.line('emergency', 'jul', 11))),
  'SV002', 'one goal over its need refuses the whole send', '10.00', pg_temp.id('emergency')::text);
select pg_temp.check(pg_temp.saved('small') = 0, 'and the other goal got nothing');
select public.save_goal(pg_temp.id('emergency'), 'Emergency fund', 'emergency', 1000, '2026-12-31', 0);

select pg_temp.refused(
  format($$select public.send_to_goals(%L)$$, jsonb_build_array(
    pg_temp.line('small', 'jul', 5), pg_temp.line('small', 'jul', 5))),
  '22023', 'a goal twice from one pot in one send');
select pg_temp.refused(
  format($$select public.send_to_goals(%L)$$, jsonb_build_array(pg_temp.line('small', 'jul', 0))), '22023', 'sending nothing');
select pg_temp.refused(
  format($$select public.send_to_goals(%L)$$, jsonb_build_array(pg_temp.line('small', 'jul', 1.005))), '22023', 'sending past the cent');
select pg_temp.refused(
  format($$select public.send_to_goals('[{"goal_id":"%s","pot_id":"%s","amount":"5"}]')$$, pg_temp.id('small'), pg_temp.id('jul')),
  '22023', 'an amount written as text');
select pg_temp.refused(
  format($$select public.send_to_goals('[{"goal_id":"%s","amount":5}]')$$, pg_temp.id('small')),
  '22023', 'a line without a pot');
select pg_temp.refused($$select public.send_to_goals('[]')$$, '22023', 'an empty send');
select pg_temp.refused($$select public.send_to_goals('{}')$$, '22023', 'a send that is not a list');
select pg_temp.refused(
  format($$select public.send_to_goals('[{"goal_id":"00000000-0000-0000-0000-000000000000","pot_id":"%s","amount":5}]')$$, pg_temp.id('jul')),
  'P0002', 'a goal that is not there');
select pg_temp.refused(
  format($$select public.send_to_goals(%L)$$, jsonb_build_array(pg_temp.line('small', 'gift', 5))),
  'P0002', 'a removed pot');

-- A pot never drops below what it has in goals ----------------------------------
select pg_temp.refused(
  format($$select public.remove_savings_pot(%L)$$, pg_temp.id('aug')),
  'SV003', 'removing a month whose money is in goals', '520.00', pg_temp.id('aug')::text);
select pg_temp.refused(
  format($$select public.save_savings_pot(%L, null, 639.99, null, null)$$, pg_temp.id('sep')),
  'SV003', 'lowering September below its 640 in goals, though July has 150 left', '640.00');
select public.save_savings_pot(pg_temp.id('jul'), null, 260, null, null);
select pg_temp.check(pg_temp.left_in('jul') = 0 and pg_temp.ready() = 0, 'July lowered to exactly its 260 in goals');
select public.save_savings_pot(pg_temp.id('jul'), null, 410, null, null);
select public.save_savings_pot(pg_temp.id('aug'), null, 600, null, null);
select pg_temp.check(pg_temp.left_in('aug') = 80, 'raising a pot is always allowed');
select public.save_savings_pot(pg_temp.id('aug'), null, 520, null, null);

-- Bringing a closed month up to date --------------------------------------------------
-- September has 640 in goals, August 520, July 260.
select pg_temp.check(
  public.update_savings_month(pg_temp.id('sep'), 3800, 3060) = 740 and pg_temp.ready() = 250,
  'a late payday raises September to 740');
select pg_temp.check(
  public.update_savings_month(pg_temp.id('sep'), 3700, 3060) = 640 and pg_temp.ready() = 150,
  'and taking it back out returns it to 640');
select pg_temp.check(
  public.update_savings_month(pg_temp.id('aug'), 3700, 3300) = 520,
  'a late bill would leave August 400, but it keeps the 520 it has in goals');
select pg_temp.check(
  (select (earned, spent, amount) = (3700.00, 3300.00, 520.00) from public.savings_pots where id = pg_temp.id('aug'))
    and pg_temp.ready() = 150,
  'with the new figures kept and nothing moved');
select pg_temp.check(
  public.update_savings_month(pg_temp.id('jul'), 3700, 3800) = 260,
  'July now overspent still holds the 260 it has in goals');
select public.update_savings_month(pg_temp.id('aug'), 3700, 3180);
select public.update_savings_month(pg_temp.id('jul'), 3700, 3290);
select pg_temp.check(
  pg_temp.left_in('jul') = 150 and pg_temp.left_in('aug') = 0 and pg_temp.ready() = 150,
  'and both go back');
select pg_temp.refused(
  format($$select public.update_savings_month(%L, 3700.001, 3000)$$, pg_temp.id('sep')), '22023', 'an update past the cent');
select pg_temp.refused(
  format($$select public.update_savings_month(%L, 3700, -1)$$, pg_temp.id('sep')), '22023', 'a negative update');
select pg_temp.refused(
  format($$select public.update_savings_month(%L, 1, 0)$$, pg_temp.id('gift')), 'P0002', 'updating a removed pot');
insert into ids values ('cash', public.save_savings_pot(null, 'Cash', 5, '2026-10-01', null));
select pg_temp.refused(
  format($$select public.update_savings_month(%L, 1, 0)$$, pg_temp.id('cash')), 'P0002', 'updating added savings');
select public.remove_savings_pot(pg_temp.id('cash'));
select pg_temp.refused(
  $$select public.update_savings_month(gen_random_uuid(), 1, 0)$$, 'P0002', 'updating a month that is not there');

-- Taking back, pot by pot ---------------------------------------------------------
select pg_temp.refused(
  format($$select public.take_from_goal(%L, %L)$$, pg_temp.id('trip'), jsonb_build_array(pg_temp.back('sep', 400.01))),
  'SV004', 'more back to September than Trip took from it', '400.00', pg_temp.id('sep')::text);
select pg_temp.refused(
  format($$select public.take_from_goal(%L, %L)$$, pg_temp.id('trip'), jsonb_build_array(pg_temp.back('jul', 1))),
  'SV004', 'back to a pot Trip never took from', '0.00');
select pg_temp.refused(
  format($$select public.take_from_goal(%L, %L)$$, pg_temp.id('trip'), jsonb_build_array(pg_temp.back('sep', 0))),
  '22023', 'taking nothing');
select pg_temp.refused(
  format($$select public.take_from_goal(%L, %L)$$, pg_temp.id('trip'),
         jsonb_build_array(pg_temp.back('sep', 1), pg_temp.back('sep', 1))),
  '22023', 'one pot twice');
insert into ids values ('take', public.take_from_goal(
  pg_temp.id('trip'), jsonb_build_array(pg_temp.back('aug', 100), pg_temp.back('sep', 50)),
  '00000000-0000-0000-0000-0000000ba7ce'));
select pg_temp.check(
  pg_temp.ready() = 300 and pg_temp.saved('trip') = 550
    and pg_temp.left_in('aug') = 100 and pg_temp.left_in('sep') = 50,
  'taking 150 from Trip: 100 back to August, 50 to September');
select pg_temp.check(
  (select count(*) = 2 and bool_and(amount < 0) from public.goal_moves where batch_id = pg_temp.id('take')),
  'one batch of negative moves');
select pg_temp.check(
  public.take_from_goal(pg_temp.id('trip'), jsonb_build_array(pg_temp.back('aug', 100), pg_temp.back('sep', 50)),
                        '00000000-0000-0000-0000-0000000ba7ce') = pg_temp.id('take')
    and public.take_from_goal(pg_temp.id('trip'), '[]', '00000000-0000-0000-0000-0000000ba7ce') = pg_temp.id('take'),
  'the same take-back arriving twice answers the same');
select pg_temp.check(pg_temp.ready() = 300 and pg_temp.saved('trip') = 550, 'and moves nothing more');

insert into ids values ('house', public.save_goal(null, 'House', 'home', 1000, null, 300));
select pg_temp.check(pg_temp.saved('house') = 300, 'a goal starts with what was put by');
select pg_temp.refused(
  format($$select public.take_from_goal(%L, %L)$$, pg_temp.id('house'), jsonb_build_array(pg_temp.back('jul', 1))),
  'SV004', 'what a goal started with never goes to savings', '0.00');

-- Ending goals -----------------------------------------------------------------------
select public.delete_goal(pg_temp.id('trip'), true);
select pg_temp.check(
  not exists (select 1 from public.goal_moves where goal_id = pg_temp.id('trip')),
  'deleting a goal deletes its moves');
select pg_temp.check(pg_temp.ready() = 850, 'and its 550 is back in savings');
select pg_temp.refused(
  format($$select public.delete_goal(%L, true)$$, pg_temp.id('trip')), 'P0002', 'deleting a goal that is gone');

select public.delete_goal(pg_temp.id('emergency'), false);
select pg_temp.check(
  (select closed_at is not null from public.goals where id = pg_temp.id('emergency'))
    and (select count(*) = 4 from public.goal_moves where goal_id = pg_temp.id('emergency')),
  '"I spent it" closes the goal and keeps its moves');
select pg_temp.check(pg_temp.ready() = 850, 'so its 720 stays out of savings');
select pg_temp.refused(
  format($$select public.send_to_goals(%L)$$, jsonb_build_array(pg_temp.line('emergency', 'sep', 1))),
  'P0002', 'sending to a closed goal');
select pg_temp.refused(
  format($$select public.take_from_goal(%L, %L)$$, pg_temp.id('emergency'), jsonb_build_array(pg_temp.back('sep', 1))),
  'P0002', 'taking from a closed goal');
select pg_temp.refused(
  format($$select public.save_goal(%L, 'Back', 'emergency', 1000, null, 0)$$, pg_temp.id('emergency')),
  'P0002', 'editing a closed goal');
select pg_temp.refused(
  format($$select public.delete_goal(%L, true)$$, pg_temp.id('emergency')),
  'P0002', 'deleting a closed goal would bring spent money back');
select pg_temp.refused(
  format($$select public.delete_goal(%L, false)$$, pg_temp.id('emergency')), 'P0002', 'closing it twice');
select pg_temp.check(
  pg_temp.ready() = 850 and (select count(*) = 4 from public.goal_moves where goal_id = pg_temp.id('emergency')),
  'its 720 stays spent');
select pg_temp.refused(
  format($$select public.remove_savings_pot(%L)$$, pg_temp.id('aug')),
  'SV003', 'a pot whose money was spent through a goal stays', '220.00');
select pg_temp.refused(
  format($$select public.delete_goal(%L, null)$$, pg_temp.id('small')), '22023', 'ending a goal without saying how');

-- Removing a month ---------------------------------------------------------------
select public.delete_goal(pg_temp.id('small'), true);
select pg_temp.refused(
  format($$select public.remove_savings_pot(%L)$$, pg_temp.id('sep')),
  'SV003', 'September still has 240 in the closed goal', '240.00');
select pg_temp.refused(
  format($$select public.remove_savings_pot(%L)$$, pg_temp.id('jul')),
  'SV003', 'July still has 260 in the closed goal', '260.00');
insert into ids values ('oct-gift', public.save_savings_pot(null, 'Found cash', 5, '2026-10-01', null));
select public.remove_savings_pot(pg_temp.id('oct-gift'));
select pg_temp.check(true, 'a pot with nothing in goals can go');


-- Wrap-ups -------------------------------------------------------------------------
select public.mark_wrap_up_seen('2026-09-01');
select pg_temp.check(
  (select bool_and(wrap_up_seen_at is not null) from public.savings_pots where kind = 'month'),
  'marking September seen');

-- As B -----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b9","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b9', true);

select pg_temp.check((select count(*) from public.savings_pots) = 0, 'B sees none of A''s pots');
select pg_temp.check((select count(*) from public.goals) = 0, 'B sees none of A''s goals');
select pg_temp.check((select count(*) from public.goal_moves) = 0, 'B sees none of A''s moves');

select pg_temp.refused(
  $$select public.close_my_savings_month('2025-12-01', 100, 0, false)$$, 'SV005', 'B closing December, before joining');
insert into ids values ('b-jan', public.close_my_savings_month('2026-01-01', 100, 0, false));
select pg_temp.check(true, 'B closing January: joined on its last day west of UTC');
insert into ids values ('b-feb', public.close_my_savings_month('2026-02-01', 100, 250, false));
select pg_temp.check(
  (select (earned, spent, amount) = (100.00, 250.00, 0.00) from public.savings_pots where id = pg_temp.id('b-feb')),
  'an overspent month is kept with nothing moved');
select public.save_savings_pot(pg_temp.id('b-feb'), null, 50, null, null);
select public.save_savings_pot(pg_temp.id('b-feb'), null, 0, null, null);
select pg_temp.check(true, 'an overspent month can be given an amount and kept at $0 again');
select pg_temp.refused(
  format($$select public.save_savings_pot(%L, null, 0, null, null)$$, pg_temp.id('b-jan')),
  'SV006', 'a month that left money, kept at $0, with nothing in goals');

insert into ids values ('b-mar', public.close_my_savings_month('2026-03-01', 100, 40, false));
select public.remove_savings_pot(pg_temp.id('b-mar'));
select pg_temp.check(
  (select removed_at is not null from public.savings_pots where id = pg_temp.id('b-mar')),
  'a removed month is kept, marked removed');
select pg_temp.check(
  public.close_my_savings_month('2026-03-01', 100, 40, false) = pg_temp.id('b-mar'),
  'closing it again finds it');
select pg_temp.check(
  (select count(*) = 1 and bool_and(removed_at is not null) from public.savings_pots where month = '2026-03-01'),
  'and leaves it removed');
select pg_temp.refused(
  format($$select public.remove_savings_pot(%L)$$, pg_temp.id('b-mar')), 'P0002', 'removing a month twice');
select pg_temp.refused(
  format($$select public.save_savings_pot(%L, null, 5, null, null)$$, pg_temp.id('b-mar')), 'P0002', 'editing a removed month');

insert into ids values ('b-goal', public.save_goal(null, 'Mine', 'other', 100, null, 0));
select pg_temp.refused(
  format($$select public.send_to_goals(%L)$$, jsonb_build_array(pg_temp.line('house', 'b-jan', 5))),
  'P0002', 'B sending to A''s goal');
select pg_temp.refused(
  format($$select public.send_to_goals(%L)$$, jsonb_build_array(pg_temp.line('b-goal', 'sep', 5))),
  'P0002', 'B sending from A''s pot');
select pg_temp.refused(
  format($$select public.take_from_goal(%L, %L)$$, pg_temp.id('house'), jsonb_build_array(pg_temp.back('b-jan', 1))),
  'P0002', 'B taking from A''s goal');
select pg_temp.refused(
  format($$select public.save_goal(%L, 'Mine now', 'trip', 10, null, 0)$$, pg_temp.id('house')),
  'P0002', 'B editing A''s goal');
select pg_temp.refused(
  format($$select public.remove_savings_pot(%L)$$, pg_temp.id('sep')), 'P0002', 'B removing A''s month');
select pg_temp.refused(
  format($$select public.save_savings_pot(%L, null, 1, null, null)$$, pg_temp.id('sep')), 'P0002', 'B changing A''s month');
select pg_temp.refused(
  format($$select public.delete_goal(%L, true)$$, pg_temp.id('house')), 'P0002', 'B deleting A''s goal');
select pg_temp.refused(
  format($$select public.delete_goal(%L, false)$$, pg_temp.id('house')), 'P0002', 'B closing A''s goal');
select pg_temp.refused(
  format($$select public.update_savings_month(%L, 1, 0)$$, pg_temp.id('sep')), 'P0002', 'B updating A''s month');
select pg_temp.check(
  public.update_savings_month(pg_temp.id('b-jan'), 100, 250) = 0, 'B''s January, overspent after all, holds nothing');
select public.mark_wrap_up_seen('2026-12-01');
select pg_temp.check(
  (select count(*) = 3 and bool_and(wrap_up_seen_at is not null) from public.savings_pots),
  'B marking wrap-ups seen marks only B''s');

-- The account's first month, at the edges ------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c9","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c9', true);
select public.close_my_savings_month('2026-07-01', 0, 0, false);
select pg_temp.check(true, 'C: July closes for an account made when it was still 31 Jul at UTC−12');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d9","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d9', true);
select pg_temp.refused(
  $$select public.close_my_savings_month('2026-07-01', 0, 0, false)$$, 'SV005', 'D: July, when it was 1 Aug everywhere');

-- Not signed in -----------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.refused($$select count(*) from public.savings_pots$$, '42501', 'anon reading pots');
select pg_temp.refused($$select count(*) from public.goals$$, '42501', 'anon reading goals');
select pg_temp.refused($$select count(*) from public.goal_moves$$, '42501', 'anon reading moves');
select pg_temp.refused($$select public.close_my_savings_month('2026-07-01', 1, 0, false)$$, '42501', 'anon closing a month');
select pg_temp.refused($$select public.send_to_goals('[]')$$, '42501', 'anon sending');
select pg_temp.refused($$select public.take_from_goal(gen_random_uuid(), '[]')$$, '42501', 'anon taking back');
select pg_temp.refused($$select public.save_goal(null, 'X', 'x', 1, null, 0)$$, '42501', 'anon making a goal');
select pg_temp.refused($$select public.delete_goal(gen_random_uuid(), true)$$, '42501', 'anon deleting a goal');
select pg_temp.refused($$select public.mark_wrap_up_seen('2026-07-01')$$, '42501', 'anon marking seen');
select pg_temp.refused($$select public.update_savings_month(gen_random_uuid(), 1, 0)$$, '42501', 'anon updating a month');
select pg_temp.refused($$select public.savings_pot_in_goals(gen_random_uuid())$$, '42501', 'anon calling a helper');

-- Under the functions -------------------------------------------------------------------
reset role;
set local role authenticated;
select pg_temp.refused($$select public.goal_saved(gen_random_uuid())$$, '42501', 'a helper is not for calling');
reset role;
select pg_temp.check(
  (select count(*) = 1 from public.goals where id = pg_temp.id('house') and closed_at is null),
  'A''s goal survived B''s delete and close');
select pg_temp.refused(
  format($$insert into public.goal_moves (user_id, goal_id, pot_id, amount, batch_id) values (%L, %L, %L, 5, gen_random_uuid())$$,
         '00000000-0000-0000-0000-0000000000b9', pg_temp.id('b-goal'), pg_temp.id('sep')),
  '23514', 'a move from someone else''s pot, even from the owner role');
select pg_temp.refused(
  format($$insert into public.goal_moves (user_id, goal_id, pot_id, amount, batch_id) values (%L, %L, %L, 5, gen_random_uuid())$$,
         '00000000-0000-0000-0000-0000000000b9', pg_temp.id('house'), pg_temp.id('b-jan')),
  '23514', 'a move to someone else''s goal, even from the owner role');
select pg_temp.refused(
  $$insert into public.savings_pots (user_id, kind, month, earned, spent, amount, added_on, label)
    values ('00000000-0000-0000-0000-0000000000a9', 'month', '2026-04-01', 1, 0, 1, '2026-05-01', 'Named')$$,
  '23514', 'a month with a name');
select pg_temp.refused(
  $$insert into public.savings_pots (user_id, kind, month, earned, spent, amount, added_on)
    values ('00000000-0000-0000-0000-0000000000a9', 'month', '2026-04-02', 1, 0, 1, '2026-05-01')$$,
  '23514', 'a month that is not a 1st');
select pg_temp.refused(
  $$insert into public.savings_pots (user_id, kind, amount, added_on, label, month)
    values ('00000000-0000-0000-0000-0000000000a9', 'added', 1, '2026-05-01', 'X', '2026-04-01')$$,
  '23514', 'added savings with a month');
select pg_temp.refused(
  $$insert into public.savings_pots (user_id, kind, month, earned, spent, amount, added_on)
    values ('00000000-0000-0000-0000-0000000000a9', 'month', '2026-09-01', 1, 0, 1, '2026-10-01')$$,
  '23505', 'a second September');

delete from auth.users where id = '00000000-0000-0000-0000-0000000000a9';
select pg_temp.check(
  not exists (select 1 from public.savings_pots where user_id = '00000000-0000-0000-0000-0000000000a9')
    and not exists (select 1 from public.goals where user_id = '00000000-0000-0000-0000-0000000000a9')
    and not exists (select 1 from public.goal_moves where user_id = '00000000-0000-0000-0000-0000000000a9'),
  'deleting an account takes its pots, goals and moves');

select 'ALL CHECKS PASSED';
rollback;
