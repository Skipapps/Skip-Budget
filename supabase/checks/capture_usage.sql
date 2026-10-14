-- Checks for 20261013100002_capture_usage.sql. LOCAL database only, with it applied: everything
-- runs in one transaction and rolls back. free_capture_allowance.sql must still pass beside it.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/capture_usage.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".
-- A receipt read by camera or upload stays counted after it is deleted; nothing else is counted;
-- nobody can write, change or remove a usage row through the API.

\set ON_ERROR_STOP on
begin;

-- F free (Los Angeles), O free (no zone), P Pro.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'usage-free@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'usage-other@test.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'usage-pro@test.local');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-0000000000c3')
on conflict (id) do nothing;
update public.profiles set timezone = 'America/Los_Angeles' where id = '00000000-0000-0000-0000-0000000000c1';
insert into public.entitlements (user_id, pro, expires_at) values
  ('00000000-0000-0000-0000-0000000000c3', true, null);

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

-- Usage rows of one person and way, read past the row policies.
create or replace function pg_temp.used(p_user text, p_source text) returns bigint
language sql as $$
  select count(*) from public.capture_usage
   where user_id = format('00000000-0000-0000-0000-0000000000%s', p_user)::uuid
     and source::text = p_source
$$;

create or replace function pg_temp.receipt(p_user text, p_name text, p_source text) returns void
language plpgsql as $$
begin
  insert into public.receipts (user_id, merchant, amount, source)
  values (format('00000000-0000-0000-0000-0000000000%s', p_user)::uuid, p_name, 1,
          p_source::public.capture_source);
end $$;

-- ---------------------------------------------------------------- the table and its grants
select pg_temp.check(
  (select relrowsecurity from pg_class where oid = 'public.capture_usage'::regclass),
  'row level security is on');
select pg_temp.check(
  (select array_agg(cmd::text) = array['SELECT'] from pg_policies
    where schemaname = 'public' and tablename = 'capture_usage'),
  'the only policy is the owner''s read');
select pg_temp.check(
  has_table_privilege('authenticated', 'public.capture_usage', 'select')
  and not has_table_privilege('authenticated', 'public.capture_usage', 'insert')
  and not has_table_privilege('authenticated', 'public.capture_usage', 'update')
  and not has_table_privilege('authenticated', 'public.capture_usage', 'delete')
  and not has_table_privilege('authenticated', 'public.capture_usage', 'truncate'),
  'signed-in callers may read, and nothing else');
select pg_temp.check(not has_table_privilege('anon', 'public.capture_usage', 'select'),
  'signed-out callers may not even read');
select pg_temp.check(
  (select prosecdef from pg_proc where oid = 'public.record_capture_usage()'::regprocedure)
  and not has_function_privilege('authenticated', 'public.record_capture_usage()', 'execute'),
  'the writer runs as its owner and nobody can call it');

-- ---------------------------------------------------------------- F: what is counted
select pg_temp.as_user('c1');
select pg_temp.receipt('c1', 'Scan ' || n, 'scan') from generate_series(1, 3) n;
select pg_temp.receipt('c1', 'Upload ' || n, 'upload') from generate_series(1, 2) n;
select pg_temp.receipt('c1', 'Typed ' || n, 'manual') from generate_series(1, 5) n;
reset role;

select pg_temp.check(pg_temp.used('c1', 'scan') = 3 and pg_temp.used('c1', 'upload') = 2,
  'each receipt read by camera or upload leaves one usage row');
select pg_temp.check(
  (select count(*) = 5 from public.capture_usage u join public.receipts r on r.id = u.receipt_id
    where u.user_id = '00000000-0000-0000-0000-0000000000c1'
      and u.source = r.source and u.created_at = r.created_at),
  'naming its receipt, its way and the time the server stamped on it');
select pg_temp.check(
  not exists (select 1 from public.capture_usage u join public.receipts r on r.id = u.receipt_id
               where r.source = 'manual'),
  'a typed receipt leaves none');

