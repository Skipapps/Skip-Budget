-- 0019 · Settling up, and where a balance actually comes from
--
-- A settlement records that a debt was cleared. It moves no money: Skip has no
-- bank connection and never will, so this is a note that cash changed hands
-- somewhere else. The UI has to say that plainly or people will wait for a
-- transfer that is not coming.
--
-- The view at the bottom is the important half of this file. Every balance in
-- the app is derived from the ledger, every time it is asked for — there is no
-- stored balance column anywhere and there must never be one. A number kept in
-- a column has to be updated correctly by every path that touches money, and
-- the day one path forgets, it is wrong permanently with nothing to detect it.
-- A number that is recomputed cannot drift.

create table if not exists public.settlements (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,

  from_member uuid not null references public.group_members (id) on delete restrict,
  to_member   uuid not null references public.group_members (id) on delete restrict,

  amount      numeric(14,2) not null check (amount > 0),
  settled_on  date not null default current_date,
  note        text check (note is null or length(note) <= 200),

  created_by  uuid not null references auth.users (id) on delete restrict,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),

  constraint settlements_not_self check (from_member <> to_member)
);

create index if not exists settlements_by_group on public.settlements (group_id, settled_on desc);

alter table public.settlements enable row level security;

drop policy if exists "settlements_select_member" on public.settlements;
create policy "settlements_select_member" on public.settlements
  for select using (public.is_group_member(group_id));

drop policy if exists "settlements_insert_member" on public.settlements;
create policy "settlements_insert_member" on public.settlements
  for insert with check (public.is_group_member(group_id) and auth.uid() = created_by);

drop policy if exists "settlements_update_member" on public.settlements;
create policy "settlements_update_member" on public.settlements
  for update using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

-- --------------------------------------------------------------------------
-- Balances
-- --------------------------------------------------------------------------
--
-- Positive means this person is owed. Negative means they owe.
--
--   what they paid  −  what was their share  +  what they have handed over
--                                            −  what they have been handed
--
-- The last two terms are what settling does. If A owes B ten and pays it, A
-- gains ten and B loses ten, and both land on zero — which is the whole point.
--
-- security_invoker matters as much as the arithmetic. Without it a view runs
-- the underlying policies as its OWNER, and this view is owned by the role
-- that ran the migration — so it would happily hand every group's balances to
-- anyone who asked. With it, the caller's own membership decides what they see.

create or replace view public.group_balances
with (security_invoker = true) as
select
  m.group_id,
  m.id           as member_id,
  m.user_id,
  m.display_name,
  coalesce((
    select sum(e.amount) from public.expenses e
     where e.paid_by = m.id and e.deleted_at is null
  ), 0)
  - coalesce((
    select sum(s.share)
      from public.expense_splits s
      join public.expenses e on e.id = s.expense_id
     where s.member_id = m.id and e.deleted_at is null
  ), 0)
  + coalesce((
    select sum(t.amount) from public.settlements t
     where t.from_member = m.id and t.deleted_at is null
  ), 0)
  - coalesce((
    select sum(t.amount) from public.settlements t
     where t.to_member = m.id and t.deleted_at is null
  ), 0)
  as balance
from public.group_members m;

comment on view public.group_balances is
  'Derived every time it is read, never stored. Positive is owed, negative owes. '
  'Adding a balance column somewhere would be faster and would eventually be wrong.';

grant select on public.group_balances to authenticated;
