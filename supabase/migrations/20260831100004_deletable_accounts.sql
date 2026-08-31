-- 0004 · Deleting an account that other people's history refers to
--
-- Deletion was failing before it began: the function opened by deleting the
-- caller's receipt images from storage.objects, and Supabase now refuses SQL
-- against its storage tables outright — "use the Storage API instead" — even
-- when zero rows would match. The line was written for images this app no
-- longer stores at all: receipts are read on the device and the photo is
-- thrown away, so there has never been anything under that folder to delete.
-- It is simply gone.
--
-- Behind that error sat a real one. The split tables reference the user with
-- `on delete restrict` — created_by on groups, expenses and settlements — so
-- the moment somebody had used splits, deleting auth.users would be refused.
-- Cascading instead would be worse: an expense you paid is your groupmates'
-- ledger as much as yours, and deleting it would rewrite their balances to
-- honour your exit.
--
-- So leaving follows the same rule joining did, in reverse. A member who was
-- never on Skip is a name; a member who deletes their account becomes one.
-- Their membership rows lose their user_id and keep a display name, every
-- split already points at the membership row rather than the user and follows
-- untouched, and the groupmates' totals do not move by a cent. What is only
-- theirs — profile, cards, bills, receipts, savings, friendships, tokens —
-- cascades away with the auth row as it always did.

-- created_by is provenance, not ownership (the owner lives on group_members),
-- so it may outlive the account as a null rather than blocking the deletion.
alter table public.groups      alter column created_by drop not null;
alter table public.expenses    alter column created_by drop not null;
alter table public.settlements alter column created_by drop not null;

alter table public.groups      drop constraint if exists groups_created_by_fkey;
alter table public.expenses    drop constraint if exists expenses_created_by_fkey;
alter table public.settlements drop constraint if exists settlements_created_by_fkey;

alter table public.groups      add constraint groups_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;
alter table public.expenses    add constraint expenses_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;
alter table public.settlements add constraint settlements_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_name text;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select nullif(btrim(coalesce(display_name, '')), '')
    into v_name
    from public.profiles
   where id = v_user;

  -- Become a name in every group, so nobody else's ledger moves. The group
  -- nickname wins where one was set; 'Former member' is the floor, because the
  -- identity check requires a placeholder to be called something.
  update public.group_members
     set display_name = coalesce(
           nullif(btrim(coalesce(display_name, '')), ''),
           v_name,
           'Former member'
         ),
         user_id = null,
         role    = 'member'
   where user_id = v_user;

  -- A group this person owned still needs an owner who can actually open it:
  -- the longest-standing remaining member steps up. A group left with only
  -- placeholders gets nobody — no policy can see it again, which is the same
  -- as gone without deleting anyone's numbers.
  update public.group_members m
     set role = 'owner'
   where m.id in (
     select distinct on (gm.group_id) gm.id
       from public.group_members gm
      where gm.user_id is not null
        and not exists (
          select 1 from public.group_members o
           where o.group_id = gm.group_id and o.role = 'owner'
        )
      order by gm.group_id, gm.joined_at
   );

  -- Everything that is only theirs cascades from here: profile, cards, bills,
  -- receipts, subscriptions, loans, charges, savings, friendships, requests,
  -- notices, device tokens.
  delete from auth.users where id = v_user;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
