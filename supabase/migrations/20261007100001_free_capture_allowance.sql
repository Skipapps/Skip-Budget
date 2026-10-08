-- 20261007100001 · Free reads 15 receipts a month by camera and 15 by upload
--
-- Scanning was Pro outright (20260831100007; voice joined it in
-- 20261001100002). Free now reads up to 15 receipts a month with the camera
-- and, counted apart, up to 15 from a photo or a file; Pro has no limit.
-- Voice stays Pro. Typing a receipt stays free and is never counted.
--
-- The month is the person's own calendar month (profiles.timezone, which the
-- phone writes), so the allowance turns over at their midnight on the 1st,
-- when the app says it does. A missing or unknown zone falls back to UTC.
--
-- Same function, same trigger (receipts_scan_is_pro, BEFORE INSERT only), so
-- a receipt already on the books stays editable on any plan: the wall gates
-- verbs, not nouns (20260928100001); an edit cannot change how a receipt
-- arrived or when (receipts_keep_origin, below). Every refusal says "part of Skip Pro",
-- which is how the app tells the wall from a failure (src/lib/pro-refusal.ts).
--
-- Order: this goes live before the app build that lets free accounts scan.
-- Older builds still keep free accounts away from the camera, so nothing
-- that is already installed changes.

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

  -- The source list repeats the partial index's own predicate, so the index is always usable.
  select count(*) into v_used
    from public.receipts
   where user_id = new.user_id
     and source = new.source
     and source in ('scan', 'upload')
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

-- How a receipt arrived and when it was saved are facts about its creation:
-- an edit keeps both. Otherwise an edit could move this month's scans into
-- last month, or relabel a typed receipt, and free the allowance. Every
-- update is held to this, a data fix included: a migration that must change
-- either column disables receipts_keep_origin around its update.
create or replace function public.keep_receipt_origin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.source := old.source;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists receipts_keep_origin on public.receipts;
create trigger receipts_keep_origin
  before update on public.receipts
  for each row execute function public.keep_receipt_origin();

-- The count above runs on every free scan and upload; this keeps it to the
-- month's own rows however long the account's history grows.
create index if not exists receipts_capture_month_idx
  on public.receipts (user_id, source, created_at)
  where source in ('scan', 'upload');

-- --------------------------------------------------------------------------
-- The one-time offer is shown once per account
-- --------------------------------------------------------------------------
--
-- The offer page promises "you won't see this offer again"; this column keeps
-- that true across reinstalls and a second phone.

alter table public.profiles
  add column if not exists pro_offer_seen_at timestamptz;

comment on column public.profiles.pro_offer_seen_at is
  'When the one-time Skip Pro offer was shown. Null = not shown yet.';

-- True the first time it is asked for an account, false ever after: two
-- phones asking at once still get one true between them, because the second
-- UPDATE re-reads the row after the first commits.
create or replace function public.claim_pro_offer()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.profiles
     set pro_offer_seen_at = now()
   where id = auth.uid()
     and pro_offer_seen_at is null;

  return found;
end;
$$;

revoke all on function public.claim_pro_offer() from public, anon;
grant execute on function public.claim_pro_offer() to authenticated;
