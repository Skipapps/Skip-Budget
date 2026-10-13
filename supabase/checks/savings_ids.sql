-- Checks for 20261013600002_savings_ids.sql. LOCAL database only, with it applied: everything runs
-- in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/savings_ids.sql
--
-- New savings and a new goal saved again with the visit's id (p_new_id) are found and given the
-- values sent now, not filed twice; another person's id is refused by the primary key. Two saves
-- at once wait on the person's savings lock, so the second finds the first; one session cannot
-- show that, so it is read, not run, here.
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d3', 'savings-ids@test.local'),
  ('00000000-0000-0000-0000-0000000000d4', 'savings-ids-other@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000d3'), ('00000000-0000-0000-0000-0000000000d4')
on conflict (id) do nothing;

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

-- ---------------------------------------------------------------- each body is its source, with only its own lines
select pg_temp.check(
  pg_temp.times(pg_temp.src('save_savings_pot'), $h$  -- After the lock, so a repeat racing the first waits for it and finds it.
  if p_id is null and p_new_id is not null
     and exists (select 1 from public.savings_pots where id = p_new_id and user_id = v_user) then
    p_id := p_new_id;
  end if;

$h$) = 1
  and pg_temp.times(pg_temp.src('save_savings_pot'), $h$    insert into public.savings_pots (id, user_id, kind, label, amount, added_on, note)
    values (coalesce(p_new_id, gen_random_uuid()), v_user, 'added', btrim(coalesce(p_label, '')), p_amount, p_added_on, v_note)
$h$) = 1
  and md5(replace(replace(pg_temp.src('save_savings_pot'),
        $h$  -- After the lock, so a repeat racing the first waits for it and finds it.
  if p_id is null and p_new_id is not null
     and exists (select 1 from public.savings_pots where id = p_new_id and user_id = v_user) then
    p_id := p_new_id;
  end if;

$h$,
        $h$$h$),
        $h$    insert into public.savings_pots (id, user_id, kind, label, amount, added_on, note)
    values (coalesce(p_new_id, gen_random_uuid()), v_user, 'added', btrim(coalesce(p_label, '')), p_amount, p_added_on, v_note)
$h$,
        $h$    insert into public.savings_pots (user_id, kind, label, amount, added_on, note)
    values (v_user, 'added', btrim(coalesce(p_label, '')), p_amount, p_added_on, v_note)
$h$)) = '81682e66610fc50bd77dc70317ddea86',
  'save_savings_pot is 20261011100001''s with only the app''s id for a new pot');
select pg_temp.check(
  pg_temp.times(pg_temp.src('save_goal'), $h$  -- After the lock, so a repeat racing the first waits for it and finds it.
  if p_id is null and p_new_id is not null
     and exists (select 1 from public.goals where id = p_new_id and user_id = v_user) then
    p_id := p_new_id;
  end if;

$h$) = 1
  and pg_temp.times(pg_temp.src('save_goal'), $h$    insert into public.goals (id, user_id, name, icon_id, target, target_date, start_amount)
    values (coalesce(p_new_id, gen_random_uuid()), v_user, btrim(coalesce(p_name, '')), p_icon_id, p_target, p_target_date, v_start)
$h$) = 1
  and md5(replace(replace(pg_temp.src('save_goal'),
        $h$  -- After the lock, so a repeat racing the first waits for it and finds it.
  if p_id is null and p_new_id is not null
     and exists (select 1 from public.goals where id = p_new_id and user_id = v_user) then
    p_id := p_new_id;
  end if;

$h$,
        $h$$h$),
        $h$    insert into public.goals (id, user_id, name, icon_id, target, target_date, start_amount)
    values (coalesce(p_new_id, gen_random_uuid()), v_user, btrim(coalesce(p_name, '')), p_icon_id, p_target, p_target_date, v_start)
$h$,
        $h$    insert into public.goals (user_id, name, icon_id, target, target_date, start_amount)
    values (v_user, btrim(coalesce(p_name, '')), p_icon_id, p_target, p_target_date, v_start)
$h$)) = '9c6b66f105d3bf4cc8b9944ebfb4e326',
  'save_goal is 20261011100001''s with only the app''s id for a new goal');

-- ---------------------------------------------------------------- signatures and grants
select pg_temp.check(
  (select count(*) = 1 from pg_proc where proname = 'save_savings_pot' and pronamespace = 'public'::regnamespace)
  and (select count(*) = 1 from pg_proc where proname = 'save_goal' and pronamespace = 'public'::regnamespace)
  and to_regprocedure('public.save_savings_pot(uuid,text,numeric,date,text)') is null
  and to_regprocedure('public.save_goal(uuid,text,text,numeric,date,numeric)') is null,
  'one of each: the overloads without the id are gone');