-- An edit cannot make a typed receipt a scan, so it never gains a usage row.
select pg_temp.as_user('c1');
update public.receipts set source = 'scan', merchant = 'Typed 1 edited' where merchant = 'Typed 1';
reset role;
select pg_temp.check(pg_temp.used('c1', 'scan') = 3, 'an edit adds no usage row');

-- ---------------------------------------------------------------- F: nobody touches a usage row
select pg_temp.as_user('c1');
select pg_temp.expect_error(
  $q$insert into public.capture_usage (user_id, source) values ('00000000-0000-0000-0000-0000000000c1', 'scan')$q$,
  '42501');
select pg_temp.expect_error($q$delete from public.capture_usage$q$, '42501');
select pg_temp.expect_error($q$update public.capture_usage set created_at = '2020-01-01'$q$, '42501');
select pg_temp.expect_error($q$select public.record_capture_usage()$q$, '42501');
select pg_temp.check((select count(*) = 5 from public.capture_usage), 'F reads its own five');
reset role;

-- ---------------------------------------------------------------- F: deleting gives nothing back
select pg_temp.as_user('c1');
delete from public.receipts where merchant in ('Scan 1', 'Scan 2');
reset role;
select pg_temp.check(pg_temp.used('c1', 'scan') = 3, 'deleting two scanned receipts leaves their usage rows');
select pg_temp.check(
  (select count(*) = 2 from public.capture_usage
    where user_id = '00000000-0000-0000-0000-0000000000c1' and source = 'scan' and receipt_id is null),
  'with no receipt to name');

select pg_temp.as_user('c1');
select pg_temp.receipt('c1', 'More scan ' || n, 'scan') from generate_series(1, 12) n;
select pg_temp.check((select count(*) = 13 from public.receipts where source = 'scan'),
  '13 scanned receipts kept, 15 read');
select pg_temp.expect_error(
  $q$select pg_temp.receipt('c1', 'Scan 16', 'scan')$q$, 'P0001', 'Scanning more than 15');
-- Every scanned receipt gone, and the month's 15 are still spent.
delete from public.receipts where source = 'scan';
select pg_temp.expect_error(
  $q$select pg_temp.receipt('c1', 'Scan after clearing', 'scan')$q$, 'P0001', 'Scanning more than 15');
select pg_temp.receipt('c1', 'Upload ' || n, 'upload') from generate_series(3, 15) n;
select pg_temp.expect_error(
  $q$select pg_temp.receipt('c1', 'Upload 16', 'upload')$q$, 'P0001', 'Uploading more than 15');
select pg_temp.receipt('c1', 'Typed at the limit', 'manual');
reset role;
select pg_temp.check(pg_temp.used('c1', 'scan') = 15 and pg_temp.used('c1', 'upload') = 15,
  'a refused receipt leaves no usage row');

-- ---------------------------------------------------------------- a failed save counts nothing
select pg_temp.as_user('c2');
select pg_temp.expect_error(
  $q$insert into public.receipts (user_id, merchant, amount, source)
     values ('00000000-0000-0000-0000-0000000000c2', 'Negative', -1, 'scan')$q$, '23514');
insert into public.receipts (id, user_id, merchant, amount, source)
values ('00000000-0000-0000-0000-00000000f0c2', '00000000-0000-0000-0000-0000000000c2', 'Once', 1, 'scan');
-- The same id again (a retried save whose first answer was lost) is refused on the key.
select pg_temp.expect_error(
  $q$insert into public.receipts (id, user_id, merchant, amount, source)
     values ('00000000-0000-0000-0000-00000000f0c2', '00000000-0000-0000-0000-0000000000c2', 'Once', 1, 'scan')$q$,
  '23505', 'receipts_pkey');
reset role;
select pg_temp.check(pg_temp.used('c2', 'scan') = 1, 'a save that fails, or files a key twice, counts once at most');

