-- 20261001100002 · Voice receipts are Pro
--
-- Voice is a verb, like scanning, so it sits behind the same wall
-- (20260831100007_pro_wall.sql). That trigger only knew 'scan' and 'upload',
-- so a free account, or a client that lies about being Pro, could file a
-- receipt marked 'voice'. Typing a receipt stays free: 'manual' is untouched.
--
-- Same function and same trigger, which stays BEFORE INSERT only: a receipt
-- already on the books stays editable after a lapse, because the wall gates
-- verbs, not nouns (20260928100001_wall_gates_verbs_not_nouns.sql).
--
-- Bills and subscriptions carry no source column, so voice is walled on the
-- client alone for those; typing them is free anyway.
--
-- Needs 20261001100001 committed first ('voice' is a new enum value).

create or replace function public.enforce_scan_is_pro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source in ('scan', 'upload', 'voice') and not public.is_pro(new.user_id) then
    if new.source = 'voice' then
      raise exception 'Adding receipts by voice is part of Skip Pro.';
    end if;
    raise exception 'Scanning receipts is part of Skip Pro.';
  end if;
  return new;
end;
$$;

-- The trigger itself is unchanged (receipts_scan_is_pro, before insert, for
-- each row); create or replace swaps the body it runs.
