-- 20261013700002 · "I already added it": a spent goal names a receipt already on the record
--
-- "I spent it" files the purchase as a new receipt with the goal (spend_goal, 20261013700001).
-- Someone who had already added that receipt from Receipts now picks it instead:
-- link_goal_receipt closes the goal and names the receipt in one transaction. Nothing about the
-- receipt changes. As with spend_goal, the app leaves what the goal held out of the spending of
-- the month the receipt is dated in (src/lib/savings.ts, paidFromGoals); a month already closed
-- is then offered its update, as for any late change.
--
-- spend_goal is recreated with its retry check straight after the lock and naming this goal, so
-- a retry is answered even when the card or account it named has gone since, and a receipt id
-- sent for another goal is never taken for a retry. Same signature, same grants.
--
-- Refusals: 42501 not signed in; 22023 a missing field, or nothing in the goal; 23503 a receipt
-- that is not the caller's or not there; 23514 a spending habit's day, which is a coffee, never
-- what a goal bought; 23505 a receipt another goal already names; P0002 'That goal is no longer
-- there.', delete_goal's own words, which the app reads as 'gone'.
--
-- Re-run safe.

/*
 * Ends an open goal as spent and names a receipt already on the record. Returns the receipt's id.
 * The same goal and receipt again (a retry after a lost answer) is answered, changing nothing.
 */
create or replace function public.link_goal_receipt(p_id uuid, p_receipt uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_habit uuid;
begin
  if v_user is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_id is null or p_receipt is null then
    raise exception 'Name the goal and the receipt.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0));

  if exists (
    select 1 from public.goals where id = p_id and user_id = v_user and receipt_id = p_receipt
  ) then
    return p_receipt;
  end if;

  -- Runs as its owner, past the row policies: the foreign key alone takes anyone's receipt.
  select habit_id into v_habit
    from public.receipts where id = p_receipt and user_id = v_user for update;
  if not found then
    raise exception 'That receipt is no longer there.' using errcode = '23503';
  end if;
  if v_habit is not null then
    raise exception 'A spending habit''s day cannot be what a goal bought.' using errcode = '23514';
  end if;
  if exists (select 1 from public.goals where receipt_id = p_receipt) then
    raise exception 'Another goal already names that receipt.' using errcode = '23505';
  end if;

  perform 1 from public.goals
   where id = p_id and user_id = v_user and closed_at is null
     for update;
  if not found then
    raise exception 'That goal is no longer there.' using errcode = 'P0002';
  end if;
  if coalesce(public.goal_saved(p_id), 0) <= 0 then
    raise exception 'There is nothing in that goal to spend.' using errcode = '22023';
  end if;

  update public.goals
     set closed_at = now(),
         receipt_id = p_receipt
   where id = p_id;

  return p_receipt;
end;
$$;

/*
 * As 20261013700001 wrote it, with the retry check moved: see the header.
 */
create or replace function public.spend_goal(
  p_id              uuid,
  p_receipt         uuid,
  p_merchant        text,
  p_purchased_on    date,
  p_card_id         uuid default null,
  p_bank_account_id uuid default null,
  p_book_id         uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_merchant text := btrim(coalesce(p_merchant, ''));
  v_amount   numeric;
begin
  if v_user is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_id is null or p_receipt is null then
    raise exception 'Name the goal and the receipt.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0));

  if exists (
    select 1 from public.goals where id = p_id and user_id = v_user and receipt_id = p_receipt
  ) then
    return p_receipt;
  end if;

  if char_length(v_merchant) not between 1 and 120 then
    raise exception 'Say where it was bought.' using errcode = '22023';
  end if;
  if p_purchased_on is null then
    raise exception 'Say when it was bought.' using errcode = '22023';
  end if;
  if p_card_id is not null and p_bank_account_id is not null then
    raise exception 'A receipt is paid with one card or one account.' using errcode = '22023';
  end if;
  -- Runs as its owner, past the row policies: the foreign keys alone take anyone's card or account.
  if p_card_id is not null and not exists (
    select 1 from public.cards where id = p_card_id and user_id = v_user
  ) then
    raise exception 'A receipt can only be paid with one of your own cards.' using errcode = '23514';
  end if;
  if p_bank_account_id is not null and not exists (
    select 1 from public.bank_accounts where id = p_bank_account_id and user_id = v_user
  ) then
    raise exception 'A receipt can only be paid from one of your own accounts.' using errcode = '23514';
  end if;

  perform 1 from public.goals
   where id = p_id and user_id = v_user and closed_at is null
     for update;
  if not found then
    raise exception 'That goal is no longer there.' using errcode = 'P0002';
  end if;

  v_amount := public.goal_saved(p_id);
  if v_amount is null or v_amount <= 0 then
    raise exception 'There is nothing in that goal to spend.' using errcode = '22023';
  end if;

  insert into public.receipts
    (id, user_id, merchant, amount, purchased_on, category_id, card_id, bank_account_id, source, book_id)
  values
    (p_receipt, v_user, v_merchant, v_amount, p_purchased_on, 'other', p_card_id, p_bank_account_id,
     'manual', p_book_id);

  update public.goals
     set closed_at = now(),
         receipt_id = p_receipt
   where id = p_id;

  return p_receipt;
end;
$$;

revoke all on function public.link_goal_receipt(uuid, uuid) from public, anon;
grant execute on function public.link_goal_receipt(uuid, uuid) to authenticated;
revoke all on function public.spend_goal(uuid, uuid, text, date, uuid, uuid, uuid) from public, anon;
grant execute on function public.spend_goal(uuid, uuid, text, date, uuid, uuid, uuid) to authenticated;
