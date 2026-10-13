-- 20261013700001 · "I spent it" files the purchase once
--
-- Deleting a goal with "I spent it" closes it, and its moves stay, so its money stays out of
-- savings. A receipt for the same purchase, added on its own, then counted it again: it lowered
-- what the month it is dated in left over, so the next wrap-up moved that much less into savings.
--
-- spend_goal closes the goal and files its receipt in one transaction, and the goal names that
-- receipt. The app leaves what the goal held out of the month's spending (src/lib/savings.ts,
-- paidFromGoals), because that money left savings when the goal closed. Everywhere else the
-- receipt counts as any receipt does: the card or account that paid, Current balance, Insights.
--
-- Additive: an older build reads goals and receipts exactly as before, and "I spent it" without a
-- receipt (delete_goal with p_return false) is unchanged.
--
-- Refusals: 42501 not signed in; 22023 a missing or malformed field, or nothing in the goal;
-- 23514 someone else's card or account (a book is held to its owner by receipts_own_book);
-- P0002 'That goal is no longer there.', delete_goal's own words, which the app reads as 'gone'.
--
-- Re-run safe.

alter table public.goals
  add column if not exists receipt_id uuid references public.receipts (id) on delete set null;

comment on column public.goals.receipt_id is
  'The receipt filed when the goal was spent. Up to what the goal held, it is not spending of the month it is dated in. Null when spent without one, or once that receipt is deleted.';

-- One goal per receipt; also the index the foreign key's "set null" uses.
create unique index if not exists goals_receipt_once
  on public.goals (receipt_id)
  where receipt_id is not null;

/*
 * Ends an open goal as spent and files what it held as a receipt: the goal closes as delete_goal
 * closes it (its moves stay) and names the receipt. The amount is the goal's own figure,
 * goal_saved: what it started with plus every move in, less every move back.
 *
 * p_receipt is the app's own id for the receipt. A call that reaches the server twice (a retry
 * after a lost answer) finds that receipt already named by one of the caller's goals and answers
 * it again, filing nothing more.
 *
 * Returns the receipt's id.
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

  perform pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0));

  if exists (select 1 from public.goals where user_id = v_user and receipt_id = p_receipt) then
    return p_receipt;
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

revoke all on function public.spend_goal(uuid, uuid, text, date, uuid, uuid, uuid) from public, anon;
grant execute on function public.spend_goal(uuid, uuid, text, date, uuid, uuid, uuid) to authenticated;
