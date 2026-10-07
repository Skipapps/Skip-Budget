-- Checks for 20261007100001_free_capture_allowance.sql. LOCAL database only: everything runs in
-- one transaction and rolls back.
--
--   npx supabase start -x gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/free_capture_allowance.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED or "wrong refusal".

\set ON_ERROR_STOP on
begin;

-- Five accounts: A free (Los Angeles), B free (a zone Postgres does not know), C free (no zone),
-- P Pro, L lapsed Pro.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'p@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'l@test.local');

insert into public.profiles (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b1')
on conflict (id) do nothing;

update public.profiles set timezone = 'America/Los_Angeles' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set timezone = 'Not/AZone'           where id = '00000000-0000-0000-0000-00000000000b';

insert into public.entitlements (user_id, pro, expires_at) values
  ('00000000-0000-0000-0000-0000000000a1', true, null),
  ('00000000-0000-0000-0000-0000000000b1', true, null);

create or replace function pg_temp.expect_refusal(p_sql text, p_words text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_words in sqlerrm) = 0 or position('part of Skip Pro' in sqlerrm) = 0 then
      raise exception 'wrong refusal: % (wanted %)', sqlerrm, p_words;
    end if;
    raise notice 'ok  refused: %', sqlerrm;
    return;
  end;
  raise exception 'expected a refusal for: %', p_sql;
end $$;

create or replace function pg_temp.check(p_ok boolean, p_what text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAILED: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

-- ---------------------------------------------------------------- free A, as the app would: RLS on
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

insert into public.receipts (user_id, merchant, amount, source)
select '00000000-0000-0000-0000-00000000000a', 'Scan ' || n, 1, 'scan' from generate_series(1, 15) n;
select pg_temp.check((select count(*) = 15 from public.receipts where source = 'scan'), '15 scans fit');
select pg_temp.expect_refusal(
  $q$insert into public.receipts (user_id, merchant, amount, source)
     values ('00000000-0000-0000-0000-00000000000a', 'Scan 16', 1, 'scan')$q$,
  'Scanning more than 15');

insert into public.receipts (user_id, merchant, amount, source)
select '00000000-0000-0000-0000-00000000000a', 'Upload ' || n, 1, 'upload' from generate_series(1, 15) n;
select pg_temp.check((select count(*) = 15 from public.receipts where source = 'upload'),
  'uploads have their own 15 after the scans are used up');
select pg_temp.expect_refusal(
  $q$insert into public.receipts (user_id, merchant, amount, source)
     values ('00000000-0000-0000-0000-00000000000a', 'Upload 16', 1, 'upload')$q$,
  'Uploading more than 15');

insert into public.receipts (user_id, merchant, amount, source)
select '00000000-0000-0000-0000-00000000000a', 'Typed ' || n, 1, 'manual' from generate_series(1, 40) n;
select pg_temp.check((select count(*) = 40 from public.receipts where source = 'manual'),
  'typed receipts are never counted');

select pg_temp.expect_refusal(
  $q$insert into public.receipts (user_id, merchant, amount, source)
     values ('00000000-0000-0000-0000-00000000000a', 'Spoken', 1, 'voice')$q$,
  'by voice');

update public.receipts set merchant = 'Scan 1 edited' where merchant = 'Scan 1';
select pg_temp.check((select count(*) = 1 from public.receipts where merchant = 'Scan 1 edited'),
  'a counted receipt stays editable at the limit');

select pg_temp.check(public.claim_pro_offer(), 'the offer is claimed the first time');
select pg_temp.check(not public.claim_pro_offer(), 'and never again');
reset role;

-- ---------------------------------------------------------------- free B: unknown zone, backdating
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
insert into public.receipts (user_id, merchant, amount, source, created_at)
values ('00000000-0000-0000-0000-00000000000b', 'Backdated', 1, 'scan', '2020-01-01');
select pg_temp.check(
  (select created_at > now() - interval '1 minute' from public.receipts where merchant = 'Backdated'),
  'an unknown zone falls back to UTC, and a free scan is stamped by the server');
reset role;

-- ---------------------------------------------------------------- free C: no zone, last month free
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
insert into public.receipts (user_id, merchant, amount, source)
values ('00000000-0000-0000-0000-00000000000c', 'No zone', 1, 'upload');
select pg_temp.check(true, 'no zone at all works');
reset role;
-- Last month's scans do not count: written directly, as the trigger would stamp them now.
alter table public.receipts disable trigger receipts_scan_is_pro;
insert into public.receipts (user_id, merchant, amount, source, created_at)
select '00000000-0000-0000-0000-00000000000c', 'Old ' || n, 1, 'scan',
       date_trunc('month', now() at time zone 'UTC') at time zone 'UTC' - interval '1 second'
  from generate_series(1, 30) n;
alter table public.receipts enable trigger receipts_scan_is_pro;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
insert into public.receipts (user_id, merchant, amount, source)
select '00000000-0000-0000-0000-00000000000c', 'New ' || n, 1, 'scan' from generate_series(1, 15) n;
select pg_temp.check(true, 'last month''s 30 scans leave this month''s 15 open');
select pg_temp.expect_refusal(
  $q$insert into public.receipts (user_id, merchant, amount, source)
     values ('00000000-0000-0000-0000-00000000000c', 'New 16', 1, 'scan')$q$,
  'Scanning more than 15');
reset role;

-- ---------------------------------------------------------------- Pro P: no limit, no restamp
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
insert into public.receipts (user_id, merchant, amount, source)
select '00000000-0000-0000-0000-0000000000a1', 'Pro ' || n, 1, (array['scan','upload','voice'])[1 + n % 3]::public.capture_source
  from generate_series(1, 60) n;
select pg_temp.check((select count(*) = 60 from public.receipts where merchant like 'Pro %'),
  'Pro scans, uploads and speaks without a limit');
reset role;

-- ---------------------------------------------------------------- lapsed L: 40 scans, then lapses
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
insert into public.receipts (user_id, merchant, amount, source)
select '00000000-0000-0000-0000-0000000000b1', 'Paid ' || n, 1, 'scan' from generate_series(1, 40) n;
reset role;
update public.entitlements set expires_at = now() - interval '1 day' where user_id = '00000000-0000-0000-0000-0000000000b1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select pg_temp.expect_refusal(
  $q$insert into public.receipts (user_id, merchant, amount, source)
     values ('00000000-0000-0000-0000-0000000000b1', 'After lapse', 1, 'scan')$q$,
  'Scanning more than 15');
update public.receipts set amount = 2 where merchant like 'Paid %';
select pg_temp.check((select count(*) = 40 from public.receipts where merchant like 'Paid %' and amount = 2),
  'after a lapse every receipt stays and stays editable');
insert into public.receipts (user_id, merchant, amount, source)
values ('00000000-0000-0000-0000-0000000000b1', 'Lapsed upload', 1, 'upload');
select pg_temp.check(true, 'a lapsed account still has its 15 uploads');
reset role;

-- ---------------------------------------------------------------- the month edge, by zone
select pg_temp.check(
  (date_trunc('month', timestamptz '2026-11-01 05:00:00+00' at time zone 'America/Los_Angeles')
     at time zone 'America/Los_Angeles') = timestamptz '2026-10-01 07:00:00+00',
  'at 10pm on 31 October in Los Angeles it is still October');
select pg_temp.check(
  (date_trunc('month', timestamptz '2026-11-01 08:00:00+00' at time zone 'America/Los_Angeles')
     at time zone 'America/Los_Angeles') = timestamptz '2026-11-01 07:00:00+00',
  'and at 1am on 1 November it is November');

-- ---------------------------------------------------------------- the offer, without a session
select set_config('request.jwt.claims', '', true);
select pg_temp.check(not public.claim_pro_offer(), 'no session claims nothing');
select pg_temp.check(not has_function_privilege('anon', 'public.claim_pro_offer()', 'execute'),
  'signed-out callers cannot run the claim');
select pg_temp.check(has_function_privilege('authenticated', 'public.claim_pro_offer()', 'execute'),
  'signed-in callers can');

select pg_temp.check(
  (select count(*) = 1 from pg_indexes where indexname = 'receipts_capture_month_idx'),
  'the month index exists');

rollback;
\echo ALL CHECKS PASSED
