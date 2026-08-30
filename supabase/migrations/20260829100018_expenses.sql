-- 0018 · Expenses, shares, and the rule that keeps them adding up
--
-- Two decisions here matter more than the rest of the schema put together.
--
-- 1. Splits point at group_members.id, not at a user id.
--
--    That is what lets a placeholder owe money. It also means claiming a
--    placeholder later is a single update to one member row — every split
--    already points at it and follows automatically, rather than needing a
--    rewrite that could half-succeed.
--
-- 2. The shares are constrained to sum to the total, in the database.
--
--    If they ever stop adding up, every balance downstream is wrong and
--    nothing announces it. Validation in the app is not enough: it protects
--    the paths you remembered, and the one that breaks this will be the path
--    you did not. There is exactly one place that cannot be gone around.

create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,

  -- Who actually put the money in. A member, so a placeholder can pay.
  paid_by     uuid not null references public.group_members (id) on delete restrict,

  -- Always positive. The sign is a presentation concern; mixing signs in the
  -- data is how totals quietly break.
  amount      numeric(14,2) not null check (amount > 0),

  description text not null check (length(btrim(description)) between 1 and 120),
  category_id text,
  spent_on    date not null default current_date,

  split_mode  text not null default 'equal' check (split_mode in ('equal', 'exact')),

  created_by  uuid not null references auth.users (id) on delete restrict,

  -- Soft, always. Someone else's balance refers to this row, and a hard delete
  -- would rewrite their history to tidy yours.
  deleted_at  timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists expenses_by_group on public.expenses (group_id, spent_on desc);

create table if not exists public.expense_splits (
  id         uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  member_id  uuid not null references public.group_members (id) on delete restrict,

  -- What this person owes of this expense. Zero is legitimate: a bill someone
  -- was present for but is not paying towards.
  share      numeric(14,2) not null check (share >= 0),

  constraint expense_splits_one_per_member unique (expense_id, member_id)
);

create index if not exists expense_splits_by_member on public.expense_splits (member_id);

alter table public.expenses       enable row level security;
alter table public.expense_splits enable row level security;

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- The invariant
-- --------------------------------------------------------------------------
--
-- Deferred, so it is judged when the transaction is complete rather than after
-- the first split row lands — inserting three shares one at a time is never
-- balanced until the third.
--
-- numeric is exact decimal in Postgres, so this comparison is exact and no
-- tolerance is needed. Were these floats, the equality would have to become an
-- epsilon, and an epsilon is a place for a cent to hide.

create or replace function public.assert_splits_balance()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_expense_id uuid := coalesce(new.expense_id, old.expense_id);
  v_amount     numeric(14,2);
  v_total      numeric(14,2);
begin
  select amount into v_amount from public.expenses where id = v_expense_id;

  -- The expense itself is gone and took its splits with it by cascade. There
  -- is nothing left to be consistent with.
  if v_amount is null then
    return null;
  end if;

  select coalesce(sum(share), 0) into v_total
    from public.expense_splits
   where expense_id = v_expense_id;

  if v_total <> v_amount then
    raise exception
      'Shares add up to % but the expense is % — every expense must be split in full.',
      v_total, v_amount;
  end if;

  return null;
end;
$$;

drop trigger if exists expense_splits_balance on public.expense_splits;
create constraint trigger expense_splits_balance
  after insert or update or delete on public.expense_splits
  deferrable initially deferred
  for each row execute function public.assert_splits_balance();

-- The other half of the same rule. Changing an expense's amount without
-- touching its splits breaks the invariant from the opposite direction, and
-- the trigger above never fires because no split row moved.
create or replace function public.assert_expense_balance()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_total numeric(14,2);
begin
  select coalesce(sum(share), 0) into v_total
    from public.expense_splits
   where expense_id = new.id;

  -- An expense with no splits yet is mid-insert, not broken.
  if v_total = 0 and not exists (
    select 1 from public.expense_splits where expense_id = new.id
  ) then
    return null;
  end if;

  if v_total <> new.amount then
    raise exception
      'Shares add up to % but the expense is % — change the split as well as the total.',
      v_total, new.amount;
  end if;

  return null;
end;
$$;

drop trigger if exists expenses_balance on public.expenses;
create constraint trigger expenses_balance
  after insert or update of amount on public.expenses
  deferrable initially deferred
  for each row execute function public.assert_expense_balance();

-- --------------------------------------------------------------------------
-- Policies
-- --------------------------------------------------------------------------

drop policy if exists "expenses_select_member" on public.expenses;
create policy "expenses_select_member" on public.expenses
  for select using (public.is_group_member(group_id));

drop policy if exists "expenses_insert_member" on public.expenses;
create policy "expenses_insert_member" on public.expenses
  for insert with check (public.is_group_member(group_id) and auth.uid() = created_by);

-- Anyone in the group may correct an expense, not only whoever entered it. The
-- person who spots the wrong total is usually not the person who typed it, and
-- an edit history (0022) is a better answer than a lock.
drop policy if exists "expenses_update_member" on public.expenses;
create policy "expenses_update_member" on public.expenses
  for update using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

-- No delete policy: deleting is setting deleted_at.

-- Reached through the expense rather than a group_id copied onto every split.
-- A duplicated column is a column that can disagree, and this lookup is by
-- primary key against a function Postgres already caches per statement.
drop policy if exists "expense_splits_select_member" on public.expense_splits;
create policy "expense_splits_select_member" on public.expense_splits
  for select using (
    exists (
      select 1 from public.expenses e
       where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

drop policy if exists "expense_splits_write_member" on public.expense_splits;
create policy "expense_splits_write_member" on public.expense_splits
  for all using (
    exists (
      select 1 from public.expenses e
       where e.id = expense_id and public.is_group_member(e.group_id)
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
       where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );
