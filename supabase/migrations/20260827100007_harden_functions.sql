-- 0007 · Function hardening
--
-- Two findings from Supabase's security advisor:
--
-- 1. Functions without a pinned search_path resolve unqualified names against
--    whatever the caller's search_path happens to be. Pinning it to '' means
--    everything must be schema-qualified and nothing can be shadowed.
--
-- 2. handle_new_user is SECURITY DEFINER — it runs with the definer's rights so
--    it can write a profile during signup. PostgREST exposes every public
--    function as an RPC endpoint, so it was callable at /rest/v1/rpc by anon.
--    A trigger function has no business being reachable from the internet.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.monthly_from_bill(
  p_amount numeric,
  p_recurrence public.bill_recurrence
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case p_recurrence
    when 'weekly'    then p_amount * 52.0 / 12.0
    when 'monthly'   then p_amount
    when 'quarterly' then p_amount / 3.0
    when 'yearly'    then p_amount / 12.0
    when 'period'    then p_amount
  end;
$$;

create or replace function public.monthly_from_salary(
  p_amount numeric,
  p_frequency public.pay_frequency
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case p_frequency
    when 'weekly'      then p_amount * 52.0 / 12.0
    when 'biweekly'    then p_amount * 26.0 / 12.0
    when 'semimonthly' then p_amount * 2.0
    when 'monthly'     then p_amount
  end;
$$;

-- Only the trigger should ever invoke this; nobody calls it over the API.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- save_loan stays callable: it is SECURITY INVOKER, so it runs as the caller
-- and RLS still applies. That is exactly how the app is meant to reach it.
grant execute on function public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid
) to authenticated;
