-- 0016 · Asking, answering, and unfriending
--
-- Friendships are never written directly — the table has no insert policy at
-- all. Everything that creates one comes through here, because each step has a
-- check that a row policy cannot express: that the request was addressed to
-- the caller, that the pair is stored in the right order, that answering twice
-- does not produce two friendships.
--
-- All three are security definer for that reason, and all three re-check
-- auth.uid() themselves rather than trusting the caller.

-- --------------------------------------------------------------------------

-- Codes get read off one screen and typed into another, so what arrives is
-- rarely what was shown: lowercase, spaced, hyphenated in the middle.
create or replace function public.normalise_invite_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

-- --------------------------------------------------------------------------

/*
 * Ask to be someone's friend, using the code they gave you.
 *
 * Two cases are worth calling out. If they have already asked you, this
 * accepts rather than queuing a second request in the opposite direction —
 * both people have now said yes, and making them each tap again to confirm
 * something they have both already done is the kind of correctness nobody
 * thanks you for. And asking twice is silently fine: the second call finds the
 * pending row and returns the same answer, so a double tap cannot fail.
 */
create or replace function public.request_friend_by_code(p_code text)
returns table (friend_id uuid, display_name text, outcome text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_code   text := public.normalise_invite_code(p_code);
  v_target public.profiles;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if length(v_code) = 0 then
    raise exception 'Enter the code your friend shared with you.';
  end if;

  select * into v_target
    from public.profiles
   where invite_code = v_code
     and discoverable;

  if v_target.id is null then
    -- Deliberately the same message whether the code is wrong or its owner has
    -- turned discovery off. The difference is not the asker's business.
    raise exception 'No one is using that code.';
  end if;

  if v_target.id = v_user then
    raise exception 'That is your own code.';
  end if;

  if public.are_friends(v_target.id) then
    return query select v_target.id, v_target.display_name, 'already_friends'::text;
    return;
  end if;

  -- They asked first. Both sides have now agreed, so this is a yes.
  if exists (
    select 1 from public.friend_requests
     where from_user = v_target.id and to_user = v_user and status = 'pending'
  ) then
    update public.friend_requests
       set status = 'accepted', responded_at = now()
     where from_user = v_target.id and to_user = v_user and status = 'pending';

    insert into public.friendships (user_a, user_b)
    values (least(v_user, v_target.id), greatest(v_user, v_target.id))
    on conflict do nothing;

    return query select v_target.id, v_target.display_name, 'accepted'::text;
    return;
  end if;

  insert into public.friend_requests (from_user, to_user)
  values (v_user, v_target.id)
  on conflict do nothing;

  return query select v_target.id, v_target.display_name, 'requested'::text;
end;
$$;

-- --------------------------------------------------------------------------

/*
 * Answer a request that was sent to you.
 *
 * The row is locked before it is read. Without that, two taps landing together
 * both see 'pending', both insert, and the pair is only saved from duplication
 * by the primary key — which would surface as an error on a perfectly ordinary
 * double tap.
 */
create or replace function public.respond_to_friend_request(
  p_request_id uuid,
  p_accept     boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_request public.friend_requests;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_request
    from public.friend_requests
   where id = p_request_id
   for update;

  if v_request.id is null then
    raise exception 'That request is no longer there.';
  end if;

  if v_request.to_user <> v_user then
    -- Same message as a missing row: whether a request exists between two
    -- other people is not something a third party gets to learn.
    raise exception 'That request is no longer there.';
  end if;

  if v_request.status <> 'pending' then
    return v_request.status;
  end if;

  update public.friend_requests
     set status = case when p_accept then 'accepted' else 'declined' end,
         responded_at = now()
   where id = p_request_id;

  if p_accept then
    insert into public.friendships (user_a, user_b)
    values (
      least(v_request.from_user, v_request.to_user),
      greatest(v_request.from_user, v_request.to_user)
    )
    on conflict do nothing;
  end if;

  return case when p_accept then 'accepted' else 'declined' end;
end;
$$;

-- --------------------------------------------------------------------------

/*
 * Undo a friendship.
 *
 * Any past requests between the two are cleared out with it, so the pair is
 * back to how it started and either side can ask again. Leaving an 'accepted'
 * row behind would be a record of a friendship that no longer exists.
 */
create or replace function public.remove_friend(p_other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  delete from public.friendships
   where user_a = least(v_user, p_other)
     and user_b = greatest(v_user, p_other);

  delete from public.friend_requests
   where (from_user = v_user and to_user = p_other)
      or (from_user = p_other and to_user = v_user);
end;
$$;

-- --------------------------------------------------------------------------

revoke all on function public.request_friend_by_code(text) from public, anon;
revoke all on function public.respond_to_friend_request(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;

grant execute on function public.request_friend_by_code(text) to authenticated;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
