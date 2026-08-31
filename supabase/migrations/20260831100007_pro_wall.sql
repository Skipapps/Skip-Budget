-- 0007 · The wall between Free and Pro
--
-- One table holds the truth, written only by the RevenueCat webhook: whether
-- this account pays. Everything else — the row limits, the gated features —
-- derives from is_pro() at the moment it is asked, so an entitlement change
-- never touches a row of data. Dropping Pro locks doors; it deletes nothing.
--
-- The limits are enforced here, not only in the app. A client is convenience;
-- the database is the wall, and a patched client changes nothing. The checks
-- run on INSERT alone, deliberately: accounts that already hold more than the
-- free allowance keep every row they have — the wall stops new bricks, it
-- does not pull old ones out.

create table if not exists public.entitlements (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  pro        boolean not null default false,
  product_id text,
  -- When the current paid period runs out. Honoured directly, so a missed
  -- expiry webhook self-heals instead of leaving somebody Pro forever.
  expires_at timestamptz,
  environment text,
  will_renew boolean,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own" on public.entitlements
  for select using (auth.uid() = user_id);
-- No insert or update policy: the webhook writes with the service role, and
-- nothing a phone can say should change what it is entitled to.

/** Whether this account pays, right now. The only question the wall asks. */
create or replace function public.is_pro(p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.entitlements
     where user_id = p_user
       and pro
       and (expires_at is null or expires_at > now())
  );
$$;

revoke all on function public.is_pro(uuid) from public, anon;
grant execute on function public.is_pro(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- The free allowance: one card, one account, one income
-- --------------------------------------------------------------------------

create or replace function public.enforce_free_allowance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if public.is_pro(new.user_id) then
    return new;
  end if;

  execute format('select count(*) from public.%I where user_id = $1', tg_table_name)
    into v_count using new.user_id;

  if v_count >= 1 then
    raise exception 'Free keeps one — Skip Pro removes the limit.';
  end if;

  return new;
end;
$$;

drop trigger if exists cards_free_allowance on public.cards;
create trigger cards_free_allowance
  before insert on public.cards
  for each row execute function public.enforce_free_allowance();

drop trigger if exists bank_accounts_free_allowance on public.bank_accounts;
create trigger bank_accounts_free_allowance
  before insert on public.bank_accounts
  for each row execute function public.enforce_free_allowance();

drop trigger if exists salary_sources_free_allowance on public.salary_sources;
create trigger salary_sources_free_allowance
  before insert on public.salary_sources
  for each row execute function public.enforce_free_allowance();

-- Beyond-allowance rows that survive a downgrade are locked, not lost: the
-- oldest stays editable and the rest refuse edits until Pro returns. Deletes
-- stay allowed on purpose — pruning down to the free allowance is the one
-- move a lapsed account should always have.
create or replace function public.enforce_lock_on_extras()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oldest uuid;
begin
  if public.is_pro(new.user_id) then
    return new;
  end if;

  execute format(
    'select id from public.%I where user_id = $1 order by created_at, id limit 1',
    tg_table_name
  ) into v_oldest using new.user_id;

  if new.id is distinct from v_oldest then
    raise exception 'This one is locked on the free plan — Skip Pro unlocks it.';
  end if;

  return new;
end;
$$;

drop trigger if exists cards_lock_extras on public.cards;
create trigger cards_lock_extras
  before update on public.cards
  for each row execute function public.enforce_lock_on_extras();

drop trigger if exists bank_accounts_lock_extras on public.bank_accounts;
create trigger bank_accounts_lock_extras
  before update on public.bank_accounts
  for each row execute function public.enforce_lock_on_extras();

drop trigger if exists salary_sources_lock_extras on public.salary_sources;
create trigger salary_sources_lock_extras
  before update on public.salary_sources
  for each row execute function public.enforce_lock_on_extras();

-- --------------------------------------------------------------------------
-- Scanning is Pro
-- --------------------------------------------------------------------------
--
-- A receipt typed by hand is free forever. One that arrived through the
-- camera or a file is the paid feature, and the row says which it was.

create or replace function public.enforce_scan_is_pro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source in ('scan', 'upload') and not public.is_pro(new.user_id) then
    raise exception 'Scanning receipts is part of Skip Pro.';
  end if;
  return new;
end;
$$;

drop trigger if exists receipts_scan_is_pro on public.receipts;
create trigger receipts_scan_is_pro
  before insert on public.receipts
  for each row execute function public.enforce_scan_is_pro();

-- --------------------------------------------------------------------------
-- The split manager is Pro
-- --------------------------------------------------------------------------
--
-- Writes only. Reading stays open so a lapsed member's groups remain intact
-- for everyone else, and so their own history is still theirs to see the day
-- they return. The client routes free users to the explainer before any of
-- these could be called; this is for the client that lies.

create or replace function public.assert_pro(p_feature text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_pro(auth.uid()) then
    raise exception '% is part of Skip Pro.', p_feature;
  end if;
end;
$$;

revoke all on function public.assert_pro(text) from public, anon;
grant execute on function public.assert_pro(text) to authenticated;