select pg_temp.check(
  (select pg_get_function_arguments(p.oid) like '%p_note text, p_new_id uuid DEFAULT NULL::uuid'
     from pg_proc p where p.proname = 'save_savings_pot' and p.pronamespace = 'public'::regnamespace)
  and (select pg_get_function_arguments(p.oid) like '%p_start_amount numeric, p_new_id uuid DEFAULT NULL::uuid'
         from pg_proc p where p.proname = 'save_goal' and p.pronamespace = 'public'::regnamespace),
  'the id comes last, with no default but none, so an older call still resolves');
select pg_temp.check(
  bool_and(has_function_privilege('authenticated', f, 'execute')
           and not has_function_privilege('anon', f, 'execute')
           and not has_function_privilege('public', f, 'execute')),
  'signed-in people may call each, signed-out ones may not')
from unnest(array[
  'public.save_savings_pot(uuid,text,numeric,date,text,uuid)',
  'public.save_goal(uuid,text,text,numeric,date,numeric,uuid)'
]) f;
select pg_temp.check(
  (select bool_and(p.prosecdef and p.proconfig = array['search_path=public'])
     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('save_savings_pot', 'save_goal')),
  'both still run as their owner, as before');

-- ---------------------------------------------------------------- new savings, added once
select pg_temp.as_user('d3');
select pg_temp.check(
  public.save_savings_pot(null, 'Gift', 50, current_date, null, '00000000-0000-0000-0000-00000000c1d3')
  = '00000000-0000-0000-0000-00000000c1d3',
  'savings added with the visit''s id are filed under it');
select pg_temp.check(
  public.save_savings_pot(null, 'Gift from Gran', 60, current_date, 'for the trip', '00000000-0000-0000-0000-00000000c1d3')
  = '00000000-0000-0000-0000-00000000c1d3',
  'added again with that id, the same savings come back');
select pg_temp.check(
  (select count(*) = 1 and bool_and(label = 'Gift from Gran' and amount = 60 and note = 'for the trip')
     from public.savings_pots where user_id = '00000000-0000-0000-0000-0000000000d3' and kind = 'added'),
  'one pot, holding the values sent the second time');
select pg_temp.check(
  public.save_savings_pot(null, 'Again', 5, current_date, null) <> public.save_savings_pot(null, 'Again', 5, current_date, null),
  'with no id, each save adds, as before');
select pg_temp.check(
  public.save_savings_pot('00000000-0000-0000-0000-00000000c1d3', 'Gift', 70, current_date, null,
                          '00000000-0000-0000-0000-00000000ffff') = '00000000-0000-0000-0000-00000000c1d3',
  'an edit by its own id saves that pot');
select pg_temp.check(
  not exists (select 1 from public.savings_pots where id = '00000000-0000-0000-0000-00000000ffff'),
  'and files nothing under the new id it was also sent');

reset role;
select pg_temp.as_user('d4');
select pg_temp.expect_error(
  $s$select public.save_savings_pot(null, 'Mine', 1, current_date, null, '00000000-0000-0000-0000-00000000c1d3')$s$,
  '23505', 'savings_pots_pkey');
reset role;
select pg_temp.check(
  (select amount = 70 and label = 'Gift' from public.savings_pots where id = '00000000-0000-0000-0000-00000000c1d3'),
  'another person''s id is refused by the key, and the savings behind it are untouched');

-- ---------------------------------------------------------------- a new goal, created once
select pg_temp.as_user('d3');
select pg_temp.check(
  public.save_goal(null, 'Trip', 'trip', 1000, null, 0, '00000000-0000-0000-0000-00000000e1d3')
  = '00000000-0000-0000-0000-00000000e1d3',
  'a goal created with the visit''s id is filed under it');
select pg_temp.check(
  public.save_goal(null, 'Trip to Rome', 'trip', 1500, '2027-06-30', 100, '00000000-0000-0000-0000-00000000e1d3')
  = '00000000-0000-0000-0000-00000000e1d3',
  'created again with that id, the same goal comes back');
-- A statement of its own: one statement reads the rows as they were when it began.
select pg_temp.check(
  (select count(*) = 1 and bool_and(name = 'Trip to Rome' and target = 1500 and target_date = '2027-06-30'
                                        and start_amount = 100)
         from public.goals where user_id = '00000000-0000-0000-0000-0000000000d3'),
  'one goal, holding the values sent the second time');
select pg_temp.check(
  public.save_goal(null, 'Car', 'car', 5000, null, 0) <> public.save_goal(null, 'Car', 'car', 5000, null, 0),
  'with no id, each save creates, as before');

reset role;
select pg_temp.as_user('d4');
select pg_temp.expect_error(
  $s$select public.save_goal(null, 'Mine', 'trip', 10, null, 0, '00000000-0000-0000-0000-00000000e1d3')$s$,
  '23505', 'goals_pkey');
reset role;
select pg_temp.check(
  (select name = 'Trip to Rome' from public.goals where id = '00000000-0000-0000-0000-00000000e1d3'),
  'another person''s id is refused by the key, and the goal behind it is untouched');

rollback;
\echo ALL CHECKS PASSED
