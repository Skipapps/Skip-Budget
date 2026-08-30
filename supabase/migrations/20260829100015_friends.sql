-- 0015 · The people, before anything they share
--
-- Everything in Skip so far belongs to exactly one account, and every policy
-- says so: `auth.uid() = user_id`, on every table. Splitting a bill breaks that
-- assumption — two accounts have to read one row and agree about it — so this
-- migration builds the part that decides who may see whom, and nothing else.
--
-- It comes first deliberately. The access rules are the hardest thing here to
-- change later, because every table added afterwards writes policies against
-- them. Getting them wrong is not a bug you fix in one place.

-- --------------------------------------------------------------------------
-- Invite codes
-- --------------------------------------------------------------------------
--
-- How one person reaches another without the app becoming a directory.
--
-- The alternative — look someone up by email — quietly hands anyone a way to
-- test addresses against the user list one at a time and learn who has an
-- account. A code is different: it only works if its owner chose to share it,
-- so there is no lookup to abuse and nothing to enumerate.

alter table public.profiles
  add column if not exists invite_code text,
  -- Off means the code stops working. Somewhere to turn when a code has been
  -- shared further than intended, short of deleting the account.
  add column if not exists discoverable boolean not null default true;

create unique index if not exists profiles_invite_code_key
  on public.profiles (invite_code)
  where invite_code is not null;

-- No 0/O, no 1/I/L. A code gets read off a screen and typed into another
-- phone, and those are the characters that turn into support requests.
-- Thirty characters over six places is 729 million codes, which is enough
-- that collisions stay theoretical rather than a thing to design around.
create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_code text;
  v_attempt integer := 0;
begin
  loop
    v_code := '';
    for _ in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;

    -- Cheaper than catching the unique violation, and the loop has to exist
    -- anyway for the case where it does collide.
    exit when not exists (select 1 from public.profiles where invite_code = v_code);

    v_attempt := v_attempt + 1;
    if v_attempt > 20 then
      raise exception 'could not allocate an invite code';
    end if;
  end loop;

  return v_code;
end;
$$;

-- Backfill before the not-null-ish expectations downstream: every profile that
-- already exists needs a code, or those accounts can never be added by anyone.
update public.profiles
   set invite_code = public.generate_invite_code()
 where invite_code is null;

-- New accounts get one at signup, in the same trigger that creates the profile
-- so there is never a moment where a profile exists without a way to reach it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, invite_code)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    public.generate_invite_code()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- Friendships
-- --------------------------------------------------------------------------
--
-- One row per pair, never two.
--
-- The obvious model — a row per direction — means a friendship can half-exist:
-- A lists B, B does not list A, and every query has to decide which one is
-- authoritative. Storing the pair with the lower uuid first makes that state
-- unrepresentable, and turns "are these two friends" into one indexed lookup
-- instead of an or.

create table if not exists public.friendships (
  user_a     uuid not null references auth.users (id) on delete cascade,
  user_b     uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (user_a, user_b),
  constraint friendships_ordered check (user_a < user_b)
);

-- The primary key covers lookups from user_a; this covers the other direction.
create index if not exists friendships_user_b_idx on public.friendships (user_b);

alter table public.friendships enable row level security;

-- --------------------------------------------------------------------------
-- Requests
-- --------------------------------------------------------------------------
--
-- Kept separate from friendships rather than modelled as a pending row on it,
-- because a declined request is a fact worth keeping: it is what stops the
-- same person asking every day, and a friendship table holding non-friends is
-- a table that lies about its own name.

create table if not exists public.friend_requests (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null references auth.users (id) on delete cascade,
  to_user      uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,

  constraint friend_requests_not_self check (from_user <> to_user)
);

-- One live request per direction. Partial, so a declined request does not stop
-- a later genuine one — people do change their minds.
create unique index if not exists friend_requests_one_pending
  on public.friend_requests (from_user, to_user)
  where status = 'pending';

create index if not exists friend_requests_inbox
  on public.friend_requests (to_user, status);

alter table public.friend_requests enable row level security;

-- --------------------------------------------------------------------------
-- The helpers every later policy is built on
-- --------------------------------------------------------------------------
--
-- These exist to break a loop that is otherwise unavoidable.
--
-- The natural policy for a shared table reads the table it is protecting —
-- "you may see members of groups you are a member of" queries group_members
-- from group_members' own policy. Postgres detects that and fails every query
-- against the table with `infinite recursion detected in policy`.
--
-- A security definer function runs as its owner, so it is not subject to the
-- policy it is being used to define, and the loop never forms. `stable` matters
-- as much as the rest: it lets Postgres evaluate the function once per
-- statement rather than once per row, which on a group with a hundred expenses
-- is the difference between one lookup and a hundred.

create or replace function public.are_friends(p_other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.friendships
     where user_a = least(auth.uid(), p_other)
       and user_b = greatest(auth.uid(), p_other)
  );
$$;

-- Replaced in a later migration once groups exist, to include the people you
-- share one with. Friends-only until then, which is all there is to share.
create or replace function public.can_see_profile(p_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() = p_id or public.are_friends(p_id);
$$;

-- --------------------------------------------------------------------------
-- Policies
-- --------------------------------------------------------------------------

-- Was own-row-only. A name and an avatar have to be readable by the people you
-- actually share money with, and by nobody else — not the whole user base,
-- which is what dropping the check entirely would mean.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_visible" on public.profiles;
create policy "profiles_select_visible" on public.profiles
  for select using (public.can_see_profile(id));

drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own" on public.friendships
  for select using (auth.uid() = user_a or auth.uid() = user_b);

-- No insert or update policy, deliberately. A friendship is only ever created
-- by accepting a request, which happens inside a function that has already
-- checked the request was addressed to the caller. Leaving the table writable
-- would let anyone add themselves to anyone.
drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own" on public.friendships
  for delete using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "friend_requests_select_own" on public.friend_requests;
create policy "friend_requests_select_own" on public.friend_requests
  for select using (auth.uid() = from_user or auth.uid() = to_user);

-- Withdrawing a request you sent. Responding to one goes through the function.
drop policy if exists "friend_requests_delete_sent" on public.friend_requests;
create policy "friend_requests_delete_sent" on public.friend_requests
  for delete using (auth.uid() = from_user and status = 'pending');

revoke execute on function public.generate_invite_code() from public, anon;
revoke execute on function public.are_friends(uuid) from public, anon;
revoke execute on function public.can_see_profile(uuid) from public, anon;
grant execute on function public.are_friends(uuid) to authenticated;
grant execute on function public.can_see_profile(uuid) to authenticated;
