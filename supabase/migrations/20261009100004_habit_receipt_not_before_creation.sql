-- 20261009100004 · A habit's receipts start on the day the habit was made
--
-- A habit counts as saved only from saved_from, the day it was made. A
-- receipt for it dated earlier would be spending on a day the habit never
-- tracked, so filing one there is refused, whether by a tap or by moving a
-- receipt onto it.
--
-- Only a write that sets the date or the habit is checked. Receipts already
-- dated before their habit's start stay as they are: their amount, note or
-- card can still be edited, the rename trigger can still update them, and
-- deleting is never refused.
--
-- Refused with SQLSTATE 23514 and a fixed message that the app matches on
-- (src/api/habits.ts, refusedBeforeHabitStart). DETAIL carries the habit's
-- saved_from as yyyy-mm-dd.
--
-- Runs as the person, like receipts_own_habit: the row policy shows it only
-- their own habits, and a habit it cannot see is that trigger's to refuse.

create or replace function public.receipts_habit_not_before_creation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_saved_from date;
begin
  if new.habit_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.purchased_on is not distinct from old.purchased_on
     and new.habit_id is not distinct from old.habit_id then
    return new;
  end if;

  select saved_from into v_saved_from from public.habits where id = new.habit_id;

  if new.purchased_on < v_saved_from then
    raise exception 'A habit receipt cannot be dated before the habit started.'
      using errcode = '23514', detail = v_saved_from::text;
  end if;

  return new;
end;
$$;

drop trigger if exists receipts_habit_not_before_creation on public.receipts;
create trigger receipts_habit_not_before_creation
  before insert or update of purchased_on, habit_id on public.receipts
  for each row execute function public.receipts_habit_not_before_creation();
