-- 0021 · Recording an expense, in one transaction
--
-- An expense and its shares have to be written together. supabase-js sends
-- each call as its own transaction, so an insert followed by an insert leaves a
-- moment where the expense exists split by nobody — and if the second call
-- fails, it stays that way. Worse, the shares can only be judged once they are
-- all present: inserting three of them one at a time is unbalanced until the
-- third, and the constraint would reject the first.
--
-- So both go through here. The deferred trigger from 0018 fires once, at
-- commit, when there is a complete picture to judge.

/*
 * The currency of a group stops being editable the moment money is recorded
 * against it. Changing it later would not convert anything — it would silently
 * relabel every existing amount, turning a $40 debt into a £40 one.
 */
create or replace function public.lock_group_currency()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.currency is distinct from old.currency
     and exists (select 1 from public.expenses where group_id = old.id) then
    raise exception 'This group already has expenses in %, so its currency cannot change.', old.currency;
  end if;
  return new;
end;
$$;

drop trigger if exists groups_lock_currency on public.groups;
create trigger groups_lock_currency
  before update of currency on public.groups
  for each row execute function public.lock_group_currency();

-- --------------------------------------------------------------------------

/*
 * Add an expense and everyone's share of it.
 *
 * p_shares is [{"member_id": "...", "share": 12.34}, ...] and must add up to
 * p_amount — enforced at commit, not here, so the message people see comes from
 * the one check that cannot be gone around.
 *
 * The app works out the shares because that is where the exact-cents maths
 * already lives, tested, in split.ts. This does not second-guess the split; it
 * checks that every member belongs to the group and that the total is honest.
 */
create or replace function public.record_expense(
  p_group_id    uuid,
  p_paid_by     uuid,
  p_amount      numeric,
  p_description text,
  p_shares      jsonb,
  p_spent_on    date default current_date,
  p_split_mode  text default 'equal',
  p_category_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_expense_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'That group is not yours.';
  end if;

  if jsonb_typeof(p_shares) <> 'array' or jsonb_array_length(p_shares) = 0 then
    raise exception 'An expense has to be split between somebody.';
  end if;

  if not exists (
    select 1 from public.group_members where id = p_paid_by and group_id = p_group_id
  ) then
    raise exception 'Whoever paid has to be in the group.';
  end if;

  -- Checked before the insert so the error names the real problem, rather than
  -- surfacing later as a foreign key violation nobody can read.
  if exists (
    select 1 from jsonb_array_elements(p_shares) s
     where not exists (
       select 1 from public.group_members m
        where m.id = (s ->> 'member_id')::uuid and m.group_id = p_group_id
     )
  ) then
    raise exception 'Somebody in that split is not in the group.';
  end if;

  insert into public.expenses (
    group_id, paid_by, amount, description, spent_on, split_mode, category_id, created_by
  )
  values (
    p_group_id, p_paid_by, p_amount, btrim(p_description),
    coalesce(p_spent_on, current_date), coalesce(p_split_mode, 'equal'),
    p_category_id, v_user
  )
  returning id into v_expense_id;

  insert into public.expense_splits (expense_id, member_id, share)
  select v_expense_id, (s ->> 'member_id')::uuid, (s ->> 'share')::numeric
    from jsonb_array_elements(p_shares) s;

  return v_expense_id;
end;
$$;

-- --------------------------------------------------------------------------

/*
 * Correct one.
 *
 * The splits are replaced wholesale rather than diffed. Deleting them all and
 * writing the new set inside one transaction is both simpler and safer than
 * working out which rows moved — and the deferred constraint means the moment
 * in the middle, where the expense has no shares at all, is never observed.
 */
create or replace function public.update_expense(
  p_expense_id  uuid,
  p_paid_by     uuid,
  p_amount      numeric,
  p_description text,
  p_shares      jsonb,
  p_spent_on    date default current_date,
  p_split_mode  text default 'equal',
  p_category_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_group_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select group_id into v_group_id
    from public.expenses
   where id = p_expense_id and deleted_at is null;

  if v_group_id is null then
    raise exception 'That expense is no longer there.';
  end if;

  if not public.is_group_member(v_group_id) then
    raise exception 'That expense is not yours.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_shares) s
     where not exists (
       select 1 from public.group_members m
        where m.id = (s ->> 'member_id')::uuid and m.group_id = v_group_id
     )
  ) then
    raise exception 'Somebody in that split is not in the group.';
  end if;

  delete from public.expense_splits where expense_id = p_expense_id;

  update public.expenses
     set paid_by     = p_paid_by,
         amount      = p_amount,
         description = btrim(p_description),
         spent_on    = coalesce(p_spent_on, current_date),
         split_mode  = coalesce(p_split_mode, 'equal'),
         category_id = p_category_id
   where id = p_expense_id;

  insert into public.expense_splits (expense_id, member_id, share)
  select p_expense_id, (s ->> 'member_id')::uuid, (s ->> 'share')::numeric
    from jsonb_array_elements(p_shares) s;
end;
$$;

-- --------------------------------------------------------------------------

/* Soft, so that everyone else's balance keeps the history it was built on. */
create or replace function public.delete_expense(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select group_id into v_group_id from public.expenses where id = p_expense_id;
  if v_group_id is null or not public.is_group_member(v_group_id) then
    raise exception 'That expense is not yours.';
  end if;

  update public.expenses set deleted_at = now() where id = p_expense_id and deleted_at is null;
end;
$$;

-- --------------------------------------------------------------------------

/*
 * Write down that a debt was paid.
 *
 * No money moves. Skip has no bank connection, and this is a note that cash,
 * or a bank transfer, or a pint, changed hands somewhere else.
 */
create or replace function public.record_settlement(
  p_group_id    uuid,
  p_from_member uuid,
  p_to_member   uuid,
  p_amount      numeric,
  p_settled_on  date default current_date,
  p_note        text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'That group is not yours.';
  end if;

  if p_from_member = p_to_member then
    raise exception 'A payment needs two different people.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter how much was paid.';
  end if;

  if (select count(*) from public.group_members
       where id in (p_from_member, p_to_member) and group_id = p_group_id) <> 2 then
    raise exception 'Both people have to be in the group.';
  end if;

  insert into public.settlements (
    group_id, from_member, to_member, amount, settled_on, note, created_by
  )
  values (
    p_group_id, p_from_member, p_to_member, p_amount,
    coalesce(p_settled_on, current_date), nullif(btrim(coalesce(p_note, '')), ''), v_user
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- --------------------------------------------------------------------------

revoke all on function public.record_expense(uuid, uuid, numeric, text, jsonb, date, text, text) from public, anon;
revoke all on function public.update_expense(uuid, uuid, numeric, text, jsonb, date, text, text) from public, anon;
revoke all on function public.delete_expense(uuid) from public, anon;
revoke all on function public.record_settlement(uuid, uuid, uuid, numeric, date, text) from public, anon;

grant execute on function public.record_expense(uuid, uuid, numeric, text, jsonb, date, text, text) to authenticated;
grant execute on function public.update_expense(uuid, uuid, numeric, text, jsonb, date, text, text) to authenticated;
grant execute on function public.delete_expense(uuid) to authenticated;
grant execute on function public.record_settlement(uuid, uuid, uuid, numeric, date, text) to authenticated;
