-- 0001 · Groups could not be created, and friend requests never arrived
--
-- Two faults in how changes were announced, one of them fatal.
--
-- The broadcast trigger worked out which group a row belonged to with
-- `coalesce(..., new.group_id, old.group_id)`, guarded by a case on the table
-- name so the group_id branch was never taken for `groups` itself. That guard
-- does nothing. PL/pgSQL resolves every row field an expression mentions in
-- order to build its parameter list, before the expression runs — so coalesce
-- short-circuiting never gets a chance, and `new.group_id` is an error on a
-- table with no such column. The trigger fires after insert on `groups`, which
-- meant creating a group failed outright.
--
-- The exception handler that should have made this survivable was wrapped
-- around the broadcast call alone, and the field lookup happened above it. A
-- guard that does not cover the line that fails is not a guard.
--
-- Second: friend requests were not announced at all. They have no group_id, so
-- the group topics never carried them, and the per-user subscription filters on
-- `user_id = me` while friend_requests names its people from_user and to_user.
-- Nothing matched, so a request sat unseen until the app was reopened.

-- --------------------------------------------------------------------------

create or replace function public.broadcast_group_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row      jsonb;
  v_group_id uuid;
begin
  -- The whole body, not just the send. This function exists to make somebody
  -- else's screen update sooner, and there is nothing it can fail at that is
  -- worth refusing an expense over.
  begin
    -- Two statements rather than one expression: each touches only the record
    -- that exists for this operation.
    if tg_op = 'DELETE' then
      v_row := to_jsonb(old);
    else
      v_row := to_jsonb(new);
    end if;

    -- Read by key out of jsonb, so a column that does not exist on this table
    -- is a missing key rather than an error. `groups` carries its own id;
    -- everything else points at one.
    v_group_id := nullif(coalesce(v_row ->> 'group_id', v_row ->> 'id'), '')::uuid;

    if v_group_id is not null then
      perform realtime.broadcast_changes(
        'group:' || v_group_id::text,
        tg_op,
        tg_op,
        tg_table_name,
        tg_table_schema,
        new,
        old
      );
    end if;
  exception when others then
    null;
  end;

  return null;
end;
$$;

-- --------------------------------------------------------------------------
-- Friend requests, to the two people they concern
-- --------------------------------------------------------------------------
--
-- A topic per account rather than per group, because a friendship exists
-- before either person shares anything to scope it by. Both sides are told:
-- the receiver so the request appears, and the sender so an accept lands on
-- their screen without them going looking for it.

create or replace function public.broadcast_friend_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_one uuid;
  v_two uuid;
begin
  begin
    if tg_op = 'DELETE' then
      v_row := to_jsonb(old);
    else
      v_row := to_jsonb(new);
    end if;

    -- friend_requests names them from_user/to_user; friendships user_a/user_b.
    v_one := nullif(coalesce(v_row ->> 'from_user', v_row ->> 'user_a'), '')::uuid;
    v_two := nullif(coalesce(v_row ->> 'to_user', v_row ->> 'user_b'), '')::uuid;

    if v_one is not null then
      perform realtime.broadcast_changes(
        'user:' || v_one::text, tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    end if;

    if v_two is not null then
      perform realtime.broadcast_changes(
        'user:' || v_two::text, tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    end if;
  exception when others then
    null;
  end;

  return null;
end;
$$;

drop trigger if exists friend_requests_broadcast on public.friend_requests;
create trigger friend_requests_broadcast
  after insert or update or delete on public.friend_requests
  for each row execute function public.broadcast_friend_change();

drop trigger if exists friendships_broadcast on public.friendships;
create trigger friendships_broadcast
  after insert or update or delete on public.friendships
  for each row execute function public.broadcast_friend_change();

-- --------------------------------------------------------------------------
-- Who may listen
-- --------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'realtime' and c.relname = 'messages'
  ) then
    execute 'drop policy if exists "split_group_topics_read" on realtime.messages';
    execute $policy$
      create policy "split_group_topics_read" on realtime.messages
        for select to authenticated
        using (
          (
            realtime.topic() like 'group:%'
            and public.is_group_member(nullif(substring(realtime.topic() from 7), '')::uuid)
          )
          or
          -- Your own topic and nobody else's. The id is in the name, so without
          -- this comparison anyone could listen to anyone by guessing a uuid
          -- they already have.
          (
            realtime.topic() like 'user:%'
            and nullif(substring(realtime.topic() from 6), '')::uuid = auth.uid()
          )
        )
    $policy$;
  end if;
end;
$$;
