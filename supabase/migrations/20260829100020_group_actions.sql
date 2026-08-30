-- 0020 · Creating groups, adding people, and letting them go
--
-- group_members has a select policy and nothing else. Every write lands here,
-- because each one carries a check no row policy can express: that the caller
-- owns the group, that a person being added is not already in it, that someone
-- leaving does not still owe anybody. A bare insert policy would let any member
-- add any stranger; a bare delete would let someone walk away from a debt.

alter table public.groups
  add column if not exists invite_code text;

create unique index if not exists groups_invite_code_key
  on public.groups (invite_code)
  where invite_code is not null;

-- Same alphabet as a personal code, one character longer. A group link travels
-- further than a personal one — into a group chat, usually — so it is worth
-- the extra place to keep guessing hopeless.
create or replace function public.generate_group_code()
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
    for _ in 1..7 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups where invite_code = v_code);
    v_attempt := v_attempt + 1;
    if v_attempt > 20 then
      raise exception 'could not allocate a group code';
    end if;
  end loop;
  return v_code;
end;
$$;

update public.groups set invite_code = public.generate_group_code() where invite_code is null;

-- --------------------------------------------------------------------------

/*
 * Make a group, and put yourself in it.
 *
 * One call rather than an insert followed by an insert: a group whose creator
 * is not a member is invisible to everyone including its creator, because
 * every policy on it asks is_group_member. Two round trips leave a window
 * where exactly that has happened, and nothing can see the row to fix it.
 */
