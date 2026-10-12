-- 20261012200001 · Editing or deleting a habit asks about its past days
--
-- A tapped day's receipt copies the habit's name, price, card or account and
-- category when it is filed. Whether an edit reaches the days already filed
-- is the person's answer, "Past and upcoming" or "Upcoming only", as it is for
-- a bill's past charges; the app writes the first as one update of every
-- receipt with that habit_id. A trigger that always renamed them would answer
-- for the person, so it goes.
--
-- That update sets neither purchased_on nor habit_id, so
-- receipts_habit_not_before_creation (20261009100004) does not fire on it and
-- days filed before that rule are rewritten like the rest.
--
-- Deleting asks too. "Keep past days" archives the habit, as before. "Remove
-- everything" is delete_habit below.

drop trigger if exists habits_rename_receipts on public.habits;
drop function if exists public.habit_renames_receipts();

-- The habit and every day filed from it, in one transaction. The receipts go
-- first: deleting the habit alone sets their habit_id to null and leaves them
-- in spending as ordinary receipts.
--
-- Runs as the caller, like update_loan and the payoff functions, so the row
-- policies keep it to the caller's own habit and receipts. A habit the caller
-- cannot see, someone else's or none at all, is refused with P0002 "there is
-- no such habit", never reported as removed.
create or replace function public.delete_habit(p_habit uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- Locked before the receipts go: a tap saved meanwhile waits on this lock
  -- (its foreign key check locks the habit row) and then fails on the deleted
  -- habit, instead of landing in between and being left with no habit.
  perform 1 from public.habits where id = p_habit for update;
  if not found then
    raise exception 'there is no such habit' using errcode = 'P0002';
  end if;

  delete from public.receipts where habit_id = p_habit;
  delete from public.habits where id = p_habit;
end;
$$;

-- A new function is executable by PUBLIC by default.
revoke all on function public.delete_habit(uuid) from public, anon;
grant execute on function public.delete_habit(uuid) to authenticated;
