-- 20261013600003 · Edit a bill or a subscription and its past charges, together
--
-- "Past and upcoming" on a bill or subscription edit saved the plan, then rewrote
-- its recorded charges in a second request. When the second failed, the plan was
-- saved and its past was not, and nothing outside the open page knew the rewrite
-- was owed. These do both in one transaction, as update_loan_and_charges does for
-- a loan: any refusal, from the plan's checks and triggers or from the rewrite,
-- undoes the whole call.
--
-- p_values is the edit as the app sends it (column names to new values). It is
-- laid over the row as stored, so a column it leaves out keeps its value, and only
-- the columns a person edits are written: never id, user_id, created_at,
-- updated_at or anchor_day, which the database keeps itself. Every trigger on the
-- table runs as for a plain update (the anchor day, ownership, the next-due floor).
--
-- With p_rewrite, every charge already recorded for the plan takes the name,
-- amount and card or account the plan now has, as the recorders copy them on the
-- day (an empty name reads 'Bill' or 'Subscription'). A charge's date is the day
-- the money moved and is never touched.
--
-- Runs as the caller: row security keeps it to their own plan and charges, and a
-- plan they cannot see is refused with P0002.

create or replace function public.update_bill_and_charges(
  p_id      uuid,
  p_values  jsonb,
  p_rewrite boolean
)
returns public.bills
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.bills;
  v_new public.bills;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    raise exception 'the values to save are missing' using errcode = '22023';
  end if;

  select * into v_row from public.bills where id = p_id for update;
  if not found then
    raise exception 'there is no such bill' using errcode = 'P0002';
  end if;

  v_new := jsonb_populate_record(v_row, p_values);

  update public.bills
     set name            = v_new.name,
         amount          = v_new.amount,
         category_id     = v_new.category_id,
         icon_id         = v_new.icon_id,
         recurrence      = v_new.recurrence,
         next_due_on     = v_new.next_due_on,
         starts_on       = v_new.starts_on,
         ends_on         = v_new.ends_on,
         card_id         = v_new.card_id,
         bank_account_id = v_new.bank_account_id,
         note            = v_new.note,
         brand_id        = v_new.brand_id,
         logo_domain     = v_new.logo_domain,
         logo_hidden     = v_new.logo_hidden,
         in_spending     = v_new.in_spending
   where id = p_id
  returning * into v_row;

  if coalesce(p_rewrite, false) then
    update public.charges
       set label           = coalesce(nullif(v_row.name, ''), 'Bill'),
           amount          = v_row.amount,
           card_id         = v_row.card_id,
           bank_account_id = v_row.bank_account_id
     where bill_id = p_id;
  end if;

  return v_row;
end;
$$;

create or replace function public.update_subscription_and_charges(
  p_id      uuid,
  p_values  jsonb,
  p_rewrite boolean
)
returns public.subscriptions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.subscriptions;
  v_new public.subscriptions;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    raise exception 'the values to save are missing' using errcode = '22023';
  end if;

  select * into v_row from public.subscriptions where id = p_id for update;
  if not found then
    raise exception 'there is no such subscription' using errcode = 'P0002';
  end if;

  v_new := jsonb_populate_record(v_row, p_values);

  update public.subscriptions
     set brand_id        = v_new.brand_id,
         name            = v_new.name,
         amount          = v_new.amount,
         cycle           = v_new.cycle,
         next_renewal_on = v_new.next_renewal_on,
         category_id     = v_new.category_id,
         card_id         = v_new.card_id,
         bank_account_id = v_new.bank_account_id,
         started_on      = v_new.started_on,
         active          = v_new.active,
         note            = v_new.note,
         logo_domain     = v_new.logo_domain,
         logo_hidden     = v_new.logo_hidden
   where id = p_id
  returning * into v_row;

  if coalesce(p_rewrite, false) then
    update public.charges
       set label           = coalesce(nullif(v_row.name, ''), 'Subscription'),
           amount          = v_row.amount,
           card_id         = v_row.card_id,
           bank_account_id = v_row.bank_account_id
     where subscription_id = p_id;
  end if;

  return v_row;
end;
$$;

-- A new function is executable by PUBLIC by default.
revoke all on function public.update_bill_and_charges(uuid, jsonb, boolean) from public, anon;
grant execute on function public.update_bill_and_charges(uuid, jsonb, boolean) to authenticated;
revoke all on function public.update_subscription_and_charges(uuid, jsonb, boolean) from public, anon;
grant execute on function public.update_subscription_and_charges(uuid, jsonb, boolean) to authenticated;