-- ---------------------------------------------------------------- O: last month does not count
insert into public.capture_usage (user_id, source, created_at)
select '00000000-0000-0000-0000-0000000000c2', 'scan',
       date_trunc('month', now() at time zone 'UTC') at time zone 'UTC' - interval '1 second'
  from generate_series(1, 30);
select pg_temp.as_user('c2');
select pg_temp.receipt('c2', 'New ' || n, 'scan') from generate_series(2, 15) n;
select pg_temp.expect_error(
  $q$select pg_temp.receipt('c2', 'New 16', 'scan')$q$, 'P0001', 'Scanning more than 15');
reset role;
select pg_temp.check(true, 'last month''s 30 leave this month''s 15 open, and no more');

-- ---------------------------------------------------------------- P: Pro has no limit
select pg_temp.as_user('c3');
select pg_temp.receipt('c3', 'Pro ' || n, (array['scan', 'upload', 'voice'])[1 + n % 3])
  from generate_series(1, 60) n;
reset role;
select pg_temp.check(
  pg_temp.used('c3', 'scan') = 20 and pg_temp.used('c3', 'upload') = 20 and pg_temp.used('c3', 'voice') = 0,
  'Pro reads without a limit; its scans and uploads are written down, voice is not');
update public.entitlements set expires_at = now() - interval '1 day'
 where user_id = '00000000-0000-0000-0000-0000000000c3';
select pg_temp.as_user('c3');
select pg_temp.expect_error(
  $q$select pg_temp.receipt('c3', 'After lapse', 'scan')$q$, 'P0001', 'Scanning more than 15');
reset role;

-- ---------------------------------------------------------------- the back-fill
-- Receipts read before the table existed: written with the writer off, then the migration's
-- back-fill run twice.
alter table public.receipts disable trigger receipts_record_capture;
alter table public.receipts disable trigger receipts_scan_is_pro;
insert into public.receipts (user_id, merchant, amount, source)
select '00000000-0000-0000-0000-0000000000c3', 'Before ' || n, 1, 'upload' from generate_series(1, 4) n;
alter table public.receipts enable trigger receipts_scan_is_pro;
alter table public.receipts enable trigger receipts_record_capture;

insert into public.capture_usage (user_id, source, receipt_id, created_at)
select r.user_id, r.source, r.id, r.created_at
  from public.receipts r
 where r.source in ('scan', 'upload')
   and not exists (select 1 from public.capture_usage u where u.receipt_id = r.id);
select pg_temp.check(pg_temp.used('c3', 'upload') = 24, 'the back-fill writes one row for each receipt read before');
insert into public.capture_usage (user_id, source, receipt_id, created_at)
select r.user_id, r.source, r.id, r.created_at
  from public.receipts r
 where r.source in ('scan', 'upload')
   and not exists (select 1 from public.capture_usage u where u.receipt_id = r.id);
select pg_temp.check(pg_temp.used('c3', 'upload') = 24, 'and nothing more the second time');
select pg_temp.expect_error(
  $q$insert into public.capture_usage (user_id, source, receipt_id)
     select user_id, source, receipt_id from public.capture_usage where receipt_id is not null limit 1$q$,
  '23505');

-- ---------------------------------------------------------------- each reads only their own
select pg_temp.as_user('c2');
select pg_temp.check(
  (select count(*) from public.capture_usage) = pg_temp.used('c2', 'scan') + pg_temp.used('c2', 'upload')
  and (select bool_and(user_id = '00000000-0000-0000-0000-0000000000c2') from public.capture_usage),
  'O reads its own usage rows and no one else''s');
reset role;

-- ---------------------------------------------------------------- deleting the account
delete from auth.users where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.check(pg_temp.used('c1', 'scan') + pg_temp.used('c1', 'upload') = 0,
  'a deleted account takes its usage rows with it');

select pg_temp.check(
  (select count(*) = 2 from pg_indexes
    where indexname in ('capture_usage_month_idx', 'capture_usage_one_per_receipt')),
  'the month index and the one-per-receipt index exist');

rollback;
\echo ALL CHECKS PASSED
