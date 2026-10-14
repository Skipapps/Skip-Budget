-- 20261013100002 · A free scan stays used when its receipt is deleted
--
-- Free reads 15 receipts a month by camera and 15 by upload (20261007100001).
-- The count was of this month's receipts saved that way, so deleting a scanned
-- receipt gave its scan back. Each receipt read that way now leaves a usage row
-- of its own, written by the database when the receipt is saved, and the count
-- reads those. Deleting the receipt leaves its usage row (receipt_id goes null).
--
-- Nobody writes or removes a usage row through the API: the owner may read
-- theirs, so the app can say how many are left, and nothing else.
--
-- A scan that read nothing is saved by the app as a typed receipt, so it leaves
-- no usage row. The database cannot tell what the camera read; it counts what
-- arrives as a scan or an upload, as before.
--
-- Pro is unchanged: no limit. Its scans are written down too, as they were
-- counted before, so the month a Pro plan lapses counts what was read in it.
--
-- Re-run safe.

create table if not exists public.capture_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  source     public.capture_source not null check (source in ('scan', 'upload')),
  receipt_id uuid references public.receipts (id) on delete set null,
  -- The receipt's own created_at: the server stamps a free one (enforce_scan_is_pro)
  -- and receipts_keep_origin keeps it, so it is the time the allowance counts.
  created_at timestamptz not null default now()
);

-- One usage row per receipt read, so the back-fill below can run twice.
create unique index if not exists capture_usage_one_per_receipt
  on public.capture_usage (receipt_id)
  where receipt_id is not null;

create index if not exists capture_usage_month_idx
  on public.capture_usage (user_id, source, created_at);

alter table public.capture_usage enable row level security;

drop policy if exists "capture_usage_select_own" on public.capture_usage;
create policy "capture_usage_select_own" on public.capture_usage
  for select using (auth.uid() = user_id);

revoke all on public.capture_usage from anon, authenticated;
grant select on public.capture_usage to authenticated;
grant all on public.capture_usage to service_role;

-- --------------------------------------------------------------------------
-- Every receipt read by camera or upload leaves its usage row
-- --------------------------------------------------------------------------

create or replace function public.record_capture_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source in ('scan', 'upload') then
    insert into public.capture_usage (user_id, source, receipt_id, created_at)
    values (new.user_id, new.source, new.id, new.created_at);
  end if;
  return null;
end;
$$;

revoke all on function public.record_capture_usage() from public, anon, authenticated;

-- After insert only: receipts_keep_origin stops an edit changing how a receipt
-- arrived, so an update can never make a typed receipt a scan.
drop trigger if exists receipts_record_capture on public.receipts;
create trigger receipts_record_capture
  after insert on public.receipts
  for each row execute function public.record_capture_usage();

-- --------------------------------------------------------------------------
-- The allowance counts usage rows
-- --------------------------------------------------------------------------
--
-- As 20261007100001, with only the count changed.

create or replace function public.enforce_scan_is_pro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_zone  text;
  v_start timestamptz;
  v_used  integer;
begin
  if new.source not in ('scan', 'upload', 'voice') or public.is_pro(new.user_id) then
    return new;
  end if;

  if new.source = 'voice' then
    raise exception 'Adding receipts by voice is part of Skip Pro.';
  end if;

  select timezone into v_zone from public.profiles where id = new.user_id;
  begin
    v_start := date_trunc('month', now() at time zone coalesce(v_zone, 'UTC'))
               at time zone coalesce(v_zone, 'UTC');
  exception when invalid_parameter_value then
    v_start := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
  end;

  -- Two saves at once must not both take the last place.
  perform pg_advisory_xact_lock(hashtextextended('capture-allowance:' || new.user_id::text, 0));

  select count(*) into v_used
    from public.capture_usage
   where user_id = new.user_id
     and source = new.source
     and created_at >= v_start;

  if v_used >= 15 then
    if new.source = 'scan' then
      raise exception 'Scanning more than 15 receipts a month is part of Skip Pro.';
    end if;
    raise exception 'Uploading more than 15 receipts a month is part of Skip Pro.';
  end if;

  -- The count reads created_at, so a free row is stamped by the server, never backdated by a phone.
  new.created_at := now();
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- The receipts already read count as before
-- --------------------------------------------------------------------------
--
-- Scans deleted before today are not known any more, so this month's count can
-- only start from the receipts still kept: the same figure the old count gave.

insert into public.capture_usage (user_id, source, receipt_id, created_at)
select r.user_id, r.source, r.id, r.created_at
  from public.receipts r
 where r.source in ('scan', 'upload')
   and not exists (select 1 from public.capture_usage u where u.receipt_id = r.id);
