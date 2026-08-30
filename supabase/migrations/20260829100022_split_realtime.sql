-- 0022 · Telling the other phones
--
-- The existing realtime setup subscribes per user and filters on
-- `user_id = me`. That is right for personal data and useless here: a group
-- expense somebody else adds carries THEIR id, so a filter looking for yours
-- can never match it, and their phone would sit on a stale balance until
-- something made it re-ask.
--
-- Dropping the filter and leaning on the policies would work, but it makes
-- Postgres evaluate every subscriber's row policies against every change.
-- Broadcast is O(1) instead: one message onto a topic per group, and the
-- clients listening to that topic pick it up.
--
-- The pattern from the existing provider carries over exactly — a message is a
-- signal that something moved, never the new truth, and React Query re-reads
-- through the same queries the screens already use.

create or replace function public.broadcast_group_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  -- group_members is keyed by group_id like the rest; expenses reached through
  -- their own column. Both shapes land here so one function covers every table.
  v_group_id := coalesce(
    case when tg_table_name = 'groups'
         then coalesce(new.id, old.id)
         else null end,
    new.group_id,
    old.group_id
  );

  if v_group_id is null then
    return null;
  end if;

  begin
    perform realtime.broadcast_changes(
      'group:' || v_group_id::text,  -- topic, one per group
      tg_op,                          -- event name
      tg_op,                          -- operation
      tg_table_name,
      tg_table_schema,
      new,
      old
    );
  exception when others then
    -- A broadcast that cannot be sent must never roll back the write that
    -- caused it. Someone's expense is worth more than someone else's screen
    -- updating a few seconds sooner, and the app still refetches on focus.
    null;
  end;

  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'groups', 'group_members', 'expenses', 'settlements'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'broadcast_' || t, t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.broadcast_group_change()',
      'broadcast_' || t, t
    );
  end loop;
end;
$$;

-- expense_splits has no group_id of its own, and giving it one would be a
-- column that can disagree with its expense. The expense row always changes in
-- the same transaction anyway, so its own broadcast already covers the split.

-- --------------------------------------------------------------------------
-- Who may listen
-- --------------------------------------------------------------------------
--
-- Without this, a private topic is readable by anyone who guesses its name —
-- and the name is a group id, which every member of every group already has
-- one of. The policy re-uses the same membership helper the table policies do,
-- so there is one definition of "may this person see this group" rather than
-- two that can drift apart.

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
          realtime.topic() like 'group:%'
          and public.is_group_member(
            nullif(substring(realtime.topic() from 7), '')::uuid
          )
        )
    $policy$;
  end if;
end;
$$;
