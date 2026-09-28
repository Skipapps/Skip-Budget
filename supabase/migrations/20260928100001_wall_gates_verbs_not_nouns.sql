-- 0009 · The wall gates verbs, never nouns (Founder's call, 2026-09-28)
--
-- Two retreats from 0007/0008, both in the direction of simplicity: a lapse
-- must never require locking or losing anything a person already made.
--
-- 1. The split manager opens to everyone. A group is multiplayer — walling
--    any member walls the whole table's ledger, and a lapsed creator who
--    cannot record paying a debt corrupts other people's balances, not just
--    their own. Joining, spending, settling and friends are free, always.
--    The one Pro thing left in splitting is scale: opening another group
--    while one of yours is still running.
--
-- 2. Extras are never locked. 0007 froze edits on beyond-allowance rows
--    after a downgrade; that is a lock on data somebody already made. The
--    model now: the wall stops new bricks only, and everything ever created
--    stays fully usable on any tier.

-- --------------------------------------------------------------------------
-- The blanket splits wall comes down
-- --------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'groups', 'group_members', 'expenses', 'expense_splits',
    'settlements', 'friend_requests', 'friendships'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_splits_pro', t);
  end loop;
end;
$$;

drop function if exists public.enforce_splits_are_pro();

-- --------------------------------------------------------------------------
-- …replaced by one allowance on the one expansion verb: opening a group
-- --------------------------------------------------------------------------
--
-- Free keeps one open group *you created*. Groups you merely joined are not
-- counted, and closing yours frees the slot — settle the trip, archive it,
-- start the next one. Service-role writers (the webhook, account-deletion
-- conversion) have no auth.uid() and pass untouched, same as 0008 did.

create or replace function public.enforce_group_allowance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_pro(auth.uid()) then
    return new;
  end if;

  if exists (
    select 1 from public.groups
     where created_by = auth.uid()
       and archived_at is null
  ) then
    raise exception 'Free keeps one open group — Skip Pro runs as many as you like.';
  end if;

  return new;
end;
$$;

drop trigger if exists groups_free_allowance on public.groups;
create trigger groups_free_allowance
  before insert on public.groups
  for each row execute function public.enforce_group_allowance();

-- --------------------------------------------------------------------------
-- No more edit locks on extras
-- --------------------------------------------------------------------------
--
-- Deletes were always allowed; now edits are too. A lapsed account with five
-- cards has five working cards — it just cannot add a sixth (0007's INSERT
-- allowance still stands, untouched).

drop trigger if exists cards_lock_extras on public.cards;
drop trigger if exists bank_accounts_lock_extras on public.bank_accounts;
drop trigger if exists salary_sources_lock_extras on public.salary_sources;
drop function if exists public.enforce_lock_on_extras();
