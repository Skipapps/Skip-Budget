-- 0017 · Groups, and the people in them who have not joined yet
--
-- A group is the container a shared expense hangs off. Two things about it are
-- less obvious than they look.
--
-- First, a member does not have to be a Skip account. You add your flatmate to
-- the flat tonight; they install the app on Thursday. If the app cannot hold a
-- person who is not yet a user, it is unusable for exactly the case people
-- reach for it — so `user_id` is nullable and a name stands in until then.
--
-- Second, the currency belongs to the group rather than to each expense.
-- Mixing currencies inside one balance means holding exchange rates, and rates
-- move, which means a debt that changes size on its own. One currency per
-- group, fixed once money has been recorded against it.

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 1 and 60),
  currency    text not null default 'USD',
  created_by  uuid not null references auth.users (id) on delete restrict,

  -- Whether to collapse chains before showing who pays whom: A owes B, B owes
  -- C becomes A owes C. Fewer payments, but it asks people to settle with
  -- someone they never ate with, so it is a preference rather than a default.
  simplify_debts boolean not null default true,

  -- Groups are closed, never deleted. A holiday that ended still has to answer
  -- what everyone paid, and the row is what other people's balances refer to.
  archived_at timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,

  -- Null while this is a placeholder for someone who has not joined.
  user_id      uuid references auth.users (id) on delete cascade,

  -- What to call them. Set for a placeholder; also kept for a real member as
  -- the name used inside this group, so a shared holiday can say "Dad".
  display_name text,

  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),

  -- Somebody has to be nameable, or the row cannot be drawn.
  constraint group_members_identity
    check (user_id is not null or nullif(btrim(coalesce(display_name, '')), '') is not null)
);

-- One membership per account per group. Partial, because placeholders all have
-- a null user_id and nulls do not collide.
create unique index if not exists group_members_one_per_user
  on public.group_members (group_id, user_id)
  where user_id is not null;

create index if not exists group_members_by_group on public.group_members (group_id);
create index if not exists group_members_by_user  on public.group_members (user_id);

alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

drop trigger if exists groups_set_updated_at on public.groups;
create trigger groups_set_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- The helper the whole feature leans on
-- --------------------------------------------------------------------------
--
-- Read the note in 0015 for why this is a function rather than a subquery in
-- each policy. In short: the policy below is applied TO group_members and asks
-- ABOUT group_members, and only a security definer function stops Postgres
-- refusing that as infinite recursion.

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.group_members
     where group_id = p_group_id
       and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.group_members
     where group_id = p_group_id
       and user_id = auth.uid()
       and role = 'owner'
  );
$$;

-- Now that groups exist, seeing someone's name extends to the people you share
-- one with — you cannot split a bill with a row of blanks. Still not everyone:
-- a stranger in another group remains invisible.
create or replace function public.can_see_profile(p_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() = p_id
      or public.are_friends(p_id)
      or exists (
           select 1
             from public.group_members mine
             join public.group_members theirs on theirs.group_id = mine.group_id
            where mine.user_id = auth.uid()
              and theirs.user_id = p_id
         );
$$;

-- --------------------------------------------------------------------------
-- Policies
-- --------------------------------------------------------------------------

drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member" on public.groups
  for select using (public.is_group_member(id));

-- Creating a group is allowed for anyone; the creator is added as its owner in
-- the same transaction by create_group, which is what makes the row visible.
drop policy if exists "groups_insert_self" on public.groups;
create policy "groups_insert_self" on public.groups
  for insert with check (auth.uid() = created_by);

drop policy if exists "groups_update_admin" on public.groups;
create policy "groups_update_admin" on public.groups
  for update using (public.is_group_admin(id)) with check (public.is_group_admin(id));

-- No delete policy. Archiving is the only way out, so that a closed holiday
-- cannot take other people's history with it.

drop policy if exists "group_members_select_member" on public.group_members;
create policy "group_members_select_member" on public.group_members
  for select using (public.is_group_member(group_id));

-- Adding and removing people runs through functions that check the caller is
-- an owner and that a leaving member is square. A bare insert policy would let
-- anyone add anyone, and a bare delete would let someone walk away from a debt.

revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.is_group_admin(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_admin(uuid) to authenticated;
