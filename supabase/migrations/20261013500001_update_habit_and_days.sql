-- 20261013500001 · Edit a habit and the days already filed from it, together
--
-- "Past and upcoming" on a habit edit. The days and then the habit as two
-- calls from the phone could leave one written and not the other when the
-- connection drops between them, with nothing on screen to say so. Here the
-- habit is saved and every day it filed takes what the habit now carries, in
-- one transaction, so any refusal undoes both. "Upcoming only" stays a plain
-- update of the habit.
--
-- The habit is saved as the app saves it: the name trimmed, and the category
-- kept unless one is given. The app sends one only with a new icon, so an icon
-- this build does not know keeps the category it was filed under. Any plan may
-- edit; only starting a habit is Pro, and that check is on insert.
--
-- The days are written from the habit as saved, so each holds what a tap
-- would file now (habitCarriedValues in src/api/habits.ts). Their date and
-- habit are never written, so receipts_habit_not_before_creation does not fire
-- and a day dated before the habit's start is rewritten like the rest. Note,
-- book, photo, source and when it was saved stay as they are.

create or replace function public.update_habit_and_days(
  p_habit           uuid,
  p_name            text,
  p_icon_id         text,
  p_color           text,
  p_price           numeric,
  p_card_id         uuid,
  p_bank_account_id uuid,
  -- Null keeps the category the habit is filed under.
  p_category_id     text default null
)
returns public.habits
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_habit public.habits;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- numeric(14,2) would round a fraction of a cent, and NaN passes price > 0:
  -- either would save the habit and every past day at a price nobody typed.
  if p_price is null or p_price = 'NaN'::numeric or p_price <= 0 or p_price <> round(p_price, 2) then
    raise exception 'a habit needs a price in whole cents above zero' using errcode = '22023';
  end if;

  -- Locked before anything is written, as delete_habit locks it, so a delete
  -- on another phone lands wholly before or after this edit, and one that won
  -- is refused here in delete_habit's words rather than as a missing row.
  -- Runs as the caller: a habit that is not theirs is not found.
  perform 1 from public.habits where id = p_habit for update;
  if not found then
    raise exception 'there is no such habit' using errcode = 'P0002';
  end if;

  -- Named both, the card wins, as it does on the phone; the table allows one.
  update public.habits
     set name            = btrim(p_name),
         icon_id         = p_icon_id,
         color           = p_color,
         price           = p_price,
         category_id     = coalesce(p_category_id, category_id),
         card_id         = p_card_id,
         bank_account_id = case when p_card_id is null then p_bank_account_id end
   where id = p_habit
  returning * into strict v_habit;

  update public.receipts
     set merchant        = v_habit.name,
         amount          = v_habit.price,
         category_id     = coalesce(v_habit.category_id, 'other'),
         card_id         = v_habit.card_id,
         bank_account_id = case when v_habit.card_id is null then v_habit.bank_account_id end
   where habit_id = p_habit;

  return v_habit;
end;
$$;

-- A new function is executable by PUBLIC by default.
revoke all on function public.update_habit_and_days(uuid, text, text, text, numeric, uuid, uuid, text)
  from public, anon;
grant execute on function public.update_habit_and_days(uuid, text, text, text, numeric, uuid, uuid, text)
  to authenticated;
