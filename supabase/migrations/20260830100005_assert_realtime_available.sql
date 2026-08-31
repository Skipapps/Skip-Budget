-- 0005 · Prove the thing realtime depends on is actually there
--
-- broadcast_group_change swallows every error, which is right — a broadcast
-- that cannot be sent must never roll back the expense that caused it. But it
-- means an absent realtime.broadcast_changes would look exactly like a working
-- one: writes succeed, nothing is announced, and the only symptom is that the
-- other phone never updates. That is a bad way to find out.
--
-- Checked by name rather than by exact signature. The first version of this
-- looked for broadcast_changes(text,text,text,text,text,record,record) with
-- to_regprocedure, which matches an exact argument list — and the real function
-- takes an eighth `level` argument with a default. So it reported the function
-- missing when it was there all along, which is a worse failure than the one it
-- was written to catch: it would have sent us rewriting working code.

do $$
declare
  v_found boolean;
begin
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'realtime'
       and p.proname = 'broadcast_changes'
  ) into v_found;

  if not v_found then
    raise exception
      'realtime.broadcast_changes is missing — group and friend broadcasts would be silently dropped';
  end if;
end;
$$;

comment on function public.broadcast_group_change() is
  'Announces a change to everyone in the group. Errors are swallowed on purpose: '
  'a broadcast is never worth failing the write that caused it. Migration 0005 '
  'asserts the underlying realtime function exists, so a swallowed error cannot '
  'quietly mean realtime was never wired up at all.';
