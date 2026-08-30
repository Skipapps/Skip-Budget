-- 0023 · Telling people something happened to their money
--
-- A queue rather than a push straight from the trigger. Sending inside the
-- transaction would put an HTTP call on the path of every expense anyone adds:
-- slow when Apple is slow, and a failure would roll back the expense itself.
-- Rows go in here instead, and the sender that already runs every quarter hour
-- drains them.
--
-- Nobody is told about their own doing. The person who added the expense knows
-- they added it, and a notification about it is the fastest way to teach
-- someone that Skip's notifications are not worth reading.

create table if not exists public.split_notices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);

-- Only ever read as "not yet sent, oldest first".
create index if not exists split_notices_pending
  on public.split_notices (created_at)
  where sent_at is null;

alter table public.split_notices enable row level security;

drop policy if exists "split_notices_select_own" on public.split_notices;
create policy "split_notices_select_own" on public.split_notices
  for select using (auth.uid() = user_id);

-- --------------------------------------------------------------------------

/** Money as people read it, not as Postgres prints it. */
create or replace function public.money_text(p_amount numeric)
returns text
language sql
immutable
as $$
  select '$' || to_char(round(coalesce(p_amount, 0), 2), 'FM999,999,990.00');
$$;

/** Whatever this member is called: their group name, their profile, or nothing. */
create or replace function public.member_label(p_member_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    nullif(btrim(coalesce(m.display_name, '')), ''),
    nullif(btrim(coalesce(p.display_name, '')), ''),
    'Someone'
  )
  from public.group_members m
  left join public.profiles p on p.id = m.user_id
  where m.id = p_member_id;
$$;

-- --------------------------------------------------------------------------

create or replace function public.notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if new.status <> 'pending' then
    return null;
  end if;

  select coalesce(nullif(btrim(coalesce(display_name, '')), ''), 'Someone')
    into v_name from public.profiles where id = new.from_user;

  insert into public.split_notices (user_id, title, body)
  values (new.to_user, 'Friend request', v_name || ' wants to split bills with you on Skip.');

  return null;
end;
$$;

drop trigger if exists friend_requests_notify on public.friend_requests;
create trigger friend_requests_notify
  after insert on public.friend_requests
  for each row execute function public.notify_friend_request();

-- --------------------------------------------------------------------------

create or replace function public.notify_added_to_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
begin
  -- A placeholder has nobody to tell, and the person who made the group does
  -- not need telling they are in it.
  if new.user_id is null or new.user_id = auth.uid() then
    return null;
  end if;

  select name into v_group from public.groups where id = new.group_id;

  insert into public.split_notices (user_id, title, body)
  values (new.user_id, v_group, 'You have been added to this group on Skip.');

  return null;
end;
$$;

drop trigger if exists group_members_notify on public.group_members;
create trigger group_members_notify
  after insert on public.group_members
  for each row execute function public.notify_added_to_group();

-- --------------------------------------------------------------------------

create or replace function public.notify_group_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
  v_payer text;
begin
  select name into v_group from public.groups where id = new.group_id;
  v_payer := public.member_label(new.paid_by);

  insert into public.split_notices (user_id, title, body)
  select m.user_id,
         v_group,
         v_payer || ' added ' || new.description || ' · ' || public.money_text(new.amount)
    from public.group_members m
   where m.group_id = new.group_id
     and m.user_id is not null
     -- Not the person who typed it in.
     and m.user_id <> new.created_by;

  return null;
end;
$$;

drop trigger if exists expenses_notify on public.expenses;
create trigger expenses_notify
  after insert on public.expenses
  for each row execute function public.notify_group_expense();

-- --------------------------------------------------------------------------

create or replace function public.notify_settlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
begin
  select name into v_group from public.groups where id = new.group_id;

  -- Only the two people it is actually about, and only if they did not record
  -- it themselves. A group of nine does not need to hear about every pair.
  insert into public.split_notices (user_id, title, body)
  select m.user_id,
         v_group,
         public.member_label(new.from_member) || ' paid ' ||
         public.member_label(new.to_member) || ' ' || public.money_text(new.amount)
    from public.group_members m
   where m.id in (new.from_member, new.to_member)
     and m.user_id is not null
     and m.user_id <> new.created_by;

  return null;
end;
$$;

drop trigger if exists settlements_notify on public.settlements;
create trigger settlements_notify
  after insert on public.settlements
  for each row execute function public.notify_settlement();

-- --------------------------------------------------------------------------

/*
 * What the sender should deliver.
 *
 * Capped, because a first run after an outage should not try to hand Apple a
 * thousand notices at once — the rest keep until the next quarter hour.
 *
 * Anything older than a day is dropped rather than sent. A notification about
 * an expense from last Tuesday is not news, and arriving late is worse than
 * not arriving.
 */
create or replace function public.split_notices_due()
returns table (notice_id uuid, user_id uuid, title text, body text)
language sql
security definer
set search_path = public
as $$
  delete from public.split_notices
   where sent_at is null and created_at < now() - interval '1 day';

  select n.id, n.user_id, n.title, n.body
    from public.split_notices n
   where n.sent_at is null
   order by n.created_at
   limit 200;
$$;

revoke all on function public.split_notices_due() from public, anon, authenticated;
revoke all on function public.member_label(uuid) from public, anon;
grant execute on function public.member_label(uuid) to authenticated;
