-- 0013 · Let a signed-in user delete their own account
--
-- Supabase gives the client no way to delete a user: auth.users is owned by
-- the auth schema and the anon/authenticated roles cannot touch it. The usual
-- answers are an Edge Function holding the service-role key, or this — a
-- security-definer function that deletes exactly one row, the caller's own.
--
-- This is the smaller attack surface of the two. There is no id parameter, so
-- there is nothing to tamper with: the row deleted is whatever auth.uid()
-- resolves to for the caller's JWT, and a caller with no session gets an
-- exception rather than a silent no-op.
--
-- Every application table references auth.users (id) on delete cascade, so
-- profiles, cards, bank accounts, salary, bills, loans, receipts and
-- subscriptions all go with it. Storage objects do NOT cascade, so scanned
-- receipt images are removed explicitly first.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- Receipt images live under a folder named for the owner's uid.
  delete from storage.objects
   where bucket_id = 'receipt-images'
     and (storage.foldername(name))[1] = v_user::text;

  delete from auth.users where id = v_user;
end;
$$;

-- Definer functions are executable by PUBLIC unless revoked, which would let
-- an unauthenticated caller reach the body. The auth.uid() guard already
-- refuses them, but the grant should not depend on that.
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