create or replace function public.create_group(
  p_name           text,
  p_currency       text default 'USD',
  p_simplify_debts boolean default true
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_group public.groups;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into public.groups (name, currency, simplify_debts, created_by, invite_code)
  values (btrim(p_name), coalesce(p_currency, 'USD'), coalesce(p_simplify_debts, true),
          v_user, public.generate_group_code())
  returning * into v_group;

  insert into public.group_members (group_id, user_id, role)
  values (v_group.id, v_user, 'owner');

  return v_group;
end;
$$;

-- --------------------------------------------------------------------------

/*
 * Add somebody.
 *
 * Either a real account — which must be a friend, so a group cannot be used to
 * pull strangers into your ledger — or a placeholder, which is just a name.
 * The placeholder is the case that makes this app usable: you add your flatmate
 * tonight and they install Skip on Thursday.
 */
create or replace function public.add_group_member(
  p_group_id     uuid,
  p_user_id      uuid default null,
  p_display_name text default null
)
returns public.group_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_member public.group_members;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'That group is not yours to add to.';
  end if;

  if p_user_id is null and nullif(btrim(coalesce(p_display_name, '')), '') is null then
    raise exception 'Give the person a name.';
  end if;

  if p_user_id is not null then
    if p_user_id <> v_user and not public.are_friends(p_user_id) then
      raise exception 'You can only add friends to a group.';
    end if;

    if exists (
      select 1 from public.group_members
       where group_id = p_group_id and user_id = p_user_id
    ) then
      raise exception 'They are already in this group.';
    end if;
  end if;

  insert into public.group_members (group_id, user_id, display_name)
  values (p_group_id, p_user_id, nullif(btrim(coalesce(p_display_name, '')), ''))
  returning * into v_member;

  return v_member;
end;
$$;

-- --------------------------------------------------------------------------

/*
 * Join a group from its code, optionally taking over a placeholder.
 *
 * The claim is the delicate part, and it is delicate in two ways.
 *
 * Because splits point at group_members.id rather than at a user id, taking
 * over a placeholder is usually a single update: the row gains a user_id and
 * every share already attached to it follows. Nothing is rewritten, so nothing
 * can be half-rewritten.
 *
 * Unless the joiner is somehow already a member under their own row, in which
 * case there are two identities to merge and the splits genuinely do have to
 * be repointed. That happens inside this one transaction, with the placeholder
 * locked, so two people opening the same link at once cannot both take it.
 */
create or replace function public.join_group_by_code(
  p_code              text,
  p_claim_member_id   uuid default null
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user        uuid := auth.uid();
  v_group       public.groups;
  v_placeholder public.group_members;
  v_existing    uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_group
    from public.groups
   where invite_code = public.normalise_invite_code(p_code)
     and archived_at is null;

  if v_group.id is null then
    raise exception 'That group link is not valid.';
  end if;

  select id into v_existing
    from public.group_members
   where group_id = v_group.id and user_id = v_user;

  if p_claim_member_id is not null then
    select * into v_placeholder
      from public.group_members
     where id = p_claim_member_id and group_id = v_group.id
     for update;

    if v_placeholder.id is null then
      raise exception 'That person is not in this group.';
    end if;

    -- Locked and re-checked: between the list being drawn and this call, some
    -- one else may have taken the same placeholder.
    if v_placeholder.user_id is not null then
      raise exception 'Somebody has already claimed that name.';
    end if;

    if v_existing is not null then
      -- Already here under our own row. Move the placeholder's history across
      -- and retire it, rather than leaving the group with two of us in it.
      update public.expense_splits set member_id = v_existing where member_id = v_placeholder.id;
      update public.expenses        set paid_by  = v_existing where paid_by  = v_placeholder.id;
      update public.settlements     set from_member = v_existing where from_member = v_placeholder.id;
      update public.settlements     set to_member   = v_existing where to_member   = v_placeholder.id;
      delete from public.group_members where id = v_placeholder.id;
      return v_group;
    end if;

    update public.group_members
       set user_id = v_user, joined_at = now()
     where id = v_placeholder.id;

    return v_group;
  end if;

  if v_existing is not null then
    return v_group;
  end if;

  insert into public.group_members (group_id, user_id)
  values (v_group.id, v_user);

  return v_group;
end;
$$;

-- --------------------------------------------------------------------------

/*
 * Leave, or remove somebody.
 *
 * Refused while the balance is not zero, with the amount named — "settle up
 * $42.50 first" is a fact someone can act on, where "cannot leave group" is a
 * wall. Being square is the only condition; who is owed and who owes does not
 * change the answer.
 */
create or replace function public.remove_group_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_member  public.group_members;
  v_balance numeric(14,2);
  v_owners  integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_member from public.group_members where id = p_member_id for update;
  if v_member.id is null then
    raise exception 'They are not in this group.';
  end if;

  -- Removing yourself is leaving. Removing anyone else needs to be the owner.
  if v_member.user_id is distinct from v_user and not public.is_group_admin(v_member.group_id) then
    raise exception 'Only the group owner can remove someone.';
  end if;

  select balance into v_balance from public.group_balances where member_id = p_member_id;

  if coalesce(v_balance, 0) <> 0 then
    raise exception 'There is % outstanding — settle up before leaving.', abs(v_balance);
  end if;

  if v_member.role = 'owner' then
    select count(*) into v_owners
      from public.group_members
     where group_id = v_member.group_id and role = 'owner';
    if v_owners <= 1 then
      raise exception 'Make somebody else the owner first, or archive the group.';
    end if;
  end if;

  delete from public.group_members where id = p_member_id;
end;
$$;

-- --------------------------------------------------------------------------

revoke all on function public.generate_group_code() from public, anon;
revoke all on function public.create_group(text, text, boolean) from public, anon;
revoke all on function public.add_group_member(uuid, uuid, text) from public, anon;
revoke all on function public.join_group_by_code(text, uuid) from public, anon;
revoke all on function public.remove_group_member(uuid) from public, anon;

grant execute on function public.create_group(text, text, boolean) to authenticated;
grant execute on function public.add_group_member(uuid, uuid, text) to authenticated;
grant execute on function public.join_group_by_code(text, uuid) to authenticated;
grant execute on function public.remove_group_member(uuid) to authenticated;
