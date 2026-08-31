-- 0008 · Splitting is Pro, said once
--
-- One trigger on every table splitting writes to, instead of a check pasted
-- into six functions. The question is about the actor, not the row: whoever
-- is signed in and writing must be Pro. Service-role writers — the webhook,
-- the placeholder conversion inside account deletion — have no auth.uid() and
-- pass untouched, and reads are not gated at all: a lapsed member's groups
-- stay whole for everyone else, and their history stays visible to them for
-- the day they come back.

create or replace function public.enforce_splits_are_pro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_pro(auth.uid()) then
    raise exception 'The split manager is part of Skip Pro.';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'groups', 'group_members', 'expenses', 'expense_splits',
    'settlements', 'friend_requests', 'friendships'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_splits_pro', t);
    execute format(
      'create trigger %I before insert on public.%I
         for each row execute function public.enforce_splits_are_pro()',
      t || '_splits_pro', t
    );
  end loop;
end;
$$;
